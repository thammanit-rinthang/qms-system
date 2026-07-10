import { requireAuth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { AuditAppointmentService } from "@/services/audit/auditAppointmentService";
import { AuditAppointmentApproveClient } from "@/components/audit/AuditAppointmentApproveClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "อนุมัติประกาศแต่งตั้ง - QMS" };

const svc = new AuditAppointmentService();

export default async function AppointmentApproverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();

  const { id } = await params;
  const raw = await svc.findById(id);
  if (!raw) notFound();

  const appt = {
    ...raw,
    publishedAt: raw.publishedAt?.toISOString() ?? null,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
    members: raw.members.map((m) => ({ ...m })),
    signoffs: raw.signoffs.map((s) => ({ ...s, signedAt: s.signedAt.toISOString() })),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <AuditAppointmentApproveClient appt={appt} mode="approver" />
    </div>
  );
}
