import { db } from "@/lib/db";
import { ensureMonthlyStatusTransition } from "@/lib/kpi-state-machine";
import { ConflictError, ForbiddenError, NotFoundError } from "@/errors/customErrors";
import { KpiMonthlySummaryReviewRepository } from "@/repositories/kpiMonthlySummaryReviewRepository";
import { ApprovalSignatureRepository } from "@/repositories/approvalSignatureRepository";
import type { ActorContext } from "@/types/kpi";
import type { SignatureType } from "@/generated/prisma/client";

interface PersonInput {
  id: string;
  name: string;
  email: string | null;
}

export class KpiMonthlySummaryService {
  private repo = new KpiMonthlySummaryReviewRepository();
  private approvalSignatureRepo = new ApprovalSignatureRepository();

  async getByYear(year: number) {
    return this.repo.findByYear(year);
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
    ensureMonthlyStatusTransition(record.status, "PENDING_REVIEW");
    const now = new Date();

    return db.$transaction(async (tx) => {
      await this.approvalSignatureRepo.deleteByDocument("KPI_MONTHLY_SUMMARY", record.id, tx);
      await this.approvalSignatureRepo.upsertStep({
        module: "KPI_MONTHLY_SUMMARY",
        documentId: record.id,
        step: "PREPARER",
        signerUserId: actor.userId,
        signerAuthUserId: actor.authUserId ?? null,
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
        submittedAt: now,
      }, tx);
    });
  }

  private assertIsAssigned(
    actor: ActorContext,
    assignedUserId: string | null,
    assignedAuthUserId: string | null,
    label: string,
  ) {
    if (["QMS", "MR", "IT"].includes(actor.role)) return;
    const matches = actor.authUserId && assignedAuthUserId
      ? actor.authUserId === assignedAuthUserId
      : actor.userId === assignedUserId;
    if (!matches) throw new ForbiddenError(`You are not assigned as the ${label} for this document`);
  }

  async reviewSummary(year: number, actor: ActorContext) {
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
        action: "APPROVED",
        actionDate: now,
      }, tx);

      return this.repo.updateStatus(year, "PENDING_APPROVAL", "PENDING_REVIEW", {}, tx);
    });
  }

  async approveSummary(year: number, actor: ActorContext) {
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
        action: "APPROVED",
        actionDate: now,
      }, tx);

      return this.repo.updateStatus(year, "APPROVED", "PENDING_APPROVAL", { approvedAt: now }, tx);
    });
  }

  async rejectSummary(year: number, actor: ActorContext, reason: string) {
    const record = await this.ensureExists(year);
    if (!["QMS", "MR", "IT"].includes(actor.role)) {
      const isReviewer = record.status === "PENDING_REVIEW";
      const assignedUserId = isReviewer ? record.reviewerUserId : record.approverUserId;
      const assignedAuthUserId = isReviewer ? record.reviewerAuthUserId : record.approverAuthUserId;
      this.assertIsAssigned(actor, assignedUserId, assignedAuthUserId, isReviewer ? "reviewer" : "approver");
    }
    ensureMonthlyStatusTransition(record.status, "REJECTED");

    const now = new Date();
    const step = record.status === "PENDING_REVIEW" ? "REVIEWER" : "APPROVER";
    return db.$transaction(async (tx) => {
      await this.approvalSignatureRepo.upsertStep({
        module: "KPI_MONTHLY_SUMMARY",
        documentId: record.id,
        step,
        signerUserId: actor.userId,
        signerAuthUserId: actor.authUserId ?? null,
        action: "REJECTED",
        actionDate: now,
        comment: reason,
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

export type { SignatureType };
