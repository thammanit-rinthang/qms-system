import { BaseRepository } from "../baseRepository";
import { AuditSchedule, Prisma } from "@/generated/prisma/client";

export class AuditScheduleRepository extends BaseRepository<AuditSchedule> {
  constructor() {
    super("auditSchedule");
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).auditSchedule;
  }

  async findByPlanId(planId: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where: { planId },
      include: { team: { orderBy: { role: "asc" } } },
      orderBy: { startAt: "asc" },
    });
  }

  async findWithPlan(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      include: {
        plan: {
          select: {
            id: true,
            title: true,
            auditNo: true,
            ownerAuthUserId: true,
            ownerEmail: true,
            ownerNameSnapshot: true,
          },
        },
      },
    });
  }

  async markChecklistSubmitted(
    scheduleId: string,
    data: { submittedAt: Date; submittedByUserId: string; submittedByName: string },
    tx?: Prisma.TransactionClient
  ) {
    return this.delegate(tx).update({
      where: { id: scheduleId },
      data: {
        checklistSubmittedAt: data.submittedAt,
        checklistSubmittedByUserId: data.submittedByUserId,
        checklistSubmittedByName: data.submittedByName,
      },
    });
  }
}
