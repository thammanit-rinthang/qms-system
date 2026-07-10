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

export interface MailRecipient {
  name: string;
  email: string;
}

interface SendMailOptions {
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

async function sendMail(opts: SendMailOptions): Promise<void> {
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
        ${opts.detailTh || opts.detailEn ? `<div style="margin-top:14px;padding:12px;background:#f8fafc"><div style="font-size:12px;font-weight:700;color:#0f172a">รายละเอียด / Details</div><div style="font-size:13px;color:#334155;margin-top:6px;white-space:pre-wrap">${esc(opts.detailTh ?? "")}${opts.detailEn ? `\n${esc(opts.detailEn)}` : ""}</div></div>` : ""}
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
}

export interface KpiMonthlyDetailRow {
  objective: string;
  target: number;
  unit: string | null;
  actualResult: number | null;
  achievedStatus: string | null;
}

function makeObjectivesTable(objectives: KpiObjectiveRow[]): string {
  if (objectives.length === 0) return "";
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
  await sendMail({
    to: [opts.reviewer],
    senderAccessToken: opts.senderAccessToken,
    subject: `[DAR] Review Required - ${opts.darNo}`,
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
  await sendMail({
    to: [opts.mr],
    senderAccessToken: opts.senderAccessToken,
    subject: `[DAR] MR Approval Required - ${opts.darNo}`,
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
      extraHtml: makeObjectivesTable(opts.objectives),
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
      extraHtml: opts.objectives ? makeObjectivesTable(opts.objectives) : undefined,
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
}) {
  const url = getAppUrl(`/qms/kpi`);
  const statusTh = opts.status === "APPROVED" ? "อนุมัติแล้ว" : "ถูกปฏิเสธ";
  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[KPI] ${opts.status} - ${opts.departmentName} / ${opts.year}`,
    bodyHtml: makeBilingualMail({
      titleTh: `ผลการอนุมัติ KPI ${opts.departmentName} ปี ${opts.year}`,
      titleEn: `KPI ${opts.departmentName} ${opts.year} Approval Result`,
      facts: [
        { labelTh: "สถานะ", labelEn: "Status", value: `${statusTh} / ${opts.status}` },
        { labelTh: "ดำเนินการโดย", labelEn: "Action By", value: opts.actorName },
        { labelTh: "หน่วยงาน", labelEn: "Department", value: opts.departmentName },
        { labelTh: "ปี", labelEn: "Year", value: String(opts.year) },
        ...(opts.objectives ? [{ labelTh: "จำนวนตัวชี้วัด", labelEn: "Objective Count", value: String(opts.objectives.length) }] : []),
      ],
      extraHtml: opts.objectives ? makeObjectivesTable(opts.objectives) : undefined,
      actionLabelTh: "เปิด KPI",
      actionLabelEn: "Open KPI",
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
      extraHtml: opts.objectives ? makeObjectivesTable(opts.objectives) : undefined,
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
}) {
  const url = getAppUrl(`/approve?token=${encodeURIComponent(opts.actionToken)}`);
  await sendMail({
    to: [opts.approver],
    senderAccessToken: opts.senderAccessToken,
    subject: `[KPI Monthly] Approval Required - ${opts.departmentName} / ${opts.month} ${opts.year}`,
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
}): Promise<void> {
  if (!opts.groupEmails.length) return;
  const url = getAppUrl(`/announcements/${opts.announcementId}`);
  const to = opts.groupEmails.map((e) => ({ name: e, email: e }));
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
}) {
  const url = getAppUrl(`/qms/kpi/monthly`);
  const statusTh = opts.status === "APPROVED" ? "อนุมัติแล้ว" : "ถูกปฏิเสธ";
  await sendMail({
    to: [opts.to],
    senderAccessToken: opts.senderAccessToken,
    subject: `[KPI Monthly] ${opts.status} - ${opts.departmentName} / ${opts.month} ${opts.year}`,
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
