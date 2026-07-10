/**
 * Audit plan workflow service — submit → review → approve flow.
 * Manages PENDING_REVIEW → PENDING_APPROVAL → PLANNED transitions.
 * Does NOT touch the READY_TO_CLOSE sign flow (that stays in auditSignReportService).
 */

import { db } from "@/lib/db";
import { AuditService } from "@/services/auditService";
import { AuditPlanRepository } from "@/repositories/audit/auditPlanRepository";

const planRepo = new AuditPlanRepository();
import { ActionTokenService } from "@/services/actionTokenService";
import { sendSignRequestOnce, sendAnnouncementOnce, sendRejectionOnce, sendApprovedNotifyOnce, notifyAuditUser } from "./auditNotificationService";
import { sendDeptScheduleApprovalEmail } from "./auditEmailService";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { AuditPlanSubmitInput } from "@/lib/validations/audit";

type Actor = {
  userId: string;
  authUserId?: string | null;
  role: string;
  accessToken?: string | null;
  nameSnapshot?: string | null;
  signaturePath?: string | null;
};

const PRIVILEGED = new Set(["QMS", "IT", "MR"]);

function isPrivileged(role: string) {
  return PRIVILEGED.has(role);
}

// ── Submit (DRAFT → PENDING_REVIEW) ──────────────────────────────────────────

export async function submitPlan(
  planId: string,
  input: AuditPlanSubmitInput,
  actor: Actor
) {
  const plan = await planRepo.findWithAuditors(planId);
  if (!plan) throw new NotFoundError("Audit plan not found");
  if (plan.status !== "DRAFT") {
    throw new ValidationError(`Plan must be in DRAFT to submit (current: ${plan.status})`);
  }

  const actorId = actor.authUserId ?? actor.userId;
  if (!isPrivileged(actor.role) && actorId !== plan.ownerAuthUserId) {
    throw new ForbiddenError("Only the plan owner or QMS/MR/IT can submit this plan");
  }

  const updated = await db.$transaction(async (tx) => {
    const p = await tx.auditPlan.update({
      where: { id: planId },
      data: {
        status: "PENDING_REVIEW",
        reviewerAuthUserId: input.reviewerAuthUserId,
        reviewerEmail: input.reviewerEmail,
        reviewerNameSnapshot: input.reviewerNameSnapshot ?? null,
        approverAuthUserId: input.approverAuthUserId,
        approverEmail: input.approverEmail,
        approverNameSnapshot: input.approverNameSnapshot ?? null,
        emailGroupMails: input.emailGroupMails,
      },
    });

    await tx.auditSignoff.create({
      data: {
        planId,
        signedByAuthUserId: actorId,
        signedRole: input.signedRole,
        signType: "IN_APP",
        signerNameSnapshot: actor.nameSnapshot ?? null,
        signaturePath: input.signaturePath ?? null,
      },
    });

    await AuditService.record(
      {
        actorUserId: actor.userId,
        actorAuthUserId: actor.authUserId,
        actorRole: actor.role,
        action: "UPDATE",
        resourceType: "AUDIT_PLAN",
        resourceId: planId,
        before: { status: "DRAFT" },
        after: { status: "PENDING_REVIEW", reviewerAuthUserId: input.reviewerAuthUserId },
        metadata: { action: "SUBMIT" },
      },
      tx
    );

    return p;
  });

  // Fire-and-forget: notify reviewer
  _issueTokenAndNotify(planId, updated.auditNo, updated.title, {
    targetAuthUserId: input.reviewerAuthUserId,
    targetEmail: input.reviewerEmail,
    targetName: input.reviewerNameSnapshot ?? input.reviewerEmail,
    signedRole: "REVIEWER",
    senderAccessToken: actor.accessToken,
  }).catch((err) =>
    logger.error("[auditWorkflow] failed to issue token/notify reviewer", {
      planId,
      signedRole: "REVIEWER",
      error: String(err),
    })
  );

  return updated;
}

