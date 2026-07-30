import { ConflictError, ForbiddenError, NotFoundError } from '@/errors/customErrors';
import { AuditService } from '@/services/auditService';
import { db } from '@/lib/db'; // used only for $transaction boundaries
import { ensureMonthlyStatusTransition } from '@/lib/kpi-state-machine';
import { KpiMonthlyReportRepository } from '@/repositories/kpiMonthlyReportRepository';
import { KpiMonthlyDetailRepository } from '@/repositories/kpiMonthlyDetailRepository';
import { KpiCorrectiveActionRepository } from '@/repositories/kpiCorrectiveActionRepository';
import { KpiObjectiveRepository } from '@/repositories/kpiObjectiveRepository';
import { ApprovalSignatureRepository } from '@/repositories/approvalSignatureRepository';
import { UserRepository } from '@/repositories/userRepository';
import { UserPreferenceRepository } from '@/repositories/userPreferenceRepository';
import { ActorContext, CreateMonthlyReportDTO, CreateCorrectiveActionDTO, ListMonthlyQuery, UpdateMonthlyDetailDTO, UpdateMonthlyReportDTO } from '@/types/kpi';
import type { MonthlyStatus, SignatureType } from '@/generated/prisma/client';
import { ALLOWED_MIME, MAX_FILE_SIZE, hasValidMagicBytes } from '@/lib/fileValidation';
import { uploadFileToKpiMonthly } from '@/services/sharepoint';
import { ValidationError } from '@/errors/customErrors';

export class KpiMonthlyService {
  private reportRepo = new KpiMonthlyReportRepository();
  private detailRepo = new KpiMonthlyDetailRepository();
  private correctiveRepo = new KpiCorrectiveActionRepository();
  private objectiveRepo = new KpiObjectiveRepository();
  private approvalSignatureRepo = new ApprovalSignatureRepository();
  private userRepo = new UserRepository();
  private userPrefRepo = new UserPreferenceRepository();

  async getSystemMasterCleanupSummary() {
    const reportCount = await this.reportRepo.countSystemMasterReports();
    return { reportCount };
  }

  async cleanupSystemMasterMonthlyReports(actor: ActorContext) {
    if (!['QMS', 'MR', 'IT'].includes(actor.role)) {
      throw new ForbiddenError('Only QMS/MR/IT can clean up SYSTEM_MASTER monthly data');
    }

    return db.$transaction(async (tx) => {
      const reportIds = await this.reportRepo.findSystemMasterReportIds(tx);
      if (reportIds.length === 0) {
        return {
          deletedReportCount: 0,
          deletedSignatureCount: 0,
          deletedTokenCount: 0,
          deletedNotificationCount: 0,
          deletedAuditLogCount: 0,
        };
      }

      const [deletedSignatures, deletedTokens, deletedNotifications, deletedAuditLogs, deletedReports] = await Promise.all([
        tx.approvalSignature.deleteMany({
          where: {
            module: 'KPI_MONTHLY',
            documentId: { in: reportIds },
          },
        }),
        tx.actionToken.deleteMany({
          where: {
            module: 'KPI_MONTHLY',
            documentId: { in: reportIds },
          },
        }),
        tx.notification.deleteMany({
          where: {
            resourceId: { in: reportIds },
            resourceType: { in: ['KPI_MONTHLY', 'KPI_MONTHLY_REVIEWER', 'KPI_MONTHLY_APPROVER'] },
          },
        }),
        tx.auditLog.deleteMany({
          where: {
            resourceType: 'KPI_MONTHLY_REPORT',
            resourceId: { in: reportIds },
          },
        }),
        this.reportRepo.deleteSystemMasterReports(tx),
      ]);

      await AuditService.record({
        actorUserId: actor.userId,
        actorAuthUserId: actor.authUserId,
        actorRole: actor.role,
        action: 'DELETE',
        resourceType: 'KPI',
        resourceId: 'SYSTEM_MASTER_MONTHLY_CLEANUP',
        metadata: {
          deletedReportIds: reportIds,
          deletedReportCount: deletedReports.count,
          deletedSignatureCount: deletedSignatures.count,
          deletedTokenCount: deletedTokens.count,
          deletedNotificationCount: deletedNotifications.count,
          deletedAuditLogCount: deletedAuditLogs.count,
        },
      }, tx);

      return {
        deletedReportCount: deletedReports.count,
        deletedSignatureCount: deletedSignatures.count,
        deletedTokenCount: deletedTokens.count,
        deletedNotificationCount: deletedNotifications.count,
        deletedAuditLogCount: deletedAuditLogs.count,
      };
    });
  }

