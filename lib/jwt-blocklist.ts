/**
 * JWT Blocklist — Redis-backed session revocation
 *
 * Enables force logout / session invalidation for JWT-based auth.
 *
 * Since NextAuth uses stateless JWTs, we maintain a Redis blocklist of
 * invalidated JTIs (JWT IDs). Middleware checks this list on every request.
 *
 * Key pattern:   jwt:blocked:{jti}
 * Value:         "1"
 * TTL:           Remaining token lifetime (so stale entries auto-expire)
 *
 * Design decision: fail-open on Redis errors to avoid locking out all users
 * if Redis becomes temporarily unavailable.
 */

import { redis } from "@/lib/redis";

const KEY_PREFIX = "jwt:blocked:";

/**
 * Add a JTI to the blocklist.
 * @param jti  - The JWT ID to block
 * @param ttlSec - How long to keep it in Redis (should equal remaining token lifetime)
 */
export async function blockJwt(jti: string, ttlSec: number): Promise<void> {
  await redis.set(`${KEY_PREFIX}${jti}`, "1", "EX", Math.max(1, ttlSec));
}

/**
 * Check if a JTI is in the blocklist.
 * Returns false on Redis errors (fail-open).
 */
export async function isJwtBlocked(jti: string): Promise<boolean> {
  try {
    const val = await redis.get(`${KEY_PREFIX}${jti}`);
    return val === "1";
  } catch (err) {
    console.error("[jwt-blocklist] Redis error during check, failing open:", err);
    return false; // fail-open: do NOT block legitimate users when Redis is down
  }
}
