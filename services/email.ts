/**
 * Mail sending via Auth Center delegated proxy.
 *
 * Flow: QMS passes the Auth Center JWT (session.user.accessToken) to
 * POST <AUTH_CENTER_URL>/api/auth/mail/send — Auth Center looks up the
 * sender's Entra UPN and sends via /users/{upn}/sendMail with its own
 * app-only Graph token.  Email appears FROM the logged-in user.
 *
 * Requires canSendDelegatedMail = true in the Auth Center JWT.
 * Skips silently if accessToken is missing (local-credential users).
 */

import { logger } from "@/lib/logger";
import { getFileInfo } from "@/lib/sharepoint";
import { renderableRichText } from "@/lib/sanitizeRichText";

export interface MailRecipient {
  name: string;
  email: string;
}

export interface SendMailOptions {
  to: MailRecipient[];
  cc?: MailRecipient[];
  subject: string;
  bodyHtml: string;
  /** Auth Center JWT from session.user.accessToken */
  senderAccessToken?: string | null;
  attachments?: Array<{
    name: string;
    contentType: string;
    contentBytes: string; // base64
  }>;
}

function getM2MHeaders(): Record<string, string> | null {
  const appId = process.env.AUTH_CENTER_APP_ID?.trim() || process.env.AUTH_CENTER_CLIENT_ID?.trim();
  const secret = process.env.AUTH_CENTER_CLIENT_SECRET?.trim();
  if (!appId || !secret) return null;
  return {
    "X-Consumer-App-Id": appId,
    "X-Consumer-App-Secret": secret,
    "Content-Type": "application/json",
  };
}

