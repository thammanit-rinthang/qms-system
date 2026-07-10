import { ApprovalModule, ApprovalStep } from "@/generated/prisma/client";
import { ActionTokenRepository } from "@/repositories/actionTokenRepository";
import {
  TokenExpiredError,
  TokenNotFoundError,
  TokenOwnerError,
  TokenRevokedError,
} from "@/errors/customErrors";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const repo = new ActionTokenRepository();

export interface VerifiedActionToken {
  id: string;
  token: string;
  module: ApprovalModule;
  documentId: string;
  role: ApprovalStep;
  issuedTo: string;
  metadata: Record<string, string> | null;
}

export class ActionTokenService {
  static async issue(opts: {
    module: ApprovalModule;
    documentId: string;
    role: ApprovalStep;
    issuedTo: string;
    metadata?: Record<string, string>;
  }): Promise<string> {
    const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS);
    const record = await repo.create({ ...opts, expiresAt });
    return record.token;
  }

  static async verify(
    token: string,
    requestingUserId: string
  ): Promise<VerifiedActionToken> {
    const record = await repo.findByToken(token);
    if (!record) throw new TokenNotFoundError();
    if (record.revokedAt) throw new TokenRevokedError();
    if (record.expiresAt < new Date()) throw new TokenExpiredError();
    if (record.issuedTo !== requestingUserId) throw new TokenOwnerError();
    return {
      id: record.id,
      token: record.token,
      module: record.module,
      documentId: record.documentId,
      role: record.role,
      issuedTo: record.issuedTo,
      metadata: record.metadata as Record<string, string> | null,
    };
  }

  static async markUsed(token: string): Promise<void> {
    await repo.markUsed(token);
  }

  static async revokeByDocument(
    module: ApprovalModule,
    documentId: string
  ): Promise<void> {
    await repo.revokeByDocument(module, documentId);
  }

  static async revokeByDocumentAndRecipient(
    module: ApprovalModule,
    documentId: string,
    issuedTo: string
  ): Promise<void> {
    await repo.revokeByDocumentAndRecipient(module, documentId, issuedTo);
  }

  static async cleanupExpired(olderThanDays = 30): Promise<void> {
    await repo.cleanupExpired(olderThanDays);
  }
}
