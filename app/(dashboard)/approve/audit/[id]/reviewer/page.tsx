import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import AuditPlanApproveClient from "@/components/audit/AuditPlanApproveClient";

export const metadata: Metadata = { title: "Audit Plan — Review" };

export default async function AuditPlanReviewerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAuth();

  const [plan, attachments] = await Promise.all([
    db.auditPlan.findUnique({
      where: { id },
      include: {
        signoffs: { orderBy: { signedAt: "asc" } },
        auditors: { orderBy: { assignedAt: "asc" } },
        departments: { orderBy: { departmentName: "asc" } },
        schedules: { include: { team: true }, orderBy: { startAt: "asc" } },
      },
    }),
    db.auditAttachment.findMany({
      where: { resourceType: "PLAN", resourceId: id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!plan || plan.status !== "PENDING_REVIEW") notFound();

  const actorId = session.user.authUserId ?? session.user.id;
  const privileged = ["QMS", "IT", "MR"].includes(session.user.role);
  if (!privileged && actorId !== plan.reviewerAuthUserId) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <AuditPlanApproveClient
        mode="reviewer"
        plan={{
          id: plan.id,
          auditNo: plan.auditNo,
          title: plan.title,
          auditType: plan.auditType,
          status: plan.status,
          scope: plan.scope ?? null,
          objective: plan.objective ?? null,
          summary: plan.summary ?? null,
          standards: plan.standards,
          standard: plan.standard ?? null,
          ownerNameSnapshot: plan.ownerNameSnapshot ?? null,
          reviewerNameSnapshot: plan.reviewerNameSnapshot ?? null,
          approverNameSnapshot: plan.approverNameSnapshot ?? null,
          startDate: plan.startDate?.toISOString() ?? null,
          endDate: plan.endDate?.toISOString() ?? null,
          signoffs: plan.signoffs.map((s) => ({
            signedRole: s.signedRole,
            signerNameSnapshot: s.signerNameSnapshot ?? null,
            signedAt: s.signedAt.toISOString(),
            signaturePath: s.signaturePath ?? null,
          })),
          auditors: plan.auditors.map((a) => ({
            assigneeNameSnapshot: a.assigneeNameSnapshot ?? null,
            assigneeEmailSnapshot: a.assigneeEmailSnapshot ?? null,
            role: a.role,
          })),
          departments: plan.departments.map((d) => ({
            departmentName: d.departmentName ?? null,
            departmentCode: d.departmentCode ?? null,
          })),
          schedules: plan.schedules.map((s) => ({
            id: s.id,
            startAt: s.startAt.toISOString(),
            endAt: s.endAt.toISOString(),
            departmentName: s.departmentName ?? null,
            sessionTitle: s.sessionTitle,
            remark: s.unavailableReason ?? null,
            team: s.team.map((tm) => ({ role: tm.role, name: tm.nameSnapshot ?? null })),
          })),
          attachments: attachments.map((a) => ({
            id: a.id,
            fileName: a.fileName,
            mimeType: a.mimeType ?? null,
            sharePointItemId: a.sharePointItemId ?? null,
            spDownloadUrl: a.spDownloadUrl ?? null,
            fileUrl: a.fileUrl ?? null,
          })),
        }}
      />
    </div>
  );
}
