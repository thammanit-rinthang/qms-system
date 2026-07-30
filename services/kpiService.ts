import { ConflictError, ForbiddenError, NotFoundError } from '@/errors/customErrors';
import { AuditService } from '@/services/auditService';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { QmsConfigService } from '@/services/qmsConfigService';
import { NotificationService } from '@/services/notificationService';
import { sendKpiObjectiveReviewerAssignedEmail, sendKpiRecallEmail, sendKpiObjectiveApproverRequestEmail, sendKpiResultEmail, sendKpiRejectedPreparerEmail, makeBilingualMail, sendKpiAnnouncementEmail, sendMail, buildFmMr01PrintHtml, type FmMr01PrintObjective } from '@/services/email';
import { ActionTokenService } from '@/services/actionTokenService';
import { DepartmentService } from '@/services/departmentService';
import { logger } from '@/lib/logger';
import { ApprovalModule, ApprovalStep } from '@/generated/prisma/client';
import { ensureKpiStatusTransition } from '@/lib/kpi-state-machine';
import { db } from '@/lib/db';
import { KpiRepository } from '@/repositories/kpiRepository';
import { KpiObjectiveRepository } from '@/repositories/kpiObjectiveRepository';
import { KpiMonthlyReportRepository } from '@/repositories/kpiMonthlyReportRepository';
import { KpiMonthlyDetailRepository } from '@/repositories/kpiMonthlyDetailRepository';
import { ApprovalSignatureRepository } from '@/repositories/approvalSignatureRepository';
import { UserRepository } from '@/repositories/userRepository';
import { UserPreferenceRepository } from '@/repositories/userPreferenceRepository';
import { getUserSnapshot } from '@/lib/userSnapshotCache';
import { listAuthCenterAppMembers } from '@/lib/auth-center-admin-client';
import { isPrivilegedQmsRole } from '@/lib/qms-roles';
import { formatKpiAnnualRevisionTag } from '@/lib/kpi-annual-document';
import {
  CreateKpiDTO,
  UpdateKpiDTO,
  CreateKpiObjectiveDTO,
  UpdateKpiObjectiveDTO,
  ListKpiQuery,
  SubmitKpiObjectivesDTO,
  KpiObjectiveRevisionSnapshot,
  KpiRevisionHistoryEntry,
  KpiRemovedObjectiveComparison,
} from '@/types/kpi';
import type { ActorContext } from '@/types/kpi';
import type { Prisma, SignatureType } from '@/generated/prisma/client';
import ExcelJS from 'exceljs';

