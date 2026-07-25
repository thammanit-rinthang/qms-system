import { KPIMonthlySummaryReview, MonthlyStatus, Prisma } from "@/generated/prisma/client";
import { BaseRepository } from "./baseRepository";
import { ConflictError } from "@/errors/customErrors";

export class KpiMonthlySummaryReviewRepository extends BaseRepository<KPIMonthlySummaryReview> {
  constructor() {
    super("kPIMonthlySummaryReview");
  }

  async findByYear(year: number, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).kPIMonthlySummaryReview.findUnique({ where: { year } });
  }

  async findOrCreate(year: number, tx?: Prisma.TransactionClient) {
    const client = this.getClient(tx);
    return client.kPIMonthlySummaryReview.upsert({
      where: { year },
      create: { year },
      update: {},
    });
  }

  async updateStatus(
    year: number,
    status: MonthlyStatus,
    expectedStatus: MonthlyStatus,
    data: Partial<{
      prepareBy: string;
      reviewerUserId: string | null;
      reviewerAuthUserId: string | null;
      reviewerName: string | null;
      reviewerEmail: string | null;
      approverUserId: string | null;
      approverAuthUserId: string | null;
      approverName: string | null;
      approverEmail: string | null;
      emailGroupMails: string[];
      emailGroupMailsCc: string[];
      submittedAt: Date;
      approvedAt: Date;
    }>,
    tx: Prisma.TransactionClient,
  ) {
    const result = await tx.kPIMonthlySummaryReview.updateMany({
      where: { year, status: expectedStatus },
      data: { status, ...data },
    });

    if (result.count !== 1) {
      throw new ConflictError(`KPI monthly summary changed before transition from ${expectedStatus}`);
    }

    return tx.kPIMonthlySummaryReview.findUniqueOrThrow({ where: { year } });
  }
}
