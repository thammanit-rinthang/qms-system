import { describe, expect, it, vi } from "vitest";
import { KpiMonthlySummaryReviewRepository } from "@/repositories/kpiMonthlySummaryReviewRepository";
import { ConflictError } from "@/errors/customErrors";

describe("KpiMonthlySummaryReviewRepository", () => {
  it("rejects a transition when the expected status no longer matches", async () => {
    const tx = {
      kPIMonthlySummaryReview: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findUniqueOrThrow: vi.fn(),
      },
    };
    const repository = new KpiMonthlySummaryReviewRepository();

    await expect(repository.updateStatus(2026, "APPROVED", "PENDING_APPROVAL", {}, tx as never))
      .rejects.toBeInstanceOf(ConflictError);
    expect(tx.kPIMonthlySummaryReview.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("returns the updated record after an atomic conditional transition", async () => {
    const updated = { year: 2026, status: "APPROVED" };
    const tx = {
      kPIMonthlySummaryReview: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue(updated),
      },
    };
    const repository = new KpiMonthlySummaryReviewRepository();

    await expect(repository.updateStatus(2026, "APPROVED", "PENDING_APPROVAL", {}, tx as never))
      .resolves.toEqual(updated);
    expect(tx.kPIMonthlySummaryReview.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { year: 2026, status: "PENDING_APPROVAL" },
    }));
  });
});
