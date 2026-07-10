import { NotificationService } from "@/services/notificationService";
import { sendAuditAnnouncementEmail, sendAuditSignRequestEmail, sendAuditRejectionEmail, sendAuditApprovedEmail, buildAuditSignRequestHtml } from "./auditEmailService";
import { AuditAttachmentRepository } from "@/repositories/audit/auditAttachmentRepository";
import { logger } from "@/lib/logger";

const attachmentRepo = new AuditAttachmentRepository();

// ─── In-app notify helper ─────────────────────────────────────────────────────

export async function notifyAuditUser(opts: {
  recipientAuthUserId: string;
  title: string;
  body: string;
  planId: string;
}): Promise<void> {
  await NotificationService.createInAppNotification({
    recipientId: opts.recipientAuthUserId,
    recipientAuthUserId: opts.recipientAuthUserId,
    title: opts.title,
    body: opts.body,
    module: "AUDIT",
    resourceId: opts.planId,
    resourceType: "AUDIT_PLAN",
  }).catch((err) => {
    logger.error("[auditNotification] failed to create in-app notification", { error: String(err) });
  });
}

// ─── Announcement fan-out ─────────────────────────────────────────────────────

const MAX_TOTAL_ATTACHMENT_BYTES = 20 * 1024 * 1024; // 20 MB safe limit (Graph hard limit is 25 MB)