const KPI_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export class KpiService {
  private kpiRepo = new KpiRepository();
  private objectiveRepo = new KpiObjectiveRepository();
  private monthlyReportRepo = new KpiMonthlyReportRepository();
  private monthlyDetailRepo = new KpiMonthlyDetailRepository();
  private approvalSignatureRepo = new ApprovalSignatureRepository();
  private userRepo = new UserRepository();
  private userPrefRepo = new UserPreferenceRepository();

  async getMasterRevisionNumber(year: number): Promise<number> {
    const masterKpi = await db.kPI.findFirst({
      where: { department: 'SYSTEM_MASTER', yearly: year },
      select: { id: true, submittedAt: true },
    });

    const departmentKpis = await db.kPI.findMany({
      where: {
        yearly: year,
        department: { not: 'SYSTEM_MASTER' },
      },
      select: { id: true },
    });

    const latestRevise = departmentKpis.length > 0
      ? await db.auditLog.findFirst({
          where: {
            resourceType: 'KPI',
            action: 'REVISE',
            resourceId: { in: departmentKpis.map((kpi) => kpi.id) },
          },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        })
      : null;

    const submitCount = masterKpi
      ? await db.auditLog.count({
          where: {
            resourceType: 'KPI',
            resourceId: masterKpi.id,
            action: 'SUBMIT',
          },
        })
      : 0;

    const effectiveSubmitCount = submitCount > 0
      ? submitCount
      : masterKpi?.submittedAt
        ? 1
        : 0;
    const approvedRevisionNo = Math.max(0, effectiveSubmitCount - 1);
    const hasPendingRevisionCycle = !!latestRevise?.createdAt
      && (!masterKpi?.submittedAt || latestRevise.createdAt > masterKpi.submittedAt);

    return approvedRevisionNo + (hasPendingRevisionCycle ? 1 : 0);
  }

  private buildObjectiveSnapshot(
    objective: {
      id: string;
      target: number;
      unit: string | null;
      objective: string;
      frequency: string;
      calculationFormula: string;
      actionPlanGuidelines: string;
      referenceDocuments: string | null;
      responsibleAuthUserId: string | null;
      responsibleNameSnapshot: string | null;
      responsibleEmailSnapshot: string | null;
      responsibleEmployeeId: string | null;
    },
  ): KpiObjectiveRevisionSnapshot {
    return {
      objectiveId: objective.id,
      target: objective.target,
      unit: objective.unit,
      objective: objective.objective,
      frequency: objective.frequency,
      calculationFormula: objective.calculationFormula,
      actionPlanGuidelines: objective.actionPlanGuidelines,
      referenceDocuments: objective.referenceDocuments,
      responsibleAuthUserId: objective.responsibleAuthUserId,
      responsibleNameSnapshot: objective.responsibleNameSnapshot,
      responsibleEmailSnapshot: objective.responsibleEmailSnapshot,
      responsibleEmployeeId: objective.responsibleEmployeeId,
    };
  }

  private hasObjectiveChanged(
    current: {
      target: number;
      unit: string | null;
      objective: string;
      frequency: string;
      calculationFormula: string;
      actionPlanGuidelines: string;
      referenceDocuments: string | null;
      responsibleAuthUserId: string | null;
      responsibleNameSnapshot: string | null;
      responsibleEmailSnapshot: string | null;
      responsibleEmployeeId: string | null;
    },
    original: KpiObjectiveRevisionSnapshot,
  ): boolean {
    return current.target !== original.target
      || current.unit !== original.unit
      || current.objective !== original.objective
      || current.frequency !== original.frequency
      || current.calculationFormula !== original.calculationFormula
      || current.actionPlanGuidelines !== original.actionPlanGuidelines
      || current.referenceDocuments !== original.referenceDocuments
      || current.responsibleAuthUserId !== original.responsibleAuthUserId
      || current.responsibleNameSnapshot !== original.responsibleNameSnapshot
      || current.responsibleEmailSnapshot !== original.responsibleEmailSnapshot
      || current.responsibleEmployeeId !== original.responsibleEmployeeId;
  }

  private parseRevisionSnapshots(metadata: unknown): KpiObjectiveRevisionSnapshot[] {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return [];
    }

    const snapshots = (metadata as Record<string, unknown>).objectiveSnapshots;
    if (!Array.isArray(snapshots)) {
      return [];
    }

    return snapshots.flatMap((snapshot) => {
      if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
        return [];
      }

      const row = snapshot as Record<string, unknown>;
      if (
        typeof row.objectiveId !== 'string'
        || typeof row.target !== 'number'
        || typeof row.objective !== 'string'
        || typeof row.frequency !== 'string'
        || typeof row.calculationFormula !== 'string'
        || typeof row.actionPlanGuidelines !== 'string'
      ) {
        return [];
      }

      return [{
        objectiveId: row.objectiveId,
        target: row.target,
        unit: typeof row.unit === 'string' ? row.unit : null,
        objective: row.objective,
        frequency: row.frequency,
        calculationFormula: row.calculationFormula,
        actionPlanGuidelines: row.actionPlanGuidelines,
        referenceDocuments: typeof row.referenceDocuments === 'string' ? row.referenceDocuments : null,
        responsibleAuthUserId: typeof row.responsibleAuthUserId === 'string' ? row.responsibleAuthUserId : null,
        responsibleNameSnapshot: typeof row.responsibleNameSnapshot === 'string' ? row.responsibleNameSnapshot : null,
        responsibleEmailSnapshot: typeof row.responsibleEmailSnapshot === 'string' ? row.responsibleEmailSnapshot : null,
        responsibleEmployeeId: typeof row.responsibleEmployeeId === 'string' ? row.responsibleEmployeeId : null,
      }];
    });
  }

  private parseRevisionReason(after: unknown, metadata: unknown): string | null {
    if (after && typeof after === 'object' && !Array.isArray(after)) {
      const reason = (after as Record<string, unknown>).reason;
      if (typeof reason === 'string' && reason.trim()) {
        return reason.trim();
      }
    }

    if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
      const reason = (metadata as Record<string, unknown>).reason;
      if (typeof reason === 'string' && reason.trim()) {
        return reason.trim();
      }
    }

    return null;
  }

  private parseRevisionObjectiveIds(metadata: unknown): string[] {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return [];
    }

    const revisedObjectiveIds = (metadata as Record<string, unknown>).revisedObjectiveIds;
    if (!Array.isArray(revisedObjectiveIds)) {
      return [];
    }

    return revisedObjectiveIds.filter((value): value is string => typeof value === 'string');
  }

  private async getRevisionHistory(kpiId: string): Promise<KpiRevisionHistoryEntry[]> {
    const revisionLogs = await db.auditLog.findMany({
      where: {
        resourceType: 'KPI',
        resourceId: kpiId,
        action: 'REVISE',
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        actorRole: true,
        after: true,
        metadata: true,
      },
    });

    const entries: Array<KpiRevisionHistoryEntry | null> = revisionLogs.map((log) => {
        const objectiveSnapshots = this.parseRevisionSnapshots(log.metadata);
        if (objectiveSnapshots.length === 0) {
          return null;
        }

        return {
          auditLogId: log.id,
          revisedAt: log.createdAt,
          revisedByRole: log.actorRole,
          reason: this.parseRevisionReason(log.after, log.metadata),
          revisedObjectiveIds: this.parseRevisionObjectiveIds(log.metadata),
          objectiveSnapshots,
        };
      });

    return entries.filter((entry): entry is KpiRevisionHistoryEntry => entry !== null);
  }

  async listKpis(query: ListKpiQuery) {
    const result = await this.kpiRepo.paginateKpis(query);

    const userIds = [
      ...new Set(
        result.data.flatMap(k => [k.reviewerUserId, k.approverUserId]).filter(Boolean) as string[],
      ),
    ];
    const users = userIds.length > 0
      ? await this.userRepo.findByIds(userIds)
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    return {
      ...result,
      data: result.data.map(k => ({
        ...k,
        reviewerUser: k.reviewerUserId
          ? (userMap.get(k.reviewerUserId) ?? (k.reviewerEmail ? { id: k.reviewerUserId, name: k.reviewer || null, email: k.reviewerEmail } : null))
          : null,
        approverUser: k.approverUserId
          ? (userMap.get(k.approverUserId) ?? (k.approverEmail ? { id: k.approverUserId, name: k.approver || null, email: k.approverEmail } : null))
          : null,
      })),
    };
  }

  async getKpiById(id: string) {
    const kpi = await this.kpiRepo.findByIdWithRelations(id);
    if (!kpi) throw new NotFoundError(`KPI ${id} not found`);

    const signatures = await this.approvalSignatureRepo.findByDocument('KPI', id);
    const revisionHistory = await this.getRevisionHistory(id);
    const revisionSnapshots = revisionHistory[0]?.objectiveSnapshots ?? [];
    const snapshotMap = new Map(revisionSnapshots.map((snapshot) => [snapshot.objectiveId, snapshot]));
    const currentObjectiveIds = new Set(kpi.objectives.map((objective) => objective.id));

    const preparerSig = signatures.find(s => s.step === 'PREPARER');
    const userIds = [kpi.reviewerUserId, kpi.approverUserId, preparerSig?.signerUserId ?? null]
      .filter(Boolean) as string[];
    const users = userIds.length > 0 ? await this.userRepo.findByIds(userIds) : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    const preparerUser = preparerSig?.signerUserId ? (userMap.get(preparerSig.signerUserId) ?? null) : null;
    const resolvedPrepare = kpi.prepare || preparerUser?.name || preparerUser?.email || '';

    return {
      ...kpi,
      objectives: kpi.objectives.map((objective) => {
        const originalObjective = snapshotMap.get(objective.id) ?? null;
        const revisionChangeType = originalObjective
          ? (this.hasObjectiveChanged({
            target: objective.target,
            unit: objective.unit,
            objective: objective.objective,
            frequency: objective.frequency,
            calculationFormula: objective.calculationFormula,
            actionPlanGuidelines: objective.actionPlanGuidelines,
            referenceDocuments: objective.referenceDocuments,
            responsibleAuthUserId: objective.responsibleAuthUserId,
            responsibleNameSnapshot: objective.responsibleNameSnapshot,
            responsibleEmailSnapshot: objective.responsibleEmailSnapshot,
            responsibleEmployeeId: objective.responsibleEmployeeId,
          }, originalObjective) ? 'UPDATED' : null)
          : (kpi.isRevision ? 'ADDED' : null);

        return {
          ...objective,
          originalObjective: revisionChangeType === 'UPDATED' ? originalObjective : null,
          revisionChangeType,
        };
      }),
      removedObjectives: revisionSnapshots
        .filter((snapshot) => !currentObjectiveIds.has(snapshot.objectiveId))
        .map((snapshot): KpiRemovedObjectiveComparison => ({
          id: `removed-${snapshot.objectiveId}`,
          revisionChangeType: 'REMOVED',
          originalObjective: snapshot,
        })),
      revisionHistory,
      prepare: resolvedPrepare,
      reviewerUser: kpi.reviewerUserId
        ? (userMap.get(kpi.reviewerUserId) ?? (kpi.reviewerEmail ? { id: kpi.reviewerUserId, name: kpi.reviewer || null, email: kpi.reviewerEmail } : null))
        : null,
      approverUser: kpi.approverUserId
        ? (userMap.get(kpi.approverUserId) ?? (kpi.approverEmail ? { id: kpi.approverUserId, name: kpi.approver || null, email: kpi.approverEmail } : null))
        : null,
      approvalSignatures: signatures.map(s => ({
        ...s,
        signerUser: s.signerName || s.signerEmail
          ? { id: s.signerUserId, name: s.signerName ?? null, email: s.signerEmail ?? null, department: s.signerDepartmentName ? { name: s.signerDepartmentName } : null }
          : null,
      })),
    };
  }

  async createKpi(dto: CreateKpiDTO) {
    const dept = await db.kpiDept.findFirst({ where: { name: dto.department, isActive: true } });
    if (!dept) throw new NotFoundError(`Department "${dto.department}" not found in KPI department list`);
    const existing = await this.kpiRepo.findByDepartmentYear(dto.department, dto.yearly);
    if (existing) throw new ConflictError(`KPI for ${dto.department} in ${dto.yearly} already exists`);
    try {
      return await this.kpiRepo.create({ ...dto, documentName: dto.documentName ?? null });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictError(`KPI for ${dto.department} in ${dto.yearly} already exists`);
      }
      throw error;
    }
  }

  async updateKpi(id: string, dto: UpdateKpiDTO) {
    await this.getKpiById(id);
    return this.kpiRepo.update(id, dto as Record<string, unknown>);
  }

  async deleteKpi(id: string, actor?: ActorContext) {
    const kpi = await this.kpiRepo.findByIdWithRelations(id);
    if (!kpi) throw new NotFoundError(`KPI ${id} not found`);

    const monthlyReportIds = kpi.monthlyReports.map((report) => report.id);
    return db.$transaction(async (tx) => {
      if (monthlyReportIds.length > 0) {
        await tx.approvalSignature.deleteMany({
          where: { module: 'KPI_MONTHLY', documentId: { in: monthlyReportIds } },
        });
        await tx.actionToken.deleteMany({
          where: { module: 'KPI_MONTHLY', documentId: { in: monthlyReportIds } },
        });
        await tx.notification.deleteMany({
          where: {
            resourceId: { in: monthlyReportIds },
            resourceType: { in: ['KPI_MONTHLY', 'KPI_MONTHLY_REVIEWER', 'KPI_MONTHLY_APPROVER'] },
          },
        });
        await tx.auditLog.deleteMany({
          where: { resourceType: 'KPI_MONTHLY_REPORT', resourceId: { in: monthlyReportIds } },
        });
        await tx.kPIMonthlyDetail.deleteMany({
          where: { monthlyReportId: { in: monthlyReportIds } },
        });
        await tx.kPIMonthlyReport.deleteMany({ where: { id: { in: monthlyReportIds } } });
      }

      await tx.approvalSignature.deleteMany({ where: { module: 'KPI', documentId: id } });
      await tx.actionToken.deleteMany({ where: { module: 'KPI', documentId: id } });
      await tx.notification.deleteMany({ where: { resourceId: id, resourceType: { in: ['KPI', 'KPI_REVIEWER', 'KPI_APPROVER'] } } });
      await tx.auditLog.deleteMany({ where: { resourceType: 'KPI', resourceId: id } });
      await tx.kPIObjective.deleteMany({ where: { kpiId: id } });
      const deleted = await this.kpiRepo.delete(id, tx);
      if (actor) {
        await AuditService.record({
          actorUserId: actor.userId,
          actorAuthUserId: actor.authUserId,
          actorRole: actor.role,
          action: 'DELETE',
          resourceType: 'KPI',
          resourceId: id,
          before: { department: kpi.department, yearly: kpi.yearly, status: kpi.status },
        }, tx);
      }
      return deleted;
    });
  }

  async addObjective(dto: CreateKpiObjectiveDTO) {
    const kpi = await this.getKpiById(dto.kpiId);
    return this.objectiveRepo.createObjective({
      ...dto,
      isRevised: kpi.isRevision,
      isAdded: kpi.isRevision,
    });
  }

  async updateObjective(id: string, dto: UpdateKpiObjectiveDTO) {
    const obj = await this.objectiveRepo.findById(id);
    if (!obj) throw new NotFoundError(`KPI Objective ${id} not found`);
    
    const kpi = await this.kpiRepo.findById(obj.kpiId);
    const updateData = { ...dto };
    if (kpi?.isRevision) {
      (updateData as Record<string, unknown>).isRevised = true;
    }
    
    return this.objectiveRepo.update(id, updateData);
  }

  async deleteObjective(id: string) {
    const obj = await this.objectiveRepo.findById(id);
    if (!obj) throw new NotFoundError(`KPI Objective ${id} not found`);
    const hasDetails = await this.objectiveRepo.hasMonthlyDetails(id);
    if (hasDetails) throw new ConflictError('Cannot delete objective with existing monthly details');
    return this.objectiveRepo.delete(id);
  }

  async getObjectivesByKpiId(kpiId: string) {
    await this.getKpiById(kpiId);
    return this.objectiveRepo.findByKpiId(kpiId);
  }

  async getObjectiveById(id: string) {
    const obj = await this.objectiveRepo.findByIdWithDetails(id);
    if (!obj) throw new NotFoundError(`KPI Objective ${id} not found`);
    return obj;
  }

  async submitObjectives(
    id: string,
    dto: SubmitKpiObjectivesDTO,
    preparerUserId: string,
    senderAccessToken?: string | null,
  ) {
    const kpi = await this.kpiRepo.findByIdWithRelations(id);
    if (!kpi) throw new NotFoundError(`KPI ${id} not found`);
    if (kpi.objectives.length === 0) throw new ConflictError('Cannot submit KPI with no objectives');
    const now = new Date();

    const [preparer, preparerSnapshot] = await Promise.all([
      this.userRepo.findByAuthUserId(preparerUserId),
      getUserSnapshot(preparerUserId),
    ]);
    const preparerName = preparer?.name || preparer?.email || preparerSnapshot?.name || preparerSnapshot?.email || '';
    const reviewerName = dto.reviewerName?.trim() || dto.reviewerEmail || '';
    const approverName = dto.approverName?.trim() || dto.approverEmail || '';

    const updated = await db.$transaction(async (tx) => {
      const result = await this.kpiRepo.submitObjectives(id, {
        prepareSignature: dto.prepareSignature,
        reviewerUserId: dto.reviewerUserId,
        reviewerAuthUserId: dto.reviewerAuthUserId ?? dto.reviewerUserId,
        reviewer: reviewerName,
        reviewerEmail: dto.reviewerEmail ?? null,
        approverUserId: dto.approverUserId,
        approverAuthUserId: dto.approverAuthUserId ?? dto.approverUserId,
        approver: approverName,
        approverEmail: dto.approverEmail ?? null,
        submittedAt: now,
        prepare: preparerName,
      }, tx);

      await this.approvalSignatureRepo.deleteByDocument('KPI', id, tx);
      await this.approvalSignatureRepo.upsertStep({
        module: 'KPI',
        documentId: id,
        step: 'PREPARER',
        signerUserId: preparerUserId,
        signerAuthUserId: dto.preparerAuthUserId ?? null,
        action: 'APPROVED',
        actionDate: now,
        signaturePath: dto.prepareSignature,
      }, tx);
      await this.approvalSignatureRepo.upsertStep({
        module: 'KPI',
        documentId: id,
        step: 'REVIEWER',
        signerUserId: dto.reviewerUserId,
        action: 'PENDING',
      }, tx);
      await this.approvalSignatureRepo.upsertStep({
        module: 'KPI',
        documentId: id,
        step: 'APPROVER',
        signerUserId: dto.approverUserId,
        action: 'PENDING',
      }, tx);

      await AuditService.record({
        actorUserId: preparerUserId,
        actorAuthUserId: dto.preparerAuthUserId,
        actorRole: 'PREPARER',
        action: 'SUBMIT',
        resourceType: 'KPI',
        resourceId: id,
        before: { status: kpi.status },
        after: { status: result.status },
      }, tx);

      return result;
    });

    // Revoke any existing tokens, then issue fresh reviewer token
    await ActionTokenService.revokeByDocument(ApprovalModule.KPI, id);
    const reviewerToken = dto.reviewerEmail
      ? await ActionTokenService.issue({
          module: ApprovalModule.KPI,
          documentId: id,
          role: ApprovalStep.REVIEWER,
          issuedTo: dto.reviewerUserId,
        })
      : null;

    // Send notification outside transaction — idempotent via NotificationService
    if (dto.reviewerEmail && reviewerToken) {
      const isSystemMaster = updated.department === 'SYSTEM_MASTER';
      const printHtml = isSystemMaster
        ? await this.getFmMr01PrintHtml(await this.kpiRepo.findByIdWithRelations(id)).catch(() => null)
        : null;

      NotificationService.sendEmailOnce(
        `KPI:${id}:SUBMITTED:reviewer:${dto.reviewerUserId}:${reviewerToken.substring(0, 16)}`,
        () => sendKpiObjectiveReviewerAssignedEmail({
          reviewer: { name: reviewerName, email: dto.reviewerEmail! },
          requesterName: preparerName,
          departmentName: updated.department,
          kpiId: updated.id,
          objectives: updated.objectives.map((o) => ({ objective: o.objective, target: o.target, unit: o.unit })),
          year: updated.yearly,
          actionToken: reviewerToken,
          senderAccessToken,
          printHtml: printHtml ?? undefined,
        }),
        dto.reviewerEmail,
        'KPI Review Request',
        dto.reviewerUserId,
        {
          title: "มี KPI รอการ Review",
          body: `KPI ${updated.department} ${updated.yearly}`,
          htmlBody: makeBilingualMail({
            titleTh: `KPI ${updated.department} ปี ${updated.yearly} รอตรวจสอบ`,
            titleEn: `KPI ${updated.department} ${updated.yearly} Pending Review`,
            facts: [
              { labelTh: "ผู้ตรวจสอบ", labelEn: "Reviewer", value: reviewerName },
              { labelTh: "ผู้มอบหมาย", labelEn: "Assigned By", value: preparerName },
              { labelTh: "หน่วยงาน", labelEn: "Department", value: updated.department },
              { labelTh: "ปี", labelEn: "Year", value: String(updated.yearly) },
              { labelTh: "จำนวนตัวชี้วัด", labelEn: "Objective Count", value: String(updated.objectives.length) },
            ],
            extraHtml: printHtml ?? undefined,
            actionLabelTh: "ตรวจสอบ KPI",
            actionLabelEn: "Review KPI",
            actionUrl: reviewerToken ? `${(process.env.NEXTAUTH_URL ?? '').replace(/\/+$/, '')}/approve?token=${encodeURIComponent(reviewerToken)}` : undefined,
          }),
          module: "KPI",
          resourceId: id,
          resourceType: "KPI_REVIEWER",
        },
      ).catch(() => { /* logged inside NotificationService */ });
    }

    return updated;
  }

  async reviewObjectives(
    id: string,
    actor: ActorContext,
    sigBody?: { signatureDataUrl?: string; signatureType?: SignatureType; saveSignature?: boolean; attachments?: { fileName: string; spItemId: string; spWebUrl: string }[] | null }
  ) {
    const kpi = await this.kpiRepo.findByIdWithRelations(id);
    if (!kpi) throw new NotFoundError(`KPI ${id} not found`);
    if (kpi.status !== 'PENDING_REVIEW') throw new ConflictError('KPI is not pending review');
    const reviewerAuthId = (kpi as Record<string, unknown>).reviewerAuthUserId as string | null | undefined;
    const isReviewer = (actor.authUserId && reviewerAuthId)
      ? reviewerAuthId === actor.authUserId
      : kpi.reviewerUserId === actor.userId;
    if (!isReviewer) throw new ForbiddenError('You are not assigned as reviewer');

    const updated = await db.$transaction(async (tx) => {
      const result = await this.kpiRepo.setStatus(id, 'PENDING_APPROVAL', tx);
      await this.approvalSignatureRepo.upsertStep({
        module: 'KPI',
        documentId: id,
        step: 'REVIEWER',
        signerUserId: actor.userId,
        signerAuthUserId: actor.authUserId ?? null,
        action: 'APPROVED',
        actionDate: new Date(),
        signaturePath: sigBody?.signatureDataUrl,
        comment: sigBody?.attachments?.length ? JSON.stringify({ text: 'Review attachments', attachments: sigBody.attachments }) : null,
      }, tx);

      if (sigBody?.saveSignature && sigBody.signatureDataUrl) {
        await this.userPrefRepo.upsertSignature(actor.userId, {
          savedSignatureUrl: sigBody.signatureDataUrl,
          signatureType: sigBody.signatureType ?? 'DRAW',
        }, tx);
      }

      await AuditService.record({
        actorUserId: actor.userId,
        actorAuthUserId: actor.authUserId,
        actorRole: actor.role,
        action: 'REVIEW',
        resourceType: 'KPI',
        resourceId: id,
        before: { status: kpi.status },
        after: { status: result.status },
      }, tx);

      return result;
    });

    // Issue approver token after reviewer signs off
    const approverToken = kpi.approverUserId
      ? await ActionTokenService.issue({
          module: ApprovalModule.KPI,
          documentId: id,
          role: ApprovalStep.APPROVER,
          issuedTo: kpi.approverUserId,
        })
      : undefined;

    // Notify approver
    if (kpi.approverUserId && approverToken) {
      const isSystemMaster = kpi.department === 'SYSTEM_MASTER';
      const printHtml = isSystemMaster
        ? await this.getFmMr01PrintHtml(kpi).catch(() => null)
        : null;

      NotificationService.sendEmailOnce(
        `KPI:${id}:REVIEWED:approver:${kpi.approverUserId}`,
        () => sendKpiObjectiveApproverRequestEmail({
          approver: { name: kpi.approver ?? '', email: kpi.approverEmail! },
          reviewerName: actor.name ?? '',
          departmentName: kpi.department,
          objectives: kpi.objectives.map((o) => ({ objective: o.objective, target: o.target, unit: o.unit })),
          year: kpi.yearly,
          actionToken: approverToken,
          senderAccessToken: actor.accessToken,
          printHtml: printHtml ?? undefined,
        }),
        kpi.approverEmail ?? '',
        'KPI Approval Request',
        kpi.approverUserId,
        {
          title: 'มี KPI รอการอนุมัติ',
          body: `KPI ${kpi.department} ${kpi.yearly}`,
          htmlBody: makeBilingualMail({
            titleTh: `KPI ${kpi.department} ปี ${kpi.yearly} รออนุมัติ`,
            titleEn: `KPI ${kpi.department} ${kpi.yearly} Pending Approval`,
            facts: [
              { labelTh: "ผู้ตรวจสอบแล้ว", labelEn: "Reviewed By", value: actor.name ?? '' },
              { labelTh: "หน่วยงาน", labelEn: "Department", value: kpi.department },
              { labelTh: "ปี", labelEn: "Year", value: String(kpi.yearly) },
              { labelTh: "จำนวนตัวชี้วัด", labelEn: "Objective Count", value: String(kpi.objectives.length) },
            ],
            extraHtml: printHtml ?? undefined,
            actionLabelTh: "อนุมัติ KPI",
            actionLabelEn: "Approve KPI",
            actionUrl: approverToken ? `${(process.env.NEXTAUTH_URL ?? '').replace(/\/+$/, '')}/approve?token=${encodeURIComponent(approverToken)}` : undefined,
          }),
          module: 'KPI',
          resourceId: id,
          resourceType: 'KPI_APPROVER',
        },
      ).catch(() => {});
    }

    return { ...updated, objectives: kpi.objectives, approverToken };
  }

  async approveObjectives(
    id: string,
    actor: ActorContext,
    sigBody?: { signatureDataUrl?: string; signatureType?: SignatureType; saveSignature?: boolean; attachments?: { fileName: string; spItemId: string; spWebUrl: string }[] | null }
  ) {
    const kpi = await this.kpiRepo.findByIdWithRelations(id);
    if (!kpi) throw new NotFoundError(`KPI ${id} not found`);
    if (kpi.status !== 'PENDING_APPROVAL') throw new ConflictError('KPI is not pending approval');
    const approverAuthId = (kpi as Record<string, unknown>).approverAuthUserId as string | null | undefined;
    const isApprover = (actor.authUserId && approverAuthId)
      ? approverAuthId === actor.authUserId
      : kpi.approverUserId === actor.userId;
    if (!isApprover) throw new ForbiddenError('You are not assigned as approver');

    const signatures = await this.approvalSignatureRepo.findByDocument('KPI', id);
    const reviewerSig = signatures.find(s => s.step === 'REVIEWER');
    if (!reviewerSig || reviewerSig.action !== 'APPROVED') {
      throw new ConflictError('Reviewer must approve before approver can proceed');
    }

    const updated = await db.$transaction(async (tx) => {
      const result = await this.kpiRepo.setStatus(id, 'APPROVED', tx);
      await this.approvalSignatureRepo.upsertStep({
        module: 'KPI',
        documentId: id,
        step: 'APPROVER',
        signerUserId: actor.userId,
        signerAuthUserId: actor.authUserId ?? null,
        action: 'APPROVED',
        actionDate: new Date(),
        signaturePath: sigBody?.signatureDataUrl,
        comment: sigBody?.attachments?.length ? JSON.stringify({ text: 'Approval attachments', attachments: sigBody.attachments }) : null,
      }, tx);

      if (sigBody?.saveSignature && sigBody.signatureDataUrl) {
        await this.userPrefRepo.upsertSignature(actor.userId, {
          savedSignatureUrl: sigBody.signatureDataUrl,
          signatureType: sigBody.signatureType ?? 'DRAW',
        }, tx);
      }

      await this.generateMonthlyReportsForApprovedKpi({
        kpiId: kpi.id,
        year: kpi.yearly,
        objectiveIds: kpi.objectives.map((objective) => objective.id),
      }, tx);

      await AuditService.record({
        actorUserId: actor.userId,
        actorAuthUserId: actor.authUserId,
        actorRole: actor.role,
        action: 'APPROVE',
        resourceType: 'KPI',
        resourceId: id,
        before: { status: kpi.status },
        after: { status: result.status },
      }, tx);

      return result;
    });

    // Approved — no more actions needed, revoke any remaining tokens
    await ActionTokenService.revokeByDocument(ApprovalModule.KPI, id);

    // Notify preparer
    const preparerSig = signatures.find((s) => s.step === 'PREPARER');
    const preparerAuthId = (preparerSig as Record<string, unknown>)?.signerAuthUserId as string | null | undefined;
    if (preparerAuthId) {
      const preparer = await getUserSnapshot(preparerAuthId);
      const isSystemMaster = kpi.department === 'SYSTEM_MASTER';
      const displayDept = isSystemMaster ? 'FM-MR-01 (วัตถุประสงค์คุณภาพประจำปี)' : kpi.department;
      const actionUrl = isSystemMaster
        ? `${(process.env.NEXTAUTH_URL ?? '').replace(/\/+$/, '')}/print/qms/kpi/fm-mr-01?year=${kpi.yearly}&mode=review`
        : `${(process.env.NEXTAUTH_URL ?? '').replace(/\/+$/, '')}/qms/kpi/${id}`;
      const printHtml = isSystemMaster
        ? await this.getFmMr01PrintHtml(kpi).catch(() => null)
        : null;

      NotificationService.sendEmailOnce(
        `KPI:${id}:APPROVED:preparer:${preparerAuthId}`,
        () => sendKpiResultEmail({
          to: { name: preparer?.name ?? '', email: preparer?.email ?? '' },
          departmentName: kpi.department,
          year: kpi.yearly,
          status: 'APPROVED',
          actorName: actor.name ?? '',
          kpiId: id,
          objectives: kpi.objectives.map((o) => ({ objective: o.objective, target: o.target, unit: o.unit })),
          senderAccessToken: actor.accessToken,
          actionUrl,
          printHtml: printHtml ?? undefined,
        }),
        preparer?.email ?? '',
        'KPI Approved',
        preparerAuthId,
        {
          title: 'KPI ได้รับการอนุมัติแล้ว',
          body: `${displayDept} ปี ${kpi.yearly} ได้รับการอนุมัติ`,
          htmlBody: makeBilingualMail({
            titleTh: `ผลการอนุมัติ ${displayDept} ปี ${kpi.yearly}`,
            titleEn: `${displayDept} ${kpi.yearly} Approval Result`,
            facts: [
              { labelTh: "สถานะ", labelEn: "Status", value: "อนุมัติแล้ว / APPROVED" },
              { labelTh: "ดำเนินการโดย", labelEn: "Action By", value: actor.name ?? '' },
              { labelTh: "หน่วยงาน/เอกสาร", labelEn: "Department/Doc", value: displayDept },
              { labelTh: "ปี", labelEn: "Year", value: String(kpi.yearly) },
              { labelTh: "จำนวนตัวชี้วัด", labelEn: "Objective Count", value: String(kpi.objectives.length) },
            ],
            extraHtml: printHtml ?? undefined,
            actionLabelTh: isSystemMaster ? "เปิดดูแผนงาน" : "เปิด KPI",
            actionLabelEn: isSystemMaster ? "Open Plan" : "Open KPI",
            actionUrl,
          }),
          module: 'KPI',
          resourceId: id,
          resourceType: 'KPI',
        },
        ).catch(() => {});
    }

    return { ...updated, objectives: kpi.objectives };
  }

  private async generateMonthlyReportsForApprovedKpi(
    payload: { kpiId: string; year: number; objectiveIds: string[] },
    tx: Prisma.TransactionClient,
  ) {
    // Upsert all 12 month reports in parallel, then batch-create details
    const reports = await Promise.all(
      KPI_MONTHS.map((month) => this.monthlyReportRepo.findOrCreate(payload.kpiId, month, payload.year, tx))
    );
    await Promise.all(
      reports.map((report) => this.monthlyDetailRepo.createManyForReport(report.id, payload.objectiveIds, tx))
    );
  }

  async recallObjectives(id: string, actor: ActorContext) {
    const kpi = await this.kpiRepo.findByIdWithRelations(id);
    if (!kpi) throw new NotFoundError(`KPI ${id} not found`);
    if (kpi.status !== 'PENDING_REVIEW' && kpi.status !== 'PENDING_APPROVAL') throw new ConflictError('KPI can only be recalled when pending review or approval');

    const signatures = await this.approvalSignatureRepo.findByDocument('KPI', id);
    const preparerSig = signatures.find(s => s.step === 'PREPARER');
    const preparerSigAuthId = (preparerSig as Record<string, unknown> | undefined)?.signerAuthUserId as string | null | undefined;
    const isPreparer = preparerSig && (
      (actor.authUserId && preparerSigAuthId)
        ? preparerSigAuthId === actor.authUserId
        : preparerSig.signerUserId === actor.userId
    );
    if (!isPreparer) {
      throw new ForbiddenError('Only the preparer can recall this KPI');
    }

    const notifyUserIds = [kpi.reviewerUserId, kpi.approverUserId].filter(Boolean) as string[];

    const updated = await db.$transaction(async (tx) => {
      const result = await this.kpiRepo.setStatus(id, 'DRAFT', tx);
      await this.kpiRepo.clearSubmission(id, tx);
      await this.approvalSignatureRepo.deleteByDocument('KPI', id, tx);

      await AuditService.record({
        actorUserId: actor.userId,
        actorAuthUserId: actor.authUserId,
        actorRole: actor.role,
        action: 'RECALL',
        resourceType: 'KPI',
        resourceId: id,
        before: { status: kpi.status },
        after: { status: result.status },
      }, tx);

      return result;
    });

    // Revoke all tokens immediately — reviewer link in inbox is now invalid
    await ActionTokenService.revokeByDocument(ApprovalModule.KPI, id);

    // Send notifications outside transaction — idempotent via NotificationService
    if (notifyUserIds.length > 0) {
      const isSystemMaster = kpi.department === 'SYSTEM_MASTER';
      const printHtml = isSystemMaster
        ? await this.getFmMr01PrintHtml(kpi).catch(() => null)
        : null;
      const snapshots = await Promise.all(notifyUserIds.map((uid) => getUserSnapshot(uid)));
      for (let i = 0; i < notifyUserIds.length; i++) {
        const u = snapshots[i];
        const authId = notifyUserIds[i];
        if (!u?.email) continue;
        NotificationService.sendEmailOnce(
          `KPI:${id}:RECALLED:notify:${authId}`,
          () => sendKpiRecallEmail({
            to: { name: u.name ?? '', email: u.email! },
            departmentName: kpi.department,
            year: kpi.yearly,
            preparerName: actor.name ?? '',
            kpiId: id,
            senderAccessToken: actor.accessToken,
            printHtml: printHtml ?? undefined,
          }),
          u.email,
          'KPI Recalled',
          authId,
          {
            title: "KPI ถูก Recall",
            body: `KPI ${kpi.department} ${kpi.yearly}`,
            htmlBody: makeBilingualMail({
              titleTh: `KPI ${kpi.department} ปี ${kpi.yearly} ถูกเรียกคืนแล้ว`,
              titleEn: `KPI ${kpi.department} ${kpi.yearly} Recalled`,
              facts: [
                { labelTh: "เรียกคืนโดย", labelEn: "Recalled By", value: actor.name ?? '' },
                { labelTh: "หน่วยงาน", labelEn: "Department", value: kpi.department },
                { labelTh: "ปี", labelEn: "Year", value: String(kpi.yearly) },
                { labelTh: "หมายเหตุ", labelEn: "Note", value: "KPI ถูกเรียกคืนกลับเป็นแบบร่าง งานที่มอบหมายถูกยกเลิก / KPI has been recalled to Draft. Your assignment has been cancelled." },
              ],
              extraHtml: printHtml ?? undefined,
              actionLabelTh: "เปิด KPI",
              actionLabelEn: "Open KPI",
              actionUrl: `${(process.env.NEXTAUTH_URL ?? '').replace(/\/+$/, '')}/qms/kpi/${id}`,
            }),
            module: "KPI",
            resourceId: id,
            resourceType: "KPI",
          },
        ).catch(() => { /* logged inside NotificationService */ });
      }
    }

    return { ...updated, notifyUserIds };
  }

  async rejectObjectives(id: string, actor: ActorContext, reason?: string, attachments?: { fileName: string; spItemId: string; spWebUrl: string }[] | null) {
    const kpi = await this.kpiRepo.findByIdWithRelations(id);
    if (!kpi) throw new NotFoundError(`KPI ${id} not found`);
    if (kpi.status !== 'PENDING_REVIEW' && kpi.status !== 'PENDING_APPROVAL') throw new ConflictError('KPI cannot be rejected in current status');
    const rejectReviewerAuthId = (kpi as Record<string, unknown>).reviewerAuthUserId as string | null | undefined;
    const rejectApproverAuthId = (kpi as Record<string, unknown>).approverAuthUserId as string | null | undefined;
    const isRejectReviewer = (actor.authUserId && rejectReviewerAuthId)
      ? rejectReviewerAuthId === actor.authUserId : kpi.reviewerUserId === actor.userId;
    const isRejectApprover = (actor.authUserId && rejectApproverAuthId)
      ? rejectApproverAuthId === actor.authUserId : kpi.approverUserId === actor.userId;
    if (!isRejectReviewer && !isRejectApprover) {
      throw new ForbiddenError('You are not assigned in this KPI workflow');
    }
    const rejectedStep = isRejectReviewer ? 'REVIEWER' : 'APPROVER';
    
    let dbComment = reason;
    if (attachments && attachments.length > 0) {
      dbComment = JSON.stringify({
        text: reason ?? "",
        attachments,
      });
    }

    const updated = await db.$transaction(async (tx) => {
      const result = await this.kpiRepo.setStatus(id, 'REJECTED', tx);
      await this.approvalSignatureRepo.upsertStep({
        module: 'KPI',
        documentId: id,
        step: rejectedStep,
        signerUserId: actor.userId,
        signerAuthUserId: actor.authUserId ?? null,
        action: 'REJECTED',
        actionDate: new Date(),
        comment: dbComment ?? null,
      }, tx);

      await AuditService.record({
        actorUserId: actor.userId,
        actorAuthUserId: actor.authUserId,
        actorRole: actor.role,
        action: 'REJECT',
        resourceType: 'KPI',
        resourceId: id,
        before: { status: kpi.status },
        after: { status: result.status },
        metadata: { step: rejectedStep },
      }, tx);

      return result;
    });

    // Revoke all tokens — preparer must re-submit to get a new reviewer link
    await ActionTokenService.revokeByDocument(ApprovalModule.KPI, id);

    // Notify preparer
    const rejectSignatures = await this.approvalSignatureRepo.findByDocument('KPI', id) ?? [];
    const rejectPreparerSig = rejectSignatures.find((s) => s.step === 'PREPARER');
    const rejectPreparerAuthId = (rejectPreparerSig as Record<string, unknown>)?.signerAuthUserId as string | null | undefined;
    if (rejectPreparerAuthId) {
      const preparer = await getUserSnapshot(rejectPreparerAuthId);
      if (preparer?.email) {
        const isSystemMaster = kpi.department === 'SYSTEM_MASTER';
        const printHtml = isSystemMaster
          ? await this.getFmMr01PrintHtml(kpi).catch(() => null)
          : null;

        NotificationService.sendEmailOnce(
          `KPI:${id}:REJECTED:preparer:${rejectPreparerAuthId}`,
          () => sendKpiRejectedPreparerEmail({
            to: { name: preparer.name ?? '', email: preparer.email! },
            departmentName: kpi.department,
            year: kpi.yearly,
            actorName: actor.name ?? '',
            kpiId: id,
            objectives: kpi.objectives.map((o) => ({ objective: o.objective, target: o.target, unit: o.unit })),
            senderAccessToken: actor.accessToken,
            printHtml: printHtml ?? undefined,
          }),
          preparer.email,
          'KPI Rejected',
          rejectPreparerAuthId,
          {
            title: 'KPI ถูกปฏิเสธ',
            body: `KPI ${kpi.department} ${kpi.yearly} ถูกปฏิเสธ`,
            htmlBody: makeBilingualMail({
              titleTh: `KPI ${kpi.department} ปี ${kpi.yearly} ถูกปฏิเสธ`,
              titleEn: `KPI ${kpi.department} ${kpi.yearly} Rejected`,
              facts: [
                { labelTh: "ปฏิเสธโดย", labelEn: "Rejected By", value: actor.name ?? '' },
                { labelTh: "หน่วยงาน", labelEn: "Department", value: kpi.department },
                { labelTh: "ปี", labelEn: "Year", value: String(kpi.yearly) },
                { labelTh: "หมายเหตุ", labelEn: "Note", value: "กรุณาแก้ไขและส่งตรวจสอบใหม่ / Please revise and resubmit." },
              ],
              extraHtml: printHtml ?? undefined,
              actionLabelTh: "แก้ไข KPI",
              actionLabelEn: "Edit KPI",
              actionUrl: `${(process.env.NEXTAUTH_URL ?? '').replace(/\/+$/, '')}/qms/kpi/${id}`,
            }),
            module: 'KPI',
            resourceId: id,
            resourceType: 'KPI',
          },
        ).catch(() => {});
      }
    }

    return { ...updated, objectives: kpi.objectives };
  }

  async qmsCheckKpi(
    id: string,
    actor: ActorContext,
    sigBody?: { signatureDataUrl?: string; signatureType?: SignatureType; saveSignature?: boolean }
  ) {
    const kpi = await this.kpiRepo.findByIdWithRelations(id);
    if (!kpi) throw new NotFoundError(`KPI ${id} not found`);
    ensureKpiStatusTransition(kpi.status, 'QMS_CHECK');
    if (!isPrivilegedQmsRole(actor.role)) throw new ForbiddenError('Only QMS/MR/IT can perform QMS check');

    const now = new Date();
    return db.$transaction(async (tx) => {
      const result = await this.kpiRepo.setStatus(id, 'QMS_CHECK', tx);
      await this.approvalSignatureRepo.upsertStep({
        module: 'KPI',
        documentId: id,
        step: 'QMS_CHECK' as ApprovalStep,
        signerUserId: actor.userId,
        signerAuthUserId: actor.authUserId ?? null,
        action: 'APPROVED',
        actionDate: now,
        signaturePath: sigBody?.signatureDataUrl,
      }, tx);

      if (sigBody?.saveSignature && sigBody.signatureDataUrl) {
        await this.userPrefRepo.upsertSignature(actor.userId, {
          savedSignatureUrl: sigBody.signatureDataUrl,
          signatureType: sigBody.signatureType ?? 'DRAW',
        }, tx);
      }

      await AuditService.record({
        actorUserId: actor.userId,
        actorAuthUserId: actor.authUserId,
        actorRole: actor.role,
        action: 'QMS_CHECK' as Parameters<typeof AuditService.record>[0]['action'],
        resourceType: 'KPI',
        resourceId: id,
        before: { status: kpi.status },
        after: { status: result.status },
      }, tx);

      return result;
    });
  }

  async announceKpi(
    id: string,
    actor: ActorContext,
    senderAccessToken?: string | null,
    body?: {
      documentName?: string | null;
      toGroupEmails?: string[];
      ccGroupEmails?: string[];
      wysiwygContent?: string;
    }
  ) {
    const kpi = await this.kpiRepo.findByIdWithRelations(id);
    if (!kpi) throw new NotFoundError(`KPI ${id} not found`);
    ensureKpiStatusTransition(kpi.status, 'ANNOUNCED');
    if (!isPrivilegedQmsRole(actor.role)) throw new ForbiddenError('Only QMS/MR/IT can announce KPIs');

    const now = new Date();
    const documentName = body?.documentName;
    const updated = await db.$transaction(async (tx) => {
      const result = await this.kpiRepo.update(id, {
        status: 'ANNOUNCED',
        publishedAt: now,
        publishedBy: actor.userId,
        ...(documentName ? { documentName } : {}),
      } as Record<string, unknown>, tx);
      return result;
    });

    await ActionTokenService.revokeByDocument(ApprovalModule.KPI, id);

    const isSystemMaster = kpi.department === 'SYSTEM_MASTER';
    const displayDept = isSystemMaster ? 'FM-MR-01 (วัตถุประสงค์คุณภาพประจำปี)' : kpi.department;

    // Generate PDF for SYSTEM_MASTER or Excel for department KPIs
    let attachment: { name: string; contentType: string; contentBytes: string } | null = null;
    if (isSystemMaster) {
      try {
        attachment = await this.generateAnnouncementPdf(kpi);
      } catch (err) {
        logger.error('[announceKpi] PDF generation failed', { err });
      }
    } else {
      try {
        attachment = await this.generateAnnouncementExcel(kpi);
      } catch {
        // Excel generation is best-effort
      }
    }

    if (body?.toGroupEmails?.length) {
      try {
        const printHtml = isSystemMaster
          ? await this.getFmMr01PrintHtml(kpi).catch(() => null)
          : null;
        const announceExtraHtml = [body.wysiwygContent, printHtml].filter(Boolean).join('<div style="margin-top:16px"></div>') || undefined;

        await sendMail({
          to: body.toGroupEmails.map(email => ({ name: email, email })),
          cc: body.ccGroupEmails?.map(email => ({ name: email, email })),
          subject: `[ประกาศ] วัตถุประสงค์คุณภาพประจำปี FM-MR-01 ปี ${kpi.yearly} / Quality Objectives Announcement`,
          bodyHtml: makeBilingualMail({
            titleTh: `ประกาศวัตถุประสงค์คุณภาพประจำปี FM-MR-01 ปี ${kpi.yearly}`,
            titleEn: `FM-MR-01 Quality Objectives ${kpi.yearly} Announced`,
            facts: [
              { labelTh: 'ประเภทเอกสาร', labelEn: 'Doc Type', value: displayDept },
              { labelTh: 'ปี', labelEn: 'Year', value: String(kpi.yearly) },
            ],
            extraHtml: announceExtraHtml,
            actionLabelTh: 'เปิดดูแผนงาน',
            actionLabelEn: 'Open Plan',
            actionUrl: `${(process.env.NEXTAUTH_URL ?? '').replace(/\/+$/, '')}/print/qms/kpi/fm-mr-01?year=${kpi.yearly}&mode=review`,
          }),
          attachments: attachment ? [attachment] : undefined,
          senderAccessToken,
        });

        // Save announcement to database
        await db.announcement.create({
          data: {
            sourceSystem: 'QMS',
            title: `ประกาศวัตถุประสงค์คุณภาพประจำปี FM-MR-01 ปี ${kpi.yearly}`,
            content: body.wysiwygContent || `วัตถุประสงค์คุณภาพประจำปี FM-MR-01 ปี ${kpi.yearly} ประกาศใช้แล้ว`,
            displayType: 'LIST',
            pushToCompanyCenter: true,
            createdById: actor.userId,
            createdByAuthUserId: actor.authUserId,
            createdByName: actor.name,
          },
        });

        // Fan out in-app notifications to matched departments
        const deptService = new DepartmentService();
        const activeDepts = await deptService.getActiveDepartments(senderAccessToken);
        const matchedDepts = activeDepts.filter(d => d.emailGroup && body.toGroupEmails?.includes(d.emailGroup));
        for (const dept of matchedDepts) {
          await NotificationService.notifyDeptMembers(
            dept.id,
            senderAccessToken,
            {
              title: 'ประกาศวัตถุประสงค์คุณภาพประจำปี FM-MR-01',
              body: `วัตถุประสงค์คุณภาพประจำปี FM-MR-01 ปี ${kpi.yearly} ประกาศใช้แล้ว`,
              htmlBody: makeBilingualMail({
                titleTh: `วัตถุประสงค์คุณภาพประจำปี FM-MR-01 ปี ${kpi.yearly} ประกาศใช้`,
                titleEn: `FM-MR-01 Quality Objectives ${kpi.yearly} Announced`,
                facts: [
                  { labelTh: 'หน่วยงาน', labelEn: 'Department', value: dept.name },
                  { labelTh: 'ปี', labelEn: 'Year', value: String(kpi.yearly) },
                ],
                extraHtml: printHtml ?? undefined,
                actionLabelTh: 'เปิดดูแผนงาน',
                actionLabelEn: 'Open Plan',
                actionUrl: `${(process.env.NEXTAUTH_URL ?? '').replace(/\/+$/, '')}/print/qms/kpi/fm-mr-01?year=${kpi.yearly}&mode=review`,
              }),
              module: 'KPI',
              resourceId: id,
              resourceType: 'KPI_ANNOUNCEMENT',
            }
          ).catch(() => {});
        }
      } catch (err) {
        logger.warn('[announceKpi] Custom announcement send failed', { err });
      }
    } else {
      // Fetch all department members from Auth Center
      let deptMembers: { id: string; email?: string | null; name?: string | null }[] = [];
      try {
        const kpiDept = await db.kpiDept.findFirst({ where: { name: kpi.department, isActive: true } });
        if (kpiDept?.authDeptCode) {
          const members = await listAuthCenterAppMembers({ accessToken: senderAccessToken ?? undefined });
          deptMembers = members
            .filter(m => {
              const dept = (m as Record<string, unknown>).department as string | undefined;
              return dept === kpiDept.authDeptCode || dept === kpi.department;
            })
            .map(m => ({ id: m.id, email: m.email, name: m.displayName }));
        }
      } catch {
        // Fallback: notify only known users
      }

      const emailSubject = `[ประกาศ] KPI ${displayDept} ปี ${kpi.yearly} / KPI Announcement`;
      const deptPrintHtml = isSystemMaster
        ? await this.getFmMr01PrintHtml(kpi).catch(() => null)
        : null;
      for (const member of deptMembers) {
        if (!member.email) continue;
        NotificationService.sendEmailOnce(
          `KPI:${id}:ANNOUNCED:${member.id}`,
          () => sendKpiAnnouncementEmail({
            to: { name: member.name ?? '', email: member.email! },
            departmentName: displayDept,
            year: kpi.yearly,
            actorName: actor.name ?? '',
            kpiId: id,
            senderAccessToken,
            attachment: attachment ?? undefined,
            printHtml: deptPrintHtml ?? undefined,
          }),
          member.email,
          emailSubject,
          member.id,
          {
            title: 'KPI ประกาศใช้',
            body: `KPI ${displayDept} ${kpi.yearly} ประกาศใช้แล้ว`,
            htmlBody: makeBilingualMail({
              titleTh: `KPI ${displayDept} ปี ${kpi.yearly} ประกาศใช้`,
              titleEn: `KPI ${displayDept} ${kpi.yearly} Announced`,
              facts: [
                { labelTh: 'หน่วยงาน/เอกสาร', labelEn: 'Department/Doc', value: displayDept },
                { labelTh: 'ปี', labelEn: 'Year', value: String(kpi.yearly) },
              ],
              extraHtml: deptPrintHtml ?? undefined,
            }),
            module: 'KPI',
            resourceId: id,
            resourceType: 'KPI_ANNOUNCEMENT',
          },
        ).catch(() => {});
      }

      // Also create in-app notifications for department members
      NotificationService.notifyDeptMembers(
        kpi.department,
        senderAccessToken,
        {
          title: `KPI ${displayDept} ${kpi.yearly} ประกาศใช้ / Announced`,
          body: `KPI ${displayDept} ปี ${kpi.yearly} ประกาศใช้แล้ว`,
          module: 'KPI',
          resourceId: id,
          resourceType: 'KPI_ANNOUNCEMENT',
        },
      ).catch(() => {});
    }

    return updated;
  }

  async copyKpiFromPreviousYear(sourceKpiId: string, targetYear: number, actor: ActorContext) {
    const sourceKpi = await this.kpiRepo.findByIdWithRelations(sourceKpiId);
    if (!sourceKpi) throw new NotFoundError(`Source KPI ${sourceKpiId} not found`);
    if (sourceKpi.yearly >= targetYear) throw new ConflictError('Target year must be after source year');

    const existing = await this.kpiRepo.findByDepartmentYear(sourceKpi.department, targetYear);
    if (existing) throw new ConflictError(`KPI for ${sourceKpi.department} in ${targetYear} already exists`);

    return db.$transaction(async (tx) => {
      const newKpi = await this.kpiRepo.create({
        yearly: targetYear,
        department: sourceKpi.department,
        prepare: sourceKpi.prepare,
        reviewer: sourceKpi.reviewer,
        approver: sourceKpi.approver,
        documentName: sourceKpi.documentName ?? undefined,
      }, tx);

      for (const obj of sourceKpi.objectives) {
        await this.objectiveRepo.createObjective({
          kpiId: newKpi.id,
          target: obj.target,
          unit: obj.unit ?? undefined,
          objective: obj.objective,
          frequency: obj.frequency,
          calculationFormula: obj.calculationFormula,
          actionPlanGuidelines: obj.actionPlanGuidelines,
          referenceDocuments: obj.referenceDocuments ?? undefined,
          responsibleAuthUserId: obj.responsibleAuthUserId ?? undefined,
          responsibleNameSnapshot: obj.responsibleNameSnapshot ?? undefined,
          responsibleEmailSnapshot: obj.responsibleEmailSnapshot ?? undefined,
          responsibleEmployeeId: obj.responsibleEmployeeId ?? undefined,
          isRevised: false,
        }, tx);
      }

      await AuditService.record({
        actorUserId: actor.userId,
        actorAuthUserId: actor.authUserId,
        actorRole: actor.role,
        action: 'COPY' as Parameters<typeof AuditService.record>[0]['action'],
        resourceType: 'KPI',
        resourceId: newKpi.id,
        metadata: { sourceKpiId, sourceYear: sourceKpi.yearly, targetYear },
      }, tx);

      return this.kpiRepo.findByIdWithRelations(newKpi.id, tx);
    });
  }

  async reviseKpi(
    id: string,
    actor: ActorContext,
    reason: string,
    objectiveIds?: string[],
  ) {
    const kpi = await this.kpiRepo.findByIdWithRelations(id);
    if (!kpi) throw new NotFoundError(`KPI ${id} not found`);
    if (kpi.status !== 'APPROVED' && kpi.status !== 'ANNOUNCED') {
      throw new ConflictError('Only APPROVED or ANNOUNCED KPIs can be revised');
    }
    if (!['QMS', 'MR', 'IT'].includes(actor.role)) throw new ForbiddenError('Only QMS/MR/IT can revise KPIs');

    const revisionMonth = new Date().getMonth();
    const remainingMonthIdx = revisionMonth + 1;

    return db.$transaction(async (tx) => {
      // Reset KPI status to DRAFT and mark as revision
      const result = await this.kpiRepo.update(id, {
        status: 'DRAFT',
        isRevision: true,
        revisionYear: kpi.yearly,
        publishedAt: null,
        publishedBy: null,
      } as Record<string, unknown>, tx);

      // Clear previous revision and addition flags on all objectives for this KPI
      for (const obj of kpi.objectives) {
        await this.objectiveRepo.update(obj.id, { isRevised: false, isAdded: false } as Record<string, unknown>, tx);
      }

      // Mark specified objectives as revised (if any)
      const targetObjIds = (objectiveIds && objectiveIds.length > 0) ? objectiveIds : [];
      for (const objId of targetObjIds) {
        await this.objectiveRepo.update(objId, { isRevised: true } as Record<string, unknown>, tx);
      }

      // Delete monthly reports from the revision month onward, regenerate remaining
      await this.monthlyReportRepo.deleteByKpiIdFromMonth(id, KPI_MONTHS[remainingMonthIdx] ?? 'Oct', tx);

      // Regenerate remaining months
      const remainingMonths = KPI_MONTHS.slice(remainingMonthIdx);
      if (remainingMonths.length > 0) {
        await this.generateMonthlyReportsForApprovedKpi({
          kpiId: kpi.id,
          year: kpi.yearly,
          objectiveIds: kpi.objectives.map(o => o.id),
        }, tx);
      }

      await this.approvalSignatureRepo.deleteByDocument('KPI', id, tx);
      await ActionTokenService.revokeByDocument(ApprovalModule.KPI, id);

      if (kpi.department !== 'SYSTEM_MASTER') {
        const masterKpi = await tx.kPI.findFirst({
          where: { department: 'SYSTEM_MASTER', yearly: kpi.yearly },
        });

        if (masterKpi && (masterKpi.status === 'APPROVED' || masterKpi.status === 'ANNOUNCED')) {
          await tx.kPI.update({
            where: { id: masterKpi.id },
            data: {
              status: 'DRAFT',
              publishedAt: null,
              publishedBy: null,
              submittedAt: null,
            },
          });

          await this.approvalSignatureRepo.deleteByDocument('KPI', masterKpi.id, tx);
          await ActionTokenService.revokeByDocument(ApprovalModule.KPI, masterKpi.id);
        }
      }

      await AuditService.record({
        actorUserId: actor.userId,
        actorAuthUserId: actor.authUserId,
        actorRole: actor.role,
        action: 'REVISE' as Parameters<typeof AuditService.record>[0]['action'],
        resourceType: 'KPI',
        resourceId: id,
        before: { status: kpi.status },
        after: { status: 'DRAFT', reason },
        metadata: {
          reason,
          revisedObjectives: targetObjIds.length,
          revisedObjectiveIds: targetObjIds,
          objectiveSnapshots: kpi.objectives.map((objective) => this.buildObjectiveSnapshot(objective)),
        },
      }, tx);

      return result;
    });
  }

  private async generateAnnouncementExcel(kpi: Awaited<ReturnType<KpiRepository['findByIdWithRelations']>>) {
    if (!kpi) return null;

    const wb = new ExcelJS.Workbook();
    wb.creator = 'QMS System';
    const ws = wb.addWorksheet('KPI Objectives');

    const headerFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F1059' } };
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    const border: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FFCCCCCC' } };
    const allBorders: Partial<ExcelJS.Borders> = { top: border, left: border, bottom: border, right: border };

    ws.columns = [
      { header: 'No.', key: 'no', width: 6 },
      { header: 'Objective', key: 'objective', width: 50 },
      { header: 'Target', key: 'target', width: 12 },
      { header: 'Unit', key: 'unit', width: 12 },
      { header: 'Frequency', key: 'frequency', width: 14 },
      { header: 'Formula', key: 'formula', width: 40 },
      { header: 'Guidelines', key: 'guidelines', width: 50 },
    ];

    ws.getRow(1).eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.border = allBorders;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    ws.getRow(1).height = 22;

    // Info row
    const infoRow = ws.addRow({ no: '', objective: `Department: ${kpi.department} | Year: ${kpi.yearly}`, target: '', unit: '', frequency: '', formula: '', guidelines: '' });
    infoRow.eachCell((cell) => { cell.font = { bold: true, size: 11 }; });

    for (let i = 0; i < kpi.objectives.length; i++) {
      const obj = kpi.objectives[i];
      const row = ws.addRow({
        no: i + 1,
        objective: obj.objective,
        target: obj.target,
        unit: obj.unit ?? '',
        frequency: obj.frequency,
        formula: obj.calculationFormula,
        guidelines: obj.actionPlanGuidelines,
      });
      row.eachCell((cell) => {
        cell.border = allBorders;
        cell.alignment = { vertical: 'top', wrapText: false };
      });
    }

    const buffer = await wb.xlsx.writeBuffer();
    return {
      name: `KPI_${kpi.department}_${kpi.yearly}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      contentBytes: Buffer.from(buffer).toString('base64'),
    };
  }

  /**
   * Builds the FM-MR-01 print-style block (same look as /print/qms/kpi/fm-mr-01)
   * for embedding in emails/PDFs — header, objectives table grouped by department, signature block, footer.
   */
  async getFmMr01PrintHtml(
    kpi: Awaited<ReturnType<KpiRepository['findByIdWithRelations']>>,
    opts?: { logoUrl?: string },
  ): Promise<string | null> {
    if (!kpi) return null;
    const year = kpi.yearly;

    const filteredKpis = await this.kpiRepo.findForExport({ yearly: year }).then((rows) =>
      Promise.all(
        rows
          .filter((row) => row.department !== 'SYSTEM_MASTER')
          .map((row) => this.getKpiById(row.id)),
      ),
    );

    const signatures = await this.approvalSignatureRepo.findByDocument('KPI', kpi.id);
    const qmsConfigService = new QmsConfigService();
    const footerConfig = await qmsConfigService.getSingleFooterConfig('KPI_ANNUAL');
    const footerLabel = footerConfig?.label?.trim() || 'วัตถุประสงค์คุณภาพประจำปี';
    const revisionNo = await this.getMasterRevisionNumber(year);
    const footerPrefix = formatKpiAnnualRevisionTag(footerConfig?.prefix, revisionNo);

    const preparerSig = signatures.find(s => s.step === 'PREPARER' && s.action === 'APPROVED');
    const reviewerSig = signatures.find(s => s.step === 'REVIEWER' && s.action === 'APPROVED');
    const approverSig = signatures.find(s => s.step === 'APPROVER' && s.action === 'APPROVED');
    const formatDate = (dateVal?: Date | string | null) => {
      if (!dateVal) return '-';
      const d = new Date(dateVal);
      return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    return buildFmMr01PrintHtml({
      year,
      footerPrefix,
      footerLabel,
      logoUrl: opts?.logoUrl ?? `${(process.env.NEXTAUTH_URL ?? '').replace(/\/+$/, '')}/logo/logo.webp`,
      departments: filteredKpis
        .filter((ak): ak is NonNullable<typeof ak> => !!ak)
        .map((ak) => ({
          department: ak.department,
          objectives: ak.objectives ?? [],
          removedObjectives: ((ak as { removedObjectives?: Array<{ originalObjective: FmMr01PrintObjective }> }).removedObjectives ?? [])
            .map((r) => r.originalObjective),
        })),
      signatures: [
        { label: 'ผู้จัดทำ / Prepared By', name: kpi.prepare, signaturePath: preparerSig?.signaturePath ?? null, date: formatDate(preparerSig?.actionDate) },
        { label: 'ผู้ตรวจสอบ / Reviewed By', name: kpi.reviewer, signaturePath: reviewerSig?.signaturePath ?? null, date: formatDate(reviewerSig?.actionDate) },
        { label: 'ผู้อนุมัติ / Approved By', name: kpi.approver, signaturePath: approverSig?.signaturePath ?? null, date: formatDate(approverSig?.actionDate) },
      ],
    });
  }

  private async generateAnnouncementPdf(kpi: Awaited<ReturnType<KpiRepository['findByIdWithRelations']>>) {
    if (!kpi) return null;

    // Load NDC logo to base64 so puppeteer can render it offline
    const logoPath = path.join(process.cwd(), 'public', 'logo', 'logo.webp');
    let logoUrl = '';
    try {
      if (fs.existsSync(logoPath)) {
        logoUrl = `data:image/webp;base64,${fs.readFileSync(logoPath).toString('base64')}`;
      }
    } catch (err) {
      logger.warn('[generateAnnouncementPdf] Logo load failed', { err });
    }

    const fragment = await this.getFmMr01PrintHtml(kpi, { logoUrl });
    if (!fragment) return null;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4 landscape; margin: 10mm 8mm 8mm 8mm; }
          body { margin: 0; padding: 0; font-size: 10px; line-height: 1.2; background-color: #fff; }
        </style>
      </head>
      <body>${fragment}</body>
      </html>
    `;

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(htmlContent);
      const pdf = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
      });

      return {
        name: 'FM-MR-01.pdf',
        contentType: 'application/pdf',
        contentBytes: Buffer.from(pdf).toString('base64'),
      };
    } finally {
      await browser.close();
    }
  }

  async getMonthlySummary(year: number) {
    const kpis = await this.kpiRepo.findMonthlySummary(year);
    return kpis.map((k) => {
      const monthMap: Record<string, { id: string; status: string } | null> = {};
      for (const r of k.monthlyReports) monthMap[r.month] = { id: r.id, status: r.status };
      return { id: k.id, department: k.department, yearly: k.yearly, objectiveCount: k.objectives.length, months: monthMap };
    });
  }

  async submitMasterReview(
    dto: {
      yearly: number;
      signatureDataUrl: string;
      reviewer: { id: string; name: string; email: string };
      approver: { id: string; name: string; email: string };
    },
    actor: ActorContext
  ) {
    const userId = actor.userId;
    const userSnapshot = await getUserSnapshot(userId);
    const actorName = userSnapshot?.name || 'System Admin';
    const actorEmail = userSnapshot?.email || '';
    const actorDept = userSnapshot?.departmentName || '';

    const updatedKpi = await db.$transaction(async (tx) => {
      let kpi = await tx.kPI.findFirst({
        where: { department: 'SYSTEM_MASTER', yearly: Number(dto.yearly) },
      });

      if (!kpi) {
        kpi = await tx.kPI.create({
          data: {
            department: 'SYSTEM_MASTER',
            yearly: Number(dto.yearly),
            prepare: actorName,
            reviewer: dto.reviewer.name,
            approver: dto.approver.name,
            status: 'DRAFT',
          },
        });
      }

      // Update KPI details and set status to PENDING_REVIEW
      const updated = await tx.kPI.update({
        where: { id: kpi.id },
        data: {
          status: 'PENDING_REVIEW',
          prepare: actorName,
          prepareSignature: dto.signatureDataUrl,
          reviewerUserId: dto.reviewer.id,
          reviewerAuthUserId: dto.reviewer.id,
          reviewer: dto.reviewer.name,
          reviewerEmail: dto.reviewer.email,
          approverUserId: dto.approver.id,
          approverAuthUserId: dto.approver.id,
          approver: dto.approver.name,
          approverEmail: dto.approver.email,
          submittedAt: new Date(),
        },
      });

      // Save signature for PREPARER step
      await tx.approvalSignature.deleteMany({
        where: { module: 'KPI', documentId: kpi.id },
      });

      await tx.approvalSignature.create({
        data: {
          module: 'KPI',
          documentId: kpi.id,
          step: 'PREPARER',
          action: 'APPROVED',
          actionDate: new Date(),
          signerUserId: userId,
          signerAuthUserId: actor.authUserId ?? userId,
          signerName: actorName,
          signerEmail: actorEmail,
          signerDepartmentName: actorDept,
          signaturePath: dto.signatureDataUrl,
        },
      });

      await AuditService.record({
        actorUserId: userId,
        actorAuthUserId: actor.authUserId,
        actorRole: actor.role,
        action: 'SUBMIT',
        resourceType: 'KPI',
        resourceId: kpi.id,
        before: { status: kpi.status },
        after: { status: updated.status, yearly: Number(dto.yearly), department: 'SYSTEM_MASTER' },
      }, tx);

      return updated;
    });

    return updatedKpi;
  }
}
