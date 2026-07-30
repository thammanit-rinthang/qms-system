import { requireAuth } from "@/lib/auth";
import PageHeader from "@/components/common/PageHeader";
import { AuditAppointmentService } from "@/services/audit/auditAppointmentService";
import AuditAppointmentsPageClient from "./AuditAppointmentsPageClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ประกาศแต่งตั้งผู้ตรวจ - QMS" };

const svc = new AuditAppointmentService();

export default async function AuditAppointmentsPage() {
  const session = await requireAuth();

  const role = session.user.role;
  const canCreate = role === "QMS" || role === "IT" || role === "MR";
  const canCrud = canCreate;

  const raw = await svc.findAll();
  const initialData = raw.map((a) => ({
    ...a,
    publishedAt: a.publishedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    members: a.members.map((m) => ({ ...m })),
    signoffs: a.signoffs.map((s) => ({ ...s, signedAt: s.signedAt.toISOString() })),
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="ประกาศแต่งตั้งผู้ตรวจติดตามภายใน"
        subtitle="Internal Audit Appointment Letters"
      />
      <AuditAppointmentsPageClient initialData={initialData} canCreate={canCreate} canCrud={canCrud} />
    </div>
  );
}
