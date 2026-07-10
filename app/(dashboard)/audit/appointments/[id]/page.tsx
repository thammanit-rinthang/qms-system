import { requireAuth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { AuditAppointmentService } from "@/services/audit/auditAppointmentService";
import { AuditAppointmentDetailClient } from "@/components/audit/AuditAppointmentDetailClient";
import type { Metadata } from "next";

const svc = new AuditAppointmentService();

export const metadata: Metadata = { title: "ประกาศแต่งตั้ง - QMS" };

export default async function AuditAppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();

  const { id } = await params;
  const raw = await svc.findById(id);
  if (!raw) notFound();

  const authUserId = session.user.authUserId ?? session.user.id;
  const role = session.user.role;
  const isPrivileged = role === "QMS" || role === "IT" || role === "MR";
  const canSubmit = isPrivileged || authUserId === raw.ownerAuthUserId;
  const canCrud = isPrivileged;

  const appt = {
    ...raw,
    ownerSignaturePath: raw.ownerSignaturePath ?? null,
    publishedAt: raw.publishedAt?.toISOString() ?? null,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
    members: raw.members.map((m) => ({ ...m })),
    signoffs: raw.signoffs.map((s) => ({ ...s, signedAt: s.signedAt.toISOString() })),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <AuditAppointmentDetailClient initialData={appt} canSubmit={canSubmit} canCrud={canCrud} />
    </div>
  );
}
