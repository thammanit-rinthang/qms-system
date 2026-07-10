import { BaseRepository } from "../baseRepository";
import { AuditSessionPlan, Prisma } from "@/generated/prisma/client";

const SESSION_INCLUDE = {
  sessions: {
    orderBy: { orderIndex: "asc" as const },
    include: { teamMembers: { orderBy: [{ role: "asc" as const }, { name: "asc" as const }] } },
  },
  ganttRows: { orderBy: { orderIndex: "asc" as const } },
};

const SESSION_INCLUDE_WITH_APPOINTMENT = {
  appointment: true,
  ...SESSION_INCLUDE,
};

export class AuditSessionPlanRepository extends BaseRepository<AuditSessionPlan> {
  constructor() {
    super("auditSessionPlan");
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).auditSessionPlan;
  }

  async findByAppointmentId(appointmentId: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { appointmentId },
      include: SESSION_INCLUDE,
    });
  }

  async findDetailById(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      include: SESSION_INCLUDE_WITH_APPOINTMENT,
    });
  }

  async upsertForAppointment(appointmentId: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).auditSessionPlan.upsert({
      where: { appointmentId },
      update: {},
      create: { appointmentId, reviseNo: 0 },
    });
  }

  async saveByAppointment(
    appointmentId: string,
    data: {
      reviseNo?: number;
      reviseDate?: string | null;
      sessions: {
        orderIndex: number;
        auditDate: string;
        startTime: string;
        endTime: string;
        department: string;
        remark?: string | null;
        teamMembers: { role: string; name: string; authUserId?: string | null }[];
      }[];
      ganttRows: {
        orderIndex: number;
        department: string;
        processes: string[];
        planWeeks: string[];
        actualWeeks: string[];
      }[];
    },
    tx?: Prisma.TransactionClient
  ) {
    const client = this.getClient(tx);
    const existing = await client.auditSessionPlan.findUnique({ where: { appointmentId } });

    let planId: string;
    if (existing) {
      await client.auditSessionPlan.update({
        where: { id: existing.id },
        data: {
          reviseNo: data.reviseNo ?? existing.reviseNo,
          reviseDate: data.reviseDate ? new Date(data.reviseDate) : existing.reviseDate,
        },
      });
      planId = existing.id;
      await client.auditSessionRow.deleteMany({ where: { planId } });
      await client.auditGanttRow.deleteMany({ where: { planId } });
    } else {
      const created = await client.auditSessionPlan.create({
        data: {
          appointmentId,
          reviseNo: data.reviseNo ?? 0,
          reviseDate: data.reviseDate ? new Date(data.reviseDate) : null,
        },
      });
      planId = created.id;
    }

    for (const s of data.sessions) {
      const row = await client.auditSessionRow.create({
        data: {
          planId,
          orderIndex: s.orderIndex,
          auditDate: new Date(s.auditDate),
          startTime: s.startTime,
          endTime: s.endTime,
          department: s.department,
          remark: s.remark ?? null,
        },
      });
      if (s.teamMembers.length) {
        await client.auditSessionTeamMember.createMany({
          data: s.teamMembers.map((m) => ({
            sessionId: row.id,
            role: m.role,
            name: m.name,
            authUserId: m.authUserId ?? null,
          })),
        });
      }
    }

    if (data.ganttRows.length) {
      await client.auditGanttRow.createMany({
        data: data.ganttRows.map((r) => ({
          planId,
          orderIndex: r.orderIndex,
          department: r.department,
          processes: r.processes,
          planWeeks: r.planWeeks,
          actualWeeks: r.actualWeeks,
        })),
      });
    }

    return client.auditSessionPlan.findUnique({
      where: { id: planId },
      include: SESSION_INCLUDE,
    });
  }

  async saveById(
    planId: string,
    data: {
      reviseNo?: number;
      reviseDate?: string | null;
      sessions: {
        orderIndex: number;
        auditDate: string;
        startTime: string;
        endTime: string;
        department: string;
        remark?: string | null;
        teamMembers: { role: string; name: string; authUserId?: string | null }[];
      }[];
      ganttRows: {
        orderIndex: number;
        department: string;
        processes: string[];
        planWeeks: string[];
        actualWeeks: string[];
      }[];
    },
    existing: AuditSessionPlan,
    tx?: Prisma.TransactionClient
  ) {
    const client = this.getClient(tx);

    await client.auditSessionPlan.update({
      where: { id: planId },
      data: {
        reviseNo: data.reviseNo ?? existing.reviseNo,
        reviseDate: data.reviseDate ? new Date(data.reviseDate) : existing.reviseDate,
      },
    });

    await client.auditSessionRow.deleteMany({ where: { planId } });
    await client.auditGanttRow.deleteMany({ where: { planId } });

    for (const s of data.sessions) {
      const row = await client.auditSessionRow.create({
        data: {
          planId,
          orderIndex: s.orderIndex,
          auditDate: new Date(s.auditDate),
          startTime: s.startTime,
          endTime: s.endTime,
          department: s.department,
          remark: s.remark ?? null,
        },
      });
      if (s.teamMembers.length) {
        await client.auditSessionTeamMember.createMany({
          data: s.teamMembers.map((m) => ({
            sessionId: row.id,
            role: m.role,
            name: m.name,
            authUserId: m.authUserId ?? null,
          })),
        });
      }
    }

    if (data.ganttRows.length) {
      await client.auditGanttRow.createMany({
        data: data.ganttRows.map((r) => ({
          planId,
          orderIndex: r.orderIndex,
          department: r.department,
          processes: r.processes,
          planWeeks: r.planWeeks,
          actualWeeks: r.actualWeeks,
        })),
      });
    }

    return client.auditSessionPlan.findUnique({
      where: { id: planId },
      include: SESSION_INCLUDE_WITH_APPOINTMENT,
    });
  }
}