  async createMonthlyReport(dto: CreateMonthlyReportDTO) {
    const existing = await this.reportRepo.findByCompositeKey(dto.kpiId, dto.month, dto.year);
    if (existing) throw new ConflictError(`Monthly report for ${dto.month} ${dto.year} already exists`);

    const objectives = await this.objectiveRepo.findByKpiId(dto.kpiId);

    return db.$transaction(async (tx) => {
      const report = await this.reportRepo.createReport(dto.kpiId, dto.month, dto.year, tx);

      for (const obj of objectives) {
        await this.detailRepo.createForReport(report.id, obj.id, tx);
      }

      return this.reportRepo.findByIdWithDetails(report.id, tx);
    });
  }

  async listReports(query: ListMonthlyQuery) {
    return this.reportRepo.paginateReports(query);
  }

  async getReportById(id: string) {
    const [report, approvalSignatures] = await Promise.all([
      this.reportRepo.findByIdWithDetails(id),
      this.approvalSignatureRepo.findByDocument('KPI_MONTHLY', id),
    ]);
    if (!report) throw new NotFoundError(`Monthly report ${id} not found`);
    return {
      ...report,
      approvalSignatures: approvalSignatures.map(s => ({
        ...s,
        signerUser: s.signerName || s.signerEmail
          ? { id: s.signerUserId, name: s.signerName ?? null, email: s.signerEmail ?? null, department: s.signerDepartmentName ? { name: s.signerDepartmentName } : null }
          : null,
      })),
    };
  }

  async updateDetail(detailId: string, dto: UpdateMonthlyDetailDTO) {
    const detail = await this.detailRepo.findByIdWithReport(detailId);
    if (!detail) throw new NotFoundError(`Monthly detail ${detailId} not found`);
    if (detail.monthlyReport.status !== 'DRAFT' && detail.monthlyReport.status !== 'REJECTED') {
      throw new ConflictError('Can only edit details in DRAFT or REJECTED reports');
    }

    if (dto.actualResult !== undefined && dto.actualResult !== null) {
      return this.detailRepo.autoSetAchievedStatus(detailId, detail.kpiObjective.target, dto.actualResult);
    }

    return this.detailRepo.updateResult(detailId, {
      actualResult: dto.actualResult,
      achievedStatus: dto.actualResult === null ? 'PENDING' : dto.achievedStatus,
    });
  }

  async updateReportMetadata(reportId: string, dto: UpdateMonthlyReportDTO, actor: ActorContext) {
    const report = await this.getReportById(reportId);
    this.ensureReportEditableByActor(report, actor);
    return this.reportRepo.updateMetadata(reportId, dto);
  }

  async uploadReportAttachment(reportId: string, file: File, actor: ActorContext) {
    const report = await this.getReportById(reportId);
    this.ensureReportEditableByActor(report, actor);

    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }
    if (!ALLOWED_MIME.has(file.type)) {
      throw new ValidationError(`File type ${file.type} is not allowed`);
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    if (!hasValidMagicBytes(buffer, file.type)) {
      throw new ValidationError('File signature does not match its type');
    }

    const uploaded = await uploadFileToKpiMonthly({
      fileBuffer: buffer,
      fileName: file.name,
      mimeType: file.type,
      departmentName: report.kpi.department,
      year: report.year,
      month: report.month,
    });

    return this.reportRepo.updateAttachment(reportId, {
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      spItemId: uploaded.spItemId,
      spWebUrl: uploaded.spWebUrl,
      spDownloadUrl: uploaded.spDownloadUrl,
      uploadedBy: actor.userId,
      uploadedAt: new Date(),
    });
  }

