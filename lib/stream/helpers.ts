import { getWritable } from "workflow";
import type { UIMessageChunk } from "ai";
import {
  STREAM_DATA_TYPES,
  type ArtifactData,
  type ContextData,
  type FollowUpData,
  type PlanCardData,
  type RetryData,
  type ThinkingData,
  type ToolCallData,
} from "@/lib/stream/protocol";

async function writeDataPart<T>(type: string, data: T, id?: string) {
  "use step";
  const writable = getWritable<UIMessageChunk>();
  const writer = writable.getWriter();
  try {
    await writer.write({
      type,
      id: id ?? crypto.randomUUID(),
      data,
    } as UIMessageChunk);
  } finally {
    writer.releaseLock();
  }
}

export async function emitPlanCard(data: PlanCardData) {
  "use step";
  await writeDataPart(STREAM_DATA_TYPES.planCard, data);
}

export async function emitToolCall(data: ToolCallData) {
  "use step";
  await writeDataPart(STREAM_DATA_TYPES.toolCall, data, data.name);
}

export async function emitRetry(data: RetryData) {
  "use step";
  await writeDataPart(STREAM_DATA_TYPES.retry, data);
}

export async function emitArtifact(data: ArtifactData) {
  "use step";
  await writeDataPart(STREAM_DATA_TYPES.artifact, data, data.id);
}

export async function emitContext(data: ContextData) {
  "use step";
  const writable = getWritable<UIMessageChunk>();
  const writer = writable.getWriter();
  try {
    await writer.write({
      type: STREAM_DATA_TYPES.ctx,
      id: "ctx",
      data,
      transient: true,
    } as UIMessageChunk);
  } finally {
    writer.releaseLock();
  }
}

export async function emitFollowUps(data: FollowUpData) {
  "use step";
  await writeDataPart(STREAM_DATA_TYPES.followups, data, "followups");
}

export async function emitThinking(data: ThinkingData) {
  "use step";
  await writeDataPart(STREAM_DATA_TYPES.thinking, data, "thinking");
}
