import asyncio
import json
import logging
from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

import asyncpg
from redis import asyncio as redis_asyncio
from redis.exceptions import RedisError

from app.core.config import get_settings
from app.schemas.chat import ChatMessage


logger = logging.getLogger(__name__)


def _normalize_dsn(dsn: str) -> str:
    return dsn.replace("postgresql+asyncpg://", "postgresql://", 1)


class ChatHistoryRepository:
    def __init__(self) -> None:
        self._pool: asyncpg.Pool | None = None
        self._pool_lock = asyncio.Lock()
        self._schema_ready = False
        self._schema_lock = asyncio.Lock()

    async def _get_pool(self) -> asyncpg.Pool:
        if self._pool is None:
            async with self._pool_lock:
                if self._pool is None:
                    database_url = get_settings().recipe_database_url
                    if not database_url:
                        raise RuntimeError("RECIPE_DATABASE_URL or DATABASE_URL is not configured")
                    self._pool = await asyncpg.create_pool(_normalize_dsn(database_url), min_size=1, max_size=5)

        await self._ensure_schema()
        return self._pool

    async def _ensure_schema(self) -> None:
        if self._schema_ready:
            return

        async with self._schema_lock:
            if self._schema_ready:
                return
            if self._pool is None:
                raise RuntimeError("Chat database pool is unavailable")

            async with self._pool.acquire() as connection:
                await connection.execute(
                    """
                    CREATE TABLE IF NOT EXISTS chat_conversations (
                        id uuid PRIMARY KEY,
                        user_id text NOT NULL,
                        title text NOT NULL DEFAULT 'New conversation',
                        created_at timestamptz NOT NULL DEFAULT now(),
                        updated_at timestamptz NOT NULL DEFAULT now()
                    );
                    CREATE INDEX IF NOT EXISTS ix_chat_conversations_user_updated
                        ON chat_conversations (user_id, updated_at DESC);
                    CREATE TABLE IF NOT EXISTS chat_messages (
                        id uuid PRIMARY KEY,
                        conversation_id uuid NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
                        role text NOT NULL CHECK (role IN ('user', 'assistant')),
                        content text NOT NULL,
                        created_at timestamptz NOT NULL DEFAULT now()
                    );
                    CREATE INDEX IF NOT EXISTS ix_chat_messages_conversation_created
                        ON chat_messages (conversation_id, created_at, id);
                    """
                )
            self._schema_ready = True

    async def create_conversation(self, user_id: str) -> dict[str, Any]:
        pool = await self._get_pool()
        conversation_id = uuid4()
        row = await pool.fetchrow(
            """
            INSERT INTO chat_conversations (id, user_id)
            VALUES ($1, $2)
            RETURNING id, title, created_at, updated_at
            """,
            conversation_id,
            user_id,
        )
        return dict(row) if row else {}

    async def owns_conversation(self, conversation_id: UUID, user_id: str) -> bool:
        pool = await self._get_pool()
        return bool(
            await pool.fetchval(
                "SELECT EXISTS(SELECT 1 FROM chat_conversations WHERE id = $1 AND user_id = $2)",
                conversation_id,
                user_id,
            )
        )

    async def get_messages(self, conversation_id: UUID, limit: int = 200) -> list[dict[str, Any]]:
        pool = await self._get_pool()
        rows = await pool.fetch(
            """
            SELECT id, role, content, created_at
            FROM (
                SELECT id, role, content, created_at
                FROM chat_messages
                WHERE conversation_id = $1
                ORDER BY created_at DESC, id DESC
                LIMIT $2
            ) recent
            ORDER BY created_at, id
            """,
            conversation_id,
            limit,
        )
        return [dict(row) for row in rows]

    async def append_message(self, conversation_id: UUID, role: str, content: str) -> dict[str, Any]:
        pool = await self._get_pool()
        message_id = uuid4()
        async with pool.acquire() as connection:
            async with connection.transaction():
                row = await connection.fetchrow(
                    """
                    INSERT INTO chat_messages (id, conversation_id, role, content)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id, role, content, created_at
                    """,
                    message_id,
                    conversation_id,
                    role,
                    content,
                )
                if role == "user":
                    await connection.execute(
                        """
                        UPDATE chat_conversations
                        SET updated_at = now(),
                            title = CASE WHEN title = 'New conversation' THEN $2 ELSE title END
                        WHERE id = $1
                        """,
                        conversation_id,
                        content.strip()[:80],
                    )
                else:
                    await connection.execute(
                        "UPDATE chat_conversations SET updated_at = now() WHERE id = $1",
                        conversation_id,
                    )
        return dict(row) if row else {}

    async def delete_conversation(self, conversation_id: UUID, user_id: str) -> bool:
        pool = await self._get_pool()
        result = await pool.execute(
            "DELETE FROM chat_conversations WHERE id = $1 AND user_id = $2",
            conversation_id,
            user_id,
        )
        return result == "DELETE 1"


