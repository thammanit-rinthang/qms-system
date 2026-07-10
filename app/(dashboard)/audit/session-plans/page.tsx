import { requireAuth } from "@/lib/auth";

import { db } from "@/lib/db";
import PageHeader from "@/components/common/PageHeader";
import { AuditSessionPlanListClient } from "@/components/audit/AuditSessionPlanListClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "แผนการตรวจติดตาม - QMS" };

export default async function AuditSessionPlansPage() {
  const session = await requireAuth();

  const role = session.user.role;
  const canCreate = role === "QMS" || role === "IT" || role === "MR";

  // All session plans, joined with their appointment
  const plans = await db.auditSessionPlan.findMany({
    include: {
      appointment: { select: { id: true, appointmentNo: true, year: true, title: true, standards: true, status: true } },
      sessions: { select: { id: true } },
      ganttRows: { select: { id: true } },
    },
    orderBy: [{ appointment: { year: "desc" } }, { createdAt: "desc" }],
  });

  // All PUBLISHED appointments without a session plan (can create one)
  const existingAppointmentIds = new Set(plans.map((p) => p.appointmentId));
  const unpaired = canCreate
    ? await db.auditAppointment.findMany({
        where: { status: "PUBLISHED" },
        orderBy: [{ year: "desc" }, { appointmentNo: "asc" }],
        select: { id: true, appointmentNo: true, year: true, title: true, standards: true },
      }).then((rows) => rows.filter((r) => !existingAppointmentIds.has(r.id)))
    : [];

  const serialized = plans.map((p) => ({
    id: p.id,
    appointmentId: p.appointmentId,
    appointmentNo: p.appointment.appointmentNo,
    year: p.appointment.year,
    title: p.appointment.title,
    standards: p.appointment.standards,
    sessionCount: p.sessions.length,
    ganttRowCount: p.ganttRows.length,
    reviseNo: p.reviseNo,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <PageHeader
        title="แผนการตรวจติดตามภายใน"
        subtitle="Internal Audit Session Plans"
      />
      <AuditSessionPlanListClient plans={serialized} unpaired={unpaired} canCreate={canCreate} />
    </div>
  );
}
