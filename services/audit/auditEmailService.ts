/**
 * Audit email templates — English-primary, bilingual labels.
 * All sends go through the Auth Center delegated mail proxy.
 */

import { logger } from "@/lib/logger";
import ExcelJS from "exceljs";
import { QmsConfigService } from "@/services/qmsConfigService";
import { AuditPlanRepository } from "@/repositories/audit/auditPlanRepository";
import { AuditSessionPlanRepository } from "@/repositories/audit/auditSessionPlanRepository";

const auditPlanRepo = new AuditPlanRepository();
const auditSessionPlanRepo = new AuditSessionPlanRepository();

export interface MailAttachment {
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

// ─── Audit plan: embeddable print-style block (FM-MR-07 look, for email bodies) ─

function planFormatBilingualDate(value: Date | string | null | undefined): { th: string; en: string } {
  if (!value) return { th: "-", en: "-" };
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return { th: "-", en: "-" };
  const monthsTh = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return {
    th: `${d.getDate()} ${monthsTh[d.getMonth()]} ${d.getFullYear() + 543}`,
    en: `${d.getDate()}-${monthsEn[d.getMonth()]}-${d.getFullYear()}`,
  };
}

function planFormatBilingualTime(start: string, end: string): string {
  const s = (start || "").trim();
  const e = (end || "").trim();
  if (!s && !e) return "-";
  return `${s} - ${e} น.`;
}

function planFormatShortName(fullName: string): string {
  if (!fullName) return "";
  let name = fullName.trim();
  if (name.includes("/")) name = name.split("/")[1]?.trim() || name.split("/")[0]?.trim();
  let prefix = "";
  let rest = name;
  for (const pf of ["mr.", "ms.", "mrs.", "นาย", "นางสาว", "นาง"]) {
    if (name.toLowerCase().startsWith(pf)) {
      prefix = pf.toUpperCase().replace("นาย", "MR.").replace("นางสาว", "MS.").replace("นาง", "MRS.");
      if (!prefix.endsWith(".")) prefix += ".";
      rest = name.substring(pf.length).trim();
      break;
    }
  }
  const parts = rest.split(/\s+/);
  if (parts.length >= 2) {
    return `${prefix ? prefix + " " : ""}${parts[0].toUpperCase()} ${parts[parts.length - 1].substring(0, 1).toUpperCase()}.`;
  }
  return name.toUpperCase();
}

interface PlanPrintSession {
  auditDate: Date | string;
  startTime: string;
  endTime: string;
  department: string;
  remark: string | null;
  teamMembers: { role: string; name: string }[];
}

interface PlanPrintGanttRow {
  department: string;
  processes: string[];
  planWeeks: string[];
  actualWeeks: string[];
}

interface PlanPrintSignoff {
  signedRole: string;
  signerNameSnapshot: string | null;
  signaturePath: string | null;
  signedAt: Date | string;
}

export interface AuditPlanPrintData {
  auditNo: string;
  title: string;
  standards?: string[] | null;
  standard?: string | null;
  ownerNameSnapshot: string | null;
  reviewerNameSnapshot: string | null;
  approverNameSnapshot: string | null;
  signoffs: PlanPrintSignoff[];
  sessions?: PlanPrintSession[];
  ganttRows?: PlanPrintGanttRow[];
}

export function buildAuditPlanPrintHtml(data: AuditPlanPrintData): string {
  const logoUrl = getAppUrl("/logo/logo.webp");
  const standardsLabel = data.standards?.length ? data.standards.join(", ") : (data.standard ?? "-");
  const reviewerSignoff = data.signoffs.find((s) => s.signedRole === "REVIEWER");
  const approverSignoff = data.signoffs.find((s) => s.signedRole === "APPROVER");

  const headerHtml = `
  <table style="width:100%;border-collapse:collapse;border:2px solid #000;color:#000;font-family:'Sarabun','Segoe UI',Arial,sans-serif;">
    <tbody>
      <tr>
        <td style="width:18%;border:2px solid #000;padding:8px 5px;text-align:center;vertical-align:middle;">
          <img src="${logoUrl}" alt="NDC INDUSTRIAL" style="max-height:28px;object-fit:contain;display:block;margin:0 auto 3px;" />
          <div style="font-size:8px;font-weight:900;letter-spacing:1px;">INDUSTRIAL</div>
        </td>
        <td style="border:2px solid #000;padding:8px 10px;text-align:center;vertical-align:middle;">
          <div style="font-size:13px;font-weight:bold;">แผนการตรวจติดตามภายใน / Internal Audit Plan</div>
          <div style="font-size:11px;color:#444;margin-top:2px;">${esc(data.auditNo)} · ${esc(data.title)}</div>
        </td>
        <td style="width:24%;border:2px solid #000;padding:6px 8px;font-size:10px;vertical-align:middle;">
          <div>มาตรฐาน / Standard: <strong>${esc(standardsLabel)}</strong></div>
        </td>
      </tr>
    </tbody>
  </table>`;

  let sessionsHtml = "";
  if (data.sessions?.length) {
    const rows = data.sessions
      .map((s) => {
        const dateInfo = planFormatBilingualDate(s.auditDate);
        const timeStr = planFormatBilingualTime(s.startTime, s.endTime);
        const leads = s.teamMembers.filter((m) => m.role === "LEAD_AUDITOR").map((m) => planFormatShortName(m.name));
        const auditors = s.teamMembers.filter((m) => m.role === "AUDITOR").map((m) => planFormatShortName(m.name));
        const observers = s.teamMembers.filter((m) => m.role === "OBSERVER").map((m) => planFormatShortName(m.name));
        const teamParts = [...leads, ...auditors, observers.length ? `(Obs: ${observers.join(", ")})` : ""].filter(Boolean);
        return `<tr>
          <td style="border:1.2px solid #000;padding:4px 6px;line-height:1.3;"><div style="font-weight:600;">${esc(dateInfo.th)}</div><div style="font-size:8.5px;color:#555;">${esc(dateInfo.en)}</div></td>
          <td style="border:1.2px solid #000;padding:4px 6px;text-align:center;">${esc(timeStr)}</td>
          <td style="border:1.2px solid #000;padding:4px 6px;font-weight:600;">${esc(s.department)}</td>
          <td style="border:1.2px solid #000;padding:4px 6px;">${esc(teamParts.join(", ") || "-")}</td>
          <td style="border:1.2px solid #000;padding:4px 6px;font-size:8.5px;color:#444;">${esc(s.remark || "-")}</td>
        </tr>`;
      })
      .join("");
    sessionsHtml = `
    <div style="margin-top:12px;font-size:11px;font-weight:bold;">ตารางการตรวจติดตาม / Audit Schedule</div>
    <table style="width:100%;border-collapse:collapse;border:1.5px solid #000;color:#000;font-size:9.5px;margin-top:4px;">
      <thead>
        <tr style="background:#f1f5f9;text-align:center;font-weight:bold;">
          <th style="border:1.2px solid #000;padding:5px 4px;">วันที่ / Date</th>
          <th style="border:1.2px solid #000;padding:5px 4px;">เวลา / Time</th>
          <th style="border:1.2px solid #000;padding:5px 4px;">หน่วยงาน / Department</th>
          <th style="border:1.2px solid #000;padding:5px 4px;">ทีมตรวจ / Team</th>
          <th style="border:1.2px solid #000;padding:5px 4px;">หมายเหตุ / Remark</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  let ganttHtml = "";
  if (data.ganttRows?.length) {
    const rows = data.ganttRows
      .map(
        (r) => `<tr>
          <td style="border:1.2px solid #000;padding:4px 6px;font-weight:600;">${esc(r.department)}</td>
          <td style="border:1.2px solid #000;padding:4px 6px;font-size:9px;">${r.processes.map((p) => esc(p)).join(", ") || "-"}</td>
          <td style="border:1.2px solid #000;padding:4px 6px;font-size:9px;color:#0059a4;">${r.planWeeks.length} weeks</td>
          <td style="border:1.2px solid #000;padding:4px 6px;font-size:9px;color:#16a34a;">${r.actualWeeks.length} weeks</td>
        </tr>`
      )
      .join("");
    ganttHtml = `
    <div style="margin-top:12px;font-size:11px;font-weight:bold;">แผน Gantt / Gantt Plan</div>
    <table style="width:100%;border-collapse:collapse;border:1.5px solid #000;color:#000;font-size:9.5px;margin-top:4px;">
      <thead>
        <tr style="background:#f1f5f9;text-align:center;font-weight:bold;">
          <th style="border:1.2px solid #000;padding:5px 4px;">หน่วยงาน / Department</th>
          <th style="border:1.2px solid #000;padding:5px 4px;">กระบวนการ / Process</th>
          <th style="border:1.2px solid #000;padding:5px 4px;">Plan</th>
          <th style="border:1.2px solid #000;padding:5px 4px;">Actual</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  const signatureBlocks = [
    { label: "Prepared by", name: data.ownerNameSnapshot, signaturePath: null as string | null, date: null as Date | string | null },
    { label: "Reviewed by", name: reviewerSignoff?.signerNameSnapshot ?? data.reviewerNameSnapshot, signaturePath: reviewerSignoff?.signaturePath ?? null, date: reviewerSignoff?.signedAt ?? null },
    { label: "Approved by", name: approverSignoff?.signerNameSnapshot ?? data.approverNameSnapshot, signaturePath: approverSignoff?.signaturePath ?? null, date: approverSignoff?.signedAt ?? null },
  ];

  const signatureHtml = `
  <table style="width:100%;border-collapse:collapse;border:2px solid #000;color:#000;margin-top:14px;">
    <tbody>
      <tr style="text-align:center;font-weight:bold;font-size:9.5px;background:#f8fafc;">
        ${signatureBlocks.map((b) => `<td style="border:2px solid #000;padding:3px;width:${100 / signatureBlocks.length}%;">${b.label}</td>`).join("")}
      </tr>
      <tr style="height:48px;text-align:center;vertical-align:middle;">
        ${signatureBlocks
          .map(
            (b) => `<td style="border:2px solid #000;padding:3px 4px;">
          ${b.signaturePath ? `<img src="${b.signaturePath}" alt="${esc(b.label)}" style="max-height:30px;max-width:90%;display:block;margin:0 auto;" />` : `<div style="height:30px;"></div>`}
          <div style="font-size:9px;font-weight:bold;margin-top:1px;color:#0F1059;">${esc(b.name || "-")}</div>
        </td>`
          )
          .join("")}
      </tr>
      <tr style="font-size:8.5px;">
        ${signatureBlocks.map((b) => `<td style="border:2px solid #000;padding:3px 5px;">Date: <span style="color:#0F1059;font-weight:bold;font-family:monospace;">${formatDateSign(b.date)}</span></td>`).join("")}
      </tr>
    </tbody>
  </table>`;

  return `<div style="font-family:'Sarabun','Segoe UI',Arial,sans-serif;">${headerHtml}${sessionsHtml}${ganttHtml}${signatureHtml}</div>`;
}

export async function getAuditPlanPrintHtml(planId: string): Promise<string | null> {
  const plan = await auditPlanRepo.findDetailById(planId);
  if (!plan) return null;

  let sessions: PlanPrintSession[] | undefined;
  let ganttRows: PlanPrintGanttRow[] | undefined;

  if (plan.appointmentId) {
    const sessionPlan = await auditSessionPlanRepo.findByAppointmentId(plan.appointmentId);
    if (sessionPlan) {
      sessions = sessionPlan.sessions.map((s) => ({
        auditDate: s.auditDate,
        startTime: s.startTime,
        endTime: s.endTime,
        department: s.department,
        remark: s.remark,
        teamMembers: s.teamMembers.map((tm) => ({ role: tm.role, name: tm.name })),
      }));
      ganttRows = sessionPlan.ganttRows.map((r) => ({
        department: r.department,
        processes: r.processes,
        planWeeks: r.planWeeks,
        actualWeeks: r.actualWeeks,
      }));
    }
  }

  if (!sessions?.length && plan.schedules.length) {
    sessions = plan.schedules.map((s) => {
      const start = new Date(s.startAt);
      const end = new Date(s.endAt);
      const timeOf = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      return {
        auditDate: s.startAt,
        startTime: timeOf(start),
        endTime: timeOf(end),
        department: s.departmentName || s.sessionTitle,
        remark: s.unavailableReason,
        teamMembers: s.team.map((tm) => ({ role: tm.role, name: tm.nameSnapshot || "" })),
      };
    });
  }

  return buildAuditPlanPrintHtml({
    auditNo: plan.auditNo,
    title: plan.title,
    standards: plan.standards,
    standard: plan.standard,
    ownerNameSnapshot: plan.ownerNameSnapshot,
    reviewerNameSnapshot: plan.reviewerNameSnapshot,
    approverNameSnapshot: plan.approverNameSnapshot,
    signoffs: plan.signoffs.map((s) => ({
      signedRole: s.signedRole,
      signerNameSnapshot: s.signerNameSnapshot,
      signaturePath: s.signaturePath,
      signedAt: s.signedAt,
    })),
    sessions,
    ganttRows,
  });
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

  const printHtml = await getAuditPlanPrintHtml(opts.planId).catch(() => null);
  if (printHtml) {
    body += `<div style="margin-top:20px">${printHtml}</div>`;
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

  const printHtml = await getAuditPlanPrintHtml(opts.planId).catch(() => null);
  const noticeHtml = `<div style="margin:16px 0 0;padding:14px 16px;background:#fefce8;border-left:3px solid #f59e0b;border-radius:0 6px 6px 0;font-size:13px;color:#92400e;line-height:1.6">
        Please log in to <strong>confirm your availability</strong> for the scheduled audit date. If you are unavailable, indicate the reason so QMS can reschedule accordingly.
      </div>${printHtml ? `<div style="margin-top:20px">${printHtml}</div>` : ""}`;

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
      body: noticeHtml,
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
  status: "CONFIRMED" | "UNAVAILABLE" | "SUGGESTED";
  confirmedBy: string;
  reason?: string | null;
  suggestedStartAt?: string | null;
  suggestedEndAt?: string | null;
  planId: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/qms/audit/${opts.planId}`);
  const isConfirmed = opts.status === "CONFIRMED";
  const isSuggested = opts.status === "SUGGESTED";
  const rows: { label: string; value: string }[] = [
    { label: "Audit No.", value: opts.auditNo },
    { label: "Plan", value: opts.planTitle },
    { label: "Department", value: opts.departmentName },
    { label: "Session", value: opts.sessionTitle },
    { label: isConfirmed ? "Confirmed by" : "Reported by", value: opts.confirmedBy },
  ];
  if (opts.reason) rows.push({ label: "Reason", value: opts.reason });
  if (isSuggested && opts.suggestedStartAt && opts.suggestedEndAt) {
    rows.push({ label: "Suggested start", value: fmtDateTime(opts.suggestedStartAt) });
    rows.push({ label: "Suggested end", value: fmtDateTime(opts.suggestedEndAt) });
  }

  const printHtml = await getAuditPlanPrintHtml(opts.planId).catch(() => null);

  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[Audit] ${isConfirmed ? "Confirmed" : isSuggested ? "New date suggested" : "Unavailable"} — ${opts.departmentName} — ${opts.auditNo}`,
    bodyHtml: layout({
      badgeColor: isConfirmed ? "#10b981" : isSuggested ? "#2563eb" : "#ef4444",
      badgeText: isConfirmed ? "Confirmed" : isSuggested ? "New Date Suggested" : "Unavailable",
      title: isConfirmed ? "Department Confirmed Schedule" : isSuggested ? "Department Suggested a New Date" : "Department Unavailable",
      subtitle: opts.auditNo,
      rows,
      body: printHtml ? `<div style="margin-top:12px">${printHtml}</div>` : undefined,
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
  const printHtml = await getAuditPlanPrintHtml(opts.planId).catch(() => null);

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
      </div>${printHtml ? `<div style="margin-top:20px">${printHtml}</div>` : ""}`,
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
  attachments?: MailAttachment[];
}): Promise<void> {
  const url = getAppUrl(`/qms/audit/${opts.planId}`);
  const printHtml = await getAuditPlanPrintHtml(opts.planId).catch(() => null);
  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[Audit] Plan Approved — ${opts.auditNo}`,
    attachments: opts.attachments,
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
      body: printHtml ? `<div style="margin-top:12px">${printHtml}</div>` : undefined,
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

  const deptPrintHtml = await getAuditPlanPrintHtml(opts.planId).catch(() => null);

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
      </div>${deptPrintHtml ? `<div style="margin-top:20px">${deptPrintHtml}</div>` : ""}`,
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
  const printHtml = await getAuditPlanPrintHtml(opts.planId).catch(() => null);
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
      body: printHtml ? `<div style="margin-top:12px">${printHtml}</div>` : undefined,
      actionLabel: "View Audit Plan",
      actionUrl: url,
    }),
  });
}

// ─── Appointment: sign request (Reviewer or Approver) ─────────────────────────

// ─── Appointment: PDF-like HTML Template Builder ─────────────────────────────

function getDeptLabel(dept: string): { th: string; en: string } {
  const d = dept.trim().toLowerCase();
  if (d.includes("qms") || d.includes("quality")) {
    return { th: "แผนกระบบมาตรฐานคุณภาพ", en: "Quality Management System Section" };
  }
  if (d.includes("safety") || d.includes("she") || d.includes("environment")) {
    return { th: "แผนกระบบมาตรฐานความปลอดภัย อาชีวอนามัยและสิ่งแวดล้อม", en: "Safety, Health, and Environment Section" };
  }
  if (d.includes("hr") || d.includes("human") || d.includes("resource")) {
    return { th: "แผนกทรัพยากรบุคคล", en: "Human Resources Section" };
  }
  if (d.includes("sales") || d.includes("marketing") || d.includes("sale")) {
    return { th: "แผนกขายและการตลาด", en: "Sales and Marketing Section" };
  }
  if (d.includes("purchase") || d.includes("purchasing") || d.includes("procurement")) {
    return { th: "แผนกจัดซื้อ", en: "Purchasing Section" };
  }
  if (d.includes("production") || d.includes("manufacture")) {
    return { th: "แผนกผลิต", en: "Production Section" };
  }
  if (d.includes("engineer") || d.includes("engineering")) {
    return { th: "แผนกวิศวกรรม", en: "Engineering Section" };
  }
  if (d.includes("warehouse") || d.includes("store") || d.includes("logistics")) {
    return { th: "แผนกคลังสินค้า", en: "Warehouse Section" };
  }
  if (d.includes("it") || d.includes("information")) {
    return { th: "แผนกเทคโนโลยีสารสนเทศ", en: "IT Section" };
  }
  const cleanDept = dept.trim();
  return { th: `แผนก${cleanDept}`, en: `${cleanDept} Section` };
}

function getMemberRoleTitle(role: string, department: string, nameTh: string): { th: string; en: string } {
  const dept = department.toLowerCase();
  const name = nameTh.toLowerCase();
  
  if (dept.includes("qms") || dept.includes("quality")) {
    return { th: "เจ้าหน้าที่แผนกระบบบริหารงานคุณภาพ", en: "Quality Management System Officer" };
  }
  if (dept.includes("safety") || dept.includes("she") || dept.includes("environment")) {
    if (name.includes("วิหวัส") || name.includes("wittawat")) {
      return { th: "เจ้าหน้าที่ความปลอดภัย", en: "Safety Officer" };
    }
    return { th: "เจ้าหน้าที่สิ่งแวดล้อม", en: "Environmental Officer" };
  }
  if (dept.includes("hr") || dept.includes("human") || dept.includes("resource")) {
    if (name.includes("แสงสุรีย์") || name.includes("saengsuree")) {
      return { th: "เจ้าหน้าที่ค่าจ้างและสวัสดิการ", en: "HR Payroll and benefits officer" };
    }
    return { th: "เจ้าหน้าที่สรรหาบุคลากร", en: "Human Resources Officer" };
  }
  if (dept.includes("sales") || dept.includes("marketing") || dept.includes("sale")) {
    return { th: "เจ้าหน้าที่แผนกขายและการตลาด", en: "Sales and Marketing Officer" };
  }
  if (dept.includes("purchase") || dept.includes("purchasing") || dept.includes("procurement")) {
    return { th: "เจ้าหน้าที่จัดซื้อ", en: "Purchasing Officer" };
  }
  if (dept.includes("production")) {
    return { th: "เจ้าหน้าที่ผลิต", en: "Production Officer" };
  }
  if (dept.includes("engineer") || dept.includes("engineering")) {
    return { th: "เจ้าหน้าที่วิศวกรรม", en: "Engineering Officer" };
  }
  if (dept.includes("warehouse")) {
    return { th: "เจ้าหน้าที่คลังสินค้า", en: "Warehouse Officer" };
  }
  if (dept.includes("it")) {
    return { th: "เจ้าหน้าที่เทคโนโลยีสารสนเทศ", en: "IT Officer" };
  }
  
  if (role === "LEAD_AUDITOR") {
    return { th: "หัวหน้าผู้ตรวจติดตามภายใน", en: "Lead Auditor" };
  }
  if (role === "AUDITOR") {
    return { th: "ผู้ตรวจติดตามภายใน", en: "Internal Auditor" };
  }
  return { th: "คณะทำงาน", en: "Committee Member" };
}

function parseBilingualName(nameStr: string): { th: string; en: string } {
  if (nameStr.includes("/")) {
    const parts = nameStr.split("/").map((p) => p.trim());
    return { th: parts[0] || "", en: parts[1] || "" };
  }
  if (nameStr.includes("(")) {
    const parts = nameStr.split("(").map((p) => p.trim().replace(")", ""));
    return { th: parts[0] || "", en: parts[1] || "" };
  }
  return { th: nameStr.trim(), en: "" };
}

function formatDateEn(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = String(date.getFullYear()).substring(2);
  return `${day}-${month}-${year}`;
}

function formatDateSign(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function buildBilingualAppointmentLetterHtml(opts: {
  appointmentNo: string;
  title: string;
  year: number;
  standards: string[];
  members: { name: string; role: string; department?: string | null; standards: string[] }[];
  signoffs?: { signedRole: string; signaturePath?: string | null; signerNameSnapshot?: string | null; signedAt: Date | string }[];
  ownerSignaturePath?: string | null;
  ownerName?: string | null;
  reviewerName?: string | null;
  approverName?: string | null;
  status: string;
  showCompanyStamp?: boolean;
}): string {
  const reviewerSignoff = opts.signoffs?.find((s) => s.signedRole === "REVIEWER");
  const approverSignoff = opts.signoffs?.find((s) => s.signedRole === "APPROVER");

  const has9001 = opts.standards.some((s) => s.includes("9001"));
  const has14001 = opts.standards.some((s) => s.includes("14001"));
  const has45001 = opts.standards.some((s) => s.includes("45001"));

  const textThParts: string[] = [];
  const textEnParts: string[] = [];

  if (has9001) {
    textThParts.push("ระบบบริหารงานคุณภาพ ISO 9001:2015");
    textEnParts.push("the Quality Management System (ISO 9001:2015)");
  }
  if (has14001) {
    textThParts.push("ระบบการจัดการสิ่งแวดล้อม ISO 14001:2015");
    textEnParts.push("the Environmental Management System (ISO 14001:2015)");
  }
  if (has45001) {
    textThParts.push("ระบบการจัดการอาชีวอนามัยและความปลอดภัย ISO 45001:2018");
    textEnParts.push("the Occupational Health and Safety Management System (ISO 45001:2018)");
  }

  let thStandardsText = "";
  if (textThParts.length === 1) {
    thStandardsText = textThParts[0];
  } else if (textThParts.length === 2) {
    thStandardsText = textThParts.join(" และ");
  } else if (textThParts.length > 2) {
    const last = textThParts.pop();
    thStandardsText = textThParts.join(", ") + " และ" + last;
  } else {
    thStandardsText = opts.standards.join(", ");
  }

  let enStandardsText = "";
  if (textEnParts.length === 1) {
    enStandardsText = textEnParts[0];
  } else if (textEnParts.length === 2) {
    enStandardsText = textEnParts.join(" and ");
  } else if (textEnParts.length > 2) {
    const last = textEnParts.pop();
    enStandardsText = textEnParts.join(", ") + ", and " + last;
  } else {
    enStandardsText = opts.standards.join(", ");
  }

  const groupedDepts: Array<{ department: string; members: typeof opts.members }> = [];
  opts.members.forEach((m) => {
    const dept = m.department || "General";
    let g = groupedDepts.find((x) => x.department === dept);
    if (!g) {
      g = { department: dept, members: [] };
      groupedDepts.push(g);
    }
    g.members.push(m);
  });

  const logoUrl = getAppUrl("/logo/logo.webp");
  const companyStampUrl = getAppUrl("/logo/stamp-company.png");

  return `
<div style="border: 2px solid #000; padding: 15px 20px; box-sizing: border-box; background-color: #fff; font-family: 'Sarabun', 'Segoe UI', Arial, sans-serif;">
  
  <!-- 1. Header Box Table -->
  <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; margin-bottom: 0; color: #000;">
    <tbody>
      <tr>
        <td style="width: 25%; text-align: center; vertical-align: middle; border: 2px solid #000; padding: 8px 5px;">
          <img src="${logoUrl}" alt="NDC INDUSTRIAL" style="max-height: 32px; object-fit: contain; display: block; margin: 0 auto 4px;" />
          <div style="font-size: 8.5px; font-weight: 900; letter-spacing: 1.2px; color: #000; font-family: sans-serif;">INDUSTRIAL</div>
        </td>
        
        <td style="width: 50%; border: 2px solid #000; padding: 8px 10px; text-align: center; vertical-align: middle;">
          <div style="font-size: 12.5px; font-weight: bold; color: #000; margin-bottom: 3px;">
            เรื่อง : ประกาศแต่งตั้งคณะทำงานระบบบริหารงาน ISO
          </div>
          <div style="font-size: 11px; font-weight: bold; color: #000; line-height: 1.2;">
            Subject: Announcement of the Appointment of the ISO Management System Working Group
          </div>
        </td>
        
        <td style="width: 25%; border: 2px solid #000; padding: 0; vertical-align: top;">
          <table style="width: 100%; border-collapse: collapse; border: none; height: 100%; margin: 0; fontSize: 10px; color: #000;">
            <tbody>
              <tr>
                <td style="border-top: none; border-left: none; border-bottom: 1px solid #000; width: 40px; font-weight: bold; padding: 4px 5px; font-size: 10px;">No.</td>
                <td style="border-top: none; border-left: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 5px; font-weight: bold; text-align: center; font-size: 9.5px;">${esc(opts.appointmentNo)}</td>
                <td style="border-top: none; border-left: 1px solid #000; border-bottom: 1px solid #000; border-right: none; width: 35px; text-align: center; padding: 4px 5px; font-weight: bold; font-size: 10px;">R.00</td>
              </tr>
              <tr>
                <td style="border-left: none; border-bottom: 1px solid #000; font-weight: bold; padding: 4px 5px; font-size: 10px;">Date.</td>
                <td colSpan="2" style="border-left: 1px solid #000; border-bottom: 1px solid #000; border-right: none; padding: 4px 5px; text-align: center; font-weight: bold; font-size: 10px;">${formatDateEn(reviewerSignoff?.signedAt || approverSignoff?.signedAt || new Date())}</td>
              </tr>
              <tr>
                <td style="border-bottom: none; border-left: none; font-weight: bold; padding: 4px 5px; font-size: 10px;">Pages.</td>
                <td colSpan="2" style="border-bottom: none; border-left: 1px solid #000; border-right: none; padding: 4px 5px; text-align: center; font-weight: bold; font-size: 10px;">1/1</td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>

  <!-- 2. Signatures Grid Box -->
  <table style="width: 100%; border-collapse: collapse; border: 2px solid #000; border-top: none; margin-bottom: 15px; color: #000;">
    <tbody>
      <tr style="text-align: center; font-weight: bold; font-size: 10px;">
        <td style="border: 2px solid #000; border-top: none; border-left: none; width: 25%; padding: 4px; background-color: #f8fafc;">Issued By</td>
        <td style="border: 2px solid #000; border-top: none; width: 25%; padding: 4px; background-color: #f8fafc;">Checked By</td>
        <td style="border: 2px solid #000; border-top: none; width: 25%; padding: 4px; background-color: #f8fafc;">Approved By</td>
        <td style="border: 2px solid #000; border-top: none; border-right: none; width: 25%; padding: 4px; background-color: #f8fafc;">Company Stamp</td>
      </tr>
      <tr style="height: 55px; text-align: center; vertical-align: middle;">
        <!-- Issued By -->
        <td style="border: 2px solid #000; border-left: none; padding: 4px 5px; vertical-align: middle;">
          ${opts.ownerSignaturePath ? `
            <img src="${opts.ownerSignaturePath}" alt="Owner Signature" style="max-height: 35px; max-width: 90%; display: block; margin: 0 auto;" />
          ` : `
            <div style="height: 35px;"></div>
          `}
          <div style="font-size: 9.5px; font-weight: 500; margin-top: 2px; color: #0F1059;">${esc(opts.ownerName || "")}</div>
        </td>
        <!-- Checked By -->
        <td style="border: 2px solid #000; padding: 4px 5px; vertical-align: middle;">
          ${reviewerSignoff?.signaturePath ? `
            <img src="${reviewerSignoff.signaturePath}" alt="Reviewer Signature" style="max-height: 35px; max-width: 90%; display: block; margin: 0 auto;" />
          ` : `
            <div style="height: 35px;"></div>
          `}
          <div style="font-size: 9.5px; font-weight: 500; margin-top: 2px; color: #0F1059;">${esc(reviewerSignoff?.signerNameSnapshot || opts.reviewerName || "")}</div>
        </td>
        <!-- Approved By -->
        <td style="border: 2px solid #000; padding: 4px 5px; vertical-align: middle;">
          ${approverSignoff?.signaturePath ? `
            <img src="${approverSignoff.signaturePath}" alt="Approver Signature" style="max-height: 35px; max-width: 90%; display: block; margin: 0 auto;" />
          ` : `
            <div style="height: 35px;"></div>
          `}
          <div style="font-size: 9.5px; font-weight: 500; margin-top: 2px; color: #0F1059;">${esc(approverSignoff?.signerNameSnapshot || opts.approverName || "")}</div>
        </td>
        <!-- Company Stamp -->
        <td style="border: 2px solid #000; border-right: none; padding: 2px; text-align: center; vertical-align: middle;">
          ${(opts.status === "PUBLISHED" && opts.showCompanyStamp !== false) ? `
            <img src="${companyStampUrl}" alt="NDC Industrial Company Stamp" style="width: 55px; height: 55px; object-fit: contain; display: block; margin: 0 auto;" />
          ` : ""}
        </td>
      </tr>
      <tr style="font-size: 9px; color: #000;">
        <td style="border: 2px solid #000; border-bottom: none; border-left: none; padding: 4px 5px;">
          Date: <span style="color: #0F1059; font-weight: bold; font-family: monospace;">${formatDateSign(reviewerSignoff?.signedAt || approverSignoff?.signedAt || new Date())}</span>
        </td>
        <td style="border: 2px solid #000; border-bottom: none; padding: 4px 5px;">
          Date: <span style="color: #0F1059; font-weight: bold; font-family: monospace;">${formatDateSign(reviewerSignoff?.signedAt)}</span>
        </td>
        <td style="border: 2px solid #000; border-bottom: none; padding: 4px 5px;">
          Date: <span style="color: #0F1059; font-weight: bold; font-family: monospace;">${formatDateSign(approverSignoff?.signedAt)}</span>
        </td>
        <td style="border: 2px solid #000; border-bottom: none; border-right: none; padding: 4px 5px;">
          Date: <span style="color: #0F1059; font-weight: bold; font-family: monospace;">${formatDateSign(approverSignoff?.signedAt)}</span>
        </td>
      </tr>
    </tbody>
  </table>

  <!-- 3. Introduction Paragraphs -->
  <div style="font-size: 10.5px; text-align: justify; line-height: 1.45; color: #000; margin-bottom: 16px;">
    <p style="text-indent: 2.5em; margin: 0 0 6px 0;">
      เพื่อให้การดำเนินงานตามระบบบริหารงานคุณภาพ ${thStandardsText} ของบริษัท เอ็นดีซี อินดัสเทรียล จำกัด เป็นไปอย่างมีประสิทธิภาพเพื่อให้สอดคล้องกับข้อกำหนดของมาตรฐาน และสามารถพัฒนาและปรับปรุงได้อย่างต่อเนื่อง บริษัทฯ จึงแต่งตั้งคณะทำงานระบบบริหารงาน ISO โดยมีรายชื่อดังต่อไปนี้:
    </p>
    <p style="text-indent: 2.5em; margin: 0;">
      In order to ensure the effective implementation of ${enStandardsText} of NDC Industrial Co., Ltd., in compliance with the requirements of the standards and to enable continual improvement and development, the Company hereby appoints the ISO Management System Committee, with the following members:
    </p>
  </div>

  <!-- 4. Grouped Committee Members List -->
  <div style="padding-left: 5px;">
    ${groupedDepts.map((group, groupIdx) => {
      const deptLabel = getDeptLabel(group.department);
      return `
        <div style="margin-bottom: 12px; font-size: 11px; color: #000;">
          <div style="font-weight: bold; margin-bottom: 5px;">
            ${groupIdx + 1}. ${deptLabel.th} ประกอบด้วยบุคคลดังต่อไปนี้
            <div style="font-weight: bold; font-size: 10px; color: #444; margin-top: 1px;">
              ${deptLabel.en} Following individuals:
            </div>
          </div>
          
          <div style="padding-left: 15px;">
            ${group.members.map((member, mIdx) => {
              const nameLabel = parseBilingualName(member.name);
              const roleLabel = getMemberRoleTitle(member.role, group.department, nameLabel.th);
              return `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; line-height: 1.3;">
                  <div style="width: 52%;">
                    <div style="font-weight: 600;">
                      ${groupIdx + 1}.${mIdx + 1} ${nameLabel.th}
                    </div>
                    ${nameLabel.en ? `
                      <div style="font-size: 9.5px; color: #444; padding-left: 18px;">
                        ${nameLabel.en}
                      </div>
                    ` : ""}
                  </div>
                  <div style="width: 48%; text-align: left; padding-left: 10px;">
                    <div style="font-weight: 600;">
                      ${roleLabel.th}
                    </div>
                    <div style="font-size: 9.5px; color: #555;">
                      ${roleLabel.en}
                    </div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }).join("")}
  </div>

  <!-- 5. Footer Revision Code -->
  <div style="text-align: right; font-size: 9.5px; color: #000; font-family: monospace; border-top: 1px solid #ddd; padding-top: 5px; margin-top: 15px;">
    FM-DC-06:Rev.00:20/11/2024
  </div>

</div>
`;
}

export function buildAppointmentSignRequestHtml(opts: {
  appointmentId: string;
  appointmentNo: string;
  title: string;
  year: number;
  standards: string[];
  ownerName?: string | null;
  reviewerName?: string | null;
  signedRole: "REVIEWER" | "APPROVER";
  members: { name: string; role: string; department?: string | null; standards: string[] }[];
  signoffs: { signedRole: string; signaturePath?: string | null; signerNameSnapshot?: string | null; signedAt: Date | string }[];
  ownerSignaturePath?: string | null;
}): string {
  const rolePath = opts.signedRole === "APPROVER" ? "approver" : "reviewer";
  const url = getAppUrl(`/approve/audit/appointments/${opts.appointmentId}/${rolePath}`);
  const roleLabel = opts.signedRole === "APPROVER" ? "Approver" : "Reviewer";

  const urgentBanner = `
<div style="margin-bottom:20px;padding:14px 16px;background:#fffbeb;border-left:4px solid #f59e0b;border-radius:6px;font-size:13.5px;color:#92400e;line-height:1.6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <strong>Signature Required:</strong> Please click the button below to review and sign this internal auditor appointment letter as <strong>${esc(roleLabel)}</strong>.
  The process cannot proceed without your signature.
</div>`;

  const letterHtml = buildBilingualAppointmentLetterHtml({
    appointmentNo: opts.appointmentNo,
    title: opts.title,
    year: opts.year,
    standards: opts.standards,
    members: opts.members,
    signoffs: opts.signoffs,
    ownerSignaturePath: opts.ownerSignaturePath,
    ownerName: opts.ownerName,
    reviewerName: opts.reviewerName,
    status: opts.signedRole === "REVIEWER" ? "PENDING_REVIEW" : "PENDING_APPROVAL",
  });

  const actionButton = `
<div style="margin-top:24px;text-align:center">
  <a href="${esc(url)}"
     style="display:inline-block;padding:13px 32px;background:#0f1059;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:.3px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
    ${opts.signedRole === "APPROVER" ? "Review & Approve" : "Review & Sign"}
  </a>
</div>`;

  return `
<div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:#f1f5f9;padding:32px 16px">
  <div style="max-width:760px;margin:0 auto">
    ${urgentBanner}
    ${letterHtml}
    ${actionButton}
    <div style="margin-top:20px;text-align:center;font-size:11px;color:#94a3b8">
      NDC Industrial Co., Ltd. — Quality Management System<br>
      This is an automated notification. Please do not reply to this email.
    </div>
  </div>
</div>`;
}

export async function sendAppointmentSignRequestEmail(opts: {
  to: { name: string; email: string };
  appointmentNo: string;
  title: string;
  year: number;
  standards: string[];
  ownerName?: string | null;
  reviewerName?: string | null;
  signedRole: "REVIEWER" | "APPROVER";
  appointmentId: string;
  senderAccessToken?: string | null;
  members: { name: string; role: string; department?: string | null; standards: string[] }[];
  signoffs: { signedRole: string; signaturePath?: string | null; signerNameSnapshot?: string | null; signedAt: Date | string }[];
  ownerSignaturePath?: string | null;
}): Promise<void> {
  const roleLabel = opts.signedRole === "APPROVER" ? "Approver" : "Reviewer";
  const bodyHtml = buildAppointmentSignRequestHtml(opts);

  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[QMS] Signature Required — Appointment ${opts.appointmentNo} (${roleLabel})`,
    bodyHtml,
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
  signoffs?: { signedRole: string; signaturePath?: string | null; signerNameSnapshot?: string | null; signedAt: Date | string }[];
  ownerSignaturePath?: string | null;
  showCompanyStamp?: boolean;
}): string {
  const url = getAppUrl(`/audit/appointments/${opts.appointmentId}`);

  const letterHtml = buildBilingualAppointmentLetterHtml({
    appointmentNo: opts.appointmentNo,
    title: opts.title,
    year: opts.year,
    standards: opts.standards,
    members: opts.members,
    signoffs: opts.signoffs || [],
    ownerSignaturePath: opts.ownerSignaturePath,
    ownerName: opts.ownerName,
    reviewerName: opts.reviewerName,
    approverName: opts.approverName,
    status: "PUBLISHED",
    showCompanyStamp: opts.showCompanyStamp,
  });

  const actionButton = `
<div style="margin-top:24px;text-align:center">
  <a href="${esc(url)}"
     style="display:inline-block;padding:13px 32px;background:#0f1059;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;letter-spacing:.3px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
    View Full Announcement
  </a>
</div>`;

  return `
<div style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:#f1f5f9;padding:32px 16px">
  <div style="max-width:760px;margin:0 auto">
    <div style="background:#d1fae5; border-left:4px solid #10b981; padding:14px 16px; margin-bottom:20px; font-size:13.5px; color:#065f46; border-radius:6px; font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
      <strong>Published:</strong> Internal auditor appointment letter <strong>${esc(opts.appointmentNo)}</strong> has been approved and published.
    </div>
    ${letterHtml}
    ${actionButton}
    <div style="margin-top:20px;text-align:center;font-size:11px;color:#94a3b8">
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
  signoffs?: { signedRole: string; signaturePath?: string | null; signerNameSnapshot?: string | null; signedAt: Date | string }[];
  ownerSignaturePath?: string | null;
  showCompanyStamp?: boolean;
}): Promise<void> {
  if (!opts.recipients.length && !opts.cc?.length) return;
  const yearEn = opts.year - 543;

  const qmsConfigService = new QmsConfigService();
  const naming = await qmsConfigService.getExportNamingMeta("AUDITOR", {
    label: "Auditor List",
    fileBaseName: "auditor-export",
    worksheetName: "Auditors",
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "QMS System";
  wb.created = new Date();
  wb.title = naming.label;

  const ws = wb.addWorksheet(naming.worksheetName);

  const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F1059" } };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  const border: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FFCCCCCC" } };
  const allBorders: Partial<ExcelJS.Borders> = { top: border, left: border, bottom: border, right: border };

  ws.columns = [
    { header: "Appointment No.",    key: "apptNo",      width: 22 },
    { header: "Year",               key: "year",        width: 8  },
    { header: "Auditor Name",       key: "auditorName", width: 28 },
    { header: "Department",         key: "department",  width: 26 },
    { header: "Role",               key: "role",        width: 16 },
    { header: "Standards",          key: "standards",   width: 28 },
    { header: "Reviewer",           key: "reviewer",    width: 24 },
    { header: "Approver",           key: "approver",    width: 24 },
    { header: "Published At",       key: "publishedAt", width: 18 },
    { header: "Created At",         key: "createdAt",   width: 18 },
  ];

  ws.getRow(1).eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = headerFont;
    cell.border = allBorders;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  ws.getRow(1).height = 22;

  const fmt = (d: Date | null | undefined) =>
    d ? d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" }) : "";

  const now = new Date();

  for (const m of opts.members) {
    const roleStr = Array.isArray(m.role) ? (m.role as string[]).join(", ") : String(m.role || "");
    const standardsStr = Array.isArray(m.standards) ? (m.standards as string[]).join(", ") : String(m.standards || "");

    const added = ws.addRow({
      apptNo:      opts.appointmentNo,
      year:        opts.year,
      auditorName: m.name,
      department:  m.department ?? "",
      role:        roleStr,
      standards:   standardsStr,
      reviewer:    opts.reviewerName ?? "",
      approver:    opts.approverName ?? "",
      publishedAt: fmt(now),
      createdAt:   fmt(now),
    });
    added.eachCell((cell) => {
      cell.border = allBorders;
      cell.alignment = { vertical: "top", wrapText: false };
    });
  }

  ws.autoFilter = { from: "A1", to: "J1" };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const buf = Buffer.from(await wb.xlsx.writeBuffer());

  const attachment: MailAttachment = {
    name: `${naming.fileBaseName}-${new Date().toISOString().slice(0, 10)}.xlsx`,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    contentBytes: buf.toString("base64"),
  };

  await sendMail({
    to: opts.recipients,
    cc: opts.cc?.length ? opts.cc : undefined,
    senderAccessToken: opts.senderAccessToken,
    subject: `[QMS] Appointment Letter Published — ${opts.appointmentNo} (Year ${yearEn})`,
    bodyHtml: buildAppointmentPublishedHtml(opts),
    attachments: [attachment],
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
  attachments?: MailAttachment[];
}) {
  const rolePath = opts.signedRole === "APPROVER" ? "approver" : "reviewer";
  const url = opts.token && opts.token.length > 0
    ? getAppUrl(`/approve/audit/${opts.planId}/${rolePath}?token=${encodeURIComponent(opts.token)}`)
    : getAppUrl(`/approve/audit/${opts.planId}/${rolePath}`);
  const roleLabel = opts.signedRole === "APPROVER" ? "Approver" : opts.signedRole === "REVIEWER" ? "Reviewer" : opts.signedRole;
  const printHtml = await getAuditPlanPrintHtml(opts.planId).catch(() => null);

  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[Audit] Signature Required — ${opts.auditNo} (${roleLabel})`,
    attachments: opts.attachments,
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
      </div>${printHtml ? `<div style="margin-top:20px">${printHtml}</div>` : ""}`,
      actionLabel: roleLabel === "Approver" ? "Review & Approve" : "Review & Sign",
      actionUrl: url,
    }),
  });
}
