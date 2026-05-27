import { generateText, type ModelMessage } from "ai";
import { togetherModel } from "@/lib/agent/together";
import { COMPACTOR_MODEL_ID } from "@/lib/agent/models";
import { createArtifact } from "@/lib/db/artifacts";
import { getChatUserId } from "@/lib/db/chats";
import { searchSimilarContext } from "@/lib/embeddings";
import { estimateMessagesTokens } from "@/lib/tokens";

export type CompactionStage = "none" | "log" | "snip" | "summarize";

export interface CompactionResult {
  messages: ModelMessage[];
  stage: CompactionStage;
  usedTokens: number;
  maxTokens: number;
}

function fillRatio(used: number, max: number) {
  return used / max;
}

export async function compactIfNeeded(input: {
  chatId: string;
  messages: ModelMessage[];
  maxTokens: number;
}): Promise<CompactionResult> {
  const usedTokens = estimateMessagesTokens(input.messages);
  const ratio = fillRatio(usedTokens, input.maxTokens);

  if (ratio < 0.6) {
    return {
      messages: input.messages,
      stage: "none",
      usedTokens,
      maxTokens: input.maxTokens,
    };
  }

  if (ratio < 0.75) {
    await createArtifact({
      chatId: input.chatId,
      kind: "compaction_snapshot",
      summary: `Compaction log at ${Math.round(ratio * 100)}% context fill`,
      payload: { messageCount: input.messages.length, usedTokens },
      tags: ["compaction", "log"],
    });

    return {
      messages: input.messages,
      stage: "log",
      usedTokens,
      maxTokens: input.maxTokens,
    };
  }

  if (ratio < 0.85) {
    const snipped = input.messages.map((message, index) => {
      if (index >= input.messages.length - 6) return message;
      if (message.role !== "tool") return message;
      return {
        ...message,
        content: [
          {
            type: "text" as const,
            text: "[snipped tool output — see artifact references in prior assistant messages]",
          },
        ],
      };
    }) as ModelMessage[];

    return {
      messages: snipped,
      stage: "snip",
      usedTokens: estimateMessagesTokens(snipped),
      maxTokens: input.maxTokens,
    };
  }

  const recent = input.messages.slice(-8);
  const older = input.messages.slice(0, -8);

  const userId = await getChatUserId(input.chatId);
  let vectorContext = "";
  if (userId && older.length > 0) {
    const lastUser = [...older]
      .reverse()
      .find((message) => message.role === "user");
    const queryText =
      typeof lastUser?.content === "string"
        ? lastUser.content
        : JSON.stringify(lastUser?.content ?? "").slice(0, 500);

    if (queryText.trim()) {
      const hits = await searchSimilarContext({
        userId,
        chatId: input.chatId,
        query: queryText,
        limit: 6,
      });
      if (hits.length > 0) {
        vectorContext = hits
          .map(
            (hit) =>
              `[${hit.sourceType}:${hit.sourceId}] (sim ${hit.similarity.toFixed(2)})\n${hit.content.slice(0, 1200)}`,
          )
          .join("\n\n");
      }
    }
  }

  const summary = older.length
    ? (
        await generateText({
          model: togetherModel(COMPACTOR_MODEL_ID),
          prompt: `Summarize this conversation history for an AI planner. Preserve user goals, decisions, key facts, artifact IDs, API choices, and unresolved tasks. Be concise.
${vectorContext ? `\nRelevant retrieved context:\n${vectorContext}\n` : ""}
${JSON.stringify(older, null, 2)}`,
        })
      ).text
    : "";

  const compactedMessages: ModelMessage[] = [
    {
      role: "system",
      content: `<previous_context>\n${summary}\n</previous_context>`,
    },
    ...recent,
  ];

  await createArtifact({
    chatId: input.chatId,
    kind: "compaction_snapshot",
    summary: "Full conversation compaction summary",
    payload: { summary, preservedMessages: recent.length },
    tags: ["compaction", "summarize"],
  });

  return {
    messages: compactedMessages,
    stage: "summarize",
    usedTokens: estimateMessagesTokens(compactedMessages),
    maxTokens: input.maxTokens,
  };
}
