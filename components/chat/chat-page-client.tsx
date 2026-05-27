"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { UIMessage } from "ai";
import { Sidebar } from "@/components/sidebar";
import { ChatView } from "@/components/chat/chat-view";
import {
  DEFAULT_MODEL_ID,
  getModelConfig,
  MODEL_CATALOG,
  type ModelConfig,
} from "@/lib/agent/models";

type ChatRecord = {
  id: string;
  title: string;
  modelId: string;
  lastMessageAt: string;
  ctxUsedTokens?: number;
};

type DbMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  parts: UIMessage["parts"];
};

export function ChatPageClient({
  chatId,
  userEmail,
  initialChat,
  initialMessages,
}: {
  chatId: string;
  userEmail: string;
  initialChat: ChatRecord;
  initialMessages: DbMessage[];
}) {
  const [chats, setChats] = useState<ChatRecord[]>([initialChat]);
  const [modelId, setModelId] = useState(initialChat.modelId || DEFAULT_MODEL_ID);
  const [ctxUsed, setCtxUsed] = useState(initialChat.ctxUsedTokens ?? 0);
  const [models] = useState<ModelConfig[]>(MODEL_CATALOG);

  const ctxMax = useMemo(
    () => getModelConfig(modelId).contextWindow,
    [modelId],
  );

  useEffect(() => {
    fetch("/api/chats")
      .then((res) => res.json())
      .then((data) => setChats(data.chats ?? []))
      .catch(() => undefined);
  }, [chatId]);

  useEffect(() => {
    fetch(`/api/chats/${chatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId }),
    }).catch(() => undefined);
  }, [chatId, modelId]);

  const uiMessages: UIMessage[] = initialMessages
    .filter((message) => message.role !== "tool")
    .map((message) => ({
      id: message.id,
      role: message.role as "user" | "assistant" | "system",
      parts: message.parts,
    }));

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        chats={chats}
        models={models}
        selectedModelId={modelId}
        onModelChange={setModelId}
        ctxUsed={ctxUsed}
        ctxMax={ctxMax}
        userEmail={userEmail}
      />
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/chat/new" className="text-muted-foreground hover:text-foreground">
              <ChevronLeft className="size-4" />
            </Link>
            <h1 className="text-sm font-medium">{initialChat.title}</h1>
          </div>
          <div className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
            Recent · {chats.length}
          </div>
        </header>
        <ChatView
          chatId={chatId}
          initialMessages={uiMessages}
          modelId={modelId}
          ctxMax={ctxMax}
          initialCtxUsed={initialChat.ctxUsedTokens ?? 0}
          onModelCtx={({ used, max }) => {
            setCtxUsed(used);
            if (max !== ctxMax) {
              // max tracks selected model via ctxMax prop
            }
          }}
        />
      </main>
    </div>
  );
}
