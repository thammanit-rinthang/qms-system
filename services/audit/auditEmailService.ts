/**
 * Audit email templates — English-primary, bilingual labels.
 * All sends go through the Auth Center delegated mail proxy.
 */

import { logger } from "@/lib/logger";

interface MailAttachment {
  name: string;
  contentType: string;
  contentBytes: string; // base64
}

interface SendMailOpts {
  to: { name: string; email: string }[];
  cc?: { name: string; email: string }[];
  subject: string;
  bodyHtml: string;
  senderAccessToken?: string | null;
  attachments?: MailAttachment[];
}

async function sendMail(opts: SendMailOpts): Promise<void> {
  if (!opts.senderAccessToken) {
    logger.warn("[auditEmail] No Auth Center token — mail skipped", { subject: opts.subject });
    return;
  }
  const base = process.env.AUTH_CENTER_URL?.replace(/\/$/, "");
  if (!base) {
    logger.warn("[auditEmail] AUTH_CENTER_URL not set — mail skipped");
    return;
  }
  for (const recipient of opts.to) {
    const payload: Record<string, unknown> = {
      toEmail: recipient.email,
      toName: recipient.name,
      subject: opts.subject,
      htmlBody: opts.bodyHtml,
    };
    if (opts.cc?.length) payload.cc = opts.cc.map((r) => ({ email: r.email, name: r.name }));
    if (opts.attachments?.length) payload.attachments = opts.attachments;
    const res = await fetch(`${base}/api/auth/mail/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.senderAccessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Auth Center sendMail ${res.status}: ${text}`);
    }
  }
}