  async submitReport(
    reportId: string,
    actor: ActorContext,
    sigBody?: {
      signatureDataUrl?: string;
      signatureType?: SignatureType;
      saveSignature?: boolean;
      reviewerUserId?: string;
      approverUserId?: string;
    }
  ) {
    const report = await this.getReportById(reportId);
    ensureMonthlyStatusTransition(report.status, 'PENDING_REVIEW');
    const now = new Date();
    return db.$transaction(async (tx) => {
      const updated = await this.reportRepo.updateStatus(reportId, 'PENDING_REVIEW', {
        prepareBy: actor.userId,
        submittedAt: now,
      }, tx);

      await this.approvalSignatureRepo.deleteByDocument('KPI_MONTHLY', reportId, tx);
      await this.approvalSignatureRepo.upsertStep({
        module: 'KPI_MONTHLY',
        documentId: reportId,
        step: 'PREPARER',
        signerUserId: actor.userId,
        signerAuthUserId: actor.authUserId ?? null,
        action: 'APPROVED',
        actionDate: now,
        signaturePath: sigBody?.signatureDataUrl,
      }, tx);

      if (sigBody?.saveSignature && sigBody.signatureDataUrl && actor.authUserId) {
        await this.userPrefRepo.upsertSignature(actor.authUserId, {
          savedSignatureUrl: sigBody.signatureDataUrl,
          signatureType: sigBody.signatureType || 'DRAW',
        }, tx);
      }
      const reviewerId = sigBody?.reviewerUserId || report.kpi.reviewerUserId;
      if (reviewerId) {
        await this.approvalSignatureRepo.upsertStep({
          module: 'KPI_MONTHLY',
          documentId: reportId,
          step: 'REVIEWER',
          signerUserId: reviewerId,
          action: 'PENDING',
        }, tx);
      }

      return updated;
    });
  }

  async reviewReport(
    reportId: string,
    actor: ActorContext,
    sigBody?: { signatureDataUrl?: string; signatureType?: SignatureType; saveSignature?: boolean; attachments?: { fileName: string; spItemId: string; spWebUrl: string }[] | null }
  ) {
    const report = await this.getReportById(reportId);

    const reviewerStep = await this.approvalSignatureRepo.findByDocumentAndStep('KPI_MONTHLY', reportId, 'REVIEWER');
    if (reviewerStep && !['QMS', 'MR', 'IT'].includes(actor.role)) {
      const reviewerStepAuthId = (reviewerStep as Record<string, unknown>).signerAuthUserId as string | null | undefined;
      const isAssignedReviewer = (actor.authUserId && reviewerStepAuthId)
        ? reviewerStepAuthId === actor.authUserId
        : reviewerStep.signerUserId === actor.userId;
      if (!isAssignedReviewer) throw new ForbiddenError('You are not assigned to review this monthly report');
    }

    const hasApprover = await this.approvalSignatureRepo.findByDocumentAndStep('KPI_MONTHLY', reportId, 'APPROVER');
    const nextStatus = hasApprover ? 'PENDING_APPROVAL' : 'APPROVED';
    ensureMonthlyStatusTransition(report.status, nextStatus as MonthlyStatus);

    const now = new Date();
    return db.$transaction(async (tx) => {
      const updateData: Partial<{ reviewBy: string; approveBy: string; approvedAt: Date }> = { reviewBy: actor.userId };
      if (!hasApprover) {
        updateData.approveBy = actor.userId;
        updateData.approvedAt = now;
      }
      const updated = await this.reportRepo.updateStatus(reportId, nextStatus as MonthlyStatus, updateData, tx);
      await this.approvalSignatureRepo.upsertStep({
        module: 'KPI_MONTHLY',
        documentId: reportId,
        step: 'REVIEWER',
        signerUserId: actor.userId,
        signerAuthUserId: actor.authUserId ?? null,
        action: 'APPROVED',
        actionDate: now,
        signaturePath: sigBody?.signatureDataUrl,
        comment: sigBody?.attachments?.length ? JSON.stringify({ text: 'Review attachments', attachments: sigBody.attachments }) : null,
      }, tx);

      if (sigBody?.saveSignature && sigBody.signatureDataUrl && actor.authUserId) {
        await this.userPrefRepo.upsertSignature(actor.authUserId, {
          savedSignatureUrl: sigBody.signatureDataUrl,
          signatureType: sigBody.signatureType || 'DRAW',
        }, tx);
      }

      return updated;
    });
  }

