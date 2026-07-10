import { KPIMonthlyReport, MonthlyStatus, Prisma } from '@/generated/prisma/client';
import { BaseRepository, PaginatedResult } from '@/repositories/baseRepository';
import { CreateMonthlyReportDTO, ListMonthlyQuery, MonthlyReportAttachmentDTO, UpdateMonthlyReportDTO } from '@/types/kpi';

export class KpiMonthlyReportRepository extends BaseRepository<KPIMonthlyReport, CreateMonthlyReportDTO, Prisma.KPIMonthlyReportUpdateInput> {
  constructor() {
    super('kPIMonthlyReport');
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).kPIMonthlyReport;
  }

  async findByCompositeKey(kpiId: string, month: string, year: number, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({ where: { kpiId_month_year: { kpiId, month, year } } });
  }

  async createReport(kpiId: string, month: string, year: number, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).create({ data: { kpiId, month, year } });
  }

  async findOrCreate(kpiId: string, month: string, year: number, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).upsert({
      where: { kpiId_month_year: { kpiId, month, year } },
      update: {},
      create: { kpiId, month, year },
    });
  }

  async findByIdWithDetails(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      include: {
        kpi: { include: { objectives: true } },
        details: {
          include: {
            kpiObjective: true,
            correctiveActions: { orderBy: { times: 'asc' } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async findForExport(where: Prisma.KPIMonthlyReportWhereInput = {}, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where,
      include: {
        kpi: { select: { department: true, yearly: true } },
        details: {
          include: {
            kpiObjective: { select: { objective: true, target: true, unit: true } },
            correctiveActions: true,
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "asc" }],
    });
  }

  async paginateReports(query: ListMonthlyQuery, tx?: Prisma.TransactionClient): Promise<PaginatedResult<KPIMonthlyReport>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.KPIMonthlyReportWhereInput = {
      ...(query.kpiId ? { kpiId: query.kpiId } : {}),
      ...(query.year ? { year: query.year } : {}),
      ...(query.month ? { month: query.month } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.department ? { kpi: { department: { contains: query.department, mode: 'insensitive' } } } : {}),
    };

    const [data, total] = await Promise.all([
      this.delegate(tx).findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ year: 'desc' }, { month: 'asc' }],
        include: {
          kpi: true,
          details: {
            include: {
              kpiObjective: true,
              correctiveActions: { orderBy: { times: 'asc' } },
            },
          },
        },
      }),
      this.delegate(tx).count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async updateStatus(id: string, status: MonthlyStatus, fields?: Partial<{ prepareBy: string; reviewBy: string; approveBy: string; submittedAt: Date; approvedAt: Date }>, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).update({ where: { id }, data: { status, ...fields } });
  }

  async updateMetadata(id: string, dto: UpdateMonthlyReportDTO, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).update({
      where: { id },
      data: {
        remark: dto.remark ?? null,
      },
    });
  }

  async updateAttachment(id: string, dto: MonthlyReportAttachmentDTO, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).update({
      where: { id },
      data: {
        attachmentFileName: dto.fileName,
        attachmentFileSize: dto.fileSize,
        attachmentMimeType: dto.mimeType,
        attachmentSpItemId: dto.spItemId,
        attachmentWebUrl: dto.spWebUrl,
        attachmentDownloadUrl: dto.spDownloadUrl,
        attachmentUploadedAt: dto.uploadedAt,
        attachmentUploadedBy: dto.uploadedBy,
      },
    });
  }

  async countByStatuses(statuses: MonthlyStatus[], tx?: Prisma.TransactionClient): Promise<number> {
    return this.delegate(tx).count({ where: { status: { in: statuses } } });
  }

  async countPendingByApproverUser(userId: string, tx?: Prisma.TransactionClient): Promise<number> {
    return this.delegate(tx).count({
      where: {
        OR: [
          { status: "PENDING_REVIEW", kpi: { reviewerUserId: userId } },
          { status: "PENDING_APPROVAL", kpi: { approverUserId: userId } },
        ],
      },
    });
  }

  async findPendingReviewByUser(userId: string, take = 10, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where: { status: "PENDING_REVIEW", kpi: { reviewerUserId: userId } },
      orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
      take,
      include: {
        kpi: { select: { id: true, department: true } },
      },
    });
  }

  async countPendingReviewByUser(userId: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).count({
      where: { status: "PENDING_REVIEW", kpi: { reviewerUserId: userId } },
    });
  }

  async findPendingApproveByUser(userId: string, take = 10, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where: { status: "PENDING_APPROVAL", kpi: { approverUserId: userId } },
      orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
      take,
      include: {
        kpi: { select: { id: true, department: true } },
      },
    });
  }

  async countPendingApproveByUser(userId: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).count({
      where: { status: "PENDING_APPROVAL", kpi: { approverUserId: userId } },
    });
  }
}
