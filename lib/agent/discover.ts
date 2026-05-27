import { generateObject } from "ai";
import { z } from "zod";
import { togetherModel } from "@/lib/agent/together";
import { EXECUTOR_MODEL_ID } from "@/lib/agent/models";
import { DISCOVER_SYSTEM_PROMPT } from "@/lib/agent/system-prompts";
import { orthDetails, orthSearch } from "@/lib/orthogonal/client";

type SearchApiResult = {
  slug: string;
  name: string;
  endpoints?: Array<{
    path: string;
    method?: string;
    description?: string;
    score?: number;
    verified?: boolean;
  }>;
};

const discoverySchema = z.object({
  api: z.string(),
  path: z.string(),
  body: z.record(z.string(), z.unknown()).optional(),
  query: z.record(z.string(), z.unknown()).optional(),
  rationale: z.string(),
  cost_cents_estimate: z.number(),
});

export async function discoverEndpoint(need: string, chatId: string) {
  const search = await orthSearch(need, 8, { chatId });
  if (!search.ok) {
    return {
      ok: false as const,
      error: search.error ?? "Search failed",
    };
  }

  const raw = search.data as {
    results?: SearchApiResult[];
    apis?: SearchApiResult[];
  };
  const apis = raw.results ?? raw.apis ?? [];
  if (apis.length === 0) {
    return { ok: false as const, error: "No matching APIs in catalog" };
  }

  const topApi = apis[0];
  const endpoints = topApi.endpoints ?? [];
  const topEndpoint =
    [...endpoints].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0] ??
    endpoints[0];

  if (!topEndpoint) {
    return { ok: false as const, error: "No endpoints found for top API match" };
  }

  const details = await orthDetails(topApi.slug, topEndpoint.path, { chatId });

  const { object } = await generateObject({
    model: togetherModel(EXECUTOR_MODEL_ID),
    schema: discoverySchema,
    system: DISCOVER_SYSTEM_PROMPT,
    prompt: `User need: ${need}

Top API: ${topApi.name} (${topApi.slug})
Endpoint: ${topEndpoint.method ?? "POST"} ${topEndpoint.path}
Description: ${topEndpoint.description ?? ""}

Search context (top matches):
${JSON.stringify(apis.slice(0, 3), null, 2)}

Endpoint schema:
${JSON.stringify(details.data ?? details, null, 2)}

Return the exact api, path, body, and query for spawn_execute.`,
  });

  return { ok: true as const, ...object };
}
