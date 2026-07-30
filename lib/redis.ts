/**
 * Redis client — singleton pattern (ioredis)
 *
 * Usage:
 *   import { redis } from "@/lib/redis";
 *   await redis.set("key", "value", "EX", 60);
 *
 * Environment:
 *   REDIS_URL  — e.g. redis://redis:6379 (Docker) or redis://localhost:6379 (dev)
 *
 * The client is shared across hot-reloads in development via `globalThis`.
 */

import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

declare global {
  var __redis: Redis | undefined;
}

function createClient(): Redis {
  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 500,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  client.on("error", (err: Error) => {
    console.error("[redis] connection error:", err.message);
  });

  client.on("connect", () => {
    console.info("[redis] connected to", REDIS_URL.replace(/:\/\/.*@/, "://***@"));
  });

  return client;
}

// Reuse existing client across Next.js hot-reloads in development
export const redis: Redis =
  globalThis.__redis ?? (globalThis.__redis = createClient());