export async function sendMail(opts: SendMailOptions): Promise<void> {
  const base = process.env.AUTH_CENTER_URL?.replace(/\/$/, "");
  if (!base) {
    logger.warn("[email] AUTH_CENTER_URL not set — mail skipped", { subject: opts.subject, to: opts.to.map((r) => r.email) });
    return;
  }

  // Auth Center proxy sends to a single To; loop callers handle multiple recipients
  for (const recipient of opts.to) {
    const body: Record<string, unknown> = {
      toEmail:  recipient.email,
      toName:   recipient.name,
      subject:  opts.subject,
      htmlBody: opts.bodyHtml,
      ...(opts.cc?.length
        ? { cc: opts.cc.map((r) => ({ email: r.email, name: r.name })) }
        : {}),
      ...(opts.attachments?.length
        ? { attachments: opts.attachments }
        : {}),
    };

    const endpoint = `${base}/api/auth/mail/send`;
    const bodyStr = JSON.stringify(body);

    // Try user Bearer token first (email appears FROM logged-in user)
    if (opts.senderAccessToken) {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${opts.senderAccessToken}`, "Content-Type": "application/json" },
        body: bodyStr,
      });

      if (res.ok) {
        const responseText = await res.text().catch(() => "");
        logger.info("[email] Auth Center response (bearer)", { status: res.status, body: responseText.slice(0, 200), to: recipient.email });
        continue;
      }

      // On token-related failures, fall through to M2M
      const responseText = await res.text().catch(() => "");
      if (res.status !== 401 && res.status !== 403) {
        throw new Error(`Auth Center sendMail ${res.status}: ${responseText}`);
      }
      logger.warn("[email] Bearer token rejected, trying M2M fallback", { status: res.status, to: recipient.email });
    }

    // M2M fallback (or when no user token available)
    const m2mHeaders = getM2MHeaders();
    if (!m2mHeaders) {
      logger.warn("[email] No Auth Center token or M2M credentials — mail skipped", { subject: opts.subject, to: recipient.email });
      continue;
    }

    const m2mRes = await fetch(endpoint, { method: "POST", headers: m2mHeaders, body: bodyStr });
    const m2mText = await m2mRes.text().catch(() => "");
    if (!m2mRes.ok) {
      throw new Error(`Auth Center sendMail (M2M) ${m2mRes.status}: ${m2mText}`);
    }
    logger.info("[email] Auth Center response (M2M)", { status: m2mRes.status, body: m2mText.slice(0, 200), to: recipient.email });
  }
}

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getAppUrl(path: string): string {
  const base = (process.env.NEXTAUTH_URL ?? "").replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function makeBilingualMail(opts: {
  titleTh: string;
  titleEn: string;
  subtitleTh?: string;
  subtitleEn?: string;
  facts: Array<{ labelTh: string; labelEn: string; value: string }>;
  detailTh?: string;
  detailEn?: string;
  extraHtml?: string;
  actionLabelTh?: string;
  actionLabelEn?: string;
  actionUrl?: string;
}): string {
  const factsHtml = opts.facts
    .map(
      (f) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;width:35%;vertical-align:top;background:#f8fafc">
          <div style="font-size:12px;color:#0f172a;font-weight:700">${esc(f.labelTh)}</div>
          <div style="font-size:11px;color:#64748b">${esc(f.labelEn)}</div>
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;vertical-align:top">
          <div style="font-size:13px;color:#0f172a;font-weight:600;white-space:pre-wrap">${esc(f.value)}</div>
        </td>
      </tr>`
    )
    .join("");

  const actionHtml = opts.actionUrl
    ? `
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e2e8f0">
        <a href="${opts.actionUrl}" style="display:inline-block;padding:12px 20px;background:#0f1059;color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:700">
          ${esc(opts.actionLabelTh ?? "เปิดรายการ")} / ${esc(opts.actionLabelEn ?? "Open Item")}
        </a>
        <div style="margin-top:8px;font-size:11px;color:#64748b;word-break:break-all">${esc(opts.actionUrl)}</div>
      </div>`
    : "";

  return `
  <div style="width:100%;margin:0;padding:20px;background:#f8fafc;font-family:Segoe UI,Arial,sans-serif">
    <div style="width:100%;max-width:980px;margin:0 auto;background:#fff;overflow:hidden">
      <div style="padding:18px 22px;background:#0f1059;color:#fff">
        <div style="font-size:20px;font-weight:800;line-height:1.3">${esc(opts.titleTh)}</div>
        <div style="font-size:15px;font-weight:600;opacity:.95">${esc(opts.titleEn)}</div>
        ${opts.subtitleTh ? `<div style="margin-top:8px;font-size:12px;opacity:.9">${esc(opts.subtitleTh)}${opts.subtitleEn ? ` / ${esc(opts.subtitleEn)}` : ""}</div>` : ""}
      </div>
      <div style="padding:20px 22px">
        <table style="width:100%;border-collapse:collapse">${factsHtml}</table>
        ${opts.detailTh || opts.detailEn ? `<div style="margin-top:14px;padding:12px;background:#f8fafc"><div style="font-size:12px;font-weight:700;color:#0f172a">รายละเอียด / Details</div><div style="font-size:13px;color:#334155;margin-top:6px;white-space:pre-wrap">${renderableRichText(opts.detailTh)}${opts.detailEn ? `\n${renderableRichText(opts.detailEn)}` : ""}</div></div>` : ""}
        ${opts.extraHtml ?? ""}
        ${actionHtml}
      </div>
      <div style="padding:12px 22px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b">
        อีเมลนี้ถูกส่งโดยระบบอัตโนมัติ กรุณาอย่าตอบกลับ / This is an automated email. Please do not reply.
      </div>
    </div>
  </div>`;
}

export interface KpiObjectiveRow {
  objective: string;
  target: number;
  unit: string | null;
  frequency?: string;
  calculationFormula?: string;
  actionPlanGuidelines?: string;
  referenceDocuments?: string | null;
  responsibleNameSnapshot?: string | null;
  responsibleEmployeeId?: string | null;
}

export interface KpiMonthlyDetailRow {
  objective: string;
  target: number;
  unit: string | null;
  actualResult: number | null;
  achievedStatus: string | null;
}

export function makeMasterObjectivesTable(objectives: KpiObjectiveRow[], revisionTag = "FM-MR-01 Rev.00"): string {
  if (objectives.length === 0) return "";

  // Group by department from the prefix `[Dept]` in objective string
  const grouped: Record<string, KpiObjectiveRow[]> = {};
  for (const obj of objectives) {
    const match = obj.objective.match(/^\[([^\]]+)\]\s*(.*)$/);
    const dept = match ? match[1] : "SYSTEM_MASTER";
    const cleanObjective = match ? match[2] : obj.objective;
    if (!grouped[dept]) {
      grouped[dept] = [];
    }
    grouped[dept].push({
      ...obj,
      objective: cleanObjective,
    });
  }

  let rowsHtml = "";
  for (const [dept, list] of Object.entries(grouped)) {
    list.forEach((obj, idx) => {
      const rowspan = idx === 0 ? ` rowspan="${list.length}"` : "";
      const deptCell = idx === 0 
        ? `<td${rowspan} style="border:1px solid #000;padding:6px;font-weight:bold;text-align:center;background-color:#f8fafc;vertical-align:top">${esc(dept)}</td>` 
        : "";

      rowsHtml += `
        <tr>
          ${deptCell}
          <td style="border:1px solid #000;padding:6px;vertical-align:top">
            <strong>${esc(obj.objective)} ${obj.target} ${esc(obj.unit || "")}</strong>
          </td>
          <td style="border:1px solid #000;padding:6px;vertical-align:top;white-space:pre-line">${esc(obj.calculationFormula || "-")}</td>
          <td style="border:1px solid #000;padding:6px;vertical-align:top;white-space:pre-line">${esc(obj.actionPlanGuidelines || "-")}</td>
          <td style="border:1px solid #000;padding:6px;vertical-align:top;text-align:center">${esc(obj.frequency || "-")}</td>
          <td style="border:1px solid #000;padding:6px;vertical-align:top;text-align:center">${esc(obj.referenceDocuments || "-")}</td>
          <td style="border:1px solid #000;padding:6px;vertical-align:top;text-align:center">
            ${esc(obj.responsibleNameSnapshot || "-")}
            ${obj.responsibleEmployeeId ? `<br><span style="color:#64748b;font-size:8px">(#${esc(obj.responsibleEmployeeId)})</span>` : ""}
          </td>
        </tr>
      `;
    });
  }

  return `
    <div style="margin-top:20px;overflow-x:auto">
      <div style="font-size:12px;font-weight:bold;color:#0f1059;margin-bottom:8px">ตารางแผนวัตถุประสงค์คุณภาพ (FM-MR-01) / Quality Objectives List</div>
      <table style="width:100%;border-collapse:collapse;font-size:10px;color:#000;font-family:Segoe UI,Arial,sans-serif;border:1px solid #000">
        <thead>
          <tr style="background-color:#f1f5f9;font-weight:bold">
            <th style="border:1px solid #000;padding:6px;width:15%;text-align:center">หน่วยงาน<br>Departments</th>
            <th style="border:1px solid #000;padding:6px;width:25%;text-align:center">วัตถุประสงค์และเป้าหมาย<br>Objectives and Targets</th>
            <th style="border:1px solid #000;padding:6px;width:12%;text-align:center">สูตรการคำนวณ<br>Calculation Formula</th>
            <th style="border:1px solid #000;padding:6px;width:20%;text-align:center">แนวทางแผนการดำเนินงาน<br>Action Plan Guidelines</th>
            <th style="border:1px solid #000;padding:6px;width:8%;text-align:center">ความถี่ในการวัดผล<br>Measurement Frequency</th>
            <th style="border:1px solid #000;padding:6px;width:10%;text-align:center">เอกสารอ้างอิง<br>Reference Documents</th>
            <th style="border:1px solid #000;padding:6px;width:10%;text-align:center">ผู้รับผิดชอบ<br>Responsible Person</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div style="text-align:right;font-size:8px;color:#64748b;margin-top:6px">${revisionTag} / วัตถุประสงค์คุณภาพประจำปี</div>
    </div>
  `;
}

// ─── FM-MR-01: embeddable print-style block (Annual Quality Objectives, matches /print/qms/kpi/fm-mr-01) ─

export interface FmMr01PrintObjective {
  objective: string;
  target: number;
  unit: string | null;
  calculationFormula: string | null;
  actionPlanGuidelines: string | null;
  frequency: string | null;
  referenceDocuments: string | null;
  responsibleNameSnapshot?: string | null;
  responsibleEmployeeId?: string | null;
  responsibleEmailSnapshot?: string | null;
  revisionChangeType?: string | null;
}

export interface FmMr01PrintDept {
  department: string;
  objectives: FmMr01PrintObjective[];
  removedObjectives?: FmMr01PrintObjective[];
}

export interface FmMr01PrintSignoff {
  label: string;
  name: string | null;
  signaturePath: string | null;
  date: string;
}

export interface FmMr01PrintData {
  year: number;
  footerPrefix: string;
  footerLabel: string;
  logoUrl: string;
  departments: FmMr01PrintDept[];
  signatures: FmMr01PrintSignoff[];
}

export function buildFmMr01PrintHtml(data: FmMr01PrintData): string {
  const responsibleCell = (o: FmMr01PrintObjective): string => {
    if (!o.responsibleNameSnapshot && !o.responsibleEmailSnapshot) return "-";
    const name = esc(o.responsibleNameSnapshot || o.responsibleEmailSnapshot || "");
    return o.responsibleEmployeeId ? `${name}<br/>(#${esc(o.responsibleEmployeeId)})` : name;
  };

  let tbodyRows = "";
  for (const dept of data.departments) {
    const objectives = dept.objectives ?? [];
    const removed = dept.removedObjectives ?? [];
    const totalRows = objectives.length + removed.length;
    if (totalRows === 0) continue;

    objectives.forEach((obj, i) => {
      const isHighlighted = obj.revisionChangeType === "UPDATED" || obj.revisionChangeType === "ADDED";
      const cellBg = isHighlighted ? "background-color:#e2f0d9;" : "";
      const boldItalic = isHighlighted ? "font-weight:bold;font-style:italic;" : "";
      const underline = obj.revisionChangeType === "ADDED" ? "text-decoration:underline;" : "";
      const deptCell = i === 0
        ? `<td rowspan="${totalRows}" style="vertical-align:top;font-weight:bold;border:1px solid #000;padding:4px 5px;text-align:center;">${esc(dept.department)}</td>`
        : "";
      tbodyRows += `
        <tr style="font-size:9px;${boldItalic}${underline}">
          ${deptCell}
          <td style="border:1px solid #000;padding:4px 5px;${cellBg}"><div><strong>${esc(obj.objective)} ${obj.target} ${esc(obj.unit || "")}</strong></div></td>
          <td style="border:1px solid #000;padding:4px 5px;white-space:pre-line;${cellBg}">${esc(obj.calculationFormula || "")}</td>
          <td style="border:1px solid #000;padding:4px 5px;white-space:pre-line;${cellBg}">${esc(obj.actionPlanGuidelines || "")}</td>
          <td style="border:1px solid #000;padding:4px 5px;text-align:center;${cellBg}">${esc(obj.frequency || "")}</td>
          <td style="border:1px solid #000;padding:4px 5px;text-align:center;${cellBg}">${esc(obj.referenceDocuments || "-")}</td>
          <td style="border:1px solid #000;padding:4px 5px;text-align:center;${cellBg}">${responsibleCell(obj)}</td>
        </tr>`;
    });

    removed.forEach((obj) => {
      tbodyRows += `
        <tr style="font-size:9px;font-weight:bold;font-style:italic;color:#b91c1c;">
          <td style="border:1px solid #000;padding:4px 5px;background-color:#fee2e2;">${esc(obj.objective)} ${obj.target} ${esc(obj.unit || "")} (Deleted)</td>
          <td style="border:1px solid #000;padding:4px 5px;background-color:#fee2e2;">${esc(obj.calculationFormula || "")}</td>
          <td style="border:1px solid #000;padding:4px 5px;background-color:#fee2e2;">${esc(obj.actionPlanGuidelines || "")}</td>
          <td style="border:1px solid #000;padding:4px 5px;text-align:center;background-color:#fee2e2;">${esc(obj.frequency || "")}</td>
          <td style="border:1px solid #000;padding:4px 5px;text-align:center;background-color:#fee2e2;">${esc(obj.referenceDocuments || "-")}</td>
          <td style="border:1px solid #000;padding:4px 5px;text-align:center;background-color:#fee2e2;">${responsibleCell(obj)}</td>
        </tr>`;
    });
  }

  if (!tbodyRows) {
    tbodyRows = `<tr><td colspan="7" style="text-align:center;border:1px solid #000;padding:16px;color:#94a3b8;">ไม่มีข้อมูลสำหรับปี ${data.year} / No data for ${data.year}</td></tr>`;
  }

  const headerHtml = `
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
    <tbody>
      <tr>
        <td style="width:20%;text-align:left;padding:4px;">
          <img src="${esc(data.logoUrl)}" alt="Logo" style="height:30px;object-fit:contain;display:block;" />
        </td>
        <td style="width:60%;text-align:center;">
          <div style="font-weight:bold;font-size:14px;color:#0F1059;">วัตถุประสงค์คุณภาพ สิ่งแวดล้อม อาชีวอนามัยและความปลอดภัย ${data.year}</div>
          <div style="font-weight:bold;font-size:12px;color:#0F1059;">Quality, Environment, Occupational Health and Safety Objectives ${data.year}</div>
        </td>
        <td style="width:20%;padding:4px;font-size:9px;">
          <div><strong>แผนงานประจำปี</strong></div>
          <div>Annual Work Plan</div>
          <div><strong>${esc(data.footerPrefix)}</strong></div>
        </td>
      </tr>
    </tbody>
  </table>`;

  const objectivesHtml = `
  <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
    <thead>
      <tr style="font-size:9.5px;background-color:#f3f4f6;font-weight:bold;">
        <th style="width:15%;border:1px solid #000;padding:4px 5px;text-align:center;">หน่วยงาน<br/>Departments</th>
        <th style="width:25%;border:1px solid #000;padding:4px 5px;text-align:center;">วัตถุประสงค์และเป้าหมาย<br/>Objectives and Targets</th>
        <th style="width:12%;border:1px solid #000;padding:4px 5px;text-align:center;">สูตรการคำนวณ<br/>Calculation Formula</th>
        <th style="width:20%;border:1px solid #000;padding:4px 5px;text-align:center;">แนวทางแผนการดำเนินงาน<br/>Action Plan Guidelines</th>
        <th style="width:8%;border:1px solid #000;padding:4px 5px;text-align:center;">ความถี่ในการวัดผล<br/>Measurement Frequency</th>
        <th style="width:10%;border:1px solid #000;padding:4px 5px;text-align:center;">เอกสารอ้างอิง<br/>Reference Documents</th>
        <th style="width:10%;border:1px solid #000;padding:4px 5px;text-align:center;">ผู้รับผิดชอบ<br/>Responsible Person</th>
      </tr>
    </thead>
    <tbody>${tbodyRows}</tbody>
  </table>`;

  const signatureHtml = `
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:14px;">
    <tbody>
      <tr>
        ${data.signatures
          .map(
            (s) => `<td style="width:${100 / data.signatures.length}%;border:1px solid #000;padding:8px 6px;text-align:center;vertical-align:top;">
          <div style="font-weight:bold;">${esc(s.label)}</div>
          <div style="height:44px;margin:4px 0;">
            ${s.signaturePath ? `<img src="${esc(s.signaturePath)}" alt="${esc(s.label)}" style="max-height:42px;max-width:90%;display:block;margin:0 auto;" />` : `<span style="color:#94a3b8;">ยังไม่ได้ลงชื่อ / Unsigned</span>`}
          </div>
          <div style="font-weight:bold;">(${esc(s.name || "-")})</div>
          <div style="font-size:8px;color:#475569;margin-top:4px;">วันที่ / Date: ${esc(s.date)}</div>
        </td>`
          )
          .join("")}
      </tr>
    </tbody>
  </table>`;

  const footerHtml = `<div style="font-size:8px;text-align:right;margin-top:6px;color:#000;">${esc(data.footerPrefix)} ${esc(data.footerLabel)}</div>`;

  return `<div style="font-family:'Sarabun','Segoe UI',Arial,sans-serif;color:#000;">${headerHtml}${objectivesHtml}${signatureHtml}${footerHtml}</div>`;
}

// ─── KPI Monthly Summary Review: embeddable print-style block (matches /print/qms/kpi/monthly) ───

export interface KpiMonthlySummaryPrintRow {
  no: number;
  objective: string;
  target: string;
  frequency: string;
  team: string;
  months: Array<{ key: string; value: string; status: "achieved" | "failed" | "pending" }>;
  average: string;
}

export interface KpiMonthlySummaryPrintData {
  year: number;
  yearBE: number;
  rows: KpiMonthlySummaryPrintRow[];
  reviewerName?: string | null;
  approverName?: string | null;
}

const MONTHLY_SUMMARY_STATUS_BG: Record<string, string> = {
  achieved: "#92D050",
  failed: "#FF5050",
  pending: "#FFFF00",
};

export function buildKpiMonthlySummaryPrintHtml(data: KpiMonthlySummaryPrintData): string {
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const rowsHtml = data.rows.length
    ? data.rows
        .map(
          (row) => `
      <tr>
        <td style="border:0.5pt solid #000;padding:4px 6px;text-align:center">${row.no}</td>
        <td style="border:0.5pt solid #000;padding:4px 6px">${esc(row.objective)}</td>
        <td style="border:0.5pt solid #000;padding:4px 6px;text-align:center">${esc(row.target)}</td>
        <td style="border:0.5pt solid #000;padding:4px 6px;text-align:center">${esc(row.frequency)}</td>
        <td style="border:0.5pt solid #000;padding:4px 6px;text-align:center">${esc(row.team)}</td>
        ${row.months
          .map(
            (m) => `<td style="border:0.5pt solid #000;padding:4px 6px;text-align:center;background-color:${MONTHLY_SUMMARY_STATUS_BG[m.status]};color:${m.status === "failed" ? "#fff" : "#000"}">${m.status === "pending" ? "" : esc(m.value)}</td>`
          )
          .join("")}
        <td style="border:0.5pt solid #000;padding:4px 6px;text-align:center;font-weight:bold">${esc(row.average)}</td>
      </tr>`
        )
        .join("")
    : `<tr><td colspan="18" style="border:0.5pt solid #000;text-align:center;padding:16px;color:#94a3b8">ไม่มีข้อมูลสำหรับปีนี้ / No data for this year</td></tr>`;

  const signatureHtml = `
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-top:10px;font-size:9px;">
    <tbody>
      <tr>
        <td style="width:33.3%;border:0.5pt solid #000;padding:6px;text-align:center">
          <div style="font-weight:bold">ผู้ตรวจสอบ / Reviewed By</div>
          <div style="margin-top:8px">${esc(data.reviewerName || "-")}</div>
        </td>
        <td style="width:33.3%;border:0.5pt solid #000;padding:6px;text-align:center">
          <div style="font-weight:bold">ผู้อนุมัติ / Approved By</div>
          <div style="margin-top:8px">${esc(data.approverName || "-")}</div>
        </td>
      </tr>
    </tbody>
  </table>`;

  return `
  <div style="font-family:'Sarabun','Segoe UI',Arial,sans-serif;color:#000;">
    <div style="text-align:center;margin-bottom:8px">
      <div style="font-weight:bold;font-size:13px">สรุปผลการดำเนินงานตามวัตถุประสงค์คุณภาพ ประจำปี ${data.yearBE}</div>
      <div style="font-weight:600;font-size:11px">Summary of Key Performance Results Year ${data.year}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:8px;">
      <thead>
        <tr style="background-color:#0F1059;color:#fff;">
          <th style="border:0.5pt solid #000;padding:4px 6px">No.</th>
          <th style="border:0.5pt solid #000;padding:4px 6px">Quality Objectives and Indicators</th>
          <th style="border:0.5pt solid #000;padding:4px 6px">Target</th>
          <th style="border:0.5pt solid #000;padding:4px 6px">Frequency</th>
          <th style="border:0.5pt solid #000;padding:4px 6px">Team</th>
          ${monthLabels.map((m) => `<th style="border:0.5pt solid #000;padding:4px 6px">${m}</th>`).join("")}
          <th style="border:0.5pt solid #000;padding:4px 6px">Average</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    ${signatureHtml}
  </div>`;
}

function makeObjectivesTable(objectives: KpiObjectiveRow[]): string {
  if (objectives.length === 0) return "";
  
  // Auto-detect master KPI plan objectives
  const isMaster = objectives.some(
    (o) => o.calculationFormula || o.actionPlanGuidelines || o.objective.startsWith("[")
  );
  if (isMaster) {
    return makeMasterObjectivesTable(objectives);
  }

  const rows = objectives
    .map(
      (o, i) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"}">
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center;color:#64748b;font-size:12px">${i + 1}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a">${esc(o.objective)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;text-align:right;font-weight:600">${o.target.toLocaleString()}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b">${esc(o.unit ?? "-")}</td>
      </tr>`
    )
    .join("");
  return `
    <div style="margin-top:16px">
      <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:6px">รายการตัวชี้วัด KPI / KPI Objectives (${objectives.length} รายการ)</div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:4px;overflow:hidden">
        <thead>
          <tr style="background:#0f1059">
            <th style="padding:8px 10px;color:#fff;font-size:11px;text-align:center;width:32px">#</th>
            <th style="padding:8px 10px;color:#fff;font-size:11px;text-align:left">ตัวชี้วัด / Objective</th>
            <th style="padding:8px 10px;color:#fff;font-size:11px;text-align:right">เป้าหมาย / Target</th>
            <th style="padding:8px 10px;color:#fff;font-size:11px;text-align:left">หน่วย / Unit</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function makeMonthlyDetailsTable(details: KpiMonthlyDetailRow[]): string {
  if (details.length === 0) return "";
  const statusColor = (s: string | null) => {
    if (s === "ACHIEVED") return "#16a34a";
    if (s === "NOT_ACHIEVED") return "#dc2626";
    return "#64748b";
  };
  const statusLabel = (s: string | null) => {
    if (s === "ACHIEVED") return "บรรลุ / Achieved";
    if (s === "NOT_ACHIEVED") return "ไม่บรรลุ / Not Achieved";
    return "รอผล / Pending";
  };
  const rows = details
    .map(
      (d, i) => `
      <tr style="background:${i % 2 === 0 ? "#fff" : "#f8fafc"}">
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center;color:#64748b;font-size:12px">${i + 1}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a">${esc(d.objective)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#334155;text-align:right">${d.target.toLocaleString()}${d.unit ? ` ${esc(d.unit)}` : ""}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:600;text-align:right;color:#0f172a">${d.actualResult !== null ? `${d.actualResult.toLocaleString()}${d.unit ? ` ${esc(d.unit)}` : ""}` : "-"}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;font-weight:700;color:${statusColor(d.achievedStatus)}">${statusLabel(d.achievedStatus)}</td>
      </tr>`
    )
    .join("");
  return `
    <div style="margin-top:16px">
      <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:6px">ผลการดำเนินงาน KPI / KPI Results (${details.length} รายการ)</div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:4px;overflow:hidden">
        <thead>
          <tr style="background:#0f1059">
            <th style="padding:8px 10px;color:#fff;font-size:11px;text-align:center;width:32px">#</th>
            <th style="padding:8px 10px;color:#fff;font-size:11px;text-align:left">ตัวชี้วัด / Objective</th>
            <th style="padding:8px 10px;color:#fff;font-size:11px;text-align:right">เป้าหมาย / Target</th>
            <th style="padding:8px 10px;color:#fff;font-size:11px;text-align:right">ผลจริง / Actual</th>
            <th style="padding:8px 10px;color:#fff;font-size:11px;text-align:left">สถานะ / Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

export interface DarEmailItem {
  itemNo: number;
  docNumber: string;
  docName: string;
  revision: string;
}

export interface DarEmailAttachment {
  fileName: string;
  spWebUrl: string;
  spItemId?: string | null;
}

export async function sendReviewerAssignedEmail(opts: {
  reviewer: MailRecipient;
  requesterName: string;
  requesterDepartment: string | null;
  darNo: string;
  darId: string;
  requestDate: string;
  objective: string;
  docType: string;
  reason: string;
  items: DarEmailItem[];
  attachments: DarEmailAttachment[];
  actionToken: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/approve?token=${encodeURIComponent(opts.actionToken)}`);

  let emailAttachments: Array<{ name: string; contentType: string; contentBytes: string }> | undefined = undefined;
  if (opts.attachments?.length) {
    const resolved = await Promise.all(
      opts.attachments.map(async (att) => {
        if (!att.spItemId) return null;
        return fetchSharePointAttachment(att.spItemId, att.fileName);
      })
    );
    emailAttachments = resolved.filter((r): r is NonNullable<typeof r> => r !== null);
  }

  await sendMail({
    to: [opts.reviewer],
    senderAccessToken: opts.senderAccessToken,
    subject: `[DAR] Review Required - ${opts.darNo}`,
    attachments: emailAttachments,
    bodyHtml: makeBilingualMail({
      titleTh: `คำขอเอกสาร DAR ${opts.darNo} รอตรวจสอบ`,
      titleEn: `DAR ${opts.darNo} Pending Review`,
      facts: [
        { labelTh: "ผู้ตรวจสอบ", labelEn: "Reviewer", value: opts.reviewer.name },
        { labelTh: "ผู้ร้องขอ", labelEn: "Requester", value: `${opts.requesterName}${opts.requesterDepartment ? ` (${opts.requesterDepartment})` : ""}` },
        { labelTh: "วันที่ร้องขอ", labelEn: "Request Date", value: opts.requestDate },
        { labelTh: "วัตถุประสงค์", labelEn: "Objective", value: opts.objective },
        { labelTh: "ประเภทเอกสาร", labelEn: "Document Type", value: opts.docType },
        { labelTh: "จำนวนรายการ", labelEn: "Item Count", value: String(opts.items.length) },
      ],
      detailTh: `เหตุผล: ${opts.reason}`,
      detailEn: `Reason: ${opts.reason}`,
      actionLabelTh: "ตรวจสอบ DAR",
      actionLabelEn: "Review DAR",
      actionUrl: url,
    }),
  });
}

export async function sendMrApprovalRequestEmail(opts: {
  mr: MailRecipient;
  reviewerName: string;
  requesterName: string;
  requesterDepartment: string | null;
  darNo: string;
  darId: string;
  requestDate: string;
  objective: string;
  docType: string;
  reason: string;
  items: DarEmailItem[];
  attachments: DarEmailAttachment[];
  actionToken: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/approve?token=${encodeURIComponent(opts.actionToken)}`);

  let emailAttachments: Array<{ name: string; contentType: string; contentBytes: string }> | undefined = undefined;
  if (opts.attachments?.length) {
    const resolved = await Promise.all(
      opts.attachments.map(async (att) => {
        if (!att.spItemId) return null;
        return fetchSharePointAttachment(att.spItemId, att.fileName);
      })
    );
    emailAttachments = resolved.filter((r): r is NonNullable<typeof r> => r !== null);
  }

  await sendMail({
    to: [opts.mr],
    senderAccessToken: opts.senderAccessToken,
    subject: `[DAR] MR Approval Required - ${opts.darNo}`,
    attachments: emailAttachments,
    bodyHtml: makeBilingualMail({
      titleTh: `คำขอ DAR ${opts.darNo} รออนุมัติ MR`,
      titleEn: `DAR ${opts.darNo} Pending MR Approval`,
      facts: [
        { labelTh: "ผู้ตรวจสอบแล้ว", labelEn: "Reviewed By", value: opts.reviewerName },
        { labelTh: "ผู้ร้องขอ", labelEn: "Requester", value: `${opts.requesterName}${opts.requesterDepartment ? ` (${opts.requesterDepartment})` : ""}` },
        { labelTh: "วัตถุประสงค์", labelEn: "Objective", value: opts.objective },
        { labelTh: "จำนวนรายการ", labelEn: "Item Count", value: String(opts.items.length) },
      ],
      actionLabelTh: "อนุมัติ DAR",
      actionLabelEn: "Approve DAR",
      actionUrl: url,
    }),
  });
}

export async function sendQmsApprovalRequestEmail(opts: {
  qms: MailRecipient;
  requesterName: string;
  darNo: string;
  darId: string;
  actionToken: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/approve?token=${encodeURIComponent(opts.actionToken)}`);
  await sendMail({
    to: [opts.qms],
    senderAccessToken: opts.senderAccessToken,
    subject: `[DAR] QMS Approval Required - ${opts.darNo}`,
    bodyHtml: makeBilingualMail({
      titleTh: `คำขอ DAR ${opts.darNo} รออนุมัติ QMS`,
      titleEn: `DAR ${opts.darNo} Pending QMS Approval`,
      facts: [
        { labelTh: "ผู้ร้องขอ", labelEn: "Requester", value: opts.requesterName },
        { labelTh: "สถานะ", labelEn: "Status", value: "MR อนุมัติแล้ว รอ QMS อนุมัติขั้นสุดท้าย / MR approved, awaiting final QMS approval" },
      ],
      actionLabelTh: "ดำเนินการ DAR",
      actionLabelEn: "Process DAR",
      actionUrl: url,
    }),
  });
}

export async function sendApprovalNotificationEmail(opts: {
  to: MailRecipient;
  darNo: string;
  darId: string;
  approverName: string;
  stepLabel: string;
  nextStepLabel: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/dar/${opts.darId}`);
  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[DAR] ${opts.darNo} - ${opts.stepLabel} Approved`,
    bodyHtml: makeBilingualMail({
      titleTh: `คำขอ DAR ${opts.darNo} อนุมัติแล้ว`,
      titleEn: `DAR ${opts.darNo} Approved`,
      facts: [
        { labelTh: "ผู้อนุมัติ", labelEn: "Approved By", value: opts.approverName },
        { labelTh: "ขั้นตอนที่อนุมัติ", labelEn: "Approved Step", value: opts.stepLabel },
        { labelTh: "ขั้นตอนถัดไป", labelEn: "Next Step", value: opts.nextStepLabel },
      ],
      actionLabelTh: "ดูคำขอ DAR",
      actionLabelEn: "View DAR",
      actionUrl: url,
    }),
  });
}

export async function sendRejectionEmail(opts: {
  to: MailRecipient;
  darNo: string;
  darId: string;
  rejectorName: string;
  stepLabel: string;
  reason: string;
  requesterName: string;
  objective: string;
  itemCount: number;
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/dar/${opts.darId}`);
  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[DAR] ${opts.darNo} ถูกปฏิเสธโดย ${opts.stepLabel} / Rejected by ${opts.stepLabel}`,
    bodyHtml: makeBilingualMail({
      titleTh: `คำขอ DAR ${opts.darNo} ถูกปฏิเสธ`,
      titleEn: `DAR ${opts.darNo} Rejected`,
      facts: [
        { labelTh: "เลขที่คำขอ", labelEn: "DAR No.", value: opts.darNo },
        { labelTh: "ผู้ร้องขอ", labelEn: "Requester", value: opts.requesterName },
        { labelTh: "วัตถุประสงค์", labelEn: "Objective", value: opts.objective },
        { labelTh: "จำนวนรายการ", labelEn: "Item Count", value: String(opts.itemCount) },
        { labelTh: "ปฏิเสธโดย", labelEn: "Rejected By", value: `${opts.rejectorName} (${opts.stepLabel})` },
        { labelTh: "เหตุผล", labelEn: "Reason", value: opts.reason },
      ],
      actionLabelTh: "ดูคำขอ DAR",
      actionLabelEn: "View DAR",
      actionUrl: url,
    }),
  });
}

export async function sendKpiObjectiveReviewerAssignedEmail(opts: {
  reviewer: MailRecipient;
  requesterName: string;
  departmentName: string;
  kpiId: string;
  objectiveId?: string;
  objectives: KpiObjectiveRow[];
  year: number;
  actionToken: string;
  senderAccessToken?: string | null;
  printHtml?: string;
}) {
  const url = getAppUrl(`/approve?token=${encodeURIComponent(opts.actionToken)}`);
  await sendMail({
    to: [opts.reviewer],
    senderAccessToken: opts.senderAccessToken,
    subject: `[KPI] Review Required - ${opts.departmentName} / ${opts.year}`,
    bodyHtml: makeBilingualMail({
      titleTh: `KPI ${opts.departmentName} ปี ${opts.year} รอตรวจสอบ`,
      titleEn: `KPI ${opts.departmentName} ${opts.year} Pending Review`,
      facts: [
        { labelTh: "ผู้ตรวจสอบ", labelEn: "Reviewer", value: opts.reviewer.name },
        { labelTh: "ผู้มอบหมาย", labelEn: "Assigned By", value: opts.requesterName },
        { labelTh: "หน่วยงาน", labelEn: "Department", value: opts.departmentName },
        { labelTh: "ปี", labelEn: "Year", value: String(opts.year) },
        { labelTh: "จำนวนตัวชี้วัด", labelEn: "Objective Count", value: String(opts.objectives.length) },
      ],
      extraHtml: opts.printHtml ?? makeObjectivesTable(opts.objectives),
      actionLabelTh: "ตรวจสอบ KPI",
      actionLabelEn: "Review KPI",
      actionUrl: url,
    }),
  });
}

export async function sendKpiObjectiveApproverRequestEmail(opts: {
  approver: MailRecipient;
  reviewerName: string;
  departmentName: string;
  objectives?: KpiObjectiveRow[];
  year: number;
  actionToken: string;
  senderAccessToken?: string | null;
  printHtml?: string;
}) {
  const url = getAppUrl(`/approve?token=${encodeURIComponent(opts.actionToken)}`);
  await sendMail({
    to: [opts.approver],
    senderAccessToken: opts.senderAccessToken,
    subject: `[KPI] Approval Required - ${opts.departmentName} / ${opts.year}`,
    bodyHtml: makeBilingualMail({
      titleTh: `KPI ${opts.departmentName} ปี ${opts.year} รออนุมัติ`,
      titleEn: `KPI ${opts.departmentName} ${opts.year} Pending Approval`,
      facts: [
        { labelTh: "ผู้ตรวจสอบแล้ว", labelEn: "Reviewed By", value: opts.reviewerName },
        { labelTh: "หน่วยงาน", labelEn: "Department", value: opts.departmentName },
        { labelTh: "ปี", labelEn: "Year", value: String(opts.year) },
        ...(opts.objectives ? [{ labelTh: "จำนวนตัวชี้วัด", labelEn: "Objective Count", value: String(opts.objectives.length) }] : []),
      ],
      extraHtml: opts.printHtml ?? (opts.objectives ? makeObjectivesTable(opts.objectives) : undefined),
      actionLabelTh: "อนุมัติ KPI",
      actionLabelEn: "Approve KPI",
      actionUrl: url,
    }),
  });
}

export async function sendKpiApprovalRequestEmail(opts: {
  approver: MailRecipient;
  departmentName: string;
  year: number;
  reviewerName?: string;
  objectives?: KpiObjectiveRow[];
  actionToken: string;
  senderAccessToken?: string | null;
}) {
  const url = getAppUrl(`/approve?token=${encodeURIComponent(opts.actionToken)}`);
  await sendMail({
    to: [opts.approver],
    senderAccessToken: opts.senderAccessToken,
    subject: `[KPI] Approval Required - ${opts.departmentName} / ${opts.year}`,
    bodyHtml: makeBilingualMail({
      titleTh: `KPI ${opts.departmentName} ปี ${opts.year} รออนุมัติ`,
      titleEn: `KPI ${opts.departmentName} ${opts.year} Pending Approval`,
      facts: [
        { labelTh: "ผู้ตรวจสอบแล้ว", labelEn: "Reviewed By", value: opts.reviewerName ?? "-" },
        { labelTh: "หน่วยงาน", labelEn: "Department", value: opts.departmentName },
        { labelTh: "ปี", labelEn: "Year", value: String(opts.year) },
        ...(opts.objectives ? [{ labelTh: "จำนวนตัวชี้วัด", labelEn: "Objective Count", value: String(opts.objectives.length) }] : []),
      ],
      extraHtml: opts.objectives ? makeObjectivesTable(opts.objectives) : undefined,
      actionLabelTh: "อนุมัติ KPI",
      actionLabelEn: "Approve KPI",
      actionUrl: url,
    }),
  });
}

export async function sendKpiResultEmail(opts: {
  to: MailRecipient;
  departmentName: string;
  year: number;
  status: "APPROVED" | "REJECTED";
  actorName: string;
  kpiId?: string;
  objectives?: KpiObjectiveRow[];
  senderAccessToken?: string | null;
  actionUrl?: string;
  printHtml?: string;
}) {
  const isSystemMaster = opts.departmentName === "SYSTEM_MASTER" || opts.departmentName.includes("FM-MR-01");
  const url = opts.actionUrl ?? (isSystemMaster
    ? getAppUrl(`/print/qms/kpi/fm-mr-01?year=${opts.year}&mode=review`)
    : getAppUrl(`/qms/kpi`));
  const statusTh = opts.status === "APPROVED" ? "อนุมัติแล้ว" : "ถูกปฏิเสธ";
  const displayDept = isSystemMaster ? "FM-MR-01 (วัตถุประสงค์คุณภาพประจำปี)" : opts.departmentName;

  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[KPI] ${opts.status} - ${displayDept} / ${opts.year}`,
    bodyHtml: makeBilingualMail({
      titleTh: `ผลการอนุมัติ ${displayDept} ปี ${opts.year}`,
      titleEn: `${displayDept} ${opts.year} Approval Result`,
      facts: [
        { labelTh: "สถานะ", labelEn: "Status", value: `${statusTh} / ${opts.status}` },
        { labelTh: "ดำเนินการโดย", labelEn: "Action By", value: opts.actorName },
        { labelTh: "หน่วยงาน/เอกสาร", labelEn: "Department/Doc", value: displayDept },
        { labelTh: "ปี", labelEn: "Year", value: String(opts.year) },
        ...(opts.objectives ? [{ labelTh: "จำนวนตัวชี้วัด", labelEn: "Objective Count", value: String(opts.objectives.length) }] : []),
      ],
      extraHtml: opts.printHtml ?? (opts.objectives ? makeObjectivesTable(opts.objectives) : undefined),
      actionLabelTh: isSystemMaster ? "เปิดดูแผนงาน" : "เปิด KPI",
      actionLabelEn: isSystemMaster ? "Open Plan" : "Open KPI",
      actionUrl: url,
    }),
  });
}

