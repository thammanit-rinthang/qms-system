import { requireAuth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AuditSessionPlanClient } from "@/components/audit/AuditSessionPlanClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "แผนการตรวจ - QMS" };

export default async function AuditSessionPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();

  const role = session.user.role;
  const isPrivileged = role === "QMS" || role === "IT" || role === "MR";

  const { id } = await params;

  const appt = await db.auditAppointment.findUnique({
    where: { id },
    include: {
      members: { orderBy: { orderIndex: "asc" } },
      sessionPlan: {
        include: {
          sessions: {
            orderBy: { orderIndex: "asc" },
            include: {
              teamMembers: { orderBy: [{ role: "asc" }, { name: "asc" }] },
            },
          },
          ganttRows: { orderBy: { orderIndex: "asc" } },
        },
      },
    },
  });

  if (!appt) notFound();
  if (appt.status !== "PUBLISHED" && !isPrivileged) notFound();

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
    sessionPlan: appt.sessionPlan
      ? {
          id: appt.sessionPlan.id,
          reviseNo: appt.sessionPlan.reviseNo,
          reviseDate: appt.sessionPlan.reviseDate?.toISOString() ?? null,
          sessions: appt.sessionPlan.sessions.map((s) => ({
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
          ganttRows: appt.sessionPlan.ganttRows.map((r) => ({
            id: r.id,
            orderIndex: r.orderIndex,
            department: r.department,
            processes: r.processes,
            planWeeks: r.planWeeks,
            actualWeeks: r.actualWeeks,
          })),
        }
      : null,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <AuditSessionPlanClient appointment={serialized} canEdit={isPrivileged} />
    </div>
  );
}
