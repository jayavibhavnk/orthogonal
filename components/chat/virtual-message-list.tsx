"use client";

import { useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { UIMessage } from "ai";
import { Message } from "@/components/chat/message";
import { StreamingIndicator } from "@/components/chat/streaming-indicator";

export function VirtualMessageList({
  messages,
  isLoading,
  showStreamingIndicator,
  onFollowUp,
}: {
  messages: UIMessage[];
  isLoading: boolean;
  showStreamingIndicator: boolean;
  onFollowUp: (text: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const tailRef = useRef<HTMLDivElement>(null);

  const itemCount = messages.length + (showStreamingIndicator ? 1 : 0);

  const virtualizer = useVirtualizer({
    count: itemCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 240,
    overscan: 4,
    measureElement: (element) => element.getBoundingClientRect().height,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [messages, showStreamingIndicator, virtualizer]);

  useEffect(() => {
    if (itemCount === 0) return;
    tailRef.current?.scrollIntoView({
      behavior: isLoading ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, isLoading, showStreamingIndicator, itemCount, virtualizer.getTotalSize()]);

  return (
    <div
      ref={parentRef}
      className="h-full overflow-y-auto px-6 py-6 [scrollbar-gutter:stable]"
    >
      <div
        className="relative mx-auto w-full max-w-3xl"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const isStreamingRow = showStreamingIndicator && item.index === itemCount - 1;
          if (isStreamingRow) {
            return (
              <div
                key="streaming-indicator"
                data-index={item.index}
                ref={virtualizer.measureElement}
                className="absolute left-0 top-0 w-full pb-6"
                style={{ transform: `translateY(${item.start}px)` }}
              >
                <StreamingIndicator label="Working on your request" />
              </div>
            );
          }

          const message = messages[item.index];
          const isLastAssistant =
            isLoading &&
            item.index === messages.length - 1 &&
            message.role === "assistant";

          return (
            <div
              key={message.id}
              data-index={item.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full pb-6"
              style={{ transform: `translateY(${item.start}px)` }}
            >
              <Message
                message={message}
                onFollowUp={onFollowUp}
                isStreaming={isLastAssistant}
              />
            </div>
          );
        })}
      </div>
      <div ref={tailRef} className="h-px" aria-hidden />
    </div>
  );
}
