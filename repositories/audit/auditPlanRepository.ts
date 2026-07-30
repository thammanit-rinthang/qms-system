import { BaseRepository, PaginatedResult } from "../baseRepository";
import { AuditPlan, Prisma, AuditPlanStatus, AuditType, AuditDeliveryMode } from "@/generated/prisma/client";

export interface AuditPlanListQuery {
  page?: number;
  limit?: number;
  auditType?: AuditType;
  status?: AuditPlanStatus;
  departmentId?: string;
  ownerAuthUserId?: string;
  search?: string;
}

export class AuditPlanRepository extends BaseRepository<AuditPlan> {
  constructor() {
    super("auditPlan");
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).auditPlan;
  }

  async findDetailById(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      include: {
        departments: true,
        auditors: true,
        schedules: {
          include: { team: { orderBy: { role: "asc" } } },
          orderBy: { startAt: "asc" },
        },
        announcements: { orderBy: { publishedAt: "desc" } },
        findings: { orderBy: { findingNo: "asc" } },
        signoffs: { orderBy: { signedAt: "asc" } },
        report: true,
      },
    });
  }

  async findByAppointmentId(appointmentId: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findFirst({
      where: { appointmentId },
      include: {
        departments: true,
        auditors: true,
        schedules: {
          include: { team: { orderBy: { role: "asc" } } },
          orderBy: { startAt: "asc" },
        },
        announcements: { orderBy: { publishedAt: "desc" } },
        findings: { orderBy: { findingNo: "asc" } },
        signoffs: { orderBy: { signedAt: "asc" } },
        report: true,
      },
    });
  }

  async listPaginated(query: AuditPlanListQuery, tx?: Prisma.TransactionClient): Promise<PaginatedResult<AuditPlan>> {
    const where: Prisma.AuditPlanWhereInput = {};

    if (query.auditType) where.auditType = query.auditType;
    if (query.status) where.status = query.status;
    if (query.ownerAuthUserId) where.ownerAuthUserId = query.ownerAuthUserId;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { auditNo: { contains: query.search, mode: "insensitive" } },
      ];
    }
    if (query.departmentId) {
      where.departments = { some: { departmentId: query.departmentId } };
    }

    return this.paginate({ page: query.page, limit: query.limit }, where, { createdAt: "desc" }, tx);
  }

  async findByAuditNo(auditNo: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({ where: { auditNo } });
  }

  async updateStatus(id: string, status: AuditPlanStatus, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).update({ where: { id }, data: { status } });
  }

  async countPendingReviewByUser(authUserId: string) {
    return this.delegate().count({ where: { status: "PENDING_REVIEW", reviewerAuthUserId: authUserId } });
  }

  async countPendingApproveByUser(authUserId: string) {
    return this.delegate().count({ where: { status: "PENDING_APPROVAL", approverAuthUserId: authUserId } });
  }

  async findPendingReviewByUser(authUserId: string, limit = 10) {
    return this.delegate().findMany({
      where: { status: "PENDING_REVIEW", reviewerAuthUserId: authUserId },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
  }

  async findPendingApproveByUser(authUserId: string, limit = 10) {
    return this.delegate().findMany({
      where: { status: "PENDING_APPROVAL", approverAuthUserId: authUserId },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
  }

  async findWithAuditors(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      include: { auditors: true },
    });
  }

  async findWithAuditorsAndLead(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      include: { auditors: { where: { role: "LEAD" } } },
    });
  }

  async findForAnnounce(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({ where: { id } });
  }

  async createAnnouncement(
    data: {
      planId: string;
      title: string;
      message: string;
      deliveryMode: AuditDeliveryMode;
      publishedAt: Date;
      publishedByAuthUserId: string;
    },
    tx?: Prisma.TransactionClient
  ) {
    return this.getClient(tx).auditAnnouncement.create({ data });
  }

  async getDashboardCounts(now: Date, sevenDaysLater: Date, tx?: Prisma.TransactionClient) {
    const client = this.getClient(tx);
    return Promise.all([
      this.delegate(tx).count(),
      this.delegate(tx).count({ where: { status: "IN_PROGRESS" } }),
      this.delegate(tx).count({ where: { status: "WAITING_CORRECTIVE" } }),
      client.auditFinding.count({ where: { status: { in: ["OPEN", "REOPENED"] } } }),
      client.auditFinding.count({
        where: { dueAt: { lt: now }, status: { notIn: ["CLOSED", "REJECTED"] } },
      }),
      this.delegate(tx).count({ where: { status: "READY_TO_CLOSE" } }),
      client.auditSchedule.findMany({
        where: { startAt: { gte: now, lte: sevenDaysLater } },
        include: { plan: { select: { id: true, title: true, auditNo: true } } },
        orderBy: { startAt: "asc" },
        take: 10,
      }),
      client.auditFinding.findMany({
        where: { status: { in: ["OPEN", "REOPENED"] } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          planId: true,
          findingNo: true,
          title: true,
          category: true,
          severity: true,
          status: true,
          ownerNameSnapshot: true,
          dueAt: true,
          createdAt: true,
        },
      }),
    ]);
  }

  async findForClose(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      include: {
        findings: { select: { status: true } },
        signoffs: true,
        report: true,
        auditors: { where: { role: "LEAD" } },
      },
    });
  }

  async findSignoff(planId: string, authUserId: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).auditSignoff.findFirst({
      where: { planId, signedByAuthUserId: authUserId },
    });
  }

  async getMyTasksData(authUserId: string, tx?: Prisma.TransactionClient) {
    const client = this.getClient(tx);
    return Promise.all([
      client.auditFinding.findMany({
        where: { ownerAuthUserId: authUserId, status: { in: ["OPEN", "REOPENED"] } },
        orderBy: { dueAt: "asc" },
        select: {
          id: true, planId: true, findingNo: true, title: true, category: true,
          severity: true, status: true, ownerNameSnapshot: true, dueAt: true, createdAt: true,
          plan: { select: { id: true, title: true, auditNo: true } },
        },
      }),
      this.delegate(tx).findMany({
        where: {
          auditors: { some: { assigneeAuthUserId: authUserId, role: "LEAD" } },
          findings: { some: { status: "RESPONDED" } },
        },
        select: {
          id: true, auditNo: true, title: true, status: true,
          findings: {
            where: { status: "RESPONDED" },
            select: {
              id: true, planId: true, findingNo: true, title: true, category: true,
              severity: true, status: true, ownerNameSnapshot: true, dueAt: true, createdAt: true,
            },
          },
        },
      }),
      this.delegate(tx).findMany({
        where: { leadAuditorAuthUserId: authUserId, status: { notIn: ["CLOSED", "CANCELLED"] } },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true, auditNo: true, title: true, status: true,
          startDate: true, endDate: true, ownerNameSnapshot: true, createdAt: true, updatedAt: true,
        },
      }),
      this.delegate(tx).findMany({
        where: {
          status: "READY_TO_CLOSE",
          OR: [{ ownerAuthUserId: authUserId }, { leadAuditorAuthUserId: authUserId }],
        },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true, auditNo: true, title: true, status: true,
          ownerAuthUserId: true, ownerNameSnapshot: true, leadAuditorAuthUserId: true, updatedAt: true,
        },
      }),
    ]);
  }

  async findForExport(
    filter: {
      search?: string;
      auditType?: AuditType;
      status?: AuditPlanStatus;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const where: Prisma.AuditPlanWhereInput = {};

    if (filter.auditType) where.auditType = filter.auditType;
    if (filter.status) where.status = filter.status;
    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search, mode: "insensitive" } },
        { auditNo: { contains: filter.search, mode: "insensitive" } },
      ];
    }

    return this.delegate(tx).findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }
}