export async function sendKpiRecallEmail(opts: {
  to: MailRecipient;
  departmentName: string;
  year: number;
  preparerName: string;
  kpiId: string;
  senderAccessToken?: string | null;
  printHtml?: string;
}) {
  const url = getAppUrl(`/qms/kpi`);
  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[KPI] Recalled - ${opts.departmentName} / ${opts.year}`,
    bodyHtml: makeBilingualMail({
      titleTh: `KPI ${opts.departmentName} ปี ${opts.year} ถูกเรียกคืนแล้ว`,
      titleEn: `KPI ${opts.departmentName} ${opts.year} Recalled`,
      facts: [
        { labelTh: "เรียกคืนโดย", labelEn: "Recalled By", value: opts.preparerName },
        { labelTh: "หน่วยงาน", labelEn: "Department", value: opts.departmentName },
        { labelTh: "ปี", labelEn: "Year", value: String(opts.year) },
        { labelTh: "หมายเหตุ", labelEn: "Note", value: "KPI ถูกเรียกคืนกลับเป็นแบบร่าง งานที่มอบหมายถูกยกเลิก / KPI has been recalled to Draft. Your assignment has been cancelled." },
      ],
      extraHtml: opts.printHtml,
      actionLabelTh: "เปิด KPI",
      actionLabelEn: "Open KPI",
      actionUrl: url,
    }),
  });
}

export async function sendKpiRejectedPreparerEmail(opts: {
  to: MailRecipient;
  departmentName: string;
  year: number;
  actorName: string;
  kpiId: string;
  objectives?: KpiObjectiveRow[];
  senderAccessToken?: string | null;
  printHtml?: string;
}) {
  const url = getAppUrl(`/qms/kpi`);
  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[KPI] Rejected - ${opts.departmentName} / ${opts.year}`,
    bodyHtml: makeBilingualMail({
      titleTh: `KPI ${opts.departmentName} ปี ${opts.year} ถูกปฏิเสธ`,
      titleEn: `KPI ${opts.departmentName} ${opts.year} Rejected`,
      facts: [
        { labelTh: "ปฏิเสธโดย", labelEn: "Rejected By", value: opts.actorName },
        { labelTh: "หน่วยงาน", labelEn: "Department", value: opts.departmentName },
        { labelTh: "ปี", labelEn: "Year", value: String(opts.year) },
        { labelTh: "หมายเหตุ", labelEn: "Note", value: "กรุณาแก้ไขและส่งตรวจสอบใหม่ / Please revise and resubmit." },
      ],
      extraHtml: opts.printHtml ?? (opts.objectives ? makeObjectivesTable(opts.objectives) : undefined),
      actionLabelTh: "แก้ไข KPI",
      actionLabelEn: "Edit KPI",
      actionUrl: url,
    }),
  });
}