class RecentChatCache:
    def __init__(self) -> None:
        self._client: redis_asyncio.Redis | None = None

    def _get_client(self) -> redis_asyncio.Redis | None:
        if self._client is None:
            redis_url = get_settings().redis_url
            if not redis_url:
                return None
            self._client = redis_asyncio.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=0.5,
                socket_timeout=0.5,
            )
        return self._client

    @staticmethod
    def _key(user_id: str, conversation_id: UUID) -> str:
        return f"chat:{user_id}:{conversation_id}"

    async def get(self, user_id: str, conversation_id: UUID) -> list[ChatMessage] | None:
        settings = get_settings()
        client = self._get_client()
        if client is None:
            return None
        try:
            values = await client.lrange(
                self._key(user_id, conversation_id),
                -settings.chat_history_limit,
                -1,
            )
            if not values:
                return None
            return [ChatMessage.model_validate(json.loads(value)) for value in values]
        except (RedisError, json.JSONDecodeError, ValueError) as exc:
            logger.warning("Redis chat history read failed; using PostgreSQL: %s", exc)
            return None

    async def replace(self, user_id: str, conversation_id: UUID, messages: list[ChatMessage]) -> None:
        settings = get_settings()
        client = self._get_client()
        if client is None:
            return
        key = self._key(user_id, conversation_id)
        try:
            pipeline = client.pipeline(transaction=True)
            pipeline.delete(key)
            if messages:
                pipeline.rpush(key, *(message.model_dump_json() for message in messages))
                pipeline.ltrim(key, -settings.chat_history_limit, -1)
                pipeline.expire(key, settings.chat_history_ttl_seconds)
            await pipeline.execute()
        except RedisError as exc:
            logger.warning("Redis chat history write failed; PostgreSQL remains authoritative: %s", exc)

    async def append(self, user_id: str, conversation_id: UUID, messages: list[ChatMessage]) -> None:
        settings = get_settings()
        client = self._get_client()
        if client is None:
            return
        key = self._key(user_id, conversation_id)
        try:
            pipeline = client.pipeline(transaction=True)
            pipeline.rpush(key, *(message.model_dump_json() for message in messages))
            pipeline.ltrim(key, -settings.chat_history_limit, -1)
            pipeline.expire(key, settings.chat_history_ttl_seconds)
            await pipeline.execute()
        except RedisError as exc:
            logger.warning("Redis chat history write failed; PostgreSQL remains authoritative: %s", exc)

    async def delete(self, user_id: str, conversation_id: UUID) -> None:
        client = self._get_client()
        if client is None:
            return
        try:
            await client.delete(self._key(user_id, conversation_id))
        except RedisError as exc:
            logger.warning("Redis chat history delete failed: %s", exc)

    async def close(self) -> None:
        if self._client is not None:
            await self._client.close()
            self._client = None


repository = ChatHistoryRepository()
recent_cache = RecentChatCache()


def rows_to_chat_messages(rows: list[dict[str, Any]]) -> list[ChatMessage]:
    return [ChatMessage(role=row["role"], content=row["content"]) for row in rows]
