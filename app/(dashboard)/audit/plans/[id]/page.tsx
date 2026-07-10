import { requireAuth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { AuditPlanService } from "@/services/audit/auditPlanService";
import AuditPlanDetailClient from "@/components/audit/AuditPlanDetailClient";
import type { AuditPlanDetail } from "@/types/audit";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "รายละเอียดแผนการตรวจสอบ" };

const auditPlanService = new AuditPlanService();

export default async function AuditPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();

  const { id } = await params;

  let plan;
  try {
    plan = await auditPlanService.getPlanById(id);
  } catch {
    notFound();
  }

  const role = session.user.role;
  const isPrivileged = role === "QMS" || role === "IT" || role === "MR";
  const userId = session.user.authUserId ?? session.user.id;

  const serialized: AuditPlanDetail = {
    ...plan,
    startDate: plan.startDate instanceof Date ? plan.startDate.toISOString() : (plan.startDate ?? null),
    endDate: plan.endDate instanceof Date ? plan.endDate.toISOString() : (plan.endDate ?? null),
    createdAt: plan.createdAt instanceof Date ? plan.createdAt.toISOString() : plan.createdAt,
    updatedAt: plan.updatedAt instanceof Date ? plan.updatedAt.toISOString() : plan.updatedAt,
    appointmentId: plan.appointmentId ?? null,
    departments: plan.departments.map((d) => ({
      id: d.id,
      departmentId: d.departmentId,
      departmentCode: d.departmentCode ?? null,
      departmentName: d.departmentName ?? null,
    })),
    auditors: plan.auditors.map((a) => ({
      id: a.id,
      assigneeAuthUserId: a.assigneeAuthUserId,
      assigneeNameSnapshot: a.assigneeNameSnapshot ?? null,
      assigneeEmailSnapshot: a.assigneeEmailSnapshot ?? null,
      role: a.role,
    })),
    schedules: plan.schedules.map((s) => ({
      id: s.id,
      planId: s.planId,
      sessionTitle: s.sessionTitle,
      location: s.location ?? null,
      agenda: s.agenda ?? null,
      startAt: s.startAt instanceof Date ? s.startAt.toISOString() : s.startAt,
      endAt: s.endAt instanceof Date ? s.endAt.toISOString() : s.endAt,
      departmentId: s.departmentId ?? null,
      departmentName: s.departmentName ?? null,
      contactEmail: s.contactEmail ?? null,
      confirmStatus: (s.confirmStatus ?? "PENDING") as import("@/types/audit").AuditScheduleConfirmStatus,
      unavailableReason: s.unavailableReason ?? null,
      confirmedAt: s.confirmedAt instanceof Date ? s.confirmedAt.toISOString() : (s.confirmedAt ?? null),
      confirmedByName: s.confirmedByName ?? null,
      leadAuditorAuthUserId: s.leadAuditorAuthUserId ?? null,
      leadAuditorNameSnapshot: s.leadAuditorNameSnapshot ?? null,
      leadAuditorEmailSnapshot: s.leadAuditorEmailSnapshot ?? null,
      checklistDueAt: s.checklistDueAt instanceof Date ? s.checklistDueAt.toISOString() : (s.checklistDueAt ?? null),
      checklistSubmittedAt: s.checklistSubmittedAt instanceof Date ? s.checklistSubmittedAt.toISOString() : (s.checklistSubmittedAt ?? null),
      checklistSubmittedByName: s.checklistSubmittedByName ?? null,
      auditeeNotifyDept: s.auditeeNotifyDept,
      team: (s as { team?: { id: string; authUserId: string; nameSnapshot: string | null; emailSnapshot: string | null; role: string }[] }).team?.map((m) => ({
        id: m.id,
        authUserId: m.authUserId,
        nameSnapshot: m.nameSnapshot ?? null,
        emailSnapshot: m.emailSnapshot ?? null,
        role: m.role as import("@/types/audit").AuditTeamRole,
      })) ?? [],
    })),
    announcements: plan.announcements.map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message ?? null,
      deliveryMode: a.deliveryMode ?? null,
      publishedAt: a.publishedAt instanceof Date ? a.publishedAt.toISOString() : (a.publishedAt ?? ""),
    })),
    findings: plan.findings.map((f) => ({
      id: f.id,
      planId: f.planId,
      findingNo: f.findingNo,
      departmentId: f.departmentId ?? null,
      category: f.category,
      severity: f.severity,
      clause: f.clause ?? null,
      title: f.title,
      detail: f.detail,
      evidenceSummary: f.evidenceSummary ?? null,
      ownerAuthUserId: f.ownerAuthUserId ?? null,
      ownerNameSnapshot: f.ownerNameSnapshot ?? null,
      status: f.status,
      dueAt: f.dueAt instanceof Date ? f.dueAt.toISOString() : (f.dueAt ?? null),
      createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : f.createdAt,
      updatedAt: f.updatedAt instanceof Date ? f.updatedAt.toISOString() : f.updatedAt,
    })),
    signoffs: plan.signoffs.map((s) => ({
      id: s.id,
      signerAuthUserId: s.signedByAuthUserId,
      signerNameSnapshot: (s as { signerNameSnapshot?: string | null }).signerNameSnapshot ?? null,
      signedRole: s.signedRole,
      signedAt: s.signedAt instanceof Date ? s.signedAt.toISOString() : s.signedAt,
    })),
    report: plan.report
      ? {
          id: plan.report.id,
          reportNo: plan.report.id,
          summary: plan.report.summary ?? null,
          conclusion: plan.report.conclusion ?? null,
          generatedAt: plan.report.generatedAt instanceof Date ? plan.report.generatedAt.toISOString() : (plan.report.generatedAt ?? ""),
          pdfFileUrl: plan.report.pdfFileUrl ?? null,
        }
      : null,
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <AuditPlanDetailClient
        plan={serialized}
        userId={userId}
        userRole={role}
        isPrivileged={isPrivileged}
      />
    </div>
  );
}