export async function sendKpiMonthlyApprovalRequestEmail(opts: {
  approver: MailRecipient;
  departmentName: string;
  month: string;
  year: number;
  preparerName?: string;
  details?: KpiMonthlyDetailRow[];
  actionToken: string;
  senderAccessToken?: string | null;
  spItemId?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
}) {
  const url = getAppUrl(`/approve?token=${encodeURIComponent(opts.actionToken)}`);

  let emailAttachments: Array<{ name: string; contentType: string; contentBytes: string }> | undefined = undefined;
  if (opts.spItemId && opts.fileName) {
    const resolved = await fetchSharePointAttachment(opts.spItemId, opts.fileName, opts.mimeType);
    if (resolved) {
      emailAttachments = [resolved];
    }
  }

  await sendMail({
    to: [opts.approver],
    senderAccessToken: opts.senderAccessToken,
    subject: `[KPI Monthly] Approval Required - ${opts.departmentName} / ${opts.month} ${opts.year}`,
    attachments: emailAttachments,
    bodyHtml: makeBilingualMail({
      titleTh: `KPI รายเดือน ${opts.departmentName} รออนุมัติ`,
      titleEn: `Monthly KPI ${opts.departmentName} Pending Approval`,
      facts: [
        { labelTh: "รอบเดือน", labelEn: "Period", value: `${opts.month} ${opts.year}` },
        { labelTh: "ผู้จัดเตรียม", labelEn: "Prepared By", value: opts.preparerName ?? "-" },
        { labelTh: "หน่วยงาน", labelEn: "Department", value: opts.departmentName },
        ...(opts.details ? [{ labelTh: "จำนวนตัวชี้วัด", labelEn: "KPI Count", value: String(opts.details.length) }] : []),
      ],
      extraHtml: opts.details ? makeMonthlyDetailsTable(opts.details) : undefined,
      actionLabelTh: "อนุมัติ KPI รายเดือน",
      actionLabelEn: "Approve Monthly KPI",
      actionUrl: url,
    }),
  });
}

