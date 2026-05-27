import { Redis } from "@upstash/redis";
import { createHash } from "crypto";

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

export function hashBody(input: unknown): string {
  const canonical = JSON.stringify(input ?? {});
  return createHash("sha256").update(canonical).digest("hex");
}

export function cacheKey(api: string, path: string, body: unknown): string {
  return `orth:${hashBody({ api, path, body })}`;
}

export function lockKey(cacheKeyValue: string): string {
  return `${cacheKeyValue}:lock`;
}

export async function getCached<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;
  return r.get<T>(key);
}

export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds = 60,
): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.set(key, value, { ex: ttlSeconds });
}

export async function acquireLock(
  key: string,
  ttlSeconds = 30,
): Promise<boolean> {
  const r = getRedis();
  if (!r) return true;
  const result = await r.set(key, "1", { nx: true, ex: ttlSeconds });
  return result === "OK";
}

export async function releaseLock(key: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.del(key);
}

export async function waitForCache<T>(
  key: string,
  timeoutMs = 8000,
  intervalMs = 200,
): Promise<T | null> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await getCached<T>(key);
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return null;
}
