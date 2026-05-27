"use client";

import { useEffect, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { WorkflowChatTransport } from "@workflow/ai";
import type { UIMessage } from "ai";
import { VirtualMessageList } from "@/components/chat/virtual-message-list";
import { Composer } from "@/components/chat/composer";
import { FollowUps } from "@/components/chat/follow-ups";
import {
  assistantHasVisibleContent,
  getLatestContextFromMessages,
} from "@/lib/chat/ui-helpers";
import type { ContextData, FollowUpData } from "@/lib/stream/protocol";

function getFollowUps(messages: UIMessage[]): string[] {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    for (const part of message.parts) {
      if (part.type === "data-followups" && "data" in part) {
        return (part.data as FollowUpData).suggestions;
      }
    }
  }
  return [];
}

export function ChatView({
  chatId,
  initialMessages,
  modelId,
  ctxMax,
  initialCtxUsed = 0,
  onModelCtx,
}: {
  chatId: string;
  initialMessages: UIMessage[];
  modelId: string;
  ctxMax: number;
  initialCtxUsed?: number;
  onModelCtx?: (ctx: { used: number; max: number }) => void;
}) {
  const [input, setInput] = useState("");

  const transport = useMemo(
    () =>
      new WorkflowChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: {
            ...body,
            chatId,
            modelId,
            messages,
          },
        }),
      }),
    [chatId, modelId],
  );

  const applyContext = (ctx: Pick<ContextData, "used" | "max">) => {
    onModelCtx?.({
      used: ctx.used,
      max: ctx.max || ctxMax,
    });
  };

  const { messages, sendMessage, status } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
    onFinish: async ({ messages: finishedMessages }) => {
      const latestCtx = getLatestContextFromMessages(finishedMessages);
      if (latestCtx) {
        applyContext(latestCtx);
      }

      await fetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: finishedMessages }),
      }).catch(() => undefined);
    },
    onData: (dataPart) => {
      if (dataPart.type === "data-ctx" && "data" in dataPart) {
        applyContext(dataPart.data as ContextData);
      }
    },
  });

  useEffect(() => {
    if (initialCtxUsed > 0) {
      applyContext({ used: initialCtxUsed, max: ctxMax });
    }
    // Only seed once on mount for this chat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]);

  useEffect(() => {
    const latestCtx = getLatestContextFromMessages(messages);
    if (latestCtx) {
      applyContext(latestCtx);
    }
  }, [messages, ctxMax]);

  const followUps = getFollowUps(messages);
  const isLoading = status === "streaming" || status === "submitted";

  const lastMessage = messages.at(-1);
  const showStreamingIndicator =
    isLoading &&
    (!lastMessage ||
      lastMessage.role === "user" ||
      (lastMessage.role === "assistant" &&
        !assistantHasVisibleContent(lastMessage)));

  const submit = (text: string) => {
    if (!text.trim()) return;
    sendMessage({ text });
    setInput("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <VirtualMessageList
          messages={messages}
          isLoading={isLoading}
          showStreamingIndicator={showStreamingIndicator}
          onFollowUp={submit}
        />
      </div>

      <div className="border-t bg-background px-6 py-4">
        <div className="mx-auto max-w-3xl space-y-3">
          {!isLoading && followUps.length > 0 && (
            <FollowUps suggestions={followUps} onSelect={submit} />
          )}
          <Composer
            value={input}
            onChange={setInput}
            onSubmit={() => submit(input)}
            disabled={isLoading}
            status={status}
          />
        </div>
      </div>
    </div>
  );
}