// ── Review (PENDING_REVIEW → PENDING_APPROVAL) ────────────────────────────────

export async function reviewPlan(planId: string, actor: Actor) {
  const plan = await planRepo.findById(planId);
  if (!plan) throw new NotFoundError("Audit plan not found");
  if (plan.status !== "PENDING_REVIEW") {
    throw new ValidationError(`Plan must be in PENDING_REVIEW to review (current: ${plan.status})`);
  }

  const actorId = actor.authUserId ?? actor.userId;
  if (!isPrivileged(actor.role) && actorId !== plan.reviewerAuthUserId) {
    throw new ForbiddenError("Only the assigned reviewer or QMS/MR/IT can review this plan");
  }

  const updated = await db.$transaction(async (tx) => {
    await tx.auditSignoff.create({
      data: {
        planId,
        signedByAuthUserId: actorId,
        signedRole: "REVIEWER",
        signType: "IN_APP",
        signerNameSnapshot: actor.nameSnapshot ?? null,
        signaturePath: actor.signaturePath ?? null,
      },
    });

    const p = await tx.auditPlan.update({
      where: { id: planId },
      data: { status: "PENDING_APPROVAL" },
    });

    await AuditService.record(
      {
        actorUserId: actor.userId,
        actorAuthUserId: actor.authUserId,
        actorRole: actor.role,
        action: "UPDATE",
        resourceType: "AUDIT_PLAN",
        resourceId: planId,
        before: { status: "PENDING_REVIEW" },
        after: { status: "PENDING_APPROVAL" },
        metadata: { action: "REVIEW" },
      },
      tx
    );

    return p;
  });

  // Fire-and-forget: notify approver (email + in-app)
  if (plan.approverAuthUserId && plan.approverEmail) {
    _issueTokenAndNotify(planId, updated.auditNo, updated.title, {
      targetAuthUserId: plan.approverAuthUserId,
      targetEmail: plan.approverEmail,
      targetName: plan.approverNameSnapshot ?? plan.approverEmail,
      signedRole: "APPROVER",
      senderAccessToken: actor.accessToken,
    }).catch((err) =>
      logger.error("[auditWorkflow] failed to issue token/notify approver", {
        planId,
        signedRole: "APPROVER",
        error: String(err),
      })
    );
  }

  // In-app: notify plan owner that reviewer has signed
  if (plan.ownerAuthUserId && plan.ownerAuthUserId !== actorId) {
    notifyAuditUser({
      recipientAuthUserId: plan.ownerAuthUserId,
      title: `Reviewer ลงนามแล้ว — ${updated.auditNo}`,
      body: `${actor.nameSnapshot ?? "Reviewer"} ลงนามในแผน "${updated.title}" แล้ว รอ Approver อนุมัติ`,
      planId,
    });
  }

  return updated;
}

// ── Approve (PENDING_APPROVAL → PLANNED) ──────────────────────────────────────

