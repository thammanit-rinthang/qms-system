import { MonthlyStatus, Prisma, type KPIMonthlySummaryReviewHistory } from "@/generated/prisma/client";
import { BaseRepository } from "./baseRepository";

export interface KpiMonthlySummaryHistorySignature {
  step: string;
  action: string;
  actionDate: string | null;
  signerName: string | null;
  signerEmail: string | null;
  signaturePath: string | null;
  comment: string | null;
}

export class KpiMonthlySummaryReviewHistoryRepository extends BaseRepository<KPIMonthlySummaryReviewHistory> {
  constructor() {
    super("kPIMonthlySummaryReviewHistory");
  }

  async archiveCycle(
    input: {
      year: number;
      cycleNo: number;
      status: MonthlyStatus;
      prepareBy: string | null;
      reviewerName: string | null;
      reviewerEmail: string | null;
      approverName: string | null;
      approverEmail: string | null;
      submittedAt: Date | null;
      signatures: KpiMonthlySummaryHistorySignature[];
      snapshot: unknown;
    },
    tx: Prisma.TransactionClient,
  ) {
    return tx.kPIMonthlySummaryReviewHistory.create({
      data: {
        year: input.year,
        cycleNo: input.cycleNo,
        status: input.status,
        prepareBy: input.prepareBy,
        reviewerName: input.reviewerName,
        reviewerEmail: input.reviewerEmail,
        approverName: input.approverName,
        approverEmail: input.approverEmail,
        submittedAt: input.submittedAt,
        signatures: input.signatures as unknown as Prisma.InputJsonValue,
        snapshot: input.snapshot as Prisma.InputJsonValue,
      },
    });
  }

  async listByYear(year: number) {
    return this.getClient().kPIMonthlySummaryReviewHistory.findMany({
      where: { year },
      orderBy: { cycleNo: "desc" },
    });
  }
}
