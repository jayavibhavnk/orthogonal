import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { messages } from "@/lib/db/schema";
import { getChatUserId, saveMessage } from "@/lib/db/chats";
import { extractTextFromParts, safeStoreEmbedding } from "@/lib/embeddings";
import type { UIMessage } from "ai";

async function indexAssistantMessage(
  chatId: string,
  messageId: string,
  parts: unknown[],
) {
  const userId = await getChatUserId(chatId);
  if (!userId) return;
  const text = extractTextFromParts(parts);
  if (!text) return;
  await safeStoreEmbedding({
    userId,
    chatId,
    sourceType: "message",
    sourceId: messageId,
    content: `[assistant] ${text}`,
  });
}

export async function persistAssistantMessage(
  chatId: string,
  uiMessages: UIMessage[],
) {
  const lastAssistant = [...uiMessages]
    .reverse()
    .find((message) => message.role === "assistant");

  if (!lastAssistant) return null;

  const [lastUserRow, lastAssistantRow] = await Promise.all([
    db.query.messages.findFirst({
      where: (m, { and, eq: eqFn }) =>
        and(eqFn(m.chatId, chatId), eqFn(m.role, "user")),
      orderBy: [desc(messages.createdAt)],
    }),
    db.query.messages.findFirst({
      where: (m, { and, eq: eqFn }) =>
        and(eqFn(m.chatId, chatId), eqFn(m.role, "assistant")),
      orderBy: [desc(messages.createdAt)],
    }),
  ]);

  // Same turn: assistant row already exists for this user message → update in place.
  if (
    lastAssistantRow &&
    lastUserRow &&
    lastAssistantRow.createdAt >= lastUserRow.createdAt
  ) {
    const [updated] = await db
      .update(messages)
      .set({ parts: lastAssistant.parts ?? [] })
      .where(eq(messages.id, lastAssistantRow.id))
      .returning();
    await indexAssistantMessage(
      chatId,
      updated.id,
      lastAssistant.parts ?? [],
    );
    return updated;
  }

  const saved = await saveMessage(
    chatId,
    "assistant",
    lastAssistant.parts ?? [],
  );
  return saved;
}
