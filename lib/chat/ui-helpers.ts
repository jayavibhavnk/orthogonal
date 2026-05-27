import type { UIMessage } from "ai";
import type { ContextData } from "@/lib/stream/protocol";

export function getLatestContextFromMessages(
  messages: UIMessage[],
): ContextData | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    for (let j = message.parts.length - 1; j >= 0; j -= 1) {
      const part = message.parts[j];
      if (part.type === "data-ctx" && "data" in part) {
        return part.data as ContextData;
      }
    }
  }
  return null;
}

export function assistantHasVisibleContent(message: UIMessage): boolean {
  for (const part of message.parts) {
    if (part.type === "text" && "text" in part && part.text?.trim()) {
      return true;
    }
    if (part.type === "data-thinking" && "data" in part) {
      return true;
    }
    if (part.type === "data-tool-call" && "data" in part) {
      return true;
    }
    if (part.type === "data-plan-card" && "data" in part) {
      return true;
    }
    if (part.type === "data-artifact" && "data" in part) {
      return true;
    }
  }
  return false;
}
