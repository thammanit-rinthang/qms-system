/**
 * Cached Microsoft Graph App-Only Access Token
 *
 * Tokens are proxied through Auth Center — QMS does not hold Azure AD credentials.
 * Auth Center endpoint: GET /api/auth/consumer/graph-token (M2M, ~1h lifetime)
 *
 * Cache key:  graph:app_token
 * TTL:        DEFAULT_TTL_SEC (token lifetime is opaque from Auth Center response)
 */

import { redis } from "@/lib/redis";
import { logger } from "@/lib/logger";

const CACHE_KEY = "graph:app_token";
const DEFAULT_TTL_SEC = 3300; // 55 minutes — safe margin below 1h token lifetime
const LOCK_KEY = "graph:app_token:lock";
const LOCK_TTL_SEC = 15;
const WAIT_STEP_MS = 150;
const WAIT_MAX_MS = 5000;

interface FreshToken {
  token: string;
  cacheTtlSec: number;
}

/** Extract `exp` from a JWT payload without verifying signature. */
function jwtExpSec(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(Buffer.from(payload, "base64url").toString()) as { exp?: number };
    return typeof json.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

async function fetchFreshToken(): Promise<FreshToken> {
  const base = process.env.AUTH_CENTER_URL?.replace(/\/$/, "");
  const appId = process.env.AUTH_CENTER_APP_ID ?? "qms";
  const appSecret = process.env.AUTH_CENTER_CLIENT_SECRET;

  if (!base || !appSecret) throw new Error("AUTH_CENTER_URL or AUTH_CENTER_CLIENT_SECRET is not configured");

  const res = await fetch(`${base}/api/auth/consumer/graph-token`, {
    headers: {
      "x-consumer-app-id": appId,
      "x-consumer-app-secret": appSecret,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Auth Center graph-token failed: ${res.status} ${text}`);
  }

  const json = await res.json() as { data?: { accessToken: string } };
  const token = json.data?.accessToken;
  if (!token) throw new Error("Auth Center graph-token: missing accessToken in response");

  // Derive TTL from the JWT's own `exp` claim (minus 60s safety margin).
  // Falls back to DEFAULT_TTL_SEC if the token is opaque or already near-expired.
  const exp = jwtExpSec(token);
  const nowSec = Math.floor(Date.now() / 1000);
  const cacheTtlSec = exp ? Math.max(60, exp - nowSec - 60) : DEFAULT_TTL_SEC;

  return { token, cacheTtlSec };
}

/**
 * Returns a valid MS Graph app-only access token.
 * Reads from Redis cache first; fetches from Azure AD on miss.
 * Pass { forceRefresh: true } to bust the cache (e.g. after a 401).
 */
export async function getGraphToken(opts?: { forceRefresh?: boolean }): Promise<string> {
  if (opts?.forceRefresh) {
    try { await redis.del(CACHE_KEY); } catch { /* non-fatal */ }
  }
  try {
    const cached = await redis.get(CACHE_KEY);
    if (cached) return cached;

    // Try to become the single refresher across instances.
    const lockAcquired = await redis.set(LOCK_KEY, "1", "EX", LOCK_TTL_SEC, "NX");
    if (lockAcquired === "OK") {
      try {
        const { token, cacheTtlSec } = await fetchFreshToken();
        await redis.set(CACHE_KEY, token, "EX", cacheTtlSec);
        return token;
      } finally {
        await redis.del(LOCK_KEY).catch(() => null);
      }
    }

    // Another instance is refreshing. Wait briefly for cache fill.
    const deadline = Date.now() + WAIT_MAX_MS;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, WAIT_STEP_MS));
      const waitCached = await redis.get(CACHE_KEY);
      if (waitCached) return waitCached;
    }

    // Wait timed out. Do a final cache check — the lock holder may have just written it.
    const lastCheck = await redis.get(CACHE_KEY);
    if (lastCheck) return lastCheck;

    // Try to take over the refresh ourselves (lock may have expired or holder crashed).
    const takeover = await redis.set(LOCK_KEY, "1", "EX", LOCK_TTL_SEC, "NX");
    if (takeover === "OK") {
      try {
        const { token, cacheTtlSec } = await fetchFreshToken();
        await redis.set(CACHE_KEY, token, "EX", cacheTtlSec);
        return token;
      } finally {
        await redis.del(LOCK_KEY).catch(() => null);
      }
    }

    // Lock is still held by another instance — fetch without caching as last resort
    // for this single request only. Prevents all waiting instances from hitting Azure AD.
    logger.warn("[graph-token] Token refresh lock contention after wait — fetching without cache");
    const { token } = await fetchFreshToken();
    return token;

  } catch (err) {
    // Redis unavailable — fall through to fetch fresh token
    logger.warn("[graph-token] Redis unavailable, fetching fresh token", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Redis completely unavailable path: fetch and attempt to cache, but don't fail on cache errors.
  const { token, cacheTtlSec } = await fetchFreshToken();
  try {
    await redis.set(CACHE_KEY, token, "EX", cacheTtlSec);
  } catch {
    // Cache write failure is non-fatal
  }
  return token;
}
