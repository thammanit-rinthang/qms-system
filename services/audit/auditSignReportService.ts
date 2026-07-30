import { db } from "@/lib/db";
import { AuditService } from "@/services/auditService";
import { AuditPlanRepository } from "@/repositories/audit/auditPlanRepository";
import { logger } from "@/lib/logger";
import { ActionTokenService } from "@/services/actionTokenService";
import { sendSignRequestOnce } from "./auditNotificationService";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import type { AuditInAppSignInput, AuditSignRequestInput, AuditSignConsumeInput, AuditReportInput } from "@/lib/validations/audit";

type Actor = { userId: string; authUserId?: string | null; role: string; accessToken?: string | null };

export class AuditSignReportService {
  private planRepo = new AuditPlanRepository();

  // ── In-App Sign ───────────────────────────────────────────────────────────

  async signInApp(planId: string, input: AuditInAppSignInput, actor: Actor) {
    const plan = await this.loadPlan(planId);
    if (plan.status === "CLOSED" || plan.status === "CANCELLED") {
      throw new ValidationError(`Cannot sign a plan in status ${plan.status}`);
    }
    // B-2: plan must be in READY_TO_CLOSE before signing
    if (plan.status !== "READY_TO_CLOSE") {
      throw new ValidationError("Plan must be in READY_TO_CLOSE status to sign.");
    }
    // B-3: prevent duplicate signatures from the same actor
    const actorId = actor.authUserId ?? actor.userId;
    const existing = await this.planRepo.findSignoff(planId, actorId);
    if (existing) {
      throw new ValidationError("You have already signed this plan.");
    }
    this.assertSignAuthority(plan, actor);

    return db.$transaction(async (tx) => {
      const signoff = await tx.auditSignoff.create({
        data: {
          planId,
          signedByAuthUserId: actor.authUserId ?? actor.userId,
          signedRole: input.signedRole,
          signType: "IN_APP",
        },
      });

      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actor.authUserId,
          actorRole: actor.role,
          action: "SIGN",
          resourceType: "AUDIT_PLAN",
          resourceId: planId,
          after: { signedRole: input.signedRole, signType: "IN_APP" },
        },
        tx
      );

      return signoff;
    });
  }

  // ── Issue Token Sign Request ───────────────────────────────────────────────

  async issueSignRequest(planId: string, input: AuditSignRequestInput, actor: Actor) {
    const plan = await this.loadPlan(planId);
    if (plan.status === "CLOSED" || plan.status === "CANCELLED") {
      throw new ValidationError(`Cannot issue sign request for a plan in status ${plan.status}`);
    }
    // Only privileged roles can issue sign requests
    if (actor.role !== "QMS" && actor.role !== "IT" && actor.role !== "MR") {
      throw new ForbiddenError("Only QMS/MR/IT can issue sign requests");
    }

    // H-1: revoke only the previous token for the same recipient, not all plan tokens
    const targetAuthUserId = input.targetAuthUserId;
    await ActionTokenService.revokeByDocumentAndRecipient("AUDIT", planId, targetAuthUserId);

    const token = await ActionTokenService.issue({
      module: "AUDIT",
      documentId: planId,
      role: "AUDIT_SIGNER",
      issuedTo: input.targetAuthUserId,
      metadata: { signedRole: input.signedRole, planId },
    });

    // Fire-and-forget — don't block the response on email
    sendSignRequestOnce({
      planId,
      auditNo: plan.auditNo,
      planTitle: plan.title,
      token,
      signedRole: input.signedRole,
      targetAuthUserId: input.targetAuthUserId,
      targetEmail: input.targetEmail,
      targetName: input.targetName ?? input.targetEmail,
      senderAccessToken: actor.accessToken,
    }).catch((err) => {
      logger.error("[auditSign] sign request email failed", { planId, error: String(err) });
    });

    return { token, planId };
  }

  // ── Consume Token Sign ────────────────────────────────────────────────────

  async consumeTokenSign(planId: string, input: AuditSignConsumeInput, actor: Actor) {
    const verified = await ActionTokenService.verify(input.token, actor.authUserId ?? actor.userId);

    if (verified.module !== "AUDIT" || verified.documentId !== planId) {
      throw new ValidationError("Token is not valid for this audit plan");
    }

    return db.$transaction(async (tx) => {
      const signoff = await tx.auditSignoff.create({
        data: {
          planId,
          signedByAuthUserId: actor.authUserId ?? actor.userId,
          signedRole: input.signedRole,
          signType: "TOKEN_LINK",
          tokenId: verified.id,
        },
      });

      await ActionTokenService.markUsed(input.token);

      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actor.authUserId,
          actorRole: actor.role,
          action: "SIGN",
          resourceType: "AUDIT_PLAN",
          resourceId: planId,
          after: { signedRole: input.signedRole, signType: "TOKEN_LINK" },
        },
        tx
      );

      return signoff;
    });
  }

  // ── Generate Report ───────────────────────────────────────────────────────

  async generateReport(planId: string, input: AuditReportInput, actor: Actor) {
    const plan = await this.loadPlan(planId);
    if (plan.status === "CANCELLED") {
      throw new ValidationError("Cannot generate report for a cancelled plan");
    }
    this.assertSignAuthority(plan, actor);

    return db.$transaction(async (tx) => {
      const report = await tx.auditReport.upsert({
        where: { planId },
        create: {
          planId,
          summary: input.summary ?? null,
          conclusion: input.conclusion ?? null,
          generatedAt: new Date(),
          generatedByAuthUserId: actor.authUserId ?? actor.userId,
        },
        update: {
          summary: input.summary ?? null,
          conclusion: input.conclusion ?? null,
          generatedAt: new Date(),
          generatedByAuthUserId: actor.authUserId ?? actor.userId,
        },
      });

      // ponytail: advance status to READY_TO_CLOSE if currently IN_PROGRESS/WAITING_CORRECTIVE
      const advanceable = new Set(["IN_PROGRESS", "WAITING_CORRECTIVE", "ANNOUNCED"]);
      if (advanceable.has(plan.status)) {
        await tx.auditPlan.update({ where: { id: planId }, data: { status: "READY_TO_CLOSE" } });
      }

      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actor.authUserId,
          actorRole: actor.role,
          action: "GENERATE_REPORT",
          resourceType: "AUDIT_REPORT",
          resourceId: report.id,
          after: { planId, generatedAt: report.generatedAt },
        },
        tx
      );

      return report;
    });
  }

  // ── Mark Audit Complete (QMS → READY_TO_CLOSE) ───────────────────────────

  async markComplete(planId: string, actor: Actor) {
    const plan = await this.loadPlan(planId);
    const completeable = new Set(["PLANNED", "ANNOUNCED", "IN_PROGRESS", "WAITING_CORRECTIVE"]);
    if (!completeable.has(plan.status)) {
      throw new ValidationError(`Cannot mark complete from status ${plan.status}`);
    }

    return db.$transaction(async (tx) => {
      await tx.auditPlan.update({ where: { id: planId }, data: { status: "READY_TO_CLOSE" } });

      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actor.authUserId,
          actorRole: actor.role,
          action: "UPDATE",
          resourceType: "AUDIT_PLAN",
          resourceId: planId,
          before: { status: plan.status },
          after: { status: "READY_TO_CLOSE" },
          metadata: { action: "COMPLETE" },
        },
        tx
      );
    });
  }

  // ── Close Plan ────────────────────────────────────────────────────────────

  async closePlan(planId: string, actor: Actor) {
    const plan = await this.planRepo.findForClose(planId);
    if (!plan) throw new NotFoundError("Audit plan not found");
    if (plan.status === "CLOSED") throw new ValidationError("Plan is already closed");
    if (plan.status === "CANCELLED") throw new ValidationError("Cannot close a cancelled plan");

    // Gate: QMS/IT/MR or plan owner
    const isPrivileged = actor.role === "QMS" || actor.role === "IT" || actor.role === "MR";
    const actorId = actor.authUserId ?? actor.userId;
    if (!isPrivileged && actorId !== plan.ownerAuthUserId) {
      throw new ForbiddenError("Only the plan owner or QMS/MR/IT can close the plan");
    }

    // Gate: no open findings
    const openFindings = plan.findings.filter(
      (f) => f.status !== "CLOSED" && f.status !== "REJECTED"
    );
    if (openFindings.length > 0) {
      throw new ValidationError(`${openFindings.length} finding(s) are not yet closed`);
    }

    // Gate: at least one sign-off
    if (plan.signoffs.length === 0) {
      throw new ValidationError("At least one sign-off is required before closing");
    }

    return db.$transaction(async (tx) => {
      await tx.auditPlan.update({ where: { id: planId }, data: { status: "CLOSED" } });

      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actor.authUserId,
          actorRole: actor.role,
          action: "CLOSE",
          resourceType: "AUDIT_PLAN",
          resourceId: planId,
          before: { status: plan.status },
          after: { status: "CLOSED" },
        },
        tx
      );
    });
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private async loadPlan(planId: string) {
    const plan = await this.planRepo.findWithAuditors(planId);
    if (!plan) throw new NotFoundError("Audit plan not found");
    return plan;
  }

  private assertSignAuthority(
    plan: { ownerAuthUserId: string; auditors: { assigneeAuthUserId: string; role: string }[] },
    actor: Actor
  ) {
    if (actor.role === "QMS" || actor.role === "IT" || actor.role === "MR") return;
    const actorId = actor.authUserId ?? actor.userId;
    const isLeadOrOwner =
      actorId === plan.ownerAuthUserId ||
      plan.auditors.some((a) => a.assigneeAuthUserId === actorId && a.role === "LEAD");
    if (!isLeadOrOwner) throw new ForbiddenError("Only the plan owner, lead auditor, or QMS/MR/IT can perform this action");
  }
}