export async function approvePlan(planId: string, actor: Actor) {
  const plan = await planRepo.findDetailById(planId);
  if (!plan) throw new NotFoundError("Audit plan not found");
  if (plan.status !== "PENDING_APPROVAL") {
    throw new ValidationError(`Plan must be in PENDING_APPROVAL to approve (current: ${plan.status})`);
  }

  const actorId = actor.authUserId ?? actor.userId;
  if (!isPrivileged(actor.role) && actorId !== plan.approverAuthUserId) {
    throw new ForbiddenError("Only the assigned approver or QMS/MR/IT can approve this plan");
  }

  const updated = await db.$transaction(async (tx) => {
    await tx.auditSignoff.create({
      data: {
        planId,
        signedByAuthUserId: actorId,
        signedRole: "APPROVER",
        signType: "IN_APP",
        signerNameSnapshot: actor.nameSnapshot ?? null,
        signaturePath: actor.signaturePath ?? null,
      },
    });

    const p = await tx.auditPlan.update({
      where: { id: planId },
      data: { status: "PLANNED" },
    });

    await AuditService.record(
      {
        actorUserId: actor.userId,
        actorAuthUserId: actor.authUserId,
        actorRole: actor.role,
        action: "UPDATE",
        resourceType: "AUDIT_PLAN",
        resourceId: planId,
        before: { status: "PENDING_APPROVAL" },
        after: { status: "PLANNED" },
        metadata: { action: "APPROVE" },
      },
      tx
    );

    return p;
  });

  // Fire-and-forget: send announcement email to email groups + all auditors
  const auditorEmails = plan.auditors
    .filter((a) => !!a.assigneeEmailSnapshot)
    .map((a) => ({
      name: a.assigneeNameSnapshot ?? a.assigneeEmailSnapshot!,
      email: a.assigneeEmailSnapshot!,
      authUserId: a.assigneeAuthUserId,
    }));

  const groupRecipients = plan.emailGroupMails.map((mail) => ({
    name: mail,
    email: mail,
  }));

  const allRecipients = [...groupRecipients, ...auditorEmails];

  if (allRecipients.length > 0) {
    sendAnnouncementOnce({
      planId,
      auditNo: updated.auditNo,
      planTitle: updated.title,
      auditType: updated.auditType,
      startDate: updated.startDate?.toISOString() ?? null,
      endDate: updated.endDate?.toISOString() ?? null,
      scope: updated.scope ?? null,
      departments: plan.departments.map((d) => ({ name: d.departmentName ?? null, code: d.departmentCode ?? null })),
      auditors: plan.auditors.map((a) => ({ name: a.assigneeNameSnapshot ?? null, role: a.role })),
      message: `แผนการตรวจสอบ ${updated.auditNo} ได้รับการอนุมัติแล้ว`,
      recipients: allRecipients,
      senderAccessToken: actor.accessToken,
    }).catch((err) => {
      logger.error("[auditWorkflow] approval announcement email failed", { planId, error: String(err) });
    });
  }

  // In-app: notify all auditors + plan owner
  const notifyIds = new Set<string>();
  plan.auditors.forEach((a) => notifyIds.add(a.assigneeAuthUserId));
  if (plan.ownerAuthUserId) notifyIds.add(plan.ownerAuthUserId);
  notifyIds.delete(actorId); // don't notify the approver themselves

  for (const uid of notifyIds) {
    notifyAuditUser({
      recipientAuthUserId: uid,
      title: `แผนได้รับการอนุมัติ — ${updated.auditNo}`,
      body: `แผนการตรวจสอบ "${updated.title}" ได้รับการอนุมัติครบแล้ว พร้อมดำเนินการ`,
      planId,
    });
  }

  // Fire-and-forget: send per-department schedule emails
  for (const s of plan.schedules) {
    if (!s.contactEmail || !s.departmentName) continue;
    sendDeptScheduleApprovalEmail({
      to: { name: s.departmentName, email: s.contactEmail },
      planTitle: updated.title,
      auditNo: updated.auditNo,
      departmentName: s.departmentName,
      sessionTitle: s.sessionTitle,
      startAt: s.startAt.toISOString(),
      endAt: s.endAt.toISOString(),
      location: s.location,
      leadAuditorName: s.leadAuditorNameSnapshot,
      planId,
      senderAccessToken: actor.accessToken,
    }).catch((err) => logger.warn("[auditWorkflow] dept schedule email failed", { scheduleId: s.id, error: String(err) }));
  }

  // Email + in-app: notify reviewer that plan is fully approved
  if (plan.reviewerAuthUserId && plan.reviewerAuthUserId !== actorId) {
    sendApprovedNotifyOnce({
      planId,
      auditNo: updated.auditNo,
      planTitle: updated.title,
      reviewerAuthUserId: plan.reviewerAuthUserId,
      reviewerName: plan.reviewerNameSnapshot ?? "ผู้ตรวจสอบ",
      reviewerEmail: plan.reviewerEmail ?? null,
      approverName: actor.nameSnapshot ?? actorId,
      senderAccessToken: actor.accessToken,
    }).catch((err) => {
      logger.error("[auditWorkflow] approved reviewer-notify failed", { planId, error: String(err) });
    });
  }

  return updated;
}