export function esc(v: string) {
  return v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function getAppUrl(path: string) {
  return `${(process.env.NEXTAUTH_URL ?? "").replace(/\/+$/, "")}${path}`;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Shared layout ────────────────────────────────────────────────────────────

export function layout(opts: {
  badgeColor: string;      // hex e.g. "#0f1059"
  badgeText: string;       // e.g. "ACTION REQUIRED"
  title: string;
  subtitle?: string;
  rows: { label: string; value: string }[];
  body?: string;           // raw HTML inserted below rows
  actionLabel?: string;
  actionUrl?: string;
  footerNote?: string;
}) {
  const BRAND = "#0f1059";

  const rowsHtml = opts.rows
    .map(
      (r) =>
        `<tr>
          <td style="padding:10px 16px;background:#f8fafc;border-bottom:1px solid #e2e8f0;width:36%;vertical-align:top">
            <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.6px">${esc(r.label)}</span>
          </td>
          <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;vertical-align:top">
            <span style="font-size:13px;font-weight:600;color:#0f172a">${esc(r.value)}</span>
          </td>
        </tr>`
    )
    .join("");

  const actionHtml = opts.actionLabel && opts.actionUrl
    ? `<div style="margin-top:24px;text-align:center">
        <a href="${esc(opts.actionUrl)}"
           style="display:inline-block;padding:13px 32px;background:${BRAND};color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:.3px">
          ${esc(opts.actionLabel)}
        </a>
      </div>`
    : "";

  return `
<div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:#f1f5f9;padding:32px 16px">
  <div style="max-width:680px;margin:0 auto">

    <!-- Header brand bar -->
    <div style="padding:16px 24px;background:${BRAND};border-radius:10px 10px 0 0;display:flex;align-items:center;gap:12px">
      <div>
        <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.6);letter-spacing:1px;text-transform:uppercase">NDC Quality Management System</div>
        <div style="font-size:19px;font-weight:800;color:#fff;margin-top:2px;line-height:1.2">${esc(opts.title)}</div>
        ${opts.subtitle ? `<div style="font-size:12px;color:rgba(255,255,255,.7);margin-top:3px">${esc(opts.subtitle)}</div>` : ""}
      </div>
      <div style="margin-left:auto">
        <span style="background:${opts.badgeColor};color:#fff;font-size:10px;font-weight:800;letter-spacing:.8px;padding:4px 10px;border-radius:20px;text-transform:uppercase;white-space:nowrap">${esc(opts.badgeText)}</span>
      </div>
    </div>

    <!-- Card body -->
    <div style="background:#fff;border-radius:0 0 10px 10px;box-shadow:0 1px 4px rgba(0,0,0,.07)">
      <table style="width:100%;border-collapse:collapse">${rowsHtml}</table>
      ${opts.body ? `<div style="padding:0 16px 4px">${opts.body}</div>` : ""}
      ${actionHtml ? `<div style="padding:0 24px 28px">${actionHtml}</div>` : ""}
    </div>

    <!-- Footer -->
    <div style="margin-top:16px;text-align:center;font-size:11px;color:#94a3b8">
      NDC Industrial Co., Ltd. — Quality Management System
      ${opts.footerNote ? `<br><span style="color:#cbd5e1">${esc(opts.footerNote)}</span>` : ""}
      <br>This is an automated notification. Please do not reply to this email.
    </div>

  </div>
</div>`;
}

// ─── Announcement ─────────────────────────────────────────────────────────────

export async function sendAuditAnnouncementEmail(opts: {
  recipients: { name: string; email: string }[];
  planTitle: string;
  auditNo: string;
  auditType?: string;
  startDate?: string | null;
  endDate?: string | null;
  scope?: string | null;
  departments?: { name: string | null; code?: string | null }[];
  auditors?: { name: string | null; role: string }[];
  message: string;
  planId: string;
  senderAccessToken?: string | null;
  attachments?: MailAttachment[];
}): Promise<void> {
  if (!opts.recipients.length) return;
  const url = getAppUrl(`/qms/audit/${opts.planId}`);

  const typeLabel: Record<string, string> = { INTERNAL: "Internal", EXTERNAL: "External" };
  const rows: { label: string; value: string }[] = [
    { label: "Audit No.", value: opts.auditNo },
    { label: "Title", value: opts.planTitle },
  ];
  if (opts.auditType) rows.push({ label: "Type", value: typeLabel[opts.auditType] ?? opts.auditType });
  if (opts.startDate || opts.endDate) rows.push({ label: "Period", value: `${fmtDate(opts.startDate)} – ${fmtDate(opts.endDate)}` });

  const roleMap: Record<string, string> = { LEAD: "Lead Auditor", MEMBER: "Auditor", OBSERVER: "Observer" };

  let body = "";
  if (opts.scope) {
    body += `<div style="margin:16px 0 0;padding:14px 16px;background:#f0f9ff;border-left:3px solid #0ea5e9;border-radius:0 6px 6px 0;font-size:13px;color:#0c4a6e;line-height:1.6"><strong>Scope:</strong> ${esc(opts.scope)}</div>`;
  }
  if (opts.message) {
    body += `<div style="margin:12px 0 0;padding:14px 16px;background:#f8fafc;border-radius:6px;font-size:13px;color:#334155;line-height:1.7;white-space:pre-wrap">${esc(opts.message)}</div>`;
  }
  if (opts.departments?.length) {
    const items = opts.departments.filter((d) => d.name).map((d) =>
      `<li style="padding:4px 0;font-size:13px;color:#0f172a">${d.code ? `<code style="background:#e2e8f0;padding:1px 5px;border-radius:3px;font-size:11px;margin-right:6px">${esc(d.code)}</code>` : ""}${esc(d.name!)}</li>`
    ).join("");
    if (items) body += `<div style="margin-top:16px"><p style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:.5px;text-transform:uppercase;margin:0 0 6px">Audited Departments</p><ul style="margin:0;padding-left:18px">${items}</ul></div>`;
  }
  if (opts.auditors?.length) {
    const items = opts.auditors.filter((a) => a.name).map((a) =>
      `<li style="padding:4px 0;font-size:13px;color:#0f172a">${esc(a.name!)} <span style="color:#64748b;font-size:11px">(${roleMap[a.role] ?? a.role})</span></li>`
    ).join("");
    if (items) body += `<div style="margin-top:16px"><p style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:.5px;text-transform:uppercase;margin:0 0 6px">Audit Team</p><ul style="margin:0;padding-left:18px">${items}</ul></div>`;
  }

  await sendMail({
    to: opts.recipients,
    senderAccessToken: opts.senderAccessToken,
    subject: `[Audit] ${opts.auditNo}: ${opts.planTitle}`,
    bodyHtml: layout({
      badgeColor: "#0ea5e9",
      badgeText: "Announcement",
      title: "Audit Plan Announcement",
      subtitle: opts.auditNo,
      rows,
      body,
      actionLabel: "View Audit Plan",
      actionUrl: url,
    }),
    attachments: opts.attachments,
  });
}

// ─── Schedule invite ──────────────────────────────────────────────────────────

export async function sendScheduleInviteEmail(opts: {
  to: { name: string; email: string };
  planTitle: string;
  auditNo: string;
  sessionTitle: string;
  departmentName: string;
  startAt: string;
  endAt: string;
  location?: string | null;
  planId: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/qms/audit/${opts.planId}`);
  const rows: { label: string; value: string }[] = [
    { label: "Audit No.", value: opts.auditNo },
    { label: "Plan", value: opts.planTitle },
    { label: "Department", value: opts.departmentName },
    { label: "Session", value: opts.sessionTitle },
    { label: "Start", value: fmtDateTime(opts.startAt) },
    { label: "End", value: fmtDateTime(opts.endAt) },
  ];
  if (opts.location) rows.push({ label: "Location", value: opts.location });

  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[Audit] Schedule Invitation — ${opts.departmentName} — ${opts.auditNo}`,
    bodyHtml: layout({
      badgeColor: "#f59e0b",
      badgeText: "Action Required",
      title: "Audit Schedule — Pending Confirmation",
      subtitle: `${opts.auditNo} · ${opts.departmentName}`,
      rows,
      body: `<div style="margin:16px 0 0;padding:14px 16px;background:#fefce8;border-left:3px solid #f59e0b;border-radius:0 6px 6px 0;font-size:13px;color:#92400e;line-height:1.6">
        Please log in to <strong>confirm your availability</strong> for the scheduled audit date. If you are unavailable, indicate the reason so QMS can reschedule accordingly.
      </div>`,
      actionLabel: "Confirm My Schedule",
      actionUrl: url,
    }),
  });
}

// ─── Schedule status change ───────────────────────────────────────────────────

export async function sendScheduleStatusEmail(opts: {
  to: { name: string; email: string };
  planTitle: string;
  auditNo: string;
  sessionTitle: string;
  departmentName: string;
  status: "CONFIRMED" | "UNAVAILABLE";
  confirmedBy: string;
  reason?: string | null;
  planId: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/qms/audit/${opts.planId}`);
  const isConfirmed = opts.status === "CONFIRMED";
  const rows: { label: string; value: string }[] = [
    { label: "Audit No.", value: opts.auditNo },
    { label: "Plan", value: opts.planTitle },
    { label: "Department", value: opts.departmentName },
    { label: "Session", value: opts.sessionTitle },
    { label: isConfirmed ? "Confirmed by" : "Reported by", value: opts.confirmedBy },
  ];
  if (opts.reason) rows.push({ label: "Reason", value: opts.reason });

  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[Audit] ${isConfirmed ? "Confirmed" : "Unavailable"} — ${opts.departmentName} — ${opts.auditNo}`,
    bodyHtml: layout({
      badgeColor: isConfirmed ? "#10b981" : "#ef4444",
      badgeText: isConfirmed ? "Confirmed" : "Unavailable",
      title: isConfirmed ? "Department Confirmed Schedule" : "Department Unavailable",
      subtitle: opts.auditNo,
      rows,
      actionLabel: "View Audit Plan",
      actionUrl: url,
    }),
  });
}

