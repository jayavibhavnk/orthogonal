import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { artifacts } from "@/lib/db/schema";
import { estimateTokens } from "@/lib/tokens";
import { safeStoreEmbedding } from "@/lib/embeddings";
import { getChatUserId } from "@/lib/db/chats";

export async function createArtifact(input: {
  chatId: string;
  kind: string;
  sourceTool?: string;
  summary: string;
  payload: unknown;
  tags?: string[];
}) {
  const tokenEstimate = estimateTokens(JSON.stringify(input.payload));
  const [artifact] = await db
    .insert(artifacts)
    .values({
      chatId: input.chatId,
      kind: input.kind,
      sourceTool: input.sourceTool,
      summary: input.summary.slice(0, 500),
      payload: input.payload,
      tokenEstimate,
      tags: input.tags ?? [],
    })
    .returning();

  const userId = await getChatUserId(input.chatId);
  if (userId) {
    const payloadPreview = JSON.stringify(input.payload).slice(0, 4000);
    await safeStoreEmbedding({
      userId,
      chatId: input.chatId,
      sourceType: input.kind === "compaction_snapshot" ? "compaction" : "artifact",
      sourceId: artifact.id,
      content: `${input.summary}\n${payloadPreview}`,
    });
  }

  return artifact;
}

export async function getArtifact(id: string) {
  return db.query.artifacts.findFirst({ where: eq(artifacts.id, id) });
}

export async function getArtifactForChat(id: string, chatId: string) {
  return db.query.artifacts.findFirst({
    where: (a, { and, eq: eqFn }) => and(eqFn(a.id, id), eqFn(a.chatId, chatId)),
  });
}

function getByPath(obj: unknown, path?: string): unknown {
  if (!path) return obj;
  const normalized = path.startsWith("$.") ? path.slice(2) : path;
  const segments = normalized.split(".").flatMap((s) => {
    const match = s.match(/^([^\[]+)(?:\[(\*|\d+)\])?$/);
    if (!match) return [s];
    const [, key, index] = match;
    return index ? [key, index] : [key];
  });

  let current: unknown = obj;
  for (const segment of segments) {
    if (current == null) return null;
    if (segment === "*") {
      if (!Array.isArray(current)) return null;
      return current;
    }
    if (Array.isArray(current)) {
      const idx = Number(segment);
      current = Number.isNaN(idx) ? null : current[idx];
      continue;
    }
    if (typeof current === "object") {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return null;
    }
  }
  return current;
}

export async function readArtifactSlice(
  id: string,
  chatId: string,
  jsonPath?: string,
) {
  const artifact = await getArtifactForChat(id, chatId);
  if (!artifact) return null;
  return {
    id: artifact.id,
    summary: artifact.summary,
    data: getByPath(artifact.payload, jsonPath),
  };
}
