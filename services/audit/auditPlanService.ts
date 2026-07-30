import { db } from "@/lib/db";
import { AuditService } from "@/services/auditService";
import { AuditPlanRepository } from "@/repositories/audit/auditPlanRepository";
import { AuditScheduleRepository } from "@/repositories/audit/auditScheduleRepository";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import type {
  AuditPlanCreateInput,
  AuditPlanUpdateInput,
  AuditAssignAuditorsInput,
  AuditPlanDepartmentsInput,
  AuditScheduleCreateInput,
  AuditScheduleUpdateInput,
  AuditScheduleConfirmInput,
} from "@/lib/validations/audit";
import { sendScheduleInviteEmail, sendScheduleStatusEmail } from "./auditEmailService";
import { NotificationService } from "@/services/notificationService";
import { getDocNoFormat, buildLikePrefix, renderDocNo } from "@/lib/docNoConfig";
import { logger } from "@/lib/logger";
import { canDeleteAuditPlan } from "@/lib/audit/permissions";
import type { AuditPlanListQuery } from "@/repositories/audit/auditPlanRepository";

const EDITABLE_STATUSES = new Set(["DRAFT", "PENDING_REVIEW", "PENDING_APPROVAL", "PLANNED"]);
const MUTABLE_STATUSES = new Set(["DRAFT", "PENDING_REVIEW", "PENDING_APPROVAL", "PLANNED", "ANNOUNCED", "IN_PROGRESS"]);

export class AuditPlanService {
  private repo = new AuditPlanRepository();
  private scheduleRepo = new AuditScheduleRepository();

  async listPlans(query: AuditPlanListQuery) {
    return this.repo.listPaginated(query);
  }

  async getPlanById(id: string) {
    const plan = await this.repo.findDetailById(id);
    if (!plan) throw new NotFoundError("Audit plan not found");
    return plan;
  }

