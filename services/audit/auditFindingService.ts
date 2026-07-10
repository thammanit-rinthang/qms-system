import { db } from "@/lib/db";
import { AuditService } from "@/services/auditService";
import { AuditFindingRepository } from "@/repositories/audit/auditFindingRepository";
import { AuditPlanRepository } from "@/repositories/audit/auditPlanRepository";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import type {
  AuditFindingCreateInput,
  AuditFindingUpdateInput,
  AuditCorrectiveActionInput,
  AuditVerifyInput,
} from "@/lib/validations/audit";
import type { FindingStatus } from "@/generated/prisma/client";

type Actor = { userId: string; authUserId?: string | null; role: string };

// Statuses where a finding's fields can still be edited by the audit team
const EDITABLE_FINDING_STATUSES = new Set<FindingStatus>(["OPEN", "REOPENED"]);

export class AuditFindingService {
  private repo = new AuditFindingRepository();
  private planRepo = new AuditPlanRepository();

  // ── List / Detail ─────────────────────────────────────────────────────────

  async listByPlan(planId: string, status?: FindingStatus) {
    return this.repo.findByPlanId(planId, status);
  }

  async getById(id: string) {
    const finding = await this.repo.findDetailById(id);
    if (!finding) throw new NotFoundError("Finding not found");
    return finding;
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async createFinding(planId: string, input: AuditFindingCreateInput, actor: Actor) {
    const plan = await this.loadPlanWithAuditors(planId);
    this.assertAuditorOrPrivileged(plan, actor);

    return db.$transaction(async (tx) => {
      const findingNo = await this.repo.nextFindingNo(planId, tx);

      const finding = await tx.auditFinding.create({
        data: {
          planId,
          findingNo,
          departmentId: input.departmentId ?? null,
          category: input.category,
          severity: input.severity,
          clause: input.clause ?? null,
          title: input.title,
          detail: input.detail,
          evidenceSummary: input.evidenceSummary ?? null,
          ownerAuthUserId: input.ownerAuthUserId ?? null,
          ownerNameSnapshot: input.ownerNameSnapshot ?? null,
          dueAt: input.dueAt ?? null,
          createdByAuthUserId: actor.authUserId ?? actor.userId,
        },
      });

      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actor.authUserId,
          actorRole: actor.role,
          action: "CREATE",
          resourceType: "AUDIT_FINDING",
          resourceId: finding.id,
          after: { planId, findingNo, category: input.category, title: input.title },
        },
        tx
      );

      return finding;
    });
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async updateFinding(id: string, input: AuditFindingUpdateInput, actor: Actor) {
    const finding = await this.repo.findById(id);
    if (!finding) throw new NotFoundError("Finding not found");
    if (!EDITABLE_FINDING_STATUSES.has(finding.status)) {
      throw new ValidationError(`Finding in status ${finding.status} cannot be edited`);
    }

    const plan = await this.loadPlanWithAuditors(finding.planId);
    this.assertAuditorOrPrivileged(plan, actor);

    return db.$transaction(async (tx) => {
      const updated = await tx.auditFinding.update({
        where: { id },
        data: {
          departmentId: input.departmentId,
          category: input.category,
          severity: input.severity,
          clause: input.clause,
          title: input.title,
          detail: input.detail,
          evidenceSummary: input.evidenceSummary,
          ownerAuthUserId: input.ownerAuthUserId,
          ownerNameSnapshot: input.ownerNameSnapshot,
          dueAt: input.dueAt,
        },
      });

      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actor.authUserId,
          actorRole: actor.role,
          action: "UPDATE",
          resourceType: "AUDIT_FINDING",
          resourceId: id,
          before: { title: finding.title, status: finding.status },
          after: { title: updated.title },
        },
        tx
      );

      return updated;
    });
  }

  // ── Respond (department corrective action) ────────────────────────────────

  async respondToFinding(id: string, input: AuditCorrectiveActionInput, actor: Actor) {
    const finding = await this.repo.findDetailById(id);
    if (!finding) throw new NotFoundError("Finding not found");
    if (finding.status !== "OPEN" && finding.status !== "REOPENED") {
      throw new ValidationError(`Cannot respond to a finding in status ${finding.status}`);
    }

    // Responder must be the finding owner, or QMS/IT
    this.assertFindingOwnerOrPrivileged(finding, actor);

    return db.$transaction(async (tx) => {
      // Upsert corrective action (one per finding)
      await tx.auditCorrectiveAction.upsert({
        where: { findingId: id },
        create: {
          findingId: id,
          rootCause: input.rootCause,
          correction: input.correction ?? null,
          correctiveActionPlan: input.correctiveActionPlan,
          targetDate: input.targetDate,
          respondedByAuthUserId: actor.authUserId ?? actor.userId,
          respondedAt: new Date(),
        },
        update: {
          rootCause: input.rootCause,
          correction: input.correction ?? null,
          correctiveActionPlan: input.correctiveActionPlan,
          targetDate: input.targetDate,
          respondedByAuthUserId: actor.authUserId ?? actor.userId,
          respondedAt: new Date(),
        },
      });

      await tx.auditFinding.update({
        where: { id },
        data: { status: "RESPONDED" },
      });

      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actor.authUserId,
          actorRole: actor.role,
          action: "RESPOND",
          resourceType: "AUDIT_FINDING",
          resourceId: id,
          before: { status: finding.status },
          after: { status: "RESPONDED" },
        },
        tx
      );

      return tx.auditFinding.findUnique({
        where: { id },
        include: { correctiveAction: true, verification: true },
      });
    });
  }

  // ── Verify ────────────────────────────────────────────────────────────────

  async verifyFinding(id: string, input: AuditVerifyInput, actor: Actor) {
    const finding = await this.repo.findDetailById(id);
    if (!finding) throw new NotFoundError("Finding not found");
    if (finding.status !== "RESPONDED") {
      throw new ValidationError(`Cannot verify a finding in status ${finding.status}`);
    }

    const plan = await this.loadPlanWithAuditors(finding.planId);
    // Only LEAD auditor or QMS/IT can verify
    this.assertLeadOrPrivileged(plan, actor);

    // PASS → VERIFIED, FAIL → REOPENED, REOPEN → REOPENED
    const nextStatus: FindingStatus = input.result === "PASS" ? "VERIFIED" : "REOPENED";

    return db.$transaction(async (tx) => {
      // Upsert verification record (replace on re-verify)
      await tx.auditVerification.upsert({
        where: { findingId: id },
        create: {
          findingId: id,
          verifierAuthUserId: actor.authUserId ?? actor.userId,
          result: input.result,
          comment: input.comment ?? null,
          verifiedAt: new Date(),
        },
        update: {
          verifierAuthUserId: actor.authUserId ?? actor.userId,
          result: input.result,
          comment: input.comment ?? null,
          verifiedAt: new Date(),
        },
      });

      await tx.auditFinding.update({
        where: { id },
        data: { status: nextStatus },
      });

      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actor.authUserId,
          actorRole: actor.role,
          action: "REVIEW",
          resourceType: "AUDIT_FINDING",
          resourceId: id,
          before: { status: finding.status },
          after: { status: nextStatus, result: input.result },
        },
        tx
      );

      return tx.auditFinding.findUnique({
        where: { id },
        include: { correctiveAction: true, verification: true },
      });
    });
  }

  // ── Close ─────────────────────────────────────────────────────────────────

  async closeFinding(id: string, actor: Actor) {
    const finding = await this.repo.findDetailById(id);
    if (!finding) throw new NotFoundError("Finding not found");
    if (finding.status !== "VERIFIED") {
      throw new ValidationError("Finding must be VERIFIED before it can be closed");
    }

    const plan = await this.loadPlanWithAuditors(finding.planId);
    this.assertLeadOrPrivileged(plan, actor);

    return db.$transaction(async (tx) => {
      await tx.auditFinding.update({
        where: { id },
        data: { status: "CLOSED" },
      });

      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actor.authUserId,
          actorRole: actor.role,
          action: "CLOSE",
          resourceType: "AUDIT_FINDING",
          resourceId: id,
          before: { status: "VERIFIED" },
          after: { status: "CLOSED" },
        },
        tx
      );
    });
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async loadPlanWithAuditors(planId: string) {
    const plan = await this.planRepo.findWithAuditors(planId);
    if (!plan) throw new NotFoundError("Audit plan not found");
    return plan;
  }

  private assertAuditorOrPrivileged(
    plan: { ownerAuthUserId: string; auditors: { assigneeAuthUserId: string }[] },
    actor: Actor
  ) {
    if (actor.role === "QMS" || actor.role === "IT") return;
    const actorId = actor.authUserId ?? actor.userId;
    if (
      actorId === plan.ownerAuthUserId ||
      plan.auditors.some((a) => a.assigneeAuthUserId === actorId)
    ) return;
    throw new ForbiddenError("Only assigned auditors or QMS/IT can manage findings");
  }

  private assertLeadOrPrivileged(
    plan: { auditors: { assigneeAuthUserId: string; role: string }[] },
    actor: Actor
  ) {
    if (actor.role === "QMS" || actor.role === "IT") return;
    const actorId = actor.authUserId ?? actor.userId;
    const isLead = plan.auditors.some(
      (a) => a.assigneeAuthUserId === actorId && a.role === "LEAD"
    );
    if (!isLead) throw new ForbiddenError("Only the lead auditor or QMS/IT can perform this action");
  }

  private assertFindingOwnerOrPrivileged(
    finding: { ownerAuthUserId: string | null },
    actor: Actor
  ) {
    if (actor.role === "QMS" || actor.role === "IT") return;
    const actorId = actor.authUserId ?? actor.userId;
    if (finding.ownerAuthUserId && actorId === finding.ownerAuthUserId) return;
    throw new ForbiddenError("Only the finding owner or QMS/IT can respond to this finding");
  }
}
