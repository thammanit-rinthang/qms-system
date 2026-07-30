import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockQueryRaw } = vi.hoisted(() => ({ mockQueryRaw: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: mockQueryRaw,
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({ $executeRaw: vi.fn(), $queryRaw: mockQueryRaw })),
  },
}));

import { CarSequenceRepository } from "@/repositories/carSequenceRepository";

describe("CarSequenceRepository", () => {
  let repo: CarSequenceRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new CarSequenceRepository();
  });

  it("returns integer parsed from DB result", async () => {
    // DB returns rows with seq 1 and 2, so next gap-fill is 3
    mockQueryRaw.mockResolvedValue([{ seq: 1 }, { seq: 2 }]);
    const seq = await repo.nextSequence(2026);
    expect(seq).toBe(3);
  });

  it("returns 1 when no rows exist for the year", async () => {
    mockQueryRaw.mockResolvedValue([]);
    const seq = await repo.nextSequence(2025);
    expect(seq).toBe(1);
  });

  it("fills the first gap in the sequence", async () => {
    // Rows 1, 3 exist — gap at 2
    mockQueryRaw.mockResolvedValue([{ seq: 1 }, { seq: 3 }]);
    const seq = await repo.nextSequence(2026);
    expect(seq).toBe(2);
  });

  it("uses tx client when provided", async () => {
    const txQueryRaw = vi.fn().mockResolvedValue([]);
    const txExecuteRaw = vi.fn().mockResolvedValue(undefined);
    const tx = { $queryRaw: txQueryRaw, $executeRaw: txExecuteRaw } as never;
    await repo.nextSequence(2026, tx);
    expect(txQueryRaw).toHaveBeenCalledTimes(1);
    expect(mockQueryRaw).not.toHaveBeenCalled();
  });

  it("concurrent calls (simulated) return unique incrementing values", async () => {
    let counter = 0;
    mockQueryRaw.mockImplementation(async () => {
      // Simulate each call sees one more row than the last
      const rows = Array.from({ length: counter }, (_, i) => ({ seq: i + 1 }));
      counter += 1;
      return rows;
    });

    const results = await Promise.all([
      repo.nextSequence(2026),
      repo.nextSequence(2026),
      repo.nextSequence(2026),
    ]);

    const unique = new Set(results);
    expect(unique.size).toBe(3);
    expect(results).toEqual([1, 2, 3]);
  });
});
