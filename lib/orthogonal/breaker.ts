import { getRedis } from "@/lib/orthogonal/cache";

export async function isCircuitOpen(api: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const value = await redis.get<number>(`circ:${api}:open`);
  return value === 1;
}

export async function recordFailure(api: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const key = `circ:${api}:failures`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 60);
  }
  if (count >= 5) {
    await redis.set(`circ:${api}:open`, 1, { ex: 30 });
  }
}

export async function recordSuccess(api: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(`circ:${api}:failures`);
}
