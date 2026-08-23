import logging
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.core.auth import AuthenticatedUser, get_current_user
from app.core.config import get_settings
from app.schemas.chat import (
    ChatMessage,
    ChatRequest,
    ChatResponse,
    ConversationMessagesResponse,
    ConversationResponse,
)
from app.services.chat_history import recent_cache, repository, rows_to_chat_messages
from app.services.chat_graph import run_chat_graph


router = APIRouter(tags=["chat"])
logger = logging.getLogger(__name__)


def _database_error(exc: Exception) -> HTTPException:
    logger.exception("Chat history database operation failed")
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Chat history database is unavailable",
    )


async def _require_owned_conversation(conversation_id: UUID, user_id: str) -> None:
    try:
        owns_conversation = await repository.owns_conversation(conversation_id, user_id)
    except (asyncpg.PostgresError, OSError, RuntimeError) as exc:
        raise _database_error(exc) from exc
    if not owns_conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(user: AuthenticatedUser = Depends(get_current_user)):
    try:
        return await repository.create_conversation(user.id)
    except (asyncpg.PostgresError, OSError, RuntimeError) as exc:
        raise _database_error(exc) from exc


@router.get("/conversations/{conversation_id}/messages", response_model=ConversationMessagesResponse)
async def get_conversation_messages(
    conversation_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
):
    await _require_owned_conversation(conversation_id, user.id)
    try:
        rows = await repository.get_messages(conversation_id)
    except (asyncpg.PostgresError, OSError, RuntimeError) as exc:
        raise _database_error(exc) from exc
    return ConversationMessagesResponse(conversation_id=conversation_id, messages=rows)


@router.post("/conversations/{conversation_id}/messages", response_model=ChatResponse)
async def chat(
    conversation_id: UUID,
    payload: ChatRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    await _require_owned_conversation(conversation_id, user.id)

    history = await recent_cache.get(user.id, conversation_id)
    if history is None:
        try:
            history_rows = await repository.get_messages(conversation_id, get_settings().chat_history_limit)
        except (asyncpg.PostgresError, OSError, RuntimeError) as exc:
            raise _database_error(exc) from exc
        history = rows_to_chat_messages(history_rows)
        await recent_cache.replace(user.id, conversation_id, history)

    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Message cannot be blank")

    try:
        user_message = await repository.append_message(conversation_id, "user", message)
    except (asyncpg.PostgresError, OSError, RuntimeError) as exc:
        raise _database_error(exc) from exc
    await recent_cache.append(user.id, conversation_id, [ChatMessage(role="user", content=message)])

    graph_result = await run_chat_graph(message, history)
    reply = graph_result.reply

    try:
        assistant_message = await repository.append_message(conversation_id, "assistant", reply)
    except (asyncpg.PostgresError, OSError, RuntimeError) as exc:
        raise _database_error(exc) from exc

    await recent_cache.append(user.id, conversation_id, [ChatMessage(role="assistant", content=reply)])
    return ChatResponse(
        reply=reply,
        user_message=user_message,
        assistant_message=assistant_message,
        recipe_preview=graph_result.recipe_preview,
    )


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: UUID,
    user: AuthenticatedUser = Depends(get_current_user),
):
    try:
        deleted = await repository.delete_conversation(conversation_id, user.id)
    except (asyncpg.PostgresError, OSError, RuntimeError) as exc:
        raise _database_error(exc) from exc
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    await recent_cache.delete(user.id, conversation_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
