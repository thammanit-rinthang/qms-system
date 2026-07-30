import { redis } from "@/lib/redis";
import { db } from "@/lib/db";

export interface HealthStatus {
  database: "ok" | "error";
  redis: "ok" | "error";
}

export class HealthService {
  static async checkReadiness(): Promise<HealthStatus> {
    const status: HealthStatus = { database: "error", redis: "error" };

    try {
      await db.$queryRaw`SELECT 1`;
      status.database = "ok";
    } catch {
      status.database = "error";
    }

    try {
      await redis.ping();
      status.redis = "ok";
    } catch {
      status.redis = "error";
    }

    return status;
  }
}
