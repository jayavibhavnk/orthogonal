import { DurableAgent } from "@workflow/ai/agent";
import { convertToModelMessages, type UIMessage, type UIMessageChunk } from "ai";
import { getWritable } from "workflow";
import { compactIfNeeded } from "@/lib/agent/compactor";
import { getModelConfig } from "@/lib/agent/models";
import { PLANNER_SYSTEM_PROMPT } from "@/lib/agent/system-prompts";
import { together } from "@/lib/agent/workflow-together";
import { buildPlannerTools } from "@/lib/agent/subagents";
import { updateChat } from "@/lib/db/chats";
import { estimateMessagesTokens } from "@/lib/tokens";
import {
  emitContext,
  emitThinking,
  emitToolCall,
} from "@/lib/stream/helpers";
import { contextFillPercent } from "@/lib/tokens";

function getLastUserText(messages: UIMessage[]) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== "user") continue;
    const text = message.parts
      .filter((part) => part.type === "text")
      .map((part) => (part.type === "text" ? part.text : ""))
      .join(" ")
      .trim();
    if (text) return text;
  }
  return "";
}

export async function chatWorkflow(input: {
  chatId: string;
  userId: string;
  modelId: string;
  messages: UIMessage[];
}) {
  "use workflow";

  const modelConfig = getModelConfig(input.modelId);
  const modelMessages = await convertToModelMessages(input.messages);
  const compacted = await compactIfNeeded({
    chatId: input.chatId,
    messages: modelMessages,
    maxTokens: modelConfig.contextWindow,
  });

  await emitContext({
    used: compacted.usedTokens,
    max: compacted.maxTokens,
    modelId: input.modelId,
    fillPercent: contextFillPercent(compacted.usedTokens, compacted.maxTokens),
  });

  const userText = getLastUserText(input.messages);
  await emitThinking({
    text: userText
      ? `Understanding your question and planning API calls for: "${userText.slice(0, 140)}${userText.length > 140 ? "…" : ""}"`
      : "Understanding your question and planning the best API calls.",
    status: "streaming",
  });

  const writable = getWritable<UIMessageChunk>();

  const agent = new DurableAgent({
    model: together(input.modelId),
    instructions: PLANNER_SYSTEM_PROMPT,
    tools: buildPlannerTools({ chatId: input.chatId, userId: input.userId }),
  });

  const result = await agent.stream({
    messages: compacted.messages,
    writable,
    maxSteps: 40,
    onStepFinish: async ({ toolCalls, text }) => {
      if (typeof text === "string" && text.trim()) {
        await emitThinking({ text: text.trim(), status: "streaming" });
      }
      for (const call of toolCalls ?? []) {
        await emitToolCall({
          name: call.toolName,
          label: formatToolLabel(call.toolName, call.input),
          status: "done",
        });
      }
    },
  });

  await emitThinking({
    text: "Research complete. Composing final answer.",
    status: "done",
  });

  const finalUsedTokens = estimateMessagesTokens(result.messages);
  await emitContext({
    used: finalUsedTokens,
    max: compacted.maxTokens,
    modelId: input.modelId,
    fillPercent: contextFillPercent(finalUsedTokens, compacted.maxTokens),
  });

  const lastAssistant = [...result.messages]
    .reverse()
    .find((message) => message.role === "assistant");

  await updateChat(input.chatId, {
    ctxUsedTokens: finalUsedTokens,
    compactedAt: compacted.stage === "summarize" ? new Date() : undefined,
  });

  return result.messages;
}

function formatToolLabel(name: string, input: unknown) {
  const value = input as Record<string, unknown> | undefined;
  switch (name) {
    case "spawn_discover":
      return "Searched the API catalog";
    case "get_endpoint_details":
      return value?.api
        ? `Loaded schema for ${value.api}${value.path ?? ""}`
        : "Loaded endpoint schema";
    case "spawn_execute":
      return value?.api
        ? `Called ${value.api}${value.path ?? ""}`
        : "Called Orthogonal API";
    case "read_artifact":
      return "Read stored artifact";
    case "search_context":
      return "Searched conversation memory";
    case "propose_plan":
      return "Prepared execution plan";
    case "generate_followups":
      return "Generated follow-ups";
    default:
      return name;
  }
}
