import { ApprovalAction, ApprovalModule, ApprovalSignature, ApprovalStep, Prisma } from "@/generated/prisma/client";
import { BaseRepository } from "./baseRepository";

type UpsertApprovalSignatureInput = {
  module: ApprovalModule;
  documentId: string;
  step: ApprovalStep;
  signerUserId: string;
  signerAuthUserId?: string | null;
  signerName?: string | null;
  signerEmail?: string | null;
  signerDepartmentName?: string | null;
  action?: ApprovalAction;
  actionDate?: Date | null;
  signaturePath?: string | null;
  comment?: string | null;
};

export class ApprovalSignatureRepository extends BaseRepository<ApprovalSignature> {
  constructor() {
    super("approvalSignature");
  }

  async upsertStep(input: UpsertApprovalSignatureInput, tx: Prisma.TransactionClient) {
    return tx.approvalSignature.upsert({
      where: {
        module_documentId_step: {
          module: input.module,
          documentId: input.documentId,
          step: input.step,
        },
      },
      create: {
        module: input.module,
        documentId: input.documentId,
        step: input.step,
        signerUserId: input.signerUserId,
        signerAuthUserId: input.signerAuthUserId ?? null,
        signerName: input.signerName ?? null,
        signerEmail: input.signerEmail ?? null,
        signerDepartmentName: input.signerDepartmentName ?? null,
        action: input.action ?? "PENDING",
        actionDate: input.actionDate ?? null,
        signaturePath: input.signaturePath ?? null,
        comment: input.comment ?? null,
      },
      update: {
        signerUserId: input.signerUserId,
        signerAuthUserId: input.signerAuthUserId ?? null,
        signerName: input.signerName ?? null,
        signerEmail: input.signerEmail ?? null,
        signerDepartmentName: input.signerDepartmentName ?? null,
        action: input.action ?? "PENDING",
        actionDate: input.actionDate ?? null,
        signaturePath: input.signaturePath ?? null,
        comment: input.comment ?? null,
      },
    });
  }

  async updateAction(
    module: ApprovalModule,
    documentId: string,
    step: ApprovalStep,
    data: {
      action: ApprovalAction;
      actionDate?: Date | null;
      signaturePath?: string | null;
      comment?: string | null;
    },
    tx: Prisma.TransactionClient
  ) {
    return tx.approvalSignature.update({
      where: { module_documentId_step: { module, documentId, step } },
      data: {
        action: data.action,
        actionDate: data.actionDate ?? null,
        signaturePath: data.signaturePath ?? null,
        comment: data.comment ?? null,
      },
    });
  }

  async findByDocument(module: ApprovalModule, documentId: string) {
    return this.getClient().approvalSignature.findMany({
      where: { module, documentId },
      select: {
        id: true,
        module: true,
        documentId: true,
        step: true,
        action: true,
        actionDate: true,
        signerUserId: true,
        signerAuthUserId: true,
        signerName: true,
        signerEmail: true,
        signerDepartmentName: true,
        signaturePath: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByDocumentAndStep(module: ApprovalModule, documentId: string, step: ApprovalStep) {
    return this.getClient().approvalSignature.findUnique({
      where: { module_documentId_step: { module, documentId, step } },
      select: {
        id: true,
        module: true,
        documentId: true,
        step: true,
        action: true,
        actionDate: true,
        signerUserId: true,
        signerAuthUserId: true,
        signerName: true,
        signerEmail: true,
        signerDepartmentName: true,
        signaturePath: true,
        comment: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async deleteByDocument(module: ApprovalModule, documentId: string, tx: Prisma.TransactionClient) {
    return tx.approvalSignature.deleteMany({
      where: { module, documentId },
    });
  }
}
