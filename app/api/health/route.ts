
import { redis } from "@/lib/redis";
import { db } from "@/lib/db";

export async function GET() {
  const start = Date.now();

  // ── PostgreSQL check ──────────────────────────────────────────────────────
  let dbStatus: "ok" | "error" = "error";
  try {
    await db.$queryRaw`SELECT 1`;
    dbStatus = "ok";
  } catch {
    dbStatus = "error";
  }

  // ── Redis check ───────────────────────────────────────────────────────────
  let redisStatus: "ok" | "error" = "error";
  let redisPingMs: number | null = null;
  let cacheKeys: Record<string, string | null> = {};

  try {
    const pingStart = Date.now();
    await redis.ping();
    redisPingMs = Date.now() - pingStart;
    redisStatus = "ok";

    // Show which cache keys currently exist (null = not cached yet)
    const [graphToken, depts, announcements, reviewers] = await Promise.all([
      redis.exists("graph:app_token"),
      redis.exists("qms:departments:active"),
      redis.exists("qms:announcements:list"),
      redis.exists("qms:dar:reviewer_candidates"),
    ]);

    cacheKeys = {
      "graph:app_token":                graphToken ? "✅ cached" : "⬜ not cached",
      "qms:departments:active":         depts       ? "✅ cached" : "⬜ not cached",
      "qms:announcements:list":         announcements ? "✅ cached" : "⬜ not cached",
      "qms:dar:reviewer_candidates":    reviewers   ? "✅ cached" : "⬜ not cached",
    };
  } catch {
    redisStatus = "error";
  }

  const totalMs = Date.now() - start;

  return Response.json({
    status: dbStatus === "ok" && redisStatus === "ok" ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    responseMs: totalMs,
    services: {
      database: dbStatus,
      redis: {
        status: redisStatus,
        pingMs: redisPingMs,
      },
    },
    cache: cacheKeys,
  });
}
