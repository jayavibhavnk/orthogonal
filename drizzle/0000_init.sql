-- Orthogonal Chat schema

CREATE TYPE "message_role" AS ENUM ('user', 'assistant', 'system', 'tool');
CREATE TYPE "tool_call_status" AS ENUM ('pending', 'running', 'done', 'error');

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "chats" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "sessions"("id") ON DELETE cascade,
  "title" text DEFAULT 'New chat' NOT NULL,
  "model_id" text DEFAULT 'zai-org/GLM-5.1' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ctx_used_tokens" integer DEFAULT 0 NOT NULL,
  "compacted_at" timestamp with time zone,
  "workflow_run_id" text
);

CREATE INDEX IF NOT EXISTS "chats_session_last_message_idx" ON "chats" ("session_id", "last_message_at");

CREATE TABLE IF NOT EXISTS "messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chat_id" uuid NOT NULL REFERENCES "chats"("id") ON DELETE cascade,
  "role" "message_role" NOT NULL,
  "parts" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "messages_chat_created_idx" ON "messages" ("chat_id", "created_at");

CREATE TABLE IF NOT EXISTS "artifacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chat_id" uuid NOT NULL REFERENCES "chats"("id") ON DELETE cascade,
  "kind" text NOT NULL,
  "source_tool" text,
  "summary" text NOT NULL,
  "payload" jsonb NOT NULL,
  "token_estimate" integer DEFAULT 0 NOT NULL,
  "tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "tool_calls" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "message_id" uuid REFERENCES "messages"("id") ON DELETE set null,
  "chat_id" uuid NOT NULL REFERENCES "chats"("id") ON DELETE cascade,
  "tool_name" text NOT NULL,
  "args" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "result_artifact_id" uuid REFERENCES "artifacts"("id") ON DELETE set null,
  "price_cents" integer,
  "latency_ms" integer,
  "attempts" integer DEFAULT 1 NOT NULL,
  "status" "tool_call_status" DEFAULT 'pending' NOT NULL,
  "error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "api_call_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chat_id" uuid REFERENCES "chats"("id") ON DELETE set null,
  "api" text NOT NULL,
  "path" text NOT NULL,
  "body_hash" text NOT NULL,
  "price_cents" integer,
  "latency_ms" integer,
  "cache_hit" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "api_call_log_body_hash_created_idx" ON "api_call_log" ("body_hash", "created_at");
