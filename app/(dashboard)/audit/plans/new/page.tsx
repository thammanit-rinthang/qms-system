import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { AuditPlanCreatePage } from "@/components/audit/AuditPlanCreatePage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "สร้างแผนการตรวจสอบ - QMS" };

export default async function NewAuditPlanPage() {
  await requireRole("QMS", "IT", "MR");

  const [appointments, standards] = await Promise.all([
    db.auditAppointment.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true,
        appointmentNo: true,
        year: true,
        title: true,
        standards: true,
        members: {
          select: { authUserId: true, name: true, role: true },
          orderBy: { orderIndex: "asc" },
        },
      },
      orderBy: [{ year: "desc" }, { appointmentNo: "asc" }],
    }),
    db.auditStandard.findMany({ where: { active: true }, select: { id: true, name: true } }),
  ]);

  return (
    <AuditPlanCreatePage
      appointments={appointments.map((a) => ({
        id: a.id,
        appointmentNo: a.appointmentNo,
        year: a.year,
        title: a.title,
        standards: a.standards,
        members: a.members.map((m) => ({ authUserId: m.authUserId, name: m.name, role: m.role })),
      }))}
      dbStandards={standards}
    />
  );
}
