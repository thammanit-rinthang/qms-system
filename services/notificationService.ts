import { NotificationLogRepository } from "@/repositories/notificationLogRepository";
import { NotificationRepository } from "@/repositories/notificationRepository";
import { logger } from "@/lib/logger";
import { getUserSnapshot } from "@/lib/userSnapshotCache";

const notifRepo = new NotificationLogRepository();
const notificationRepo = new NotificationRepository();

export class NotificationService {
  /**
   * Resolve whether a user should receive email or in-app notification.
   * Users with m365Linked flag receive email; otherwise in-app.
   */
  static async resolveChannel(authUserId: string): Promise<"email" | "in_app"> {
    const cached = await getUserSnapshot(authUserId);
    if (cached) {
      return cached.m365Linked ? "email" : "in_app";
    }
    // Default to email when cache miss (user hasn't logged in yet)
    return "email";
  }

  /**
   * Create an in-app notification record.
   */
  static async createInAppNotification(data: {
    recipientId: string;
    recipientAuthUserId?: string | null;
    title: string;
    body: string;
    htmlBody?: string | null;
    module: string;
    resourceId: string;
    resourceType: string;
  }) {
    return notificationRepo.create(data);
  }

  static async createInAppNotificationOnce(
    idempotencyKey: string,
    recipient: string,
    subject: string,
    data: {
      recipientId: string;
      recipientAuthUserId?: string | null;
      title: string;
      body: string;
      htmlBody?: string | null;
      module: string;
      resourceId: string;
      resourceType: string;
    },
  ): Promise<void> {
    const existing = await notifRepo.findByIdempotencyKey(idempotencyKey);

    if (existing?.status === "SENT") {
      logger.info("[notification] Skipped duplicate in-app notification", { idempotencyKey, recipientId: data.recipientId });
      return;
    }

    const log = existing ?? (await notifRepo.create({
      idempotencyKey,
      channel: "IN_APP",
      status: "PENDING",
      recipient,
      subject,
    }));

    try {
      await NotificationService.createInAppNotification(data);
      await notifRepo.markSent(log.id);
      logger.info("[notification] In-app notification created", { idempotencyKey, recipientId: data.recipientId });
    } catch (error) {
      await notifRepo.markFailed(log.id, error instanceof Error ? error.message : String(error));
      logger.error("[notification] In-app notification failed", { idempotencyKey, recipientId: data.recipientId, error });
      throw error;
    }
  }

  /**
   * Fan out in-app notifications to all members of a department.
   * Fire-and-forget: errors are logged but never thrown.
   */
  static async notifyDeptMembers(
    deptCode: string,
    accessToken: string | null | undefined,
    data: { title: string; body: string; htmlBody?: string | null; module: string; resourceId: string; resourceType: string },
  ): Promise<void> {
    if (!deptCode || !accessToken) return;
    try {
      const { getAuthCenterDepartmentMembers } = await import("@/lib/auth-center-admin-client");
      const result = await getAuthCenterDepartmentMembers(deptCode, { accessToken });
      const members = result?.members ?? [];
      const rows = members.filter((m) => m.id).map((m) => ({
        recipientId: m.id,
        recipientAuthUserId: m.id,
        ...data,
      }));
      await notificationRepo.createMany(rows);
      logger.info("[notification] notifyDeptMembers sent", { deptCode, count: members.length });
    } catch (err) {
      logger.warn("[notification] notifyDeptMembers failed", { deptCode, error: String(err) });
    }
  }

  /**
   * Send an email exactly once per idempotency key.
   *
   * If the key has already been SENT, the call is a no-op.
   * If it is PENDING or FAILED (from a previous attempt), it will retry.
   *
   * When recipientUserId is provided with notificationData:
   * - always create an in-app Notification record once
   * - "email": also proceed with sendFn
   * - "in_app": skip sendFn after the in-app notification is created
   *
   * Key convention:  {RESOURCE_TYPE}:{resourceId}:{EVENT}:{recipientId}
   * e.g.  "KPI:abc123:SUBMITTED:reviewer:user456"
   */
  static async sendEmailOnce(
    idempotencyKey: string,
    sendFn: () => Promise<void>,
    recipient: string,
    subject: string,
    recipientUserId?: string,
    notificationData?: {
      title: string;
      body: string;
      htmlBody?: string | null;
      module: string;
      resourceId: string;
      resourceType: string;
    },
    options?: { forceEmail?: boolean },
  ): Promise<void> {
    const existing = await notifRepo.findByIdempotencyKey(idempotencyKey);

    if (existing?.status === "SENT") {
      logger.info("[notification] Skipped duplicate send", { idempotencyKey, recipient });
      return;
    }

    // Create the in-app notification once, then decide whether email is also needed.
    if (recipientUserId && notificationData) {
      await NotificationService.createInAppNotificationOnce(
        `${idempotencyKey}:IN_APP`,
        recipient || recipientUserId,
        subject,
        {
          recipientId: recipientUserId,
          recipientAuthUserId: recipientUserId,
          ...notificationData,
        },
      );

      if (!options?.forceEmail) {
        const channel = await NotificationService.resolveChannel(recipientUserId);
        if (channel === "in_app") {
          return;
        }
      }
    }

    if (!recipient) {
      logger.info("[notification] Email skipped because recipient is missing", { idempotencyKey, recipientUserId });
      return;
    }

    const log = existing ?? (await notifRepo.create({
      idempotencyKey,
      channel: "EMAIL",
      status: "PENDING",
      recipient,
      subject,
    }));

    try {
      logger.info("[notification] Calling email sendFn", { idempotencyKey, recipient });
      await sendFn();
      await notifRepo.markSent(log.id);
      logger.info("[notification] Email sent", { idempotencyKey, recipient });
    } catch (error) {
      await notifRepo.markFailed(log.id, error instanceof Error ? error.message : String(error));
      logger.error("[notification] Email failed", { idempotencyKey, recipient, errorMessage: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}