  async approveReport(
    reportId: string,
    actor: ActorContext,
    sigBody?: { signatureDataUrl?: string; signatureType?: SignatureType; saveSignature?: boolean; attachments?: { fileName: string; spItemId: string; spWebUrl: string }[] | null }
  ) {
    const report = await this.getReportById(reportId);
    ensureMonthlyStatusTransition(report.status, 'APPROVED');

    const approverStep = await this.approvalSignatureRepo.findByDocumentAndStep('KPI_MONTHLY', reportId, 'APPROVER');
    if (approverStep && !['QMS', 'MR', 'IT'].includes(actor.role)) {
      const approverStepAuthId = (approverStep as Record<string, unknown>).signerAuthUserId as string | null | undefined;
      const isAssignedApprover = (actor.authUserId && approverStepAuthId)
        ? approverStepAuthId === actor.authUserId
        : approverStep.signerUserId === actor.userId;
      if (!isAssignedApprover) throw new ForbiddenError('You are not assigned to approve this monthly report');
    }

    const now = new Date();
    return db.$transaction(async (tx) => {
      const updated = await this.reportRepo.updateStatus(reportId, 'APPROVED', {
        approveBy: actor.userId,
        approvedAt: now,
      }, tx);
      await this.approvalSignatureRepo.upsertStep({
        module: 'KPI_MONTHLY',
        documentId: reportId,
        step: 'APPROVER',
        signerUserId: actor.userId,
        signerAuthUserId: actor.authUserId ?? null,
        action: 'APPROVED',
        actionDate: now,
        signaturePath: sigBody?.signatureDataUrl,
        comment: sigBody?.attachments?.length ? JSON.stringify({ text: 'Approval attachments', attachments: sigBody.attachments }) : null,
      }, tx);

      if (sigBody?.saveSignature && sigBody.signatureDataUrl && actor.authUserId) {
        await this.userPrefRepo.upsertSignature(actor.authUserId, {
          savedSignatureUrl: sigBody.signatureDataUrl,
          signatureType: sigBody.signatureType || 'DRAW',
        }, tx);
      }

      return updated;
    });
  }

  async rejectReport(reportId: string, reason: string, actor: ActorContext, attachments?: { fileName: string; spItemId: string; spWebUrl: string }[] | null) {
    if (!['QMS', 'MR', 'IT'].includes(actor.role)) {
      throw new ForbiddenError('Only QMS/MR/IT can reject monthly reports');
    }
    const report = await this.getReportById(reportId);
    if (report.status === 'DRAFT' || report.status === 'APPROVED') {
      throw new ConflictError(`Cannot reject a report in ${report.status} status`);
    }
    ensureMonthlyStatusTransition(report.status, 'REJECTED');

    let dbComment = reason;
    if (attachments && attachments.length > 0) {
      dbComment = JSON.stringify({
        text: reason,
        attachments,
      });
    }

    return db.$transaction(async (tx) => {
      const updated = await this.reportRepo.updateStatus(reportId, 'REJECTED', undefined, tx);
      await this.approvalSignatureRepo.upsertStep({
        module: 'KPI_MONTHLY',
        documentId: reportId,
        step: report.status === 'PENDING_REVIEW' ? 'REVIEWER' : 'APPROVER',
        signerUserId: actor.userId,
        signerAuthUserId: actor.authUserId ?? null,
        action: 'REJECTED',
        actionDate: new Date(),
        comment: dbComment,
      }, tx);
      await AuditService.record({
        actorUserId: actor.userId,
        actorAuthUserId: actor.authUserId,
        actorRole: actor.role,
        action: 'REJECT',
        resourceType: 'KPI_MONTHLY_REPORT',
        resourceId: reportId,
        before: { status: report.status },
        after: { status: 'REJECTED', reason },
      }, tx);
      return updated;
    });
  }

  async addCorrectiveAction(dto: CreateCorrectiveActionDTO) {
    const detail = await this.detailRepo.findById(dto.monthlyDetailId);
    if (!detail) throw new NotFoundError(`Monthly detail ${dto.monthlyDetailId} not found`);
    if (detail.achievedStatus !== 'NOT_OK') {
      throw new ConflictError('Corrective actions are only allowed for NOT_OK results');
    }
    return this.correctiveRepo.createAction(dto);
  }

  async deleteCorrectiveAction(actionId: string) {
    const action = await this.correctiveRepo.findById(actionId);
    if (!action) throw new NotFoundError(`Corrective action ${actionId} not found`);
    return this.correctiveRepo.delete(actionId);
  }

  async listCorrectiveActions(detailId: string) {
    return this.correctiveRepo.listByDetailId(detailId);
  }

  private ensureReportEditableByActor(
    report: Awaited<ReturnType<KpiMonthlyReportRepository['findByIdWithDetails']>>,
    actor: ActorContext,
  ) {
    if (!report) throw new NotFoundError('Monthly report not found');
    if (report.status === 'APPROVED') {
      throw new ConflictError('Cannot edit an approved monthly report');
    }
    if (['QMS', 'MR', 'IT'].includes(actor.role)) return;
    if (report.status !== 'DRAFT' && report.status !== 'REJECTED') {
      throw new ConflictError('Can only edit monthly report in DRAFT or REJECTED status');
    }
  }
}
