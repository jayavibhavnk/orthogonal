-- Auth + pgvector context embeddings

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "chats" ADD COLUMN IF NOT EXISTS "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "chats_user_last_message_idx" ON "chats" ("user_id", "last_message_at");

CREATE TYPE "embedding_source_type" AS ENUM ('message', 'artifact', 'compaction');

CREATE TABLE IF NOT EXISTS "context_embeddings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "chat_id" uuid NOT NULL REFERENCES "chats"("id") ON DELETE CASCADE,
  "source_type" "embedding_source_type" NOT NULL,
  "source_id" uuid NOT NULL,
  "content" text NOT NULL,
  "embedding" vector(1024) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "context_embeddings_chat_idx" ON "context_embeddings" ("chat_id");
CREATE INDEX IF NOT EXISTS "context_embeddings_user_idx" ON "context_embeddings" ("user_id");

CREATE INDEX IF NOT EXISTS "context_embeddings_hnsw_idx"
  ON "context_embeddings"
  USING hnsw ("embedding" vector_cosine_ops);

CREATE UNIQUE INDEX IF NOT EXISTS "context_embeddings_source_unique"
  ON "context_embeddings" ("source_type", "source_id");