// ── Reject (PENDING_REVIEW | PENDING_APPROVAL → DRAFT) ───────────────────────

export async function rejectPlan(planId: string, input: { reason: string; signedRole: "REVIEWER" | "APPROVER" }, actor: Actor) {
  const plan = await planRepo.findById(planId);
  if (!plan) throw new NotFoundError("Audit plan not found");

  const validStatuses = input.signedRole === "REVIEWER" ? ["PENDING_REVIEW"] : ["PENDING_APPROVAL"];
  if (!validStatuses.includes(plan.status)) {
    throw new ValidationError(`Cannot reject plan in status: ${plan.status}`);
  }

  const actorId = actor.authUserId ?? actor.userId;
  const assignedField = input.signedRole === "REVIEWER" ? plan.reviewerAuthUserId : plan.approverAuthUserId;
  if (!isPrivileged(actor.role) && actorId !== assignedField) {
    throw new ForbiddenError("Only the assigned reviewer/approver or QMS/MR/IT can reject this plan");
  }

  const updated = await db.$transaction(async (tx) => {
    const p = await tx.auditPlan.update({
      where: { id: planId },
      data: { status: "DRAFT", rejectReason: input.reason },
    });

    await AuditService.record(
      {
        actorUserId: actor.userId,
        actorAuthUserId: actor.authUserId,
        actorRole: actor.role,
        action: "REJECT",
        resourceType: "AUDIT_PLAN",
        resourceId: planId,
        before: { status: plan.status },
        after: { status: "DRAFT" },
        metadata: { action: "REJECT", signedRole: input.signedRole, reason: input.reason },
      },
      tx
    );

    return p;
  });

  // Email + in-app: notify owner
  if (plan.ownerAuthUserId && plan.ownerAuthUserId !== actorId) {
    sendRejectionOnce({
      planId,
      auditNo: updated.auditNo,
      planTitle: updated.title,
      ownerAuthUserId: plan.ownerAuthUserId,
      ownerName: plan.ownerNameSnapshot ?? "เจ้าของแผน",
      ownerEmail: plan.ownerEmail ?? null,
      rejectedBy: actor.nameSnapshot ?? actorId,
      rejectedRole: input.signedRole,
      reason: input.reason,
      senderAccessToken: actor.accessToken,
    }).catch((err) => {
      logger.error("[auditWorkflow] rejection notification failed", { planId, error: String(err) });
    });
  }

  return updated;
}

// ── Private helper ─────────────────────────────────────────────────────────────

async function _issueTokenAndNotify(
  planId: string,
  auditNo: string,
  planTitle: string,
  opts: {
    targetAuthUserId: string;
    targetEmail: string;
    targetName: string;
    signedRole: string;
    senderAccessToken?: string | null;
  }
) {
  try {
    await ActionTokenService.revokeByDocumentAndRecipient("AUDIT", planId, opts.targetAuthUserId);
    const token = await ActionTokenService.issue({
      module: "AUDIT",
      documentId: planId,
      role: "AUDIT_SIGNER",
      issuedTo: opts.targetAuthUserId,
      metadata: { signedRole: opts.signedRole, planId },
    });

    await sendSignRequestOnce({
      planId,
      auditNo,
      planTitle,
      token,
      signedRole: opts.signedRole,
      targetAuthUserId: opts.targetAuthUserId,
      targetEmail: opts.targetEmail,
      targetName: opts.targetName,
      senderAccessToken: opts.senderAccessToken,
    });
  } catch (err) {
    logger.error("[auditWorkflow] failed to issue token/notify", { planId, signedRole: opts.signedRole, error: String(err) });
  }
}
