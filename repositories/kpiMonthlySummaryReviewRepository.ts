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

  async countPendingReviewByUser(userId: string, authUserId?: string | null) {
    return this.getClient().kPIMonthlySummaryReview.count({
      where: {
        status: "PENDING_REVIEW",
        OR: [{ reviewerUserId: userId }, ...(authUserId ? [{ reviewerAuthUserId: authUserId }] : [])],
      },
    });
  }

  async countPendingApproveByUser(userId: string, authUserId?: string | null) {
    return this.getClient().kPIMonthlySummaryReview.count({
      where: {
        status: "PENDING_APPROVAL",
        OR: [{ approverUserId: userId }, ...(authUserId ? [{ approverAuthUserId: authUserId }] : [])],
      },
    });
  }

  async findPendingReviewByUser(userId: string, authUserId?: string | null, limit = 10) {
    return this.getClient().kPIMonthlySummaryReview.findMany({
      where: {
        status: "PENDING_REVIEW",
        OR: [{ reviewerUserId: userId }, ...(authUserId ? [{ reviewerAuthUserId: authUserId }] : [])],
      },
      orderBy: { submittedAt: "desc" },
      take: limit,
    });
  }

  async findPendingApproveByUser(userId: string, authUserId?: string | null, limit = 10) {
    return this.getClient().kPIMonthlySummaryReview.findMany({
      where: {
        status: "PENDING_APPROVAL",
        OR: [{ approverUserId: userId }, ...(authUserId ? [{ approverAuthUserId: authUserId }] : [])],
      },
      orderBy: { submittedAt: "desc" },
      take: limit,
    });
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
      prepareByName: string | null;
      prepareByEmail: string | null;
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
      cycleNo: number;
      submittedAt: Date | null;
      approvedAt: Date | null;
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
