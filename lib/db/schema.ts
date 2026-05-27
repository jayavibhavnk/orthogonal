import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
  "tool",
]);

export const toolCallStatusEnum = pgEnum("tool_call_status", [
  "pending",
  "running",
  "done",
  "error",
]);

export const embeddingSourceTypeEnum = pgEnum("embedding_source_type", [
  "message",
  "artifact",
  "compaction",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const chats = pgTable(
  "chats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New chat"),
    modelId: text("model_id")
      .notNull()
      .default("zai-org/GLM-5.1"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    ctxUsedTokens: integer("ctx_used_tokens").notNull().default(0),
    compactedAt: timestamp("compacted_at", { withTimezone: true }),
    workflowRunId: text("workflow_run_id"),
  },
  (table) => [
    index("chats_session_last_message_idx").on(
      table.sessionId,
      table.lastMessageAt,
    ),
    index("chats_user_last_message_idx").on(
      table.userId,
      table.lastMessageAt,
    ),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    role: messageRoleEnum("role").notNull(),
    parts: jsonb("parts").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("messages_chat_created_idx").on(table.chatId, table.createdAt)],
);

export const artifacts = pgTable("artifacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  sourceTool: text("source_tool"),
  summary: text("summary").notNull(),
  payload: jsonb("payload").notNull(),
  tokenEstimate: integer("token_estimate").notNull().default(0),
  tags: text("tags").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const toolCalls = pgTable("tool_calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id").references(() => messages.id, {
    onDelete: "set null",
  }),
  chatId: uuid("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  toolName: text("tool_name").notNull(),
  args: jsonb("args").notNull().default({}),
  resultArtifactId: uuid("result_artifact_id").references(() => artifacts.id, {
    onDelete: "set null",
  }),
  priceCents: integer("price_cents"),
  latencyMs: integer("latency_ms"),
  attempts: integer("attempts").notNull().default(1),
  status: toolCallStatusEnum("status").notNull().default("pending"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const apiCallLog = pgTable(
  "api_call_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chat_id").references(() => chats.id, { onDelete: "set null" }),
    api: text("api").notNull(),
    path: text("path").notNull(),
    bodyHash: text("body_hash").notNull(),
    priceCents: integer("price_cents"),
    latencyMs: integer("latency_ms"),
    cacheHit: boolean("cache_hit").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("api_call_log_body_hash_created_idx").on(
      table.bodyHash,
      table.createdAt,
    ),
  ],
);

export const contextEmbeddings = pgTable(
  "context_embeddings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    sourceType: embeddingSourceTypeEnum("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("context_embeddings_chat_idx").on(table.chatId),
    index("context_embeddings_user_idx").on(table.userId),
  ],
);

export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Chat = typeof chats.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Artifact = typeof artifacts.$inferSelect;
export type ToolCall = typeof toolCalls.$inferSelect;
