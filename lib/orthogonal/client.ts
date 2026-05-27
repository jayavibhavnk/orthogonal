import pRetry from "p-retry";
import { db } from "@/lib/db/client";
import { apiCallLog } from "@/lib/db/schema";
import {
  acquireLock,
  cacheKey as buildCacheKey,
  getCached,
  lockKey,
  releaseLock,
  setCached,
  waitForCache,
  hashBody,
} from "@/lib/orthogonal/cache";
import {
  isCircuitOpen,
  recordFailure,
  recordSuccess,
} from "@/lib/orthogonal/breaker";
import { checkEndpointRateLimit } from "@/lib/orthogonal/ratelimit";
import type {
  OrthCallOptions,
  OrthClientResult,
  OrthRunRequest,
  OrthSearchResult,
} from "@/lib/orthogonal/types";

const BASE_URL = "https://api.orthogonal.com/v1";

function getApiKey() {
  const key = process.env.ORTHOGONAL_API_KEY;
  if (!key) throw new Error("ORTHOGONAL_API_KEY is not configured");
  return key;
}

async function orthogonalFetch<T>(
  path: string,
  body: unknown,
  options: OrthCallOptions = {},
): Promise<OrthClientResult<T>> {
  const started = Date.now();
  let attempts = 0;

  const doFetch = async (): Promise<OrthClientResult<T>> => {
    attempts += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    const signal = options.signal
      ? AbortSignal.any([options.signal, controller.signal])
      : controller.signal;

    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getApiKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal,
      });

      const json = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        const code = String(json.error ?? json.code ?? response.status);
        const retryable =
          response.status === 429 ||
          response.status >= 500 ||
          code.includes("UPSTREAM") ||
          code.includes("RATE");

        if (retryable) {
          throw new Error(code);
        }

        return {
          ok: false,
          attempts,
          cacheHit: false,
          latencyMs: Date.now() - started,
          error: String(json.error ?? json.message ?? "Request failed"),
          errorCode: code,
        };
      }

      return {
        ok: true,
        data: (json.data ?? json) as T,
        priceCents: Number(json.priceCents ?? 0),
        requestId: String(json.requestId ?? ""),
        attempts,
        cacheHit: false,
        latencyMs: Date.now() - started,
      };
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    const result = await pRetry(doFetch, {
      retries: 2,
      factor: 2,
      minTimeout: 500,
      randomize: true,
      onFailedAttempt: async (error) => {
        await options.onRetry?.({
          tool: path,
          attempt: error.attemptNumber,
          reason:
            error.error instanceof Error
              ? error.error.message
              : String(error.error ?? "retry"),
          nextDelayMs: error.attemptNumber * 500,
        });
      },
    });
    return result;
  } catch (error) {
    return {
      ok: false,
      attempts,
      cacheHit: false,
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : "Unknown error",
      errorCode: "UPSTREAM_ERROR",
    };
  }
}

export async function orthSearch(
  prompt: string,
  limit = 5,
  options: OrthCallOptions = {},
) {
  return orthogonalFetch<{ results?: OrthSearchResult[]; apis?: OrthSearchResult[] }>(
    "/search",
    { prompt, limit },
    options,
  );
}

export async function orthDetails(
  api: string,
  path: string,
  options: OrthCallOptions = {},
) {
  return orthogonalFetch<Record<string, unknown>>(
    "/details",
    { api, path },
    options,
  );
}

export async function orthRun(
  request: OrthRunRequest,
  options: OrthCallOptions = {},
) {
  const endpointOpen = await isCircuitOpen(request.api);
  if (endpointOpen) {
    return {
      ok: false,
      attempts: 0,
      cacheHit: false,
      latencyMs: 0,
      error: `Circuit open for ${request.api}`,
      errorCode: "CIRCUIT_OPEN",
    } satisfies OrthClientResult;
  }

  const rate = await checkEndpointRateLimit(request.api);
  if (!rate.success) {
    return {
      ok: false,
      attempts: 0,
      cacheHit: false,
      latencyMs: 0,
      error: `Rate limited for ${request.api}`,
      errorCode: "RATE_LIMITED",
    } satisfies OrthClientResult;
  }

  const key = buildCacheKey(request.api, request.path, {
    body: request.body,
    query: request.query,
  });
  const cached = await getCached<OrthClientResult>(key);
  if (cached) {
    if (options.chatId) {
      await db.insert(apiCallLog).values({
        chatId: options.chatId,
        api: request.api,
        path: request.path,
        bodyHash: hashBody({ body: request.body, query: request.query }),
        priceCents: cached.priceCents ?? 0,
        latencyMs: cached.latencyMs,
        cacheHit: true,
      });
    }
    return { ...cached, cacheHit: true };
  }

  const lock = lockKey(key);
  const acquired = await acquireLock(lock);
  if (!acquired) {
    const waited = await waitForCache<OrthClientResult>(key);
    if (waited) return { ...waited, cacheHit: true };
  }

  try {
    const result = await orthogonalFetch<unknown>(
      "/run",
      {
        api: request.api,
        path: request.path,
        body: request.body,
        query: request.query,
      },
      options,
    );

    if (result.ok) {
      await setCached(key, result, 60);
      await recordSuccess(request.api);
    } else {
      await recordFailure(request.api);
    }

    if (options.chatId) {
      await db.insert(apiCallLog).values({
        chatId: options.chatId,
        api: request.api,
        path: request.path,
        bodyHash: hashBody({ body: request.body, query: request.query }),
        priceCents: result.priceCents ?? 0,
        latencyMs: result.latencyMs,
        cacheHit: result.cacheHit,
      });
    }

    return result;
  } finally {
    if (acquired) await releaseLock(lock);
  }
}
