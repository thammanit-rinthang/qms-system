import { KPIMonthlyDetail, AchievedStatus, Prisma } from '@/generated/prisma/client';
import { BaseRepository } from '@/repositories/baseRepository';
import { UpdateMonthlyDetailDTO } from '@/types/kpi';

export class KpiMonthlyDetailRepository extends BaseRepository<KPIMonthlyDetail, Prisma.KPIMonthlyDetailCreateInput, Prisma.KPIMonthlyDetailUpdateInput> {
  constructor() {
    super('kPIMonthlyDetail');
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).kPIMonthlyDetail;
  }

  async findByIdWithReport(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      include: { monthlyReport: true, kpiObjective: true },
    });
  }

  async findByReportId(reportId: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where: { monthlyReportId: reportId },
      include: { kpiObjective: true, correctiveActions: { orderBy: { times: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateResult(id: string, dto: UpdateMonthlyDetailDTO, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).update({ where: { id }, data: dto });
  }

  async autoSetAchievedStatus(id: string, target: number, actualResult: number, tx?: Prisma.TransactionClient) {
    const achievedStatus: AchievedStatus = actualResult >= target ? 'OK' : 'NOT_OK';
    return this.delegate(tx).update({ where: { id }, data: { actualResult, achievedStatus } });
  }

  async createForReport(monthlyReportId: string, kpiObjectiveId: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).create({ data: { monthlyReportId, kpiObjectiveId } });
  }

  async createManyForReport(monthlyReportId: string, kpiObjectiveIds: string[], tx?: Prisma.TransactionClient) {
    if (kpiObjectiveIds.length === 0) return { count: 0 };

    return this.delegate(tx).createMany({
      data: kpiObjectiveIds.map((kpiObjectiveId) => ({
        monthlyReportId,
        kpiObjectiveId,
      })),
      skipDuplicates: true,
    });
  }
}
