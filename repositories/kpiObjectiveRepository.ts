import { KPIObjective, Prisma } from '@/generated/prisma/client';
import { BaseRepository } from '@/repositories/baseRepository';
import { CreateKpiObjectiveDTO, UpdateKpiObjectiveDTO } from '@/types/kpi';

export class KpiObjectiveRepository extends BaseRepository<KPIObjective, CreateKpiObjectiveDTO, UpdateKpiObjectiveDTO> {
  constructor() {
    super('kPIObjective');
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).kPIObjective;
  }

  async findByKpiId(kpiId: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where: { kpiId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByIdWithDetails(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      include: {
        kpi: true,
        monthlyDetails: {
          include: { correctiveActions: true },
        },
      },
    });
  }

  async createObjective(data: CreateKpiObjectiveDTO, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).create({
      data: {
        kpi: { connect: { id: data.kpiId } },
        target: data.target,
        unit: data.unit,
        objective: data.objective,
        frequency: data.frequency,
        calculationFormula: data.calculationFormula,
        actionPlanGuidelines: data.actionPlanGuidelines,
        referenceDocuments: data.referenceDocuments,
      },
    });
  }

  async hasMonthlyDetails(id: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    const count = await this.getClient(tx).kPIMonthlyDetail.count({ where: { kpiObjectiveId: id } });
    return count > 0;
  }
}