export async function sendAnnouncementOnce(opts: {
  planId: string;
  auditNo: string;
  planTitle: string;
  auditType?: string;
  startDate?: string | null;
  endDate?: string | null;
  scope?: string | null;
  departments?: { name: string | null; code?: string | null }[];
  auditors?: { name: string | null; role: string }[];
  message: string;
  recipients: { name: string; email: string; authUserId?: string }[];
  senderAccessToken?: string | null;
}): Promise<void> {
  const emailRecipients = opts.recipients.filter((r) => !!r.email);
  if (!emailRecipients.length) return;

  // H-1: Fetch plan attachments and download via spDownloadUrl (pre-authenticated CDN URL)
  let emailAttachments: Array<{ name: string; contentType: string; contentBytes: string }> = [];
  try {
    const planAttachments = await attachmentRepo.findByResource("PLAN", opts.planId);

    // Only process attachments that have a real download URL
    const downloadable = planAttachments.filter((a) => !!a.spDownloadUrl && !!a.fileName);

    const settled = await Promise.allSettled(
      downloadable.map(async (a) => {
        // H-1: spDownloadUrl is a pre-authenticated CDN URL — no Authorization header needed
        const res = await fetch(a.spDownloadUrl!);
        if (!res.ok) throw new Error(`Download failed: ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        return {
          name: a.fileName,
          contentType: a.mimeType ?? "application/octet-stream",
          contentBytes: buf.toString("base64"),
        };
      }),
    );

    const validAttachments = settled
      .filter(
        (r): r is PromiseFulfilledResult<{ name: string; contentType: string; contentBytes: string }> =>
          r.status === "fulfilled",
      )
      .map((r) => r.value);

    // H-2: Guard total attachment size before sending — truncate rather than fail
    const totalEstimatedBytes = validAttachments.reduce((sum, a) => {
      return sum + Math.ceil(a.contentBytes.length * 0.75); // base64 → raw bytes estimate
    }, 0);

    if (totalEstimatedBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
      logger.warn("Audit announcement attachments exceed size limit — truncating", {
        planId: opts.planId,
        totalEstimatedBytes,
        count: validAttachments.length,
      });
      let running = 0;
      emailAttachments = validAttachments.filter((a) => {
        const size = Math.ceil(a.contentBytes.length * 0.75);
        if (running + size > MAX_TOTAL_ATTACHMENT_BYTES) return false;
        running += size;
        return true;
      });
    } else {
      emailAttachments = validAttachments;
    }
  } catch (err) {
    logger.warn("[auditNotification] Failed to fetch plan attachments for announcement email", {
      planId: opts.planId,
      error: String(err),
    });
  }

  const idempotencyKey = `AUDIT_PLAN:${opts.planId}:ANNOUNCED:batch`;

  await NotificationService.sendEmailOnce(
    idempotencyKey,
    () =>
      sendAuditAnnouncementEmail({
        recipients: emailRecipients.map((r) => ({ name: r.name, email: r.email })),
        planTitle: opts.planTitle,
        auditNo: opts.auditNo,
        auditType: opts.auditType,
        startDate: opts.startDate,
        endDate: opts.endDate,
        scope: opts.scope,
        departments: opts.departments,
        auditors: opts.auditors,
        message: opts.message,
        planId: opts.planId,
        senderAccessToken: opts.senderAccessToken,
        attachments: emailAttachments.length ? emailAttachments : undefined,
      }),
    emailRecipients.map((r) => r.email).join(","),
    `[Audit] ${opts.auditNo}: ${opts.planTitle}`,
  );
}

// ─── Rejection notification ───────────────────────────────────────────────────

export async function sendRejectionOnce(opts: {
  planId: string;
  auditNo: string;
  planTitle: string;
  ownerAuthUserId: string;
  ownerName: string;
  ownerEmail: string | null;
  rejectedBy: string;
  rejectedRole: "REVIEWER" | "APPROVER";
  reason: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const idempotencyKey = `AUDIT_PLAN:${opts.planId}:REJECTED:${opts.rejectedRole}`;

  if (opts.ownerEmail) {
    await NotificationService.sendEmailOnce(
      idempotencyKey,
      () =>
        sendAuditRejectionEmail({
          to: { name: opts.ownerName, email: opts.ownerEmail! },
          planTitle: opts.planTitle,
          auditNo: opts.auditNo,
          rejectedBy: opts.rejectedBy,
          rejectedRole: opts.rejectedRole,
          reason: opts.reason,
          planId: opts.planId,
          senderAccessToken: opts.senderAccessToken,
        }),
      opts.ownerEmail,
      `[Audit] ส่งกลับแก้ไข ${opts.auditNo}`,
      opts.ownerAuthUserId,
      {
        title: `แผนถูกส่งกลับแก้ไข — ${opts.auditNo}`,
        body: `${opts.rejectedBy} ส่งกลับแผน "${opts.planTitle}": ${opts.reason}`,
        module: "AUDIT",
        resourceId: opts.planId,
        resourceType: "AUDIT_PLAN",
      },
    );
  } else {
    // no email address stored — in-app only
    await notifyAuditUser({
      recipientAuthUserId: opts.ownerAuthUserId,
      title: `แผนถูกส่งกลับแก้ไข — ${opts.auditNo}`,
      body: `${opts.rejectedBy} ส่งกลับแผน "${opts.planTitle}": ${opts.reason}`,
      planId: opts.planId,
    });
  }
}

// ─── Approved — notify reviewer ───────────────────────────────────────────────

export async function sendApprovedNotifyOnce(opts: {
  planId: string;
  auditNo: string;
  planTitle: string;
  reviewerAuthUserId: string;
  reviewerName: string;
  reviewerEmail: string | null;
  approverName: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const idempotencyKey = `AUDIT_PLAN:${opts.planId}:APPROVED:reviewer-notify`;

  if (opts.reviewerEmail) {
    await NotificationService.sendEmailOnce(
      idempotencyKey,
      () =>
        sendAuditApprovedEmail({
          to: { name: opts.reviewerName, email: opts.reviewerEmail! },
          planTitle: opts.planTitle,
          auditNo: opts.auditNo,
          approverName: opts.approverName,
          planId: opts.planId,
          senderAccessToken: opts.senderAccessToken,
        }),
      opts.reviewerEmail,
      `[Audit] อนุมัติแล้ว ${opts.auditNo}`,
      opts.reviewerAuthUserId,
      {
        title: `แผนได้รับการอนุมัติ — ${opts.auditNo}`,
        body: `แผน "${opts.planTitle}" ได้รับการอนุมัติโดย ${opts.approverName}`,
        module: "AUDIT",
        resourceId: opts.planId,
        resourceType: "AUDIT_PLAN",
      },
    );
  } else {
    await notifyAuditUser({
      recipientAuthUserId: opts.reviewerAuthUserId,
      title: `แผนได้รับการอนุมัติ — ${opts.auditNo}`,
      body: `แผน "${opts.planTitle}" ได้รับการอนุมัติโดย ${opts.approverName}`,
      planId: opts.planId,
    });
  }
}

// ─── Sign request notification ────────────────────────────────────────────────

export async function sendSignRequestOnce(opts: {
  planId: string;
  auditNo: string;
  planTitle: string;
  token: string;
  signedRole: string;
  targetAuthUserId: string;
  targetEmail: string;
  targetName: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const idempotencyKey = `AUDIT_PLAN:${opts.planId}:SIGN_REQUEST:${opts.targetAuthUserId}`;

  await NotificationService.sendEmailOnce(
    idempotencyKey,
    () =>
      sendAuditSignRequestEmail({
        to: { name: opts.targetName, email: opts.targetEmail },
        planTitle: opts.planTitle,
        auditNo: opts.auditNo,
        signedRole: opts.signedRole,
        token: opts.token,
        planId: opts.planId,
        senderAccessToken: opts.senderAccessToken,
      }),
    opts.targetEmail,
    `[Audit Sign] ${opts.auditNo}`,
    opts.targetAuthUserId,
    {
      title: `ขอลายเซ็น — ${opts.auditNo}`,
      body: `กรุณาลงนามในรายงานการตรวจสอบ ${opts.planTitle}`,
      htmlBody: buildAuditSignRequestHtml({
        planTitle: opts.planTitle,
        auditNo: opts.auditNo,
        signedRole: opts.signedRole,
      }),
      module: "AUDIT",
      resourceId: opts.planId,
      resourceType: "AUDIT_PLAN",
    },
  );
}
