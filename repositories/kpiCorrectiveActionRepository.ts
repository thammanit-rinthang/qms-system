import { KPICorrectiveAction, Prisma } from '@/generated/prisma/client';
import { BaseRepository } from '@/repositories/baseRepository';
import { CreateCorrectiveActionDTO } from '@/types/kpi';

export class KpiCorrectiveActionRepository extends BaseRepository<KPICorrectiveAction, CreateCorrectiveActionDTO, Partial<CreateCorrectiveActionDTO>> {
  constructor() {
    super('kPICorrectiveAction');
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).kPICorrectiveAction;
  }

  async createAction(dto: CreateCorrectiveActionDTO, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).create({
      data: {
        monthlyDetail: { connect: { id: dto.monthlyDetailId } },
        times: dto.times,
        rootCause: dto.rootCause,
        guidelines: dto.guidelines,
        responsiblePerson: dto.responsiblePerson,
        dueDate: dto.dueDate,
      },
    });
  }

  async listByDetailId(detailId: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where: { monthlyDetailId: detailId },
      orderBy: { times: 'asc' },
    });
  }
}
