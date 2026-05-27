import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { chats, messages } from "@/lib/db/schema";
import { DEFAULT_MODEL_ID } from "@/lib/agent/models";
import {
  extractTextFromParts,
  safeStoreEmbedding,
} from "@/lib/embeddings";

export async function createChat(
  sessionId: string,
  modelId = DEFAULT_MODEL_ID,
  userId?: string | null,
) {
  const [chat] = await db
    .insert(chats)
    .values({ sessionId, modelId, userId: userId ?? undefined })
    .returning();
  return chat;
}

export async function getChatForSession(chatId: string, sessionId: string) {
  return db.query.chats.findFirst({
    where: (c, { and: andFn, eq: eqFn }) =>
      andFn(eqFn(c.id, chatId), eqFn(c.sessionId, sessionId)),
  });
}

export async function getChatForOwner(
  chatId: string,
  sessionId: string,
  userId: string,
) {
  return db.query.chats.findFirst({
    where: (c, { and: andFn, eq: eqFn, or: orFn }) =>
      andFn(
        eqFn(c.id, chatId),
        orFn(eqFn(c.userId, userId), eqFn(c.sessionId, sessionId)),
      ),
  });
}

export async function listChatsForSession(sessionId: string) {
  return db.query.chats.findMany({
    where: eq(chats.sessionId, sessionId),
    orderBy: [desc(chats.lastMessageAt)],
  });
}

export async function listChatsForUser(userId: string) {
  return db.query.chats.findMany({
    where: eq(chats.userId, userId),
    orderBy: [desc(chats.lastMessageAt)],
  });
}

export async function listChatsForOwner(sessionId: string, userId: string) {
  return listChatsForUser(userId);
}

export async function updateChat(
  chatId: string,
  data: Partial<{
    title: string;
    modelId: string;
    ctxUsedTokens: number;
    compactedAt: Date;
    workflowRunId: string;
    lastMessageAt: Date;
  }>,
) {
  const [updated] = await db
    .update(chats)
    .set({ ...data, lastMessageAt: data.lastMessageAt ?? new Date() })
    .where(eq(chats.id, chatId))
    .returning();
  return updated;
}

export async function deleteChat(chatId: string) {
  await db.delete(chats).where(eq(chats.id, chatId));
}

export async function getMessagesForChat(chatId: string) {
  return db.query.messages.findMany({
    where: eq(messages.chatId, chatId),
    orderBy: [messages.createdAt],
  });
}

async function indexMessageIfNeeded(
  chatId: string,
  messageId: string,
  role: string,
  parts: unknown[],
) {
  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
  });
  if (!chat?.userId) return;

  const text = extractTextFromParts(parts);
  if (!text) return;

  await safeStoreEmbedding({
    userId: chat.userId,
    chatId,
    sourceType: "message",
    sourceId: messageId,
    content: `[${role}] ${text}`,
  });
}

export async function saveMessage(
  chatId: string,
  role: "user" | "assistant" | "system" | "tool",
  parts: unknown[],
) {
  const [message] = await db
    .insert(messages)
    .values({ chatId, role, parts })
    .returning();

  await updateChat(chatId, { lastMessageAt: new Date() });
  await indexMessageIfNeeded(chatId, message.id, role, parts);
  return message;
}

export async function replaceMessagesForChat(
  chatId: string,
  newMessages: Array<{
    role: "user" | "assistant" | "system" | "tool";
    parts: unknown[];
  }>,
) {
  await db.delete(messages).where(eq(messages.chatId, chatId));
  if (newMessages.length === 0) return [];
  return db
    .insert(messages)
    .values(newMessages.map((m) => ({ chatId, ...m })))
    .returning();
}

export async function getChatUserId(chatId: string) {
  const chat = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
    columns: { userId: true },
  });
  return chat?.userId ?? null;
}
