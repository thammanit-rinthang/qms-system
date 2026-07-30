import { db } from "@/lib/db";

export class NotificationRepository {
  async create(data: {
    recipientId: string;
    recipientAuthUserId?: string | null;
    title: string;
    body: string;
    htmlBody?: string | null;
    module: string;
    resourceId: string;
    resourceType: string;
  }) {
    return db.notification.create({ data });
  }

  async createMany(rows: { recipientId: string; recipientAuthUserId?: string | null; title: string; body: string; module: string; resourceId: string; resourceType: string }[]) {
    if (!rows.length) return { count: 0 };
    return db.notification.createMany({ data: rows });
  }

  async findByRecipient(recipientId: string, limit = 20) {
    return db.notification.findMany({
      where: { recipientId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async markRead(id: string, recipientId: string) {
    return db.notification.updateMany({
      where: { id, recipientId },
      data: { isRead: true },
    });
  }

  async markAllRead(recipientId: string) {
    return db.notification.updateMany({
      where: { recipientId, isRead: false },
      data: { isRead: true },
    });
  }

  async countUnread(recipientId: string) {
    return db.notification.count({ where: { recipientId, isRead: false } });
  }

  async deleteOne(id: string, recipientId: string) {
    return db.notification.deleteMany({ where: { id, recipientId } });
  }

  async deleteMany(ids: string[], recipientId: string) {
    return db.notification.deleteMany({ where: { id: { in: ids }, recipientId } });
  }
}
