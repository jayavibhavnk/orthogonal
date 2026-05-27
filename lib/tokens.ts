import { getEncoding } from "js-tiktoken";

const encoder = getEncoding("cl100k_base");

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return encoder.encode(text).length;
}

export function estimateMessagesTokens(messages: unknown[]): number {
  return estimateTokens(JSON.stringify(messages));
}

export function contextFillPercent(used: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.round((used / max) * 100));
}
