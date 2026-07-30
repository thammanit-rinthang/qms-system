import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { SystemConfigRepository } from "@/repositories/systemConfigRepository";
import { redis } from "@/lib/redis";
import { getGraphToken } from "@/lib/graph-token";
import { logger } from "@/lib/logger";

const sysRepo = new SystemConfigRepository();

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Authenticate & Authorize (IT only)
    const session = await requireRole("IT");

    // 2. Test DB Connection
    let dbStatus = "CONNECTED";
    let dbLatencyMs = 0;
    let dbError: string | null = null;
    try {
      const dbStart = Date.now();
      await sysRepo.ping();
      dbLatencyMs = Date.now() - dbStart;
    } catch (err) {
      dbStatus = "DISCONNECTED";
      dbError = err instanceof Error ? err.message : String(err);
      logger.error("[system-info] DB health check failed", err);
    }

    // 3. Test Redis Connection
    let redisStatus = "CONNECTED";
    let redisLatencyMs = 0;
    let redisError: string | null = null;
    try {
      const redisStart = Date.now();
      await redis.ping();
      redisLatencyMs = Date.now() - redisStart;
    } catch (err) {
      redisStatus = "DISCONNECTED";
      redisError = err instanceof Error ? err.message : String(err);
      logger.error("[system-info] Redis health check failed", err);
    }

    // 4. Test SharePoint/Graph API Connection
    let spStatus = "CONNECTED";
    let spLatencyMs = 0;
    let spError: string | null = null;
    try {
      const spStart = Date.now();
      const siteId = process.env.SHAREPOINT_SITE_ID || "root";
      const token = await getGraphToken();
      const res = await fetch(`https://graph.microsoft.com/v1.0/sites/${siteId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`Graph Site fetch returned status ${res.status}`);
      }
      spLatencyMs = Date.now() - spStart;
    } catch (err) {
      spStatus = "DISCONNECTED";
      spError = err instanceof Error ? err.message : String(err);
      logger.error("[system-info] SharePoint health check failed", err);
    }

    // 5. Gather build environment details
    const gitCommitSha = process.env.NEXT_PUBLIC_GIT_COMMIT_SHA || "Development";
    const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || "N/A";

    return NextResponse.json({
      success: true,
      data: {
        system: {
          gitCommitSha,
          buildTime,
          nodeVersion: process.version,
          platform: process.platform,
          env: process.env.NODE_ENV,
        },
        services: {
          database: {
            status: dbStatus,
            latencyMs: dbLatencyMs,
            error: dbError,
          },
          redis: {
            status: redisStatus,
            latencyMs: redisLatencyMs,
            error: redisError,
          },
          sharepoint: {
            status: spStatus,
            latencyMs: spLatencyMs,
            error: spError,
          },
        },
        user: {
          id: session.user.id,
          name: session.user.name,
          role: session.user.role,
        }
      }
    });
  } catch (error) {
    logger.error("[system-info] API execution failed", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal Server Error"
    }, { status: 500 });
  }
}
