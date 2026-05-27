import { generateText, tool, type ToolSet } from "ai";
import { z } from "zod";
import { discoverEndpoint } from "@/lib/agent/discover";
import { togetherModel } from "@/lib/agent/together";
import { EXECUTOR_MODEL_ID } from "@/lib/agent/models";
import { EXECUTE_SYSTEM_PROMPT } from "@/lib/agent/system-prompts";
import { orthDetails, orthRun } from "@/lib/orthogonal/client";
import { createArtifact, readArtifactSlice } from "@/lib/db/artifacts";
import { generateFollowUps } from "@/lib/agent/follow-ups";

async function discoverSubAgentStep(need: string, chatId: string) {
  "use step";
  const result = await discoverEndpoint(need, chatId);
  return JSON.stringify(result);
}

async function executeSubAgentStep(input: {
  api: string;
  path: string;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
  chatId: string;
}) {
  "use step";
  const response = await orthRun(
    {
      api: input.api,
      path: input.path,
      body: input.body,
      query: input.query,
    },
    { chatId: input.chatId },
  );

  if (!response.ok) {
    return JSON.stringify({
      ok: false,
      error: response.error,
      errorCode: response.errorCode,
      attempts: response.attempts,
      hint: "Check spawn_discover output for correct body schema. Fundable financing_types need [{type:'SERIES_A'}] objects.",
    });
  }

  const payload = response.data ?? {};
  const payloadText = JSON.stringify(payload);
  const artifact = await createArtifact({
    chatId: input.chatId,
    kind: "tool_result",
    sourceTool: `${input.api}${input.path}`,
    summary: `Stored ${input.api}${input.path} result (${payloadText.length} bytes)`,
    payload,
    tags: [input.api, input.path],
  });

  const { emitArtifact } = await import("@/lib/stream/helpers");
  await emitArtifact({
    id: artifact.id,
    summary: artifact.summary,
    tokenEstimate: artifact.tokenEstimate,
  });

  const summary = await generateText({
    model: togetherModel(EXECUTOR_MODEL_ID),
    system: EXECUTE_SYSTEM_PROMPT,
    prompt: `Summarize this API result for the planner. Include every company/entity with name, funding amount, date, and location when present. Keep under 800 words.

API: ${input.api}${input.path}
Price: ${response.priceCents ?? 0} cents
Request ID: ${response.requestId}
Payload:
${payloadText.slice(0, 12000)}`,
  });

  return JSON.stringify({
    ok: true,
    summary: summary.text,
    artifact_id: artifact.id,
    price_cents: response.priceCents ?? 0,
    request_id: response.requestId,
    cache_hit: response.cacheHit,
    latency_ms: response.latencyMs,
  });
}

async function readArtifactStep(
  chatId: string,
  id: string,
  jsonpath?: string,
) {
  "use step";
  const slice = await readArtifactSlice(id, chatId, jsonpath);
  return slice ?? { error: "Artifact not found" };
}

async function endpointDetailsStep(api: string, path: string, chatId: string) {
  "use step";
  const details = await orthDetails(api, path, { chatId });
  return JSON.stringify(details.data ?? details);
}

async function proposePlanStep(plan: {
  feasibility: string;
  process: string;
  costCents: number;
  sampleOutput?: string;
}) {
  "use step";
  const { emitPlanCard } = await import("@/lib/stream/helpers");
  await emitPlanCard({
    ...plan,
    sampleOutput: plan.sampleOutput ?? "Live results will appear after execution.",
  });
  return { accepted: true, continue: "Call spawn_execute next with discovered params." };
}

export async function followUpsStep(answer: string) {
  "use step";
  const suggestions = await generateFollowUps(answer);
  const { emitFollowUps } = await import("@/lib/stream/helpers");
  await emitFollowUps({ suggestions });
  return suggestions;
}

async function searchContextStep(
  chatId: string,
  userId: string,
  query: string,
  limit: number,
) {
  "use step";
  const { searchSimilarContext } = await import("@/lib/embeddings");
  const hits = await searchSimilarContext({ userId, chatId, query, limit });
  return JSON.stringify({ hits });
}

export type PlannerToolContext = {
  chatId: string;
  userId: string;
};

export function buildPlannerTools(ctx: PlannerToolContext): ToolSet {
  return {
    spawn_discover: tool({
      description:
        "Discovery sub-agent: searches the Orthogonal catalog and returns exact api, path, body, query, and cost estimate as JSON. Always call this before spawn_execute.",
      inputSchema: z.object({ need: z.string() }),
      execute: async ({ need }) => discoverSubAgentStep(need, ctx.chatId),
    }),
    spawn_execute: tool({
      description:
        "Execution sub-agent: runs an Orthogonal endpoint with real params from spawn_discover, stores results, returns summary with request_id. Required for every data question.",
      inputSchema: z.object({
        api: z.string(),
        path: z.string(),
        body: z.record(z.string(), z.unknown()).optional(),
        query: z.record(z.string(), z.unknown()).optional(),
      }),
      execute: async ({ api, path, body, query }) =>
        executeSubAgentStep({ api, path, body, query, chatId: ctx.chatId }),
    }),
    get_endpoint_details: tool({
      description: "Fetch full request schema for an api/path before executing",
      inputSchema: z.object({
        api: z.string(),
        path: z.string(),
      }),
      execute: async ({ api, path }) =>
        endpointDetailsStep(api, path, ctx.chatId),
    }),
    read_artifact: tool({
      description: "Read a stored artifact or JSON path slice",
      inputSchema: z.object({
        id: z.string(),
        jsonpath: z.string().optional(),
      }),
      execute: async ({ id, jsonpath }) =>
        readArtifactStep(ctx.chatId, id, jsonpath),
    }),
    search_context: tool({
      description:
        "Semantic search over prior messages, artifacts, and compaction notes in this chat. Use when context is large or you need earlier facts.",
      inputSchema: z.object({
        query: z.string(),
        limit: z.number().min(1).max(10).optional(),
      }),
      execute: async ({ query, limit }) =>
        searchContextStep(ctx.chatId, ctx.userId, query, limit ?? 5),
    }),
    propose_plan: tool({
      description:
        "Optional: show a brief plan card to the user. Does NOT execute anything — you must still call spawn_execute immediately after.",
      inputSchema: z.object({
        feasibility: z.string(),
        process: z.string(),
        cost_cents: z.number(),
        sample_output: z.string().optional(),
      }),
      execute: async ({ feasibility, process, cost_cents, sample_output }) =>
        proposePlanStep({
          feasibility,
          process,
          costCents: cost_cents,
          sampleOutput: sample_output,
        }),
    }),
    generate_followups: tool({
      description: "Generate 4 follow-up suggestions after the final answer",
      inputSchema: z.object({ answer_so_far: z.string() }),
      execute: async ({ answer_so_far }) => followUpsStep(answer_so_far),
    }),
  };
}
