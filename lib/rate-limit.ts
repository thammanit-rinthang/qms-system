/**
 * Redis-backed rate limiter — Fixed Window Counter
 *
 * Uses Redis INCR + EXPIRE for atomic, multi-instance-safe counting.
 *
 * Falls back gracefully if Redis is unavailable (allows request).
 *
 * Previously used an in-memory Map which did not work across
 * multiple Docker instances. This version is shared across all instances.
 */

import { redis } from "@/lib/redis";

type LocalBucket = { count: number; resetAt: number };
const localBuckets = new Map<string, LocalBucket>();
let lastRedisWarningAt = 0;

function localRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const existing = localBuckets.get(key);
  const bucket = existing && existing.resetAt > now
    ? { count: existing.count + 1, resetAt: existing.resetAt }
    : { count: 1, resetAt: now + config.windowMs };

  localBuckets.set(key, bucket);
  if (localBuckets.size > 10_000) {
    for (const [bucketKey, value] of localBuckets) {
      if (value.resetAt <= now) localBuckets.delete(bucketKey);
    }
  }

  return {
    allowed: bucket.count <= config.limit,
    limit: config.limit,
    remaining: Math.max(0, config.limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export async function rateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const windowSec = Math.ceil(config.windowMs / 1000);
  const redisKey = `rl:${key}`;

  try {
    // INCR is atomic — safe across concurrent requests and multiple instances
    const count = await redis.incr(redisKey);

    if (count === 1) {
      // First request in this window — set the expiry
      await redis.expire(redisKey, windowSec);
    }

    // Calculate resetAt from remaining TTL
    const ttl = await redis.ttl(redisKey);
    const resetAt = Date.now() + (ttl > 0 ? ttl * 1000 : config.windowMs);
    const remaining = Math.max(0, config.limit - count);

    return {
      allowed: count <= config.limit,
      limit: config.limit,
      remaining,
      resetAt,
    };
  } catch (err) {
    // Redis is shared across instances, but a bounded local fallback keeps
    // rate limiting effective during a Redis outage instead of disabling the
    // control entirely. It is intentionally not treated as a replacement for
    // Redis in normal operation.
    if (Date.now() - lastRedisWarningAt > 30_000) {
      lastRedisWarningAt = Date.now();
      console.error("[rate-limit] Redis unavailable, using local fallback", err);
    }
    return localRateLimit(key, config);
  }
}
