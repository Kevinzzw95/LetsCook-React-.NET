CREATE EXTENSION IF NOT EXISTS vector;
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
                    
CREATE TABLE IF NOT EXISTS "RecipeEmbeddingSyncState" (
    "CollectionName" text PRIMARY KEY,
    "ContentHashes" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "UpdatedAt" timestamptz NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS langchain_pg_collection (
    uuid uuid PRIMARY KEY,
    name varchar NOT NULL UNIQUE,
    cmetadata json
);
CREATE TABLE IF NOT EXISTS langchain_pg_embedding (
    id varchar PRIMARY KEY,
    collection_id uuid REFERENCES langchain_pg_collection(uuid) ON DELETE CASCADE,
    embedding vector(__DIMENSIONS__),
    document varchar,
    cmetadata jsonb
);
CREATE INDEX IF NOT EXISTS ix_cmetadata_gin ON langchain_pg_embedding USING gin (cmetadata jsonb_path_ops);
