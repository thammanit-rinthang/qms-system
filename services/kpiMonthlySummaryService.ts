import { db } from "@/lib/db";
import { ensureMonthlyStatusTransition } from "@/lib/kpi-state-machine";
import { ConflictError, ForbiddenError, NotFoundError } from "@/errors/customErrors";
import { KpiMonthlySummaryReviewRepository } from "@/repositories/kpiMonthlySummaryReviewRepository";
import { ApprovalSignatureRepository } from "@/repositories/approvalSignatureRepository";
import { KpiMonthlySummaryReviewHistoryRepository } from "@/repositories/kpiMonthlySummaryReviewHistoryRepository";
import type { ActorContext } from "@/types/kpi";
import type { SignatureType } from "@/generated/prisma/client";

interface PersonInput {
  id: string;
  name: string;
  email: string | null;
}

interface AttachmentInput {
  fileName: string;
  spItemId: string;
  spWebUrl: string;
}

function packComment(text?: string, attachments?: AttachmentInput[] | null): string | undefined {
  if (attachments && attachments.length > 0) {
    return JSON.stringify({ text: text ?? "", attachments });
  }
  return text;
}

export class KpiMonthlySummaryService {
  private repo = new KpiMonthlySummaryReviewRepository();
  private approvalSignatureRepo = new ApprovalSignatureRepository();
  private historyRepo = new KpiMonthlySummaryReviewHistoryRepository();

  async getByYear(year: number) {
    return this.repo.findByYear(year);
  }

  async getHistory(year: number) {
    return this.historyRepo.listByYear(year);
  }

  /**
   * Resolve the preparer's notification contact. Records submitted before
   * prepareByEmail/prepareByName existed (or a session without a mapped
   * email) fall back to the PREPARER signature, then to Auth Center.
   */
  async resolvePreparerContact(
    record: { id: string; prepareByName: string | null; prepareByEmail: string | null },
    accessToken?: string | null,
  ): Promise<{ name: string | null; email: string | null }> {
    if (record.prepareByEmail) return { name: record.prepareByName, email: record.prepareByEmail };

    const sig = await this.approvalSignatureRepo.findByDocumentAndStep("KPI_MONTHLY_SUMMARY", record.id, "PREPARER");
    if (sig?.signerEmail) return { name: sig.signerName, email: sig.signerEmail };

    if (sig?.signerAuthUserId && accessToken) {
      try {
        const { getAuthCenterUserProfile } = await import("@/lib/auth-center-admin-client");
        const profile = await getAuthCenterUserProfile(sig.signerAuthUserId, { accessToken });
        if (profile?.email) return { name: profile.displayName ?? sig.signerName ?? record.prepareByName, email: profile.email };
      } catch {
        // best-effort fallback — fall through to null email
      }
    }

    return { name: record.prepareByName ?? sig?.signerName ?? null, email: null };
  }

  private async ensureExists(year: number) {
    const record = await this.repo.findByYear(year);
    if (!record) throw new NotFoundError(`No KPI monthly summary review for year ${year}`);
    return record;
  }