// ─── Audit plan rejection ─────────────────────────────────────────────────────

export async function sendAuditRejectionEmail(opts: {
  to: { name: string; email: string };
  planTitle: string;
  auditNo: string;
  rejectedBy: string;
  rejectedRole: string;
  reason: string;
  planId: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/qms/audit/${opts.planId}`);
  const roleLabel = opts.rejectedRole === "APPROVER" ? "Approver" : "Reviewer";

  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[Audit] Plan Returned for Revision — ${opts.auditNo}`,
    bodyHtml: layout({
      badgeColor: "#ef4444",
      badgeText: "Returned",
      title: "Audit Plan Returned for Revision",
      subtitle: opts.auditNo,
      rows: [
        { label: "Audit No.", value: opts.auditNo },
        { label: "Title", value: opts.planTitle },
        { label: "Returned by", value: `${opts.rejectedBy} (${roleLabel})` },
      ],
      body: `<div style="margin:16px 0 0;padding:14px 16px;background:#fff1f2;border-left:3px solid #f43f5e;border-radius:0 6px 6px 0">
        <p style="font-size:11px;font-weight:700;color:#be123c;text-transform:uppercase;letter-spacing:.5px;margin:0 0 6px">Reason for Return</p>
        <p style="font-size:13px;color:#0f172a;line-height:1.7;margin:0;white-space:pre-wrap">${esc(opts.reason)}</p>
      </div>`,
      actionLabel: "Revise & Resubmit",
      actionUrl: url,
    }),
  });
}

