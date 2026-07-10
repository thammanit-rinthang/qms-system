import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export class NotificationLogRepository {
  async findByIdempotencyKey(idempotencyKey: string) {
    return db.notificationLog.findUnique({ where: { idempotencyKey } });
  }

  async create(data: {
    idempotencyKey: string;
    channel: string;
    status: string;
    recipient: string;
    subject?: string;
  }) {
    return db.notificationLog.create({ data });
  }

  async markSent(id: string) {
    return db.notificationLog.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date(), attempts: { increment: 1 } },
    });
  }

  async markFailed(id: string, errorMessage: string) {
    return db.notificationLog.update({
      where: { id },
      data: { status: "FAILED", errorMessage, attempts: { increment: 1 } },
    });
  }

  async upsertPending(data: {
    idempotencyKey: string;
    channel: string;
    recipient: string;
    subject?: string;
  }, tx?: Prisma.TransactionClient) {
    const client = tx ?? db;
    return client.notificationLog.upsert({
      where: { idempotencyKey: data.idempotencyKey },
      create: { ...data, status: "PENDING" },
      update: {},
    });
  }
}