  async submitForReview(
    year: number,
    actor: ActorContext,
    input: {
      signatureDataUrl: string;
      reviewer: PersonInput;
      approver: PersonInput;
      emailGroupMails: string[];
      emailGroupMailsCc: string[];
    },
  ) {
    if (!["QMS", "MR", "IT"].includes(actor.role)) {
      throw new ForbiddenError("Only QMS/MR/IT can submit the monthly KPI summary for review");
    }

    const record = await this.repo.findOrCreate(year);
    if (record.status === "PENDING_REVIEW" || record.status === "PENDING_APPROVAL") {
      throw new ConflictError("This document is already in review — recall it before starting a new round");
    }
    const now = new Date();

    return db.$transaction(async (tx) => {
      if (record.status !== "DRAFT") {
        const existingSignatures = await this.approvalSignatureRepo.findByDocument("KPI_MONTHLY_SUMMARY", record.id);
        await this.historyRepo.archiveCycle({
          year,
          cycleNo: record.cycleNo,
          status: record.status,
          prepareBy: record.prepareByName ?? record.prepareBy,
          reviewerName: record.reviewerName,
          reviewerEmail: record.reviewerEmail,
          approverName: record.approverName,
          approverEmail: record.approverEmail,
          submittedAt: record.submittedAt,
          signatures: existingSignatures.map((s) => ({
            step: s.step,
            action: s.action,
            actionDate: s.actionDate ? s.actionDate.toISOString() : null,
            signerName: s.signerName,
            signerEmail: s.signerEmail,
            signaturePath: s.signaturePath,
            comment: s.comment,
          })),
        }, tx);
      }

      await this.approvalSignatureRepo.deleteByDocument("KPI_MONTHLY_SUMMARY", record.id, tx);
      await this.approvalSignatureRepo.upsertStep({
        module: "KPI_MONTHLY_SUMMARY",
        documentId: record.id,
        step: "PREPARER",
        signerUserId: actor.userId,
        signerAuthUserId: actor.authUserId ?? null,
        signerName: actor.name ?? null,
        signerEmail: actor.email ?? null,
        action: "APPROVED",
        actionDate: now,
        signaturePath: input.signatureDataUrl,
      }, tx);
      await this.approvalSignatureRepo.upsertStep({
        module: "KPI_MONTHLY_SUMMARY",
        documentId: record.id,
        step: "REVIEWER",
        signerUserId: input.reviewer.id,
        signerName: input.reviewer.name,
        signerEmail: input.reviewer.email,
        action: "PENDING",
      }, tx);
      await this.approvalSignatureRepo.upsertStep({
        module: "KPI_MONTHLY_SUMMARY",
        documentId: record.id,
        step: "APPROVER",
        signerUserId: input.approver.id,
        signerName: input.approver.name,
        signerEmail: input.approver.email,
        action: "PENDING",
      }, tx);

      return this.repo.updateStatus(year, "PENDING_REVIEW", record.status, {
        prepareBy: actor.userId,
        prepareByName: actor.name ?? null,
        prepareByEmail: actor.email ?? null,
        reviewerUserId: input.reviewer.id,
        reviewerAuthUserId: input.reviewer.id,
        reviewerName: input.reviewer.name,
        reviewerEmail: input.reviewer.email,
        approverUserId: input.approver.id,
        approverAuthUserId: input.approver.id,
        approverName: input.approver.name,
        approverEmail: input.approver.email,
        emailGroupMails: input.emailGroupMails,
        emailGroupMailsCc: input.emailGroupMailsCc,
        cycleNo: record.status === "DRAFT" ? record.cycleNo : record.cycleNo + 1,
        submittedAt: now,
        approvedAt: null,
      }, tx);
    });
  }

  private assertIsAssigned(
    actor: ActorContext,
    assignedUserId: string | null,
    assignedAuthUserId: string | null,
    label: string,
  ) {
    const matches = actor.authUserId && assignedAuthUserId
      ? actor.authUserId === assignedAuthUserId
      : actor.userId === assignedUserId;
    if (!matches) throw new ForbiddenError(`You are not assigned as the ${label} for this document`);
  }

  async reviewSummary(
    year: number,
    actor: ActorContext,
    input: { signatureDataUrl: string; comment?: string; attachments?: AttachmentInput[] },
  ) {
    const record = await this.ensureExists(year);
    this.assertIsAssigned(actor, record.reviewerUserId, record.reviewerAuthUserId, "reviewer");
    ensureMonthlyStatusTransition(record.status, "PENDING_APPROVAL");

    const now = new Date();
    return db.$transaction(async (tx) => {
      await this.approvalSignatureRepo.upsertStep({
        module: "KPI_MONTHLY_SUMMARY",
        documentId: record.id,
        step: "REVIEWER",
        signerUserId: actor.userId,
        signerAuthUserId: actor.authUserId ?? null,
        signerName: record.reviewerName,
        signerEmail: record.reviewerEmail,
        action: "APPROVED",
        actionDate: now,
        signaturePath: input.signatureDataUrl,
        comment: packComment(input.comment, input.attachments),
      }, tx);

      return this.repo.updateStatus(year, "PENDING_APPROVAL", "PENDING_REVIEW", {}, tx);
    });
  }