  async createPlan(
    input: AuditPlanCreateInput,
    actor: { userId: string; authUserId?: string | null; role: string; nameSnapshot?: string | null; email?: string | null }
  ) {
    // M-2: sourceOrganization is required for EXTERNAL plans
    if (input.auditType === "EXTERNAL" && !input.sourceOrganization) {
      throw new ValidationError("sourceOrganization is required for EXTERNAL audit plans.");
    }

    // ponytail: retry loop guards against concurrent create race on audit_no unique constraint
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await db.$transaction(async (tx) => {
          const auditNo = await this.nextAuditNo(tx);

          const plan = await tx.auditPlan.create({
            data: {
              auditNo,
              title: input.title,
              auditType: input.auditType,
              mode: input.mode ?? "SYSTEM",
              standard: input.standard,
              standards: input.standards ?? [],
              scope: input.scope,
              objective: input.objective,
              sourceOrganization: input.sourceOrganization,
              startDate: input.startDate,
              endDate: input.endDate,
              summary: input.summary,
              appointmentId: (input as { appointmentId?: string }).appointmentId ?? null,
              ownerAuthUserId: actor.authUserId ?? actor.userId,
              ownerEmail: actor.email ?? null,
              ownerNameSnapshot: actor.nameSnapshot ?? null,
            },
          });

          await AuditService.record(
            {
              actorUserId: actor.userId,
              actorAuthUserId: actor.authUserId,
              actorRole: actor.role,
              action: "CREATE",
              resourceType: "AUDIT_PLAN",
              resourceId: plan.id,
              after: { auditNo, title: input.title, auditType: input.auditType, status: "DRAFT" },
            },
            tx
          );

          return plan;
        });
      } catch (err: unknown) {
        const isUniqueViolation =
          typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002";
        if (!isUniqueViolation || attempt === 4) throw err;
        logger.warn("[auditPlan] audit_no collision, retrying", { attempt });
      }
    }
    throw new ValidationError("Failed to generate unique audit number after retries");
  }

  async updatePlan(
    id: string,
    input: AuditPlanUpdateInput,
    actor: { userId: string; authUserId?: string | null; role: string }
  ) {
    const plan = await this.repo.findById(id);
    if (!plan) throw new NotFoundError("Audit plan not found");
    if (!EDITABLE_STATUSES.has(plan.status)) {
      throw new ValidationError(`Plan in status ${plan.status} cannot be edited`);
    }
    this.assertOwnerOrPrivileged(plan.ownerAuthUserId, actor);

    return db.$transaction(async (tx) => {
      const updated = await tx.auditPlan.update({
        where: { id },
        data: {
          title: input.title,
          standard: input.standard,
          scope: input.scope,
          objective: input.objective,
          sourceOrganization: input.sourceOrganization,
          startDate: input.startDate,
          endDate: input.endDate,
          summary: input.summary,
        },
      });

      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actor.authUserId,
          actorRole: actor.role,
          action: "UPDATE",
          resourceType: "AUDIT_PLAN",
          resourceId: id,
          before: { title: plan.title, status: plan.status },
          after: { title: updated.title },
        },
        tx
      );

      return updated;
    });
  }

  async deletePlan(
    id: string,
    actor: { userId: string; authUserId?: string | null; role: string }
  ) {
    const plan = await this.repo.findById(id);
    if (!plan) throw new NotFoundError("Audit plan not found");
    if (!canDeleteAuditPlan(actor.role)) {
      throw new ForbiddenError("Only QMS, MR, or IT can delete audit plans");
    }

    await db.$transaction(async (tx) => {
      await tx.auditPlanDepartment.deleteMany({ where: { planId: id } });
      await tx.auditAuditorAssignment.deleteMany({ where: { planId: id } });
      await tx.auditPlan.delete({ where: { id } });

      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actor.authUserId,
          actorRole: actor.role,
          action: "DELETE",
          resourceType: "AUDIT_PLAN",
          resourceId: id,
          before: { status: plan.status, auditNo: plan.auditNo },
          after: null,
          metadata: { action: "DELETE" },
        },
        tx
      );
    });
  }

  async cancelPlan(
    id: string,
    actor: { userId: string; authUserId?: string | null; role: string }
  ) {
    const plan = await this.repo.findById(id);
    if (!plan) throw new NotFoundError("Audit plan not found");
    if (plan.status === "CLOSED" || plan.status === "CANCELLED") {
      throw new ValidationError(`Plan is already ${plan.status}`);
    }
    this.assertOwnerOrPrivileged(plan.ownerAuthUserId, actor);

    return db.$transaction(async (tx) => {
      const updated = await tx.auditPlan.update({
        where: { id },
        data: { status: "CANCELLED" },
      });

      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actor.authUserId,
          actorRole: actor.role,
          action: "UPDATE",
          resourceType: "AUDIT_PLAN",
          resourceId: id,
          before: { status: plan.status },
          after: { status: "CANCELLED" },
          metadata: { action: "CANCEL" },
        },
        tx
      );

      return updated;
    });
  }

  // ── Auditor Assignment ───────────────────────────────────────────────────

  async assignAuditors(
    planId: string,
    input: AuditAssignAuditorsInput,
    actor: { userId: string; authUserId?: string | null; role: string }
  ) {
    const plan = await this.repo.findById(planId);
    if (!plan) throw new NotFoundError("Audit plan not found");
    if (!MUTABLE_STATUSES.has(plan.status)) {
      throw new ValidationError(`Cannot assign auditors to a plan in status ${plan.status}`);
    }
    this.assertOwnerOrPrivileged(plan.ownerAuthUserId, actor);

    const leadEntry = input.auditors.find((a) => a.role === "LEAD");

    return db.$transaction(async (tx) => {
      // Replace all assignments atomically
      await tx.auditAuditorAssignment.deleteMany({ where: { planId } });
      await tx.auditAuditorAssignment.createMany({
        data: input.auditors.map((a) => ({
          planId,
          assigneeAuthUserId: a.assigneeAuthUserId,
          assigneeNameSnapshot: a.assigneeNameSnapshot ?? null,
          assigneeEmailSnapshot: a.assigneeEmailSnapshot ?? null,
          role: a.role,
        })),
      });

      // Keep plan.leadAuditorAuthUserId in sync
      await tx.auditPlan.update({
        where: { id: planId },
        data: { leadAuditorAuthUserId: leadEntry?.assigneeAuthUserId ?? null },
      });

      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actor.authUserId,
          actorRole: actor.role,
          action: "ASSIGN_AUDITOR",
          resourceType: "AUDIT_PLAN",
          resourceId: planId,
          after: { auditors: input.auditors.map((a) => ({ id: a.assigneeAuthUserId, role: a.role })) },
        },
        tx
      );

      return tx.auditAuditorAssignment.findMany({ where: { planId } });
    });
  }

  // ── Departments ──────────────────────────────────────────────────────────

  async setDepartments(
    planId: string,
    input: AuditPlanDepartmentsInput,
    actor: { userId: string; authUserId?: string | null; role: string }
  ) {
    const plan = await this.repo.findById(planId);
    if (!plan) throw new NotFoundError("Audit plan not found");
    if (!MUTABLE_STATUSES.has(plan.status)) {
      throw new ValidationError(`Cannot set departments on a plan in status ${plan.status}`);
    }
    this.assertOwnerOrPrivileged(plan.ownerAuthUserId, actor);

    return db.$transaction(async (tx) => {
      await tx.auditPlanDepartment.deleteMany({ where: { planId } });
      await tx.auditPlanDepartment.createMany({
        data: input.departments.map((d) => ({
          planId,
          departmentId: d.departmentId,
          departmentCode: d.departmentCode ?? null,
          departmentName: d.departmentName ?? null,
        })),
      });

      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actor.authUserId,
          actorRole: actor.role,
          action: "UPDATE",
          resourceType: "AUDIT_PLAN",
          resourceId: planId,
          after: { departments: input.departments.map((d) => d.departmentId) },
          metadata: { action: "SET_DEPARTMENTS" },
        },
        tx
      );

      return tx.auditPlanDepartment.findMany({ where: { planId } });
    });
  }

  // ── Schedule ─────────────────────────────────────────────────────────────

  async createSchedule(
    planId: string,
    input: AuditScheduleCreateInput,
    actor: { userId: string; authUserId?: string | null; role: string }
  ) {
    const plan = await this.repo.findWithAuditorsAndLead(planId);
    if (!plan) throw new NotFoundError("Audit plan not found");
    if (!MUTABLE_STATUSES.has(plan.status)) {
      throw new ValidationError(`Cannot add schedule to a plan in status ${plan.status}`);
    }
    this.assertOwnerLeadOrPrivileged(plan, actor);

    const schedule = await db.$transaction(async (tx) => {
      const checklistDueAt = new Date(input.endAt);
      checklistDueAt.setDate(checklistDueAt.getDate() + 7);

      const teamInput = (input as { team?: { authUserId: string; nameSnapshot?: string; emailSnapshot?: string; role: string }[] }).team;
      const lead = teamInput?.find((m) => m.role === "LEAD_AUDITOR");

      const s = await tx.auditSchedule.create({
        data: {
          planId,
          sessionTitle: input.sessionTitle,
          location: input.location ?? null,
          agenda: input.agenda ?? null,
          startAt: input.startAt,
          endAt: input.endAt,
          departmentId: input.departmentId ?? null,
          departmentName: input.departmentName ?? null,
          contactEmail: input.contactEmail ?? null,
          leadAuditorAuthUserId: lead?.authUserId ?? input.leadAuditorAuthUserId ?? null,
          leadAuditorNameSnapshot: lead?.nameSnapshot ?? input.leadAuditorNameSnapshot ?? null,
          leadAuditorEmailSnapshot: lead?.emailSnapshot ?? input.leadAuditorEmailSnapshot ?? null,
          auditeeNotifyDept: (input as { auditeeNotifyDept?: boolean }).auditeeNotifyDept ?? true,
          checklistDueAt,
        },
      });

      if (teamInput && teamInput.length > 0) {
        await tx.auditScheduleTeamMember.createMany({
          data: teamInput.map((m) => ({
            scheduleId: s.id,
            authUserId: m.authUserId,
            nameSnapshot: m.nameSnapshot ?? null,
            emailSnapshot: m.emailSnapshot ?? null,
            role: m.role as import("@/generated/prisma/client").AuditTeamRole,
          })),
        });
      }

      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actor.authUserId,
          actorRole: actor.role,
          action: "CREATE",
          resourceType: "AUDIT_SCHEDULE",
          resourceId: s.id,
          after: { planId, sessionTitle: input.sessionTitle, startAt: input.startAt, departmentName: input.departmentName },
        },
        tx
      );

      return s;
    });

    // Fire-and-forget: notify department contact
    if (schedule.contactEmail && schedule.departmentName) {
      sendScheduleInviteEmail({
        to: { name: schedule.departmentName, email: schedule.contactEmail },
        planTitle: plan.title,
        auditNo: plan.auditNo,
        sessionTitle: schedule.sessionTitle,
        departmentName: schedule.departmentName,
        startAt: schedule.startAt.toISOString(),
        endAt: schedule.endAt.toISOString(),
        location: schedule.location,
        planId: plan.id,
        senderAccessToken: (actor as { accessToken?: string | null }).accessToken ?? null,
      }).catch((err) => logger.warn("[auditSchedule] invite email failed", { error: String(err) }));
    }

    return schedule;
  }

  async getSchedulesByPlan(planId: string) {
    const plan = await this.repo.findById(planId);
    if (!plan) throw new NotFoundError("Audit plan not found");
    return this.scheduleRepo.findByPlanId(planId);
  }

  async updateSchedule(
    scheduleId: string,
    input: AuditScheduleUpdateInput,
    actor: { userId: string; authUserId?: string | null; role: string }
  ) {
    const schedule = await this.scheduleRepo.findById(scheduleId);
    if (!schedule) throw new NotFoundError("Schedule not found");

    const plan = await this.repo.findWithAuditorsAndLead(schedule.planId);
    if (!plan) throw new NotFoundError("Audit plan not found");
    if (!MUTABLE_STATUSES.has(plan.status)) {
      throw new ValidationError(`Cannot edit schedule for a plan in status ${plan.status}`);
    }
    this.assertOwnerLeadOrPrivileged(plan, actor);

    const dateChanged =
      (input.startAt && input.startAt.getTime() !== schedule.startAt.getTime()) ||
      (input.endAt && input.endAt.getTime() !== schedule.endAt.getTime());
    const shouldReset = dateChanged && schedule.confirmStatus !== "PENDING";

    const updated = await db.$transaction(async (tx) => {
      const newEndAt = input.endAt ?? schedule.endAt;
      const checklistDueAt = new Date(newEndAt);
      checklistDueAt.setDate(checklistDueAt.getDate() + 7);

      const teamInput = (input as { team?: { authUserId: string; nameSnapshot?: string; emailSnapshot?: string; role: string }[] }).team;
      const auditeeNotifyDeptInput = (input as { auditeeNotifyDept?: boolean }).auditeeNotifyDept;

      let leadAuditorAuthUserId: string | null | undefined = input.leadAuditorAuthUserId ?? undefined;
      let leadAuditorNameSnapshot: string | null | undefined = input.leadAuditorNameSnapshot ?? undefined;
      let leadAuditorEmailSnapshot: string | null | undefined = input.leadAuditorEmailSnapshot ?? undefined;

      if (teamInput !== undefined) {
        await tx.auditScheduleTeamMember.deleteMany({ where: { scheduleId } });
        if (teamInput.length > 0) {
          await tx.auditScheduleTeamMember.createMany({
            data: teamInput.map((m) => ({
              scheduleId,
              authUserId: m.authUserId,
              nameSnapshot: m.nameSnapshot ?? null,
              emailSnapshot: m.emailSnapshot ?? null,
              role: m.role as import("@/generated/prisma/client").AuditTeamRole,
            })),
          });
        }
        const lead = teamInput.find((m) => m.role === "LEAD_AUDITOR");
        leadAuditorAuthUserId = lead?.authUserId ?? null;
        leadAuditorNameSnapshot = lead?.nameSnapshot ?? null;
        leadAuditorEmailSnapshot = lead?.emailSnapshot ?? null;
      }

      const u = await tx.auditSchedule.update({
        where: { id: scheduleId },
        data: {
          sessionTitle: input.sessionTitle,
          location: input.location,
          agenda: input.agenda,
          startAt: input.startAt,
          endAt: input.endAt,
          departmentId: input.departmentId,
          departmentName: input.departmentName,
          contactEmail: input.contactEmail,
          leadAuditorAuthUserId,
          leadAuditorNameSnapshot,
          leadAuditorEmailSnapshot,
          auditeeNotifyDept: auditeeNotifyDeptInput ?? undefined,
          checklistDueAt,
          ...(shouldReset
            ? { confirmStatus: "PENDING", unavailableReason: null, confirmedAt: null, confirmedByAuthUserId: null, confirmedByName: null }
            : {}),
        },
      });

      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actor.authUserId,
          actorRole: actor.role,
          action: "UPDATE",
          resourceType: "AUDIT_SCHEDULE",
          resourceId: scheduleId,
          before: { sessionTitle: schedule.sessionTitle, startAt: schedule.startAt, confirmStatus: schedule.confirmStatus },
          after: { sessionTitle: u.sessionTitle, startAt: u.startAt, confirmStatus: u.confirmStatus },
        },
        tx
      );

      return u;
    });

    // Re-notify dept contact when date was reset to PENDING
    if (shouldReset && updated.contactEmail && updated.departmentName) {
      sendScheduleInviteEmail({
        to: { name: updated.departmentName, email: updated.contactEmail },
        planTitle: plan.title,
        auditNo: plan.auditNo,
        sessionTitle: updated.sessionTitle,
        departmentName: updated.departmentName,
        startAt: updated.startAt.toISOString(),
        endAt: updated.endAt.toISOString(),
        location: updated.location,
        planId: plan.id,
        senderAccessToken: (actor as { accessToken?: string | null }).accessToken ?? null,
      }).catch((err) => logger.warn("[auditSchedule] re-invite email failed", { error: String(err) }));
    }

    return updated;
  }

  async confirmSchedule(
    scheduleId: string,
    input: AuditScheduleConfirmInput,
    actor: { userId: string; authUserId?: string | null; role: string; nameSnapshot?: string | null; accessToken?: string | null; departmentId?: string | null }
  ) {
    const schedule = await this.scheduleRepo.findById(scheduleId);
    if (!schedule) throw new NotFoundError("Schedule not found");

    const plan = await this.repo.findDetailById(schedule.planId);
    if (!plan) throw new NotFoundError("Audit plan not found");

    const actorId = actor.authUserId ?? actor.userId;

    const PRIVILEGED = new Set(["QMS", "MR", "IT"]);
    if (!PRIVILEGED.has(actor.role)) {
      const isLeadAuditor = plan.leadAuditorAuthUserId === actorId;
      const isAssignedAuditor = plan.auditors.some((a) => a.assigneeAuthUserId === actorId);

      if (!isLeadAuditor && !isAssignedAuditor) {
        const scheduleDept = schedule.departmentId;
        if (!scheduleDept || !actor.departmentId || actor.departmentId !== scheduleDept) {
          throw new ForbiddenError("You are not authorized to confirm this schedule");
        }
      }
    }

    const now = new Date();

    const updated = await db.$transaction(async (tx) => {
      const u = await tx.auditSchedule.update({
        where: { id: scheduleId },
        data: {
          confirmStatus: input.status,
          unavailableReason: input.status === "UNAVAILABLE" ? (input.reason ?? null) : null,
          suggestedStartAt: input.status === "SUGGESTED" ? (input.suggestedStartAt ?? null) : null,
          suggestedEndAt: input.status === "SUGGESTED" ? (input.suggestedEndAt ?? null) : null,
          suggestedReason: input.status === "SUGGESTED" ? (input.reason ?? null) : null,
          suggestedByAuthUserId: input.status === "SUGGESTED" ? actorId : null,
          suggestedByName: input.status === "SUGGESTED" ? (actor.nameSnapshot ?? null) : null,
          suggestedAt: input.status === "SUGGESTED" ? now : null,
          confirmedAt: input.status === "SUGGESTED" ? null : now,
          confirmedByAuthUserId: input.status === "SUGGESTED" ? null : actorId,
          confirmedByName: input.status === "SUGGESTED" ? null : (actor.nameSnapshot ?? null),
        },
      });

      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actor.authUserId,
          actorRole: actor.role,
          action: "UPDATE",
          resourceType: "AUDIT_SCHEDULE",
          resourceId: scheduleId,
          before: { confirmStatus: schedule.confirmStatus },
          after: { confirmStatus: input.status, reason: input.reason },
          metadata: { action: "CONFIRM", status: input.status },
        },
        tx
      );

      return u;
    });

    // Notify plan owner that dept confirmed/declined
    if (plan.ownerAuthUserId && plan.ownerAuthUserId !== actorId) {
      const deptLabel = schedule.departmentName ?? "แผนก";
      const statusLabel = input.status === "CONFIRMED" ? "ยืนยันแล้ว" : input.status === "SUGGESTED" ? "เสนอวันใหม่" : "แจ้งไม่ว่าง";
      await NotificationService.createInAppNotification({
        recipientId: plan.ownerAuthUserId,
        recipientAuthUserId: plan.ownerAuthUserId,
        title: `${deptLabel} ${statusLabel} — ${plan.auditNo}`,
        body: input.status === "UNAVAILABLE"
          ? `${deptLabel} ไม่ว่างในช่วง "${schedule.sessionTitle}": ${input.reason ?? "-"}`
          : input.status === "SUGGESTED"
            ? `${deptLabel} เสนอวันใหม่สำหรับ "${schedule.sessionTitle}"${input.suggestedStartAt ? `: ${input.suggestedStartAt.toLocaleString("th-TH")}` : ""}`
          : `${deptLabel} ยืนยันตาราง "${schedule.sessionTitle}" แล้ว`,
        module: "AUDIT",
        resourceId: plan.id,
        resourceType: "AUDIT_PLAN",
      }).catch(() => null);
    }

    // Email: notify plan owner
    if (plan.ownerEmail) {
      sendScheduleStatusEmail({
        to: { name: plan.ownerNameSnapshot ?? "ผู้ดูแลแผน", email: plan.ownerEmail },
        planTitle: plan.title,
        auditNo: plan.auditNo,
        sessionTitle: schedule.sessionTitle,
        departmentName: schedule.departmentName ?? "-",
        status: input.status,
        confirmedBy: actor.nameSnapshot ?? actorId,
        reason: input.reason ?? null,
        suggestedStartAt: input.suggestedStartAt?.toISOString() ?? null,
        suggestedEndAt: input.suggestedEndAt?.toISOString() ?? null,
        planId: plan.id,
        senderAccessToken: actor.accessToken,
      }).catch((err) => logger.warn("[auditSchedule] status email failed", { error: String(err) }));
    }

    return updated;
  }

  async acceptSuggestedSchedule(
    scheduleId: string,
    actor: { userId: string; authUserId?: string | null; role: string; accessToken?: string | null }
  ) {
    const schedule = await this.scheduleRepo.findWithPlan(scheduleId);
    if (!schedule) throw new NotFoundError("Schedule not found");
    const plan = await this.repo.findWithAuditorsAndLead(schedule.planId);
    if (!plan) throw new NotFoundError("Audit plan not found");
    this.assertOwnerLeadOrPrivileged(plan, actor);
    if (schedule.confirmStatus !== "SUGGESTED" || !schedule.suggestedStartAt || !schedule.suggestedEndAt) {
      throw new ValidationError("No suggested date is waiting for approval");
    }

    const updated = await db.$transaction(async (tx) => {
      const result = await tx.auditSchedule.update({
        where: { id: scheduleId },
        data: {
          startAt: schedule.suggestedStartAt!,
          endAt: schedule.suggestedEndAt!,
          confirmStatus: "PENDING",
          unavailableReason: null,
          suggestedStartAt: null,
          suggestedEndAt: null,
          suggestedReason: null,
          suggestedByAuthUserId: null,
          suggestedByName: null,
          suggestedAt: null,
          confirmedAt: null,
          confirmedByAuthUserId: null,
          confirmedByName: null,
        },
      });
      await AuditService.record({
        actorUserId: actor.userId,
        actorAuthUserId: actor.authUserId,
        actorRole: actor.role,
        action: "UPDATE",
        resourceType: "AUDIT_SCHEDULE",
        resourceId: scheduleId,
        before: { confirmStatus: schedule.confirmStatus, startAt: schedule.startAt, endAt: schedule.endAt },
        after: { confirmStatus: "PENDING", startAt: result.startAt, endAt: result.endAt },
        metadata: { action: "ACCEPT_SUGGESTED_DATE" },
      }, tx);
      return result;
    });

    if (updated.contactEmail && updated.departmentName) {
      sendScheduleInviteEmail({
        to: { name: updated.departmentName, email: updated.contactEmail },
        planTitle: plan.title,
        auditNo: plan.auditNo,
        sessionTitle: updated.sessionTitle,
        departmentName: updated.departmentName,
        startAt: updated.startAt.toISOString(),
        endAt: updated.endAt.toISOString(),
        location: updated.location,
        planId: plan.id,
        senderAccessToken: actor.accessToken ?? null,
      }).catch((err) => logger.warn("[auditSchedule] suggested date invite failed", { error: String(err) }));
    }
    return updated;
  }

  async deleteSchedule(
    scheduleId: string,
    actor: { userId: string; authUserId?: string | null; role: string }
  ) {
    const schedule = await this.scheduleRepo.findById(scheduleId);
    if (!schedule) throw new NotFoundError("Schedule not found");

    const plan = await this.repo.findWithAuditorsAndLead(schedule.planId);
    if (!plan) throw new NotFoundError("Audit plan not found");
    if (!MUTABLE_STATUSES.has(plan.status)) {
      throw new ValidationError(`Cannot delete schedule for a plan in status ${plan.status}`);
    }
    this.assertOwnerLeadOrPrivileged(plan, actor);

    return db.$transaction(async (tx) => {
      await tx.auditSchedule.delete({ where: { id: scheduleId } });

      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actor.authUserId,
          actorRole: actor.role,
          action: "DELETE",
          resourceType: "AUDIT_SCHEDULE",
          resourceId: scheduleId,
          before: { planId: schedule.planId, sessionTitle: schedule.sessionTitle },
        },
        tx
      );
    });
  }

  // ── Dashboard ────────────────────────────────────────────────────────────

  async getDashboardData() {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      total,
      inProgress,
      waitingCorrective,
      openFindings,
      overdueFindings,
      pendingSignoffs,
      upcomingSchedules,
      recentOpenFindings,
    ] = await this.repo.getDashboardCounts(now, sevenDaysLater);

    return {
      counts: {
        totalPlans: total,
        inProgressPlans: inProgress,
        waitingCorrectivePlans: waitingCorrective,
        openFindings,
        overdueCorrectiveActions: overdueFindings,
        pendingSignoffs,
      },
      upcomingSchedules: upcomingSchedules.map((s) => ({
        id: s.id,
        planId: s.planId,
        planTitle: s.plan.title,
        planAuditNo: s.plan.auditNo,
        sessionTitle: s.sessionTitle,
        location: s.location ?? null,
        startAt: s.startAt instanceof Date ? s.startAt.toISOString() : s.startAt,
        endAt: s.endAt instanceof Date ? s.endAt.toISOString() : s.endAt,
      })),
      recentFindings: recentOpenFindings.map((f) => ({
        id: f.id,
        planId: f.planId,
        findingNo: f.findingNo,
        title: f.title,
        category: f.category,
        severity: f.severity,
        status: f.status,
        ownerNameSnapshot: f.ownerNameSnapshot ?? null,
        dueAt: f.dueAt instanceof Date ? f.dueAt.toISOString() : (f.dueAt ?? null),
        createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : f.createdAt,
      })),
    };
  }

  // ── My Tasks ──────────────────────────────────────────────────────────────

  async getMyTasks(authUserId: string) {
    const [
      toRespond,
      toVerifyPlans,
      leadingPlans,
      pendingSignoffs,
    ] = await this.repo.getMyTasksData(authUserId);

    const toVerify = toVerifyPlans.flatMap((plan) =>
      plan.findings.map((f) => ({
        ...f,
        planId: plan.id,
        planTitle: plan.title,
        planAuditNo: plan.auditNo,
        dueAt: f.dueAt instanceof Date ? f.dueAt.toISOString() : (f.dueAt ?? null),
        createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : f.createdAt,
      })),
    );

    return {
      toRespond: toRespond.map((f) => ({
        id: f.id,
        planId: f.planId,
        planTitle: f.plan.title,
        planAuditNo: f.plan.auditNo,
        findingNo: f.findingNo,
        title: f.title,
        category: f.category,
        severity: f.severity,
        status: f.status,
        ownerNameSnapshot: f.ownerNameSnapshot ?? null,
        dueAt: f.dueAt instanceof Date ? f.dueAt.toISOString() : (f.dueAt ?? null),
        createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : f.createdAt,
      })),
      toVerify,
      leadingPlans: leadingPlans.map((p) => ({
        id: p.id,
        auditNo: p.auditNo,
        title: p.title,
        status: p.status,
        startDate: p.startDate instanceof Date ? p.startDate.toISOString() : (p.startDate ?? null),
        endDate: p.endDate instanceof Date ? p.endDate.toISOString() : (p.endDate ?? null),
        ownerNameSnapshot: p.ownerNameSnapshot ?? null,
        updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
      })),
      pendingSignoffs: pendingSignoffs.map((p) => ({
        id: p.id,
        auditNo: p.auditNo,
        title: p.title,
        status: p.status,
        ownerNameSnapshot: p.ownerNameSnapshot ?? null,
        updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
      })),
    };
  }

  // ── Checklist Submit ─────────────────────────────────────────────────────

  async submitChecklist(
    scheduleId: string,
    actor: { userId: string; authUserId?: string | null; role: string; name?: string | null },
    fileName: string
  ) {
    const actorId = actor.authUserId ?? actor.userId;
    const submittedByName = actor.name ?? actorId;
    return db.$transaction(async (tx) => {
      const updated = await this.scheduleRepo.markChecklistSubmitted(
        scheduleId,
        { submittedAt: new Date(), submittedByUserId: actorId, submittedByName },
        tx
      );
      await AuditService.record(
        {
          actorUserId: actor.userId,
          actorAuthUserId: actorId,
          actorRole: actor.role,
          action: "UPDATE",
          resourceType: "AUDIT_SCHEDULE",
          resourceId: scheduleId,
          metadata: { action: "CHECKLIST_SUBMITTED", fileName },
        },
        tx
      );
      return updated;
    });
  }

  // ── private ──────────────────────────────────────────────────────────────

  private assertOwnerOrPrivileged(
    ownerAuthUserId: string,
    actor: { userId: string; authUserId?: string | null; role: string }
  ) {
    const isPrivileged = actor.role === "QMS" || actor.role === "IT" || actor.role === "MR";
    if (isPrivileged) return;
    const actorId = actor.authUserId ?? actor.userId;
    if (actorId !== ownerAuthUserId) {
      throw new ForbiddenError("Only the plan owner or QMS/MR/IT can perform this action");
    }
  }

  private assertOwnerLeadOrPrivileged(
    plan: { ownerAuthUserId: string; auditors: { assigneeAuthUserId: string }[] },
    actor: { userId: string; authUserId?: string | null; role: string }
  ) {
    const isPrivileged = actor.role === "QMS" || actor.role === "IT" || actor.role === "MR";
    if (isPrivileged) return;
    const actorId = actor.authUserId ?? actor.userId;
    if (actorId === plan.ownerAuthUserId) return;
    if (plan.auditors.some((a) => a.assigneeAuthUserId === actorId)) return;
    throw new ForbiddenError("Only the plan owner, lead auditor, or QMS/MR/IT can perform this action");
  }

  private async nextAuditNo(tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]): Promise<string> {
    const format = await getDocNoFormat("AUDIT_PLAN");
    const year = new Date().getFullYear();
    const { likePrefix } = buildLikePrefix(format, { year });
    const startPos = likePrefix.length + 1;
    const rawNos = await tx.$queryRaw<{ audit_no: string }[]>`
      SELECT audit_no FROM audit_plans WHERE audit_no LIKE ${`${likePrefix}%`}
    `;
    const existing = rawNos.map((r) => {
      const suffix = r.audit_no.substring(likePrefix.length);
      const seq = /^\d+$/.test(suffix) ? parseInt(suffix, 10) : null;
      return { audit_no: r.audit_no, suffix, seq };
    });
    const used = new Set(existing.filter((r) => r.seq !== null).map((r) => r.seq!));
    let next = 1;
    while (used.has(next)) next++;
    logger.info("[auditPlan] nextAuditNo", { format, likePrefix, startPos, existing, used: [...used], next });
    const result = renderDocNo(format, { year, seq: next });
    logger.info("[auditPlan] generated auditNo", { result });
    return result;
  }
}
