import { beforeEach, describe, expect, it, vi } from "vitest";

const redisMock = {
  incr: vi.fn().mockRejectedValue(new Error("Redis unavailable")),
  expire: vi.fn(),
  ttl: vi.fn(),
};

vi.mock("@/lib/redis", () => ({ redis: redisMock }));

describe("rateLimit Redis outage fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("continues enforcing a bounded local window when Redis is unavailable", async () => {
    const { rateLimit } = await import("@/lib/rate-limit");

    expect((await rateLimit("test", { limit: 2, windowMs: 60_000 })).allowed).toBe(true);
    expect((await rateLimit("test", { limit: 2, windowMs: 60_000 })).allowed).toBe(true);
    expect((await rateLimit("test", { limit: 2, windowMs: 60_000 })).allowed).toBe(false);
  });
});