// ─── Audit plan approved ──────────────────────────────────────────────────────

export async function sendAuditApprovedEmail(opts: {
  to: { name: string; email: string };
  planTitle: string;
  auditNo: string;
  approverName: string;
  planId: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/qms/audit/${opts.planId}`);
  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[Audit] Plan Approved — ${opts.auditNo}`,
    bodyHtml: layout({
      badgeColor: "#10b981",
      badgeText: "Approved",
      title: "Audit Plan Approved",
      subtitle: opts.auditNo,
      rows: [
        { label: "Audit No.", value: opts.auditNo },
        { label: "Title", value: opts.planTitle },
        { label: "Approved by", value: opts.approverName },
      ],
      actionLabel: "View Audit Plan",
      actionUrl: url,
    }),
  });
}

// ─── Department schedule after plan approval ──────────────────────────────────

export async function sendDeptScheduleApprovalEmail(opts: {
  to: { name: string; email: string };
  planTitle: string;
  auditNo: string;
  departmentName: string;
  sessionTitle: string;
  startAt: string;
  endAt: string;
  location?: string | null;
  leadAuditorName?: string | null;
  planId: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/audit/plans/${opts.planId}`);
  const rows: { label: string; value: string }[] = [
    { label: "Audit No.", value: opts.auditNo },
    { label: "Plan", value: opts.planTitle },
    { label: "Department", value: opts.departmentName },
    { label: "Session", value: opts.sessionTitle },
    { label: "Start", value: fmtDateTime(opts.startAt) },
    { label: "End", value: fmtDateTime(opts.endAt) },
  ];
  if (opts.location) rows.push({ label: "Location", value: opts.location });
  if (opts.leadAuditorName) rows.push({ label: "Lead Auditor", value: opts.leadAuditorName });

  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[Audit] Plan Approved — Your Audit Schedule — ${opts.departmentName} — ${opts.auditNo}`,
    bodyHtml: layout({
      badgeColor: "#f59e0b",
      badgeText: "Action Required",
      title: "Plan Approved — Your Department Audit Schedule",
      subtitle: `${opts.auditNo} · ${opts.departmentName}`,
      rows,
      body: `<div style="margin:16px 0 0;padding:14px 16px;background:#fefce8;border-left:3px solid #f59e0b;border-radius:0 6px 6px 0;font-size:13px;color:#92400e;line-height:1.6">
        Please log in to <strong>confirm your availability</strong> for this audit session. If you are unavailable, provide a reason so QMS can reschedule.
      </div>`,
      actionLabel: "Confirm My Schedule",
      actionUrl: url,
    }),
  });
}

// ─── Checklist received ───────────────────────────────────────────────────────

export async function sendChecklistReceivedEmail(opts: {
  to: { name: string; email: string };
  planTitle: string;
  auditNo: string;
  departmentName: string;
  sessionTitle: string;
  submittedBy: string;
  planId: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/audit/plans/${opts.planId}`);
  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[Audit] Checklist Received — ${opts.departmentName} — ${opts.auditNo}`,
    bodyHtml: layout({
      badgeColor: "#10b981",
      badgeText: "Received",
      title: "Audit Checklist Received",
      subtitle: opts.auditNo,
      rows: [
        { label: "Audit No.", value: opts.auditNo },
        { label: "Plan", value: opts.planTitle },
        { label: "Department", value: opts.departmentName },
        { label: "Session", value: opts.sessionTitle },
        { label: "Submitted by", value: opts.submittedBy },
      ],
      actionLabel: "View Audit Plan",
      actionUrl: url,
    }),
  });
}

