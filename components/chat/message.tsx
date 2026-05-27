"use client";

import type { ReactNode } from "react";
import { PlanCard } from "@/components/chat/plan-card";
import {
  MarkdownContent,
  mergeAssistantTextParts,
} from "@/components/chat/markdown-content";
import { ThinkingBlock } from "@/components/chat/thinking-block";
import { StreamingIndicator } from "@/components/chat/streaming-indicator";
import {
  ArtifactChip,
  RetryBanner,
  ToolPill,
} from "@/components/chat/tool-pill";
import type {
  ArtifactData,
  ContextData,
  PlanCardData,
  RetryData,
  ThinkingData,
  ToolCallData,
} from "@/lib/stream/protocol";
import type { UIMessage } from "ai";

function isDataPart<T>(
  part: UIMessage["parts"][number],
  type: string,
): part is UIMessage["parts"][number] & { data: T } {
  return part.type === type;
}

function shouldSkipPart(part: UIMessage["parts"][number]) {
  if (part.type === "data-thinking") return true;
  if (part.type === "data-followups") return true;
  if (
    part.type === "data-tool-call" &&
    "data" in part &&
    (part.data as ToolCallData).name === "generate_followups"
  ) {
    return true;
  }
  if (part.type === "data-ctx") return true;
  return false;
}

function renderInlinePart(
  part: UIMessage["parts"][number],
  key: string,
) {
  if (isDataPart<ThinkingData>(part, "data-thinking")) {
    return null;
  }

  if (isDataPart<PlanCardData>(part, "data-plan-card")) {
    return <PlanCard key={key} plan={part.data} />;
  }

  if (isDataPart<ToolCallData>(part, "data-tool-call")) {
    return <ToolPill key={key} data={part.data} />;
  }

  if (isDataPart<RetryData>(part, "data-retry")) {
    return (
      <RetryBanner
        key={key}
        tool={part.data.tool}
        attempt={part.data.attempt}
        reason={part.data.reason}
      />
    );
  }

  if (isDataPart<ArtifactData>(part, "data-artifact")) {
    return (
      <ArtifactChip key={key} id={part.data.id} summary={part.data.summary} />
    );
  }

  return null;
}

export function Message({
  message,
  isStreaming = false,
}: {
  message: UIMessage;
  onFollowUp?: (text: string) => void;
  isStreaming?: boolean;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    const text = message.parts
      .filter((part) => part.type === "text")
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("\n");
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-3 text-sm">
          <p>{text}</p>
        </div>
      </div>
    );
  }

  const thinkingParts = message.parts.filter(
    (part): part is UIMessage["parts"][number] & { data: ThinkingData } =>
      part.type === "data-thinking" && "data" in part,
  );
  const latestThinking = thinkingParts.at(-1)?.data;

  const mergedText = mergeAssistantTextParts(message.parts);
  const blocks: ReactNode[] = [];

  if (latestThinking) {
    blocks.push(
      <ThinkingBlock
        key={`${message.id}-thinking`}
        data={latestThinking}
        defaultOpen={isStreaming || latestThinking.status === "streaming"}
      />,
    );
  }
  let textBuffer: UIMessage["parts"] = [];

  const flushText = () => {
    if (textBuffer.length === 0) return;
    const text = mergeAssistantTextParts(textBuffer);
    textBuffer = [];
    if (text) {
      blocks.push(
        <MarkdownContent
          key={`text-${blocks.length}`}
          text={text}
          isStreaming={isStreaming}
        />,
      );
    }
  };

  for (const [index, part] of message.parts.entries()) {
    if (shouldSkipPart(part)) continue;

    if (part.type === "text") {
      textBuffer.push(part);
      continue;
    }

    flushText();
    const rendered = renderInlinePart(part, `${message.id}-${index}`);
    if (rendered) blocks.push(rendered);
  }

  flushText();

  if (blocks.length === 0 && mergedText) {
    blocks.push(
      <MarkdownContent key="text-final" text={mergedText} isStreaming={isStreaming} />,
    );
  }

  if (blocks.length === 0 && isStreaming) {
    blocks.push(<StreamingIndicator key="inline-streaming" className="max-w-md" />);
  }

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-none space-y-4">{blocks}</div>
    </div>
  );
}
