import { requireAuth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AuditSessionPlanClient } from "@/components/audit/AuditSessionPlanClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "แผนการตรวจ - QMS" };

export default async function AuditSessionPlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const session = await requireAuth();

  const role = session.user.role;
  const isPrivileged = role === "QMS" || role === "IT" || role === "MR";

  const { planId } = await params;

  const plan = await db.auditSessionPlan.findUnique({
    where: { id: planId },
    include: {
      appointment: {
        include: { members: { orderBy: { orderIndex: "asc" } } },
      },
      sessions: {
        orderBy: { orderIndex: "asc" },
        include: { teamMembers: { orderBy: [{ role: "asc" }, { name: "asc" }] } },
      },
      ganttRows: { orderBy: { orderIndex: "asc" } },
    },
  });

  if (!plan) notFound();
  if (!isPrivileged && plan.appointment.status !== "PUBLISHED") notFound();

  const appt = plan.appointment;

  const serialized = {
    id: appt.id,
    appointmentNo: appt.appointmentNo,
    year: appt.year,
    title: appt.title,
    standards: appt.standards,
    status: appt.status as string,
    members: appt.members.map((m) => ({
      id: m.id,
      authUserId: m.authUserId,
      name: m.name,
      department: m.department,
      role: m.role,
    })),
    sessionPlan: {
      id: plan.id,
      reviseNo: plan.reviseNo,
      reviseDate: plan.reviseDate?.toISOString() ?? null,
      sessions: plan.sessions.map((s) => ({
        id: s.id,
        orderIndex: s.orderIndex,
        auditDate: s.auditDate.toISOString(),
        startTime: s.startTime,
        endTime: s.endTime,
        department: s.department,
        remark: s.remark,
        teamMembers: s.teamMembers.map((tm) => ({
          id: tm.id,
          role: tm.role,
          name: tm.name,
          authUserId: tm.authUserId,
        })),
      })),
      ganttRows: plan.ganttRows.map((r) => ({
        id: r.id,
        orderIndex: r.orderIndex,
        department: r.department,
        processes: r.processes,
        planWeeks: r.planWeeks,
        actualWeeks: r.actualWeeks,
      })),
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <AuditSessionPlanClient appointment={serialized} canEdit={isPrivileged} />
    </div>
  );
}