// ─── Appointment: sign request (Reviewer or Approver) ─────────────────────────

export async function sendAppointmentSignRequestEmail(opts: {
  to: { name: string; email: string };
  appointmentNo: string;
  title: string;
  year: number;
  standards: string[];
  ownerName?: string | null;
  signedRole: "REVIEWER" | "APPROVER";
  appointmentId: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const rolePath = opts.signedRole === "APPROVER" ? "approver" : "reviewer";
  const url = getAppUrl(`/approve/audit/appointments/${opts.appointmentId}/${rolePath}`);
  const roleLabel = opts.signedRole === "APPROVER" ? "Approver" : "Reviewer";
  const yearEn = opts.year - 543;

  const standardsBadges = opts.standards.length
    ? `<div style="margin-top:16px">
        <p style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin:0 0 6px">Standards</p>
        <div>${opts.standards.map((s) => `<span style="display:inline-block;background:#e0e7ff;color:#3730a3;border-radius:4px;padding:3px 10px;font-size:12px;font-weight:700;margin:2px 4px 2px 0">${esc(s)}</span>`).join("")}</div>
      </div>`
    : "";

  const urgentBanner = `<div style="margin:16px 0 0;padding:14px 16px;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:0 6px 6px 0;font-size:13px;color:#92400e;line-height:1.6">
    <strong>Your signature is required.</strong> Please click the button below to review and sign this appointment letter as <strong>${esc(roleLabel)}</strong>.
    The process cannot proceed without your signature.
  </div>`;

  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[QMS] Signature Required — Appointment ${opts.appointmentNo} (${roleLabel})`,
    bodyHtml: layout({
      badgeColor: "#f59e0b",
      badgeText: "Signature Required",
      title: "Appointment Letter — Signature Request",
      subtitle: `${opts.appointmentNo} · ${roleLabel}`,
      rows: [
        { label: "Document No.", value: opts.appointmentNo },
        { label: "Title", value: opts.title },
        { label: "Year", value: `${yearEn} (B.E. ${opts.year})` },
        ...(opts.ownerName ? [{ label: "Prepared by", value: opts.ownerName }] : []),
        { label: "Your Role", value: roleLabel },
      ],
      body: standardsBadges + urgentBanner,
      actionLabel: opts.signedRole === "APPROVER" ? "Review & Approve" : "Review & Sign",
      actionUrl: url,
    }),
  });
}

// ─── Appointment: published (full letter to all recipients) ───────────────────

export function buildAppointmentPublishedHtml(opts: {
  appointmentNo: string;
  title: string;
  year: number;
  standards: string[];
  members: { name: string; role: string; department?: string | null; standards: string[] }[];
  approverName: string;
  ownerName?: string | null;
  reviewerName?: string | null;
  appointmentId: string;
}): string {
  const url = getAppUrl(`/audit/appointments/${opts.appointmentId}`);
  const yearEn = opts.year - 543;

  const ROLE_LABELS: Record<string, string> = {
    LEAD_AUDITOR: "Lead Auditor",
    AUDITOR: "Internal Auditor",
    COMMITTEE: "Working Committee",
    SECRETARY: "Secretary",
    ADVISOR: "Advisor",
  };

  const memberRows = opts.members.map((m, i) =>
    `<tr style="background:${i % 2 === 0 ? "#f8fafc" : "#fff"}">
      <td style="padding:9px 14px;font-size:12px;color:#64748b;border-bottom:1px solid #e2e8f0">${i + 1}</td>
      <td style="padding:9px 14px;font-size:13px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0">${esc(m.name)}</td>
      <td style="padding:9px 14px;font-size:12px;color:#64748b;border-bottom:1px solid #e2e8f0">${esc(m.department ?? "—")}</td>
      <td style="padding:9px 14px;font-size:12px;border-bottom:1px solid #e2e8f0"><span style="background:#f1f5f9;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;color:#334155">${esc(ROLE_LABELS[m.role] ?? m.role)}</span></td>
      <td style="padding:9px 14px;font-size:11px;color:#64748b;border-bottom:1px solid #e2e8f0">${m.standards.length ? m.standards.map(esc).join(", ") : "—"}</td>
    </tr>`
  ).join("");

  return `
<div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:#f1f5f9;padding:32px 16px">
<div style="max-width:760px;margin:0 auto">

  <!-- Header -->
  <div style="padding:20px 28px;background:#0f1059;border-radius:10px 10px 0 0">
    <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.55);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">NDC Quality Management System</div>
    <div style="font-size:18px;font-weight:800;color:#fff;line-height:1.3">Appointment of Internal Auditors &amp; ISO Working Committee</div>
    <div style="font-size:14px;font-weight:600;color:rgba(255,255,255,.75);margin-top:4px">Year ${yearEn}</div>
    <div style="margin-top:8px;display:flex;align-items:center;gap:10px">
      <span style="font-size:12px;color:rgba(255,255,255,.6)">Document No. <strong style="color:#fff">${esc(opts.appointmentNo)}</strong></span>
      <span style="background:#10b981;color:#fff;font-size:10px;font-weight:800;letter-spacing:.8px;padding:3px 10px;border-radius:20px;text-transform:uppercase">Published</span>
    </div>
  </div>

  <!-- Body card -->
  <div style="background:#fff;border-radius:0 0 10px 10px;padding:28px 32px;box-shadow:0 1px 4px rgba(0,0,0,.07)">

    <!-- Salutation -->
    <p style="font-size:14px;color:#0f172a;margin:0 0 2px;line-height:1.8">เรียน ผู้จัดการ / หัวหน้าทุกหน่วยงาน และพนักงานทุกท่าน</p>
    <p style="font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.8">Dear Department Managers and All Employees,</p>

    <!-- Paragraph 1 -->
    <p style="font-size:13px;color:#0f172a;margin:0 0 2px;line-height:1.8">เพื่อให้การดำเนินงานระบบบริหารขององค์กรเป็นไปอย่างมีประสิทธิภาพ และสอดคล้องตามข้อกำหนดมาตรฐานสากล</p>
    <p style="font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.8">To ensure the effective implementation and continuous improvement of the company&apos;s management systems in accordance with international standards,</p>

    <!-- Paragraph 2 -->
    <p style="font-size:13px;color:#0f172a;margin:0 0 2px;line-height:1.8">บริษัทฯ ขอประกาศแต่งตั้ง ผู้ตรวจติดตามภายใน (Internal Auditors) และคณะทำงานระบบ ISO ประจำปี ${opts.year} สำหรับมาตรฐานดังต่อไปนี้</p>
    <p style="font-size:13px;color:#64748b;margin:0 0 16px;line-height:1.8">The Company hereby announces the appointment of Internal Auditors and the ISO Working Committee for the year ${yearEn} covering the following standards:</p>

    <!-- Standards list -->
    <ul style="margin:0 0 20px;padding-left:20px">
      ${opts.standards.map((s) => `<li style="font-size:13px;color:#0f172a;padding:4px 0;line-height:1.6">${esc(s)}</li>`).join("")}
    </ul>

    <!-- Paragraph 3 -->
    <p style="font-size:13px;color:#0f172a;margin:0 0 2px;line-height:1.8">รายชื่อและหน้าที่รับผิดชอบในการเป็นผู้ตรวจติดตามภายใน และคณะทำงาน มีหน้าที่และความรับผิดชอบ ตามรายละเอียดประกาศที่แนบมานี้</p>
    <p style="font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.8">The list of appointed Internal Auditors and committee members, along with their roles and responsibilities, are specified in the attached announcement.</p>

    <!-- Members table -->
    <div style="border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;margin-bottom:24px">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#0f1059;color:#fff">
            <th style="padding:10px 14px;font-size:11px;font-weight:700;text-align:left;width:36px">#</th>
            <th style="padding:10px 14px;font-size:11px;font-weight:700;text-align:left">Name</th>
            <th style="padding:10px 14px;font-size:11px;font-weight:700;text-align:left">Department</th>
            <th style="padding:10px 14px;font-size:11px;font-weight:700;text-align:left">Role</th>
            <th style="padding:10px 14px;font-size:11px;font-weight:700;text-align:left">Standards</th>
          </tr>
        </thead>
        <tbody>${memberRows}</tbody>
      </table>
    </div>

    <!-- Paragraph 4 -->
    <p style="font-size:13px;color:#0f172a;margin:0 0 2px;line-height:1.8">จึงประกาศมาเพื่อทราบ และขอความร่วมมือจากทุกหน่วยงานในการสนับสนุนการดำเนินงานของคณะผู้ตรวจติดตามและคณะทำงานดังกล่าว</p>
    <p style="font-size:13px;color:#64748b;margin:0 0 20px;line-height:1.8">This announcement is issued for acknowledgement, and all departments are kindly requested to fully support the appointed Internal Auditors and Working Committee in performing their duties.</p>

    <!-- Closing -->
    <p style="font-size:13px;color:#0f172a;margin:0 0 2px;line-height:1.8">ขอขอบคุณสำหรับความร่วมมือด้วยดีเสมอมา</p>
    <p style="font-size:13px;color:#64748b;margin:0 0 24px;line-height:1.8">Thank you for your cooperation.</p>

    <!-- Sign-off chain -->
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
      ${opts.ownerName ? `<div style="flex:1;min-width:120px"><p style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin:0 0 3px">Prepared by</p><p style="font-size:13px;font-weight:600;color:#0f172a;margin:0">${esc(opts.ownerName)}</p></div>` : ""}
      ${opts.reviewerName ? `<div style="flex:1;min-width:120px"><p style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;margin:0 0 3px">Reviewed by</p><p style="font-size:13px;font-weight:600;color:#0f172a;margin:0">${esc(opts.reviewerName)}</p></div>` : ""}
      <div style="flex:1;min-width:120px"><p style="font-size:10px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:.5px;margin:0 0 3px">Approved by</p><p style="font-size:13px;font-weight:600;color:#0f172a;margin:0">${esc(opts.approverName)}</p></div>
    </div>

    <div style="text-align:center">
      <a href="${esc(url)}" style="display:inline-block;padding:13px 32px;background:#0f1059;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700">View Full Announcement</a>
    </div>
  </div>

  <!-- Footer -->
  <div style="margin-top:16px;text-align:center;font-size:11px;color:#94a3b8">
    NDC Industrial Co., Ltd. — Quality Management System<br>
    This is an automated notification. Please do not reply to this email.
  </div>

</div>
</div>`;
}

export async function sendAppointmentPublishedEmail(opts: {
  recipients: { name: string; email: string }[];
  cc?: { name: string; email: string }[];
  appointmentNo: string;
  title: string;
  year: number;
  standards: string[];
  members: { name: string; role: string; department?: string | null; standards: string[] }[];
  approverName: string;
  ownerName?: string | null;
  reviewerName?: string | null;
  appointmentId: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  if (!opts.recipients.length && !opts.cc?.length) return;
  const yearEn = opts.year - 543;
  await sendMail({
    to: opts.recipients,
    cc: opts.cc?.length ? opts.cc : undefined,
    senderAccessToken: opts.senderAccessToken,
    subject: `[QMS] Appointment Letter Published — ${opts.appointmentNo} (Year ${yearEn})`,
    bodyHtml: buildAppointmentPublishedHtml(opts),
  });
}

// ─── Appointment: returned to owner ──────────────────────────────────────────

export async function sendAppointmentRejectedEmail(opts: {
  to: { name: string; email: string };
  appointmentNo: string;
  title: string;
  year: number;
  reason: string;
  rejectedByName?: string | null;
  rejectedByRole: "REVIEWER" | "APPROVER";
  appointmentId: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/audit/appointments/${opts.appointmentId}`);
  const roleLabel = opts.rejectedByRole === "APPROVER" ? "Approver" : "Reviewer";
  const yearEn = opts.year - 543;

  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[QMS] Appointment Returned for Revision — ${opts.appointmentNo}`,
    bodyHtml: layout({
      badgeColor: "#ef4444",
      badgeText: "Returned",
      title: "Appointment Letter Returned for Revision",
      subtitle: `${opts.appointmentNo} · Returned by ${roleLabel}`,
      rows: [
        { label: "Document No.", value: opts.appointmentNo },
        { label: "Title", value: opts.title },
        { label: "Year", value: `${yearEn} (B.E. ${opts.year})` },
        { label: "Returned by", value: opts.rejectedByName ? `${opts.rejectedByName} (${roleLabel})` : roleLabel },
      ],
      body: `<div style="margin:16px 0 0;padding:14px 16px;background:#fff1f2;border-left:3px solid #f43f5e;border-radius:0 6px 6px 0">
        <p style="font-size:11px;font-weight:700;color:#be123c;text-transform:uppercase;letter-spacing:.5px;margin:0 0 6px">Reason for Return</p>
        <p style="font-size:13px;color:#0f172a;line-height:1.7;margin:0;white-space:pre-wrap">${esc(opts.reason)}</p>
      </div>`,
      actionLabel: "Revise & Resubmit",
      actionUrl: url,
    }),
  });
}

// ─── Audit plan: sign request html (reused for in-app notification body) ─────

export function buildAuditSignRequestHtml(opts: {
  planTitle: string;
  auditNo: string;
  signedRole: string;
}): string {
  const roleLabel = opts.signedRole === "APPROVER" ? "Approver" : opts.signedRole === "REVIEWER" ? "Reviewer" : opts.signedRole;
  return layout({
    badgeColor: "#f59e0b",
    badgeText: "Signature Required",
    title: "Audit Plan — Signature Request",
    subtitle: `${esc(opts.auditNo)} · ${esc(roleLabel)}`,
    rows: [
      { label: "Audit No.", value: opts.auditNo },
      { label: "Title", value: opts.planTitle },
      { label: "Your Role", value: roleLabel },
    ],
    body: `<div style="margin:16px 0 0;padding:14px 16px;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:0 6px 6px 0;font-size:13px;color:#92400e;line-height:1.6">
      <strong>Your signature is required</strong> to proceed with the audit plan approval workflow.
    </div>`,
  });
}

// ─── Audit plan: sign request (for audit plan, not appointment) ───────────────

export async function sendAuditSignRequestEmail(opts: {
  to: { name: string; email: string };
  planTitle: string;
  auditNo: string;
  signedRole: string;
  token: string;
  planId: string;
  senderAccessToken?: string | null;
}) {
  const rolePath = opts.signedRole === "APPROVER" ? "approver" : "reviewer";
  const url = opts.token && opts.token.length > 0
    ? getAppUrl(`/approve/audit/${opts.planId}/${rolePath}?token=${encodeURIComponent(opts.token)}`)
    : getAppUrl(`/approve/audit/${opts.planId}/${rolePath}`);
  const roleLabel = opts.signedRole === "APPROVER" ? "Approver" : opts.signedRole === "REVIEWER" ? "Reviewer" : opts.signedRole;

  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[Audit] Signature Required — ${opts.auditNo} (${roleLabel})`,
    bodyHtml: layout({
      badgeColor: "#f59e0b",
      badgeText: "Signature Required",
      title: "Audit Plan — Signature Request",
      subtitle: `${opts.auditNo} · ${roleLabel}`,
      rows: [
        { label: "Audit No.", value: opts.auditNo },
        { label: "Title", value: opts.planTitle },
        { label: "Your Role", value: roleLabel },
      ],
      body: `<div style="margin:16px 0 0;padding:14px 16px;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:0 6px 6px 0;font-size:13px;color:#92400e;line-height:1.6">
        <strong>Your signature is required</strong> to proceed with the audit plan approval workflow.
      </div>`,
      actionLabel: roleLabel === "Approver" ? "Review & Approve" : "Review & Sign",
      actionUrl: url,
    }),
  });
}
