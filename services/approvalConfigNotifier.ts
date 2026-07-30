import { NotificationService } from "@/services/notificationService";
import { SystemConfigRepository } from "@/repositories/systemConfigRepository";
import { getApprovalConfigLookupKeys, type ApprovalConfigModuleKey } from "@/lib/approval-config";
import { logger } from "@/lib/logger";

const configRepo = new SystemConfigRepository();

/**
 * Drop an in-app notification to the QMS person configured in qms/approval-config when a module's
 * workflow reaches its final approved/complete state. Resolves the module-specific key first
 * (e.g. DAR_QMS_AUTH_USER_ID), then the legacy global fallback (CURRENT_QMS_AUTH_USER_ID).
 *
 * Fire-and-forget: never throws. The approval has already committed by the time this runs, so a
 * missing config or a notification failure must not surface as an error — it is logged instead.
 */
export async function notifyApprovalConfigQms(
  moduleKey: ApprovalConfigModuleKey,
  data: {
    title: string;
    body: string;
    htmlBody?: string | null;
    module: string;
    resourceId: string;
    resourceType: string;
  },
): Promise<void> {
  try {
    const authKeys = getApprovalConfigLookupKeys(moduleKey, "QMS", "AUTH_USER_ID");
    const emailKeys = getApprovalConfigLookupKeys(moduleKey, "QMS", "EMAIL");
    const rows = await configRepo.findManyByKeys([...authKeys, ...emailKeys]);
    const values = new Map(rows.map((r) => [r.configKey, r.configValue]));

    const qmsAuthUserId = authKeys.map((k) => values.get(k)).find((v): v is string => Boolean(v)) ?? null;
    if (!qmsAuthUserId) {
      logger.info("[notifyApprovalConfigQms] no QMS configured for module", { moduleKey });
      return;
    }
    const qmsEmail = emailKeys.map((k) => values.get(k)).find((v): v is string => Boolean(v)) ?? qmsAuthUserId;

    await NotificationService.createInAppNotificationOnce(
      // idempotent per (resource, QMS recipient) so a retried final-approval can't double-notify
      `${data.resourceType}:${data.resourceId}:FINAL_QMS:${qmsAuthUserId}`,
      qmsEmail,
      data.title,
      { recipientId: qmsAuthUserId, recipientAuthUserId: qmsAuthUserId, ...data },
    );
  } catch (err) {
    logger.warn("[notifyApprovalConfigQms] failed", { moduleKey, error: String(err) });
  }
}
