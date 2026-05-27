import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "@/lib/orthogonal/cache";

const limiters = new Map<string, Ratelimit>();

function getLimiter(key: string, requests: number, window: `${number} s`) {
  const redis = getRedis();
  if (!redis) return null;
  const cacheKey = `${key}:${requests}:${window}`;
  if (!limiters.has(cacheKey)) {
    limiters.set(
      cacheKey,
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(requests, window),
        prefix: `ratelimit:${key}`,
      }),
    );
  }
  return limiters.get(cacheKey)!;
}

export async function checkSessionRateLimit(sessionId: string) {
  const limiter = getLimiter("session", 60, "60 s");
  if (!limiter) return { success: true, remaining: 60 };
  return limiter.limit(sessionId);
}

export async function checkEndpointRateLimit(api: string) {
  const limits: Record<string, number> = {
    fundable: 30,
    apollo: 60,
    linkup: 60,
    default: 60,
  };
  const requests = limits[api] ?? limits.default;
  const limiter = getLimiter(`endpoint:${api}`, requests, "60 s");
  if (!limiter) return { success: true, remaining: requests };
  return limiter.limit(api);
}