  async approveSummary(
    year: number,
    actor: ActorContext,
    input: { signatureDataUrl: string; comment?: string; attachments?: AttachmentInput[] },
  ) {
    const record = await this.ensureExists(year);
    this.assertIsAssigned(actor, record.approverUserId, record.approverAuthUserId, "approver");
    ensureMonthlyStatusTransition(record.status, "APPROVED");

    const now = new Date();
    return db.$transaction(async (tx) => {
      await this.approvalSignatureRepo.upsertStep({
        module: "KPI_MONTHLY_SUMMARY",
        documentId: record.id,
        step: "APPROVER",
        signerUserId: actor.userId,
        signerAuthUserId: actor.authUserId ?? null,
        signerName: record.approverName,
        signerEmail: record.approverEmail,
        action: "APPROVED",
        actionDate: now,
        signaturePath: input.signatureDataUrl,
        comment: packComment(input.comment, input.attachments),
      }, tx);

      return this.repo.updateStatus(year, "APPROVED", "PENDING_APPROVAL", { approvedAt: now }, tx);
    });
  }

  async rejectSummary(year: number, actor: ActorContext, reason: string, attachments?: AttachmentInput[]) {
    const record = await this.ensureExists(year);
    const isReviewer = record.status === "PENDING_REVIEW";
    const assignedUserId = isReviewer ? record.reviewerUserId : record.approverUserId;
    const assignedAuthUserId = isReviewer ? record.reviewerAuthUserId : record.approverAuthUserId;
    this.assertIsAssigned(actor, assignedUserId, assignedAuthUserId, isReviewer ? "reviewer" : "approver");
    ensureMonthlyStatusTransition(record.status, "REJECTED");

    const now = new Date();
    const step = isReviewer ? "REVIEWER" : "APPROVER";
    return db.$transaction(async (tx) => {
      await this.approvalSignatureRepo.upsertStep({
        module: "KPI_MONTHLY_SUMMARY",
        documentId: record.id,
        step,
        signerUserId: actor.userId,
        signerAuthUserId: actor.authUserId ?? null,
        action: "REJECTED",
        actionDate: now,
        comment: packComment(reason, attachments),
      }, tx);

      return this.repo.updateStatus(year, "REJECTED", record.status, {}, tx);
    });
  }

  async recallSummary(year: number, actor: ActorContext) {
    const record = await this.ensureExists(year);
    if (record.status !== "PENDING_REVIEW" && record.status !== "PENDING_APPROVAL") {
      throw new ConflictError("This document can only be recalled when pending review or approval");
    }
    if (!["QMS", "MR", "IT"].includes(actor.role) && actor.userId !== record.prepareBy) {
      throw new ForbiddenError("Only the preparer can recall this document");
    }

    const previous = {
      reviewerUserId: record.reviewerUserId,
      reviewerName: record.reviewerName,
      reviewerEmail: record.reviewerEmail,
      approverUserId: record.approverUserId,
      approverName: record.approverName,
      approverEmail: record.approverEmail,
    };

    const updated = await db.$transaction(async (tx) => {
      await this.approvalSignatureRepo.deleteByDocument("KPI_MONTHLY_SUMMARY", record.id, tx);
      return this.repo.updateStatus(year, "DRAFT", record.status, {
        reviewerUserId: null,
        reviewerAuthUserId: null,
        reviewerName: null,
        reviewerEmail: null,
        approverUserId: null,
        approverAuthUserId: null,
        approverName: null,
        approverEmail: null,
      }, tx);
    });

    return { ...updated, previous };
  }
}

export type { SignatureType, AttachmentInput as KpiMonthlySummaryAttachmentInput };
