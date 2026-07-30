import { db } from "@/lib/db";
import { ApprovalModule, ApprovalStep, Prisma } from "@/generated/prisma/client";
import crypto from "crypto";

export class ActionTokenRepository {
  private get delegate() {
    return db.actionToken;
  }

  async create(data: {
    module: ApprovalModule;
    documentId: string;
    role: ApprovalStep;
    issuedTo: string;
    metadata?: Record<string, string>;
    expiresAt: Date;
  }) {
    const token = crypto.randomBytes(32).toString("hex");
    return this.delegate.create({
      data: {
        token,
        module: data.module,
        documentId: data.documentId,
        role: data.role,
        issuedTo: data.issuedTo,
        expiresAt: data.expiresAt,
        metadata: data.metadata
          ? (data.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  }

  async findByToken(token: string) {
    return this.delegate.findUnique({ where: { token } });
  }

  async markUsed(token: string) {
    return this.delegate.update({
      where: { token },
      data: { usedAt: new Date() },
    });
  }

  async revokeByDocument(module: ApprovalModule, documentId: string) {
    return this.delegate.updateMany({
      where: { module, documentId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeByDocumentAndRecipient(module: ApprovalModule, documentId: string, issuedTo: string) {
    return this.delegate.updateMany({
      where: { module, documentId, issuedTo, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async cleanupExpired(olderThanDays = 30) {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    return this.delegate.deleteMany({
      where: { expiresAt: { lt: cutoff } },
    });
  }
}
