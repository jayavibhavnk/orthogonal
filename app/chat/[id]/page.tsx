import { notFound, redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getOrCreateSessionId } from "@/lib/session";
import {
  getChatForOwner,
  getMessagesForChat,
} from "@/lib/db/chats";
import { ChatPageClient } from "@/components/chat/chat-page-client";
import type { UIMessage } from "ai";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const sessionId = await getOrCreateSessionId();
  const { id } = await params;

  const chat = await getChatForOwner(id, sessionId, user.id);
  if (!chat) notFound();

  const messages = await getMessagesForChat(id);

  return (
    <ChatPageClient
      chatId={chat.id}
      userEmail={user.email}
      initialChat={{
        id: chat.id,
        title: chat.title,
        modelId: chat.modelId,
        lastMessageAt: chat.lastMessageAt.toISOString(),
        ctxUsedTokens: chat.ctxUsedTokens,
      }}
      initialMessages={messages.map((message) => ({
        id: message.id,
        role: message.role,
        parts: message.parts as UIMessage["parts"],
      }))}
    />
  );
}
