import { KPI, Prisma } from '@/generated/prisma/client';
import { BaseRepository, PaginatedResult } from '@/repositories/baseRepository';
import { CreateKpiDTO, UpdateKpiDTO, ListKpiQuery } from '@/types/kpi';

export class KpiRepository extends BaseRepository<KPI, CreateKpiDTO, UpdateKpiDTO> {
  constructor() {
    super('kPI');
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).kPI;
  }

  async paginateKpis(query: ListKpiQuery, tx?: Prisma.TransactionClient): Promise<PaginatedResult<KPI>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.KPIWhereInput = {
      ...(query.yearly ? { yearly: query.yearly } : {}),
      ...(query.department ? { department: { contains: query.department, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await Promise.all([
      this.delegate(tx).findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ yearly: 'desc' }, { department: 'asc' }],
        include: { objectives: true },
      }),
      this.delegate(tx).count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async findByIdWithRelations(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      include: {
        objectives: { orderBy: { createdAt: 'asc' } },
        monthlyReports: {
          orderBy: [{ year: 'desc' }, { month: 'asc' }],
          include: { details: { include: { kpiObjective: true } } },
        },
      },
    });
  }

  async findByDepartmentYear(department: string, yearly: number, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findFirst({ where: { department, yearly } });
  }

  async findForExport(where: Prisma.KPIWhereInput = {}, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where,
      include: {
        objectives: true,
      },
      orderBy: [{ yearly: "desc" }, { department: "asc" }],
    });
  }

  async submitObjectives(
    id: string,
    payload: {
      prepareSignature: string;
      reviewerUserId: string;
      reviewerAuthUserId?: string | null;
      reviewer?: string | null;
      reviewerEmail?: string | null;
      approverUserId: string;
      approverAuthUserId?: string | null;
      approver?: string | null;
      approverEmail?: string | null;
      submittedAt: Date;
      prepare?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    return this.delegate(tx).update({
      where: { id },
      data: {
        status: 'PENDING_REVIEW',
        prepareSignature: payload.prepareSignature,
        reviewerUserId: payload.reviewerUserId,
        reviewerAuthUserId: payload.reviewerAuthUserId ?? null,
        reviewer: payload.reviewer ?? "",
        reviewerEmail: payload.reviewerEmail ?? null,
        approverUserId: payload.approverUserId,
        approverAuthUserId: payload.approverAuthUserId ?? null,
        approver: payload.approver ?? "",
        approverEmail: payload.approverEmail ?? null,
        submittedAt: payload.submittedAt,
        ...(payload.prepare ? { prepare: payload.prepare } : {}),
      },
      include: { objectives: true }
    });
  }

  async findPendingReviewByUser(userId: string, take = 10, tx?: Prisma.TransactionClient) {
    const client = this.getClient(tx);

    // IDs where reviewer has already approved
    const reviewedIds = await client.approvalSignature.findMany({
      where: { module: "KPI", step: "REVIEWER", action: "APPROVED" },
      select: { documentId: true },
    });
    const reviewedIdSet = reviewedIds.map((r) => r.documentId);

    return this.delegate(tx).findMany({
      where: {
        status: "PENDING_REVIEW",
        reviewerUserId: userId,
        id: { notIn: reviewedIdSet },
      },
      orderBy: [{ yearly: "desc" }, { updatedAt: "desc" }],
      take,
      select: { id: true, department: true, yearly: true, status: true },
    });
  }

  async countPendingReviewByUser(userId: string, tx?: Prisma.TransactionClient) {
    const client = this.getClient(tx);

    const reviewedIds = await client.approvalSignature.findMany({
      where: { module: "KPI", step: "REVIEWER", action: "APPROVED" },
      select: { documentId: true },
    });
    const reviewedIdSet = reviewedIds.map((r) => r.documentId);

    return this.delegate(tx).count({
      where: {
        status: "PENDING_REVIEW",
        reviewerUserId: userId,
        id: { notIn: reviewedIdSet },
      },
    });
  }

  async findPendingApproveByUser(userId: string, take = 10, tx?: Prisma.TransactionClient) {
    const client = this.getClient(tx);

    // IDs where reviewer has approved → approver can now act
    const reviewedIds = await client.approvalSignature.findMany({
      where: { module: "KPI", step: "REVIEWER", action: "APPROVED" },
      select: { documentId: true },
    });
    const reviewedIdSet = reviewedIds.map((r) => r.documentId);

    return this.delegate(tx).findMany({
      where: {
        status: "PENDING_APPROVAL",
        approverUserId: userId,
        id: { in: reviewedIdSet },
      },
      orderBy: [{ yearly: "desc" }, { updatedAt: "desc" }],
      take,
      select: { id: true, department: true, yearly: true, status: true },
    });
  }

  async countPendingApproveByUser(userId: string, tx?: Prisma.TransactionClient) {
    const client = this.getClient(tx);

    const reviewedIds = await client.approvalSignature.findMany({
      where: { module: "KPI", step: "REVIEWER", action: "APPROVED" },
      select: { documentId: true },
    });
    const reviewedIdSet = reviewedIds.map((r) => r.documentId);

    return this.delegate(tx).count({
      where: {
        status: "PENDING_APPROVAL",
        approverUserId: userId,
        id: { in: reviewedIdSet },
      },
    });
  }

  async setStatus(id: string, status: 'DRAFT' | 'PENDING_REVIEW' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED', tx?: Prisma.TransactionClient) {
    return this.delegate(tx).update({
      where: { id },
      data: { status },
    });
  }

  async findMonthlySummary(year: number, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where: { yearly: year },
      select: {
        id: true, department: true, yearly: true,
        objectives: { select: { id: true } },
        monthlyReports: { where: { year }, select: { id: true, month: true, status: true } },
      },
      orderBy: { department: 'asc' },
    });
  }

  async clearSubmission(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).update({
      where: { id },
      data: {
        reviewerUserId: null,
        approverUserId: null,
        prepareSignature: null,
        submittedAt: null,
        prepare: '',
      },
    });
  }
}
