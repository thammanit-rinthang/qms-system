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
    // Redis unavailable — fail open to avoid blocking all users
    console.error("[rate-limit] Redis error, failing open:", err);
    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit,
      resetAt: Date.now() + config.windowMs,
    };
  }
}
