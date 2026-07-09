import "server-only";
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

const redis = globalForRedis.redis ?? new Redis(process.env.REDIS_URL as string);

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

const WINDOW_SECONDS = 60;
const LIMITS: Record<string, number> = {
  chat: 20,
  playground: 30,
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
};

export async function checkRateLimit(userId: string, scope: keyof typeof LIMITS): Promise<RateLimitResult> {
  const limit = LIMITS[scope];
  const key = `ratelimit:${scope}:${userId}`;

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, WINDOW_SECONDS);
  }
  const ttl = await redis.ttl(key);
  const resetSeconds = ttl > 0 ? ttl : WINDOW_SECONDS;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetSeconds,
  };
}