export async function sendAnnouncementEmail(opts: {
  groupEmails: string[];
  title: string;
  content: string;
  sourceSystem: string;
  senderAccessToken?: string | null;
  announcementId: string;
  spItemId?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
}): Promise<void> {
  if (!opts.groupEmails.length) return;
  const url = getAppUrl(`/announcements/${opts.announcementId}`);
  const to = opts.groupEmails.map((e) => ({ name: e, email: e }));

  let attachments: Array<{ name: string; contentType: string; contentBytes: string }> | undefined = undefined;

  if (opts.spItemId) {
    const file = await fetchSharePointAttachment(opts.spItemId, opts.fileName, opts.mimeType);
    if (file) {
      attachments = [file];
    }
  }

  await sendMail({
    to,
    senderAccessToken: opts.senderAccessToken,
    subject: `[${esc(opts.sourceSystem)}] ประกาศใหม่: ${esc(opts.title)}`,
    bodyHtml: makeBilingualMail({
      titleTh: `ประกาศใหม่ / New Announcement`,
      titleEn: `New Announcement`,
      facts: [
        { labelTh: "หัวข้อ", labelEn: "Title", value: opts.title },
        { labelTh: "ระบบ", labelEn: "System", value: opts.sourceSystem },
      ],
      detailTh: opts.content,
      actionLabelTh: "ดูประกาศ",
      actionLabelEn: "View Announcement",
      actionUrl: url,
    }),
    attachments,
  });
}

export async function sendKpiMonthlyResultEmail(opts: {
  to: MailRecipient;
  departmentName: string;
  month: string;
  year: number;
  status: "APPROVED" | "REJECTED";
  actorName: string;
  reason?: string;
  details?: KpiMonthlyDetailRow[];
  reportId?: string;
  senderAccessToken?: string | null;
  spItemId?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
}) {
  const url = getAppUrl(`/qms/kpi/monthly`);
  const statusTh = opts.status === "APPROVED" ? "อนุมัติแล้ว" : "ถูกปฏิเสธ";

  let emailAttachments: Array<{ name: string; contentType: string; contentBytes: string }> | undefined = undefined;
  if (opts.spItemId && opts.fileName) {
    const resolved = await fetchSharePointAttachment(opts.spItemId, opts.fileName, opts.mimeType);
    if (resolved) {
      emailAttachments = [resolved];
    }
  }

  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[KPI Monthly] ${opts.status} - ${opts.departmentName} / ${opts.month} ${opts.year}`,
    attachments: emailAttachments,
    bodyHtml: makeBilingualMail({
      titleTh: `ผลการอนุมัติ KPI รายเดือน ${opts.departmentName}`,
      titleEn: `Monthly KPI ${opts.departmentName} Approval Result`,
      facts: [
        { labelTh: "รอบเดือน", labelEn: "Period", value: `${opts.month} ${opts.year}` },
        { labelTh: "สถานะ", labelEn: "Status", value: `${statusTh} / ${opts.status}` },
        { labelTh: "ดำเนินการโดย", labelEn: "Action By", value: opts.actorName },
        ...(opts.reason ? [{ labelTh: "เหตุผล", labelEn: "Reason", value: opts.reason }] : []),
        ...(opts.details ? [{ labelTh: "จำนวนตัวชี้วัด", labelEn: "KPI Count", value: String(opts.details.length) }] : []),
      ],
      extraHtml: opts.details ? makeMonthlyDetailsTable(opts.details) : undefined,
      actionLabelTh: "เปิด KPI รายเดือน",
      actionLabelEn: "Open Monthly KPI",
      actionUrl: url,
    }),
  });
}

export async function sendKpiMonthlyReminderEmail(opts: {
  to: MailRecipient[];
  departmentName: string;
  month: string;
  year: number;
  isLastDay: boolean;
  senderAccessToken?: string | null;
}): Promise<void> {
  if (!opts.to.length) return;
  const url = getAppUrl(`/qms/kpi/monthly`);
  const urgency = opts.isLastDay ? "วันนี้เป็นวันสุดท้าย / Today is the last day" : "กรุณาส่งภายในสิ้นเดือน / Please submit by end of month";
  await sendMail({
    to: opts.to,
    senderAccessToken: opts.senderAccessToken,
    subject: `[KPI Monthly] แจ้งเตือนการส่งรายงาน ${opts.departmentName} / ${opts.month} ${opts.year}`,
    bodyHtml: makeBilingualMail({
      titleTh: `แจ้งเตือน: KPI รายเดือน ${opts.departmentName}`,
      titleEn: `Reminder: Monthly KPI ${opts.departmentName}`,
      facts: [
        { labelTh: "รอบเดือน", labelEn: "Period", value: `${opts.month} ${opts.year}` },
        { labelTh: "หน่วยงาน", labelEn: "Department", value: opts.departmentName },
        { labelTh: "สถานะ", labelEn: "Status", value: urgency },
      ],
      actionLabelTh: "ส่ง KPI รายเดือน",
      actionLabelEn: "Submit Monthly KPI",
      actionUrl: url,
    }),
  });
}

export async function fetchSharePointAttachment(
  spItemId: string,
  fileName?: string | null,
  mimeType?: string | null
): Promise<{ name: string; contentType: string; contentBytes: string } | null> {
  try {
    const info = await getFileInfo(spItemId);
    if (info.downloadUrl) {
      const res = await fetch(info.downloadUrl);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        return {
          name: fileName || info.name || "attachment",
          contentType: mimeType || info.mimeType || "application/octet-stream",
          contentBytes: Buffer.from(buf).toString("base64"),
        };
      }
    }
  } catch (err) {
    logger.warn("[fetchSharePointAttachment] Failed to download attachment from SharePoint", { error: err instanceof Error ? err.message : String(err) });
  }
  return null;
}

export async function sendKpiAnnouncementEmail(opts: {
  to: MailRecipient;
  departmentName: string;
  year: number;
  actorName: string;
  senderAccessToken?: string | null;
  kpiId?: string;
  attachment?: { name: string; contentType: string; contentBytes: string };
  printHtml?: string;
}) {
  const url = getAppUrl(`/qms/kpi`);
  const attachments = opts.attachment ? [opts.attachment] : undefined;

  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[KPI] ประกาศใช้ ${opts.departmentName} ${opts.year} / KPI Announced`,
    bodyHtml: makeBilingualMail({
      titleTh: `ประกาศใช้ KPI ${opts.departmentName} ปี ${opts.year}`,
      titleEn: `KPI ${opts.departmentName} ${opts.year} Announced`,
      facts: [
        { labelTh: "สถานะ", labelEn: "Status", value: "ประกาศใช้ / ANNOUNCED" },
        { labelTh: "ดำเนินการโดย", labelEn: "Action By", value: opts.actorName },
        { labelTh: "หน่วยงาน", labelEn: "Department", value: opts.departmentName },
        { labelTh: "ปี", labelEn: "Year", value: String(opts.year) },
      ],
      extraHtml: opts.printHtml,
      actionLabelTh: "เปิด KPI",
      actionLabelEn: "Open KPI",
      actionUrl: url,
    }),
    attachments,
  });
}
