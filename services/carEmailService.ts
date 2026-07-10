import { logger } from "@/lib/logger";

export function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function getAppUrl(path: string): string {
  const base = (process.env.NEXTAUTH_URL ?? "").replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function sendMail(opts: {
  to: string;
  cc?: string[];
  subject: string;
  bodyHtml: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  if (!opts.senderAccessToken) {
    logger.warn("[carEmail] No sender token - mail skipped", { subject: opts.subject, to: opts.to });
    return;
  }

  const base = process.env.AUTH_CENTER_URL?.replace(/\/$/, "");
  if (!base) {
    logger.warn("[carEmail] AUTH_CENTER_URL not set - mail skipped", { subject: opts.subject, to: opts.to });
    return;
  }

  const body: Record<string, unknown> = {
    toEmail: opts.to,
    subject: opts.subject,
    htmlBody: opts.bodyHtml,
    ...(opts.cc?.length ? { cc: opts.cc.map((email) => ({ email })) } : {}),
  };

  const res = await fetch(`${base}/api/auth/mail/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.senderAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Auth Center sendMail ${res.status}: ${text}`);
  }
}

// ─── Source type labels ────────────────────────────────────────────────────────
const SOURCE_TH: Record<string, string> = {
  I: "การตรวจติดตามคุณภาพภายใน (Internal Audit)",
  C: "ข้อร้องเรียนจากลูกค้า (Customer Complaint)",
  N: "ผลิตภัณฑ์ไม่เป็นไปตามข้อกำหนด (Nonconforming Product)",
  O: "อื่นๆ (Other)",
};
const SOURCE_EN: Record<string, string> = {
  I: "Internal Quality Audit",
  C: "Customer Complaint",
  N: "Nonconforming Product",
  O: "Other",
};

export function fmtDate(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "long", year: "numeric" });
}

// ─── Main bilingual template ───────────────────────────────────────────────────
export function carMailHtml(opts: {
  carNo: string;
  statusBadgeTh: string;
  statusBadgeEn: string;
  greeting: { th: string; en: string };
  intro: { th: string; en: string };
  carBlock?: {
    targetDeptTh?: string;
    sourceTypeTh?: string;
    sourceTypeEn?: string;
    isoStandards?: string[];
    defectTh?: string;
    defectEn?: string;
    nonConformanceTh?: string;
    issuerTh?: string;
    responseDueTh?: string;
  };
  closingTh: string;
  closingEn: string;
  actionLabel?: string;
  actionUrl?: string;
  extraButtons?: string;
}): string {
  const { carNo, statusBadgeTh, statusBadgeEn, greeting, intro, carBlock, closingTh, closingEn, actionLabel, actionUrl, extraButtons } = opts;

  const isoRow = carBlock?.isoStandards?.length
    ? `<tr><td style="padding:5px 0;color:#64748b;font-size:12px;white-space:nowrap">ISO Standards:</td><td style="padding:5px 0 5px 12px;font-size:12px;color:#1e293b">${carBlock.isoStandards.map(esc).join(", ")}</td></tr>`
    : "";
  const deptRow = carBlock?.targetDeptTh
    ? `<tr><td style="padding:5px 0;color:#64748b;font-size:12px;white-space:nowrap">หน่วยงาน / Dept:</td><td style="padding:5px 0 5px 12px;font-size:12px;color:#1e293b">${esc(carBlock.targetDeptTh)}</td></tr>`
    : "";
  const sourceRow = carBlock?.sourceTypeTh
    ? `<tr><td style="padding:5px 0;color:#64748b;font-size:12px;white-space:nowrap">แหล่งที่มา / Source:</td><td style="padding:5px 0 5px 12px;font-size:12px;color:#1e293b">${esc(carBlock.sourceTypeTh)}</td></tr>`
    : "";
  const issuerRow = carBlock?.issuerTh
    ? `<tr><td style="padding:5px 0;color:#64748b;font-size:12px;white-space:nowrap">ผู้ออก CAR / Issuer:</td><td style="padding:5px 0 5px 12px;font-size:12px;color:#1e293b">${esc(carBlock.issuerTh)}</td></tr>`
    : "";
  const dueRow = carBlock?.responseDueTh
    ? `<tr><td style="padding:5px 0;color:#64748b;font-size:12px;white-space:nowrap">กำหนดตอบกลับ / Due:</td><td style="padding:5px 0 5px 12px;font-size:12px;color:#ef4444;font-weight:700">${esc(carBlock.responseDueTh)}</td></tr>`
    : "";

  const carDetailBlock = carBlock ? `
    <div style="margin:16px 0;border-radius:8px;border:1px solid #e2e8f0;overflow:hidden">
      <div style="background:#f8fafc;padding:10px 14px;border-bottom:1px solid #e2e8f0">
        <span style="font-weight:800;font-size:14px;color:#0f1059;font-family:monospace">${esc(carNo)}</span>
        <span style="margin-left:8px;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:#fee2e2;color:#dc2626">${esc(statusBadgeTh)}</span>
        <span style="margin-left:4px;padding:2px 8px;border-radius:4px;font-size:11px;color:#64748b;background:#f1f5f9">${esc(statusBadgeEn)}</span>
      </div>
      <div style="padding:12px 14px">
        <table style="border-collapse:collapse;width:100%">
          ${deptRow}${sourceRow}${isoRow}${issuerRow}${dueRow}
        </table>
        ${carBlock.defectTh ? `<div style="margin-top:10px;border-top:1px solid #f1f5f9;padding-top:10px">
          <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:4px;text-transform:uppercase">ประเด็น / Issue:</div>
          <div style="font-size:12px;color:#1e293b;line-height:1.6">${esc(carBlock.defectTh)}</div>
        </div>` : ""}
        ${carBlock.nonConformanceTh ? `<div style="margin-top:8px">
          <div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:4px;text-transform:uppercase">ข้อกำหนดที่เกี่ยวข้อง / Requirement:</div>
          <div style="font-size:12px;color:#1e293b;line-height:1.6">${esc(carBlock.nonConformanceTh)}</div>
        </div>` : ""}
      </div>
    </div>` : "";

  const actionBtn = extraButtons
    ?? (actionLabel && actionUrl
      ? `<div style="margin-top:20px">
          <a href="${esc(actionUrl)}" style="display:inline-block;background:#0f1059;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:700">
            ${esc(actionLabel)}
          </a>
        </div>`
      : "");

  return `
<div style="width:100%;margin:0;padding:20px 0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif">
  <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">

    <!-- Header -->
    <div style="background:#0f1059;padding:20px 24px">
      <div style="font-size:11px;font-weight:700;letter-spacing:1px;color:rgba(255,255,255,.6);text-transform:uppercase;margin-bottom:4px">Corrective Action Request</div>
      <div style="font-size:22px;font-weight:800;color:#fff">${esc(statusBadgeTh)}</div>
      <div style="font-size:14px;color:rgba(255,255,255,.8);margin-top:2px">${esc(statusBadgeEn)}</div>
      <div style="margin-top:10px;display:inline-block;background:rgba(255,255,255,.15);padding:4px 12px;border-radius:4px;font-size:13px;font-weight:700;color:#fff;font-family:monospace">${esc(carNo)}</div>
    </div>

    <!-- Body -->
    <div style="padding:22px 24px">
      <p style="margin:0 0 4px;font-size:13px;color:#334155">${esc(greeting.th)}</p>
      <p style="margin:0 0 14px;font-size:13px;color:#64748b;font-style:italic">${esc(greeting.en)}</p>

      <p style="margin:0 0 4px;font-size:13px;color:#334155;line-height:1.6">${esc(intro.th)}</p>
      <p style="margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.6;font-style:italic">${esc(intro.en)}</p>

      ${carDetailBlock}

      <p style="margin:16px 0 4px;font-size:13px;color:#334155;line-height:1.6">${esc(closingTh)}</p>
      <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;font-style:italic">${esc(closingEn)}</p>

      ${actionBtn}
    </div>

    <!-- Footer -->
    <div style="padding:12px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">
      This is an automated notification from the QMS System. Please do not reply to this email.
    </div>
  </div>
</div>`;
}

// ─── Issued ────────────────────────────────────────────────────────────────────
export async function sendCarIssuedEmail(opts: {
  carId: string;
  carNo: string;
  targetEmail: string;
  cc?: string[];
  senderAccessToken?: string | null;
  targetDepartmentName?: string;
  sourceType?: string;
  isoStandards?: string[];
  defectDetail?: string;
  nonConformanceRef?: string;
  issuerName?: string;
  issuerPosition?: string;
  responseDueAt?: string;
}): Promise<void> {
  const url = getAppUrl(`/car/${opts.carId}`);
  const deptName = opts.targetDepartmentName ?? "-";
  const sourceTh = opts.sourceType ? SOURCE_TH[opts.sourceType] ?? opts.sourceType : undefined;
  const sourceEn = opts.sourceType ? SOURCE_EN[opts.sourceType] ?? opts.sourceType : undefined;
  const issuerTh = [opts.issuerName, opts.issuerPosition].filter(Boolean).join(" — ") || undefined;
  const dueTh = fmtDate(opts.responseDueAt);

  const html = carMailHtml({
    carNo: opts.carNo,
    statusBadgeTh: "ออก CAR แล้ว",
    statusBadgeEn: "CAR Issued",
    greeting: {
      th: `เรียน ${deptName} และผู้ที่เกี่ยวข้อง,`,
      en: `Dear ${deptName} Department and All Concerned,`,
    },
    intro: {
      th: "ตามที่บริษัทได้ดำเนินการตรวจสอบและพบประเด็นที่ต้องดำเนินการแก้ไข จึงได้ดำเนินการออกใบแจ้งดำเนินการแก้ไข (Corrective Action Request : CAR) ดังนี้",
      en: "Following an inspection, a nonconformity has been identified and the following Corrective Action Request (CAR) has been issued:",
    },
    carBlock: {
      targetDeptTh: deptName,
      sourceTypeTh: sourceTh,
      sourceTypeEn: sourceEn,
      isoStandards: opts.isoStandards,
      defectTh: opts.defectDetail,
      nonConformanceTh: opts.nonConformanceRef,
      issuerTh,
      responseDueTh: dueTh !== "-" ? dueTh : undefined,
    },
    closingTh: `ขอให้หน่วยงานที่เกี่ยวข้องดำเนินการวิเคราะห์หาสาเหตุ (Root Cause Analysis) พร้อมกำหนดมาตรการแก้ไขและป้องกันการเกิดซ้ำ รวมถึงจัดส่งเอกสารตอบกลับ CAR ภายใน 7 วัน (ภายในวันที่ ${dueTh}) เพื่อให้การดำเนินงานเป็นไปอย่างมีประสิทธิภาพและสอดคล้องตามข้อกำหนดของระบบบริหาร`,
    closingEn: `The related department is requested to conduct a Root Cause Analysis, establish corrective and preventive actions to prevent recurrence, and submit the CAR response within 7 days (by ${dueTh}), in order to ensure effective operations and compliance with management system requirements.`,
    actionLabel: "ดูและตอบกลับ CAR / View & Respond",
    actionUrl: url,
  });

  await sendMail({
    to: opts.targetEmail,
    cc: opts.cc,
    subject: `[CAR] ออก CAR แล้ว / Issued – ${opts.carNo}`,
    bodyHtml: html,
    senderAccessToken: opts.senderAccessToken,
  });
}

// ─── Reminder ─────────────────────────────────────────────────────────────────
export async function sendCarReminderEmail(opts: {
  carId: string;
  carNo: string;
  targetEmail: string;
  cc?: string[];
  senderAccessToken?: string | null;
  targetDepartmentName?: string;
  isoStandards?: string[];
  defectDetail?: string;
  nonConformanceRef?: string;
  responseDueAt?: string;
}): Promise<void> {
  const url = getAppUrl(`/car/${opts.carId}`);
  const deptName = opts.targetDepartmentName ?? "-";
  const dueTh = fmtDate(opts.responseDueAt);

  const html = carMailHtml({
    carNo: opts.carNo,
    statusBadgeTh: "แจ้งเตือน — รอการตอบกลับ",
    statusBadgeEn: "Reminder — Response Pending",
    greeting: {
      th: `เรียน ${deptName} และผู้ที่เกี่ยวข้อง,`,
      en: `Dear ${deptName} Department and All Concerned,`,
    },
    intro: {
      th: `CAR ${opts.carNo} ยังคงรอการตอบกลับจากหน่วยงานของท่าน กรุณาดำเนินการโดยเร็วที่สุด`,
      en: `CAR ${opts.carNo} is still awaiting a response from your department. Please take action as soon as possible.`,
    },
    carBlock: {
      targetDeptTh: deptName,
      isoStandards: opts.isoStandards,
      defectTh: opts.defectDetail,
      nonConformanceTh: opts.nonConformanceRef,
      responseDueTh: dueTh !== "-" ? dueTh : undefined,
    },
    closingTh: "ขอให้หน่วยงานที่เกี่ยวข้องดำเนินการตอบกลับ CAR โดยเร็วที่สุด เพื่อให้การดำเนินงานเป็นไปอย่างมีประสิทธิภาพ",
    closingEn: "Please respond to this CAR at your earliest convenience to ensure effective operations.",
    actionLabel: "ดูและตอบกลับ CAR / View & Respond",
    actionUrl: url,
  });

  await sendMail({
    to: opts.targetEmail,
    cc: opts.cc,
    subject: `[CAR Reminder] รอการตอบกลับ / Pending – ${opts.carNo}`,
    bodyHtml: html,
    senderAccessToken: opts.senderAccessToken,
  });
}

// ─── Overdue (7-day) ──────────────────────────────────────────────────────────
export async function sendCarOverdueEmail(opts: {
  carId: string;
  carNo: string;
  targetEmail: string;
  cc?: string[];
  senderAccessToken?: string | null;
  targetDepartmentName?: string;
  isoStandards?: string[];
  defectDetail?: string;
  responseDueAt?: string;
}): Promise<void> {
  const deptName = opts.targetDepartmentName ?? "-";
  const dueTh = fmtDate(opts.responseDueAt);

  const html = carMailHtml({
    carNo: opts.carNo,
    statusBadgeTh: "เกินกำหนด — ยังไม่ได้รับการตอบกลับ",
    statusBadgeEn: "Overdue — No Response Received",
    greeting: {
      th: `เรียน ${deptName} และผู้ที่เกี่ยวข้อง,`,
      en: `Dear ${deptName} Department and All Concerned,`,
    },
    intro: {
      th: `CAR ${opts.carNo} เกินกำหนดตอบกลับแล้ว${dueTh !== "-" ? ` (${dueTh})` : ""} กรุณาดำเนินการตอบกลับโดยด่วน`,
      en: `CAR ${opts.carNo} is overdue${dueTh !== "-" ? ` (due ${dueTh})` : ""}. Please respond immediately.`,
    },
    carBlock: {
      targetDeptTh: deptName,
      isoStandards: opts.isoStandards,
      defectTh: opts.defectDetail,
      responseDueTh: dueTh !== "-" ? dueTh : undefined,
    },
    closingTh: "กรุณาดำเนินการตอบกลับ CAR โดยด่วน เพื่อหลีกเลี่ยงผลกระทบต่อระบบบริหารคุณภาพ",
    closingEn: "Please respond to this CAR urgently to avoid impact on the quality management system.",
  });

  await sendMail({
    to: opts.targetEmail,
    cc: opts.cc,
    subject: `[CAR Overdue] เกินกำหนดตอบกลับ / Overdue – ${opts.carNo}`,
    bodyHtml: html,
    senderAccessToken: opts.senderAccessToken,
  });
}

// ─── Responded (notify QMS) ────────────────────────────────────────────────────
export async function sendCarRespondedEmail(opts: {
  carId: string;
  carNo: string;
  recipients: string[];
  senderAccessToken?: string | null;
  targetDepartmentName?: string;
  defectDetail?: string;
  isoStandards?: string[];
}): Promise<void> {
  const url = getAppUrl(`/qms/car/${opts.carId}`);
  const deptName = opts.targetDepartmentName ?? "-";

  const html = carMailHtml({
    carNo: opts.carNo,
    statusBadgeTh: "ได้รับการตอบกลับแล้ว",
    statusBadgeEn: "CAR Response Received",
    greeting: {
      th: "เรียน ผู้รับผิดชอบระบบ QMS และผู้ที่เกี่ยวข้อง,",
      en: "Dear QMS Representative and All Concerned,",
    },
    intro: {
      th: `CAR ${opts.carNo} ได้รับการตอบกลับจาก ${deptName} แล้ว กรุณาเข้าตรวจสอบแผนการดำเนินการแก้ไข`,
      en: `CAR ${opts.carNo} has received a corrective action response from ${deptName}. Please review the corrective action plan.`,
    },
    carBlock: {
      targetDeptTh: deptName,
      isoStandards: opts.isoStandards,
      defectTh: opts.defectDetail,
    },
    closingTh: "กรุณาตรวจสอบและอนุมัติแผนการดำเนินการแก้ไขเพื่อดำเนินการขั้นตอนถัดไป",
    closingEn: "Please review and approve the corrective action plan to proceed to the next step.",
    actionLabel: "ดูรายละเอียด / View Details",
    actionUrl: url,
  });

  for (const to of opts.recipients) {
    await sendMail({
      to,
      subject: `[CAR] ได้รับการตอบกลับแล้ว / Response Received – ${opts.carNo}`,
      bodyHtml: html,
      senderAccessToken: opts.senderAccessToken,
    });
  }
}

// ─── MR review request ─────────────────────────────────────────────────────────
export async function sendCarMrReviewRequestEmail(opts: {
  carId: string;
  carNo: string;
  mrEmail: string;
  token?: string | null;
  plannedCompletionDate: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/qms/car/${opts.carId}`);
  const dueTh   = fmtDate(opts.plannedCompletionDate);

  const html = carMailHtml({
    carNo: opts.carNo,
    statusBadgeTh: "รออนุมัติแผนแก้ไข (MR)",
    statusBadgeEn: "MR Review Required",
    greeting: {
      th: "เรียน ผู้แทนฝ่ายบริหาร (Management Representative),",
      en: "Dear Management Representative (MR),",
    },
    intro: {
      th: `CAR ${opts.carNo} ได้รับแผนการดำเนินการแก้ไขจากหน่วยงานที่รับผิดชอบแล้ว กรุณาเข้าระบบเพื่อตรวจสอบและให้ความเห็นชอบหรือปฏิเสธแผนดังกล่าว`,
      en: `CAR ${opts.carNo} has received a corrective action plan. Please log in to the system to review and approve or reject the plan.`,
    },
    carBlock: {
      responseDueTh: dueTh !== "-" ? `วันที่แผนกำหนดเสร็จ: ${dueTh}` : undefined,
    },
    closingTh: "กรุณาเข้าสู่ระบบเพื่อตรวจสอบและอนุมัติหรือปฏิเสธแผนการดำเนินการแก้ไข",
    closingEn: "Please log in to the system to review and approve or reject the corrective action plan.",
    actionLabel: "à¸”à¸¹à¸£à¸²à¸¢à¸¥à¸°à¹€à¸­à¸µà¸¢à¸” / View Details",
    actionUrl: url,
  });

  await sendMail({
    to: opts.mrEmail,
    subject: `[CAR] รออนุมัติแผนแก้ไข / MR Review Required – ${opts.carNo}`,
    bodyHtml: html,
    senderAccessToken: opts.senderAccessToken,
  });
}

// ─── Plan approved ─────────────────────────────────────────────────────────────
export async function sendCarPlanApprovedEmail(opts: {
  carId: string;
  carNo: string;
  recipients: string[];
  cc?: string[];
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/car/${opts.carId}`);

  const html = carMailHtml({
    carNo: opts.carNo,
    statusBadgeTh: "อนุมัติแผนแก้ไขแล้ว",
    statusBadgeEn: "Corrective Action Plan Approved",
    greeting: {
      th: "เรียน หน่วยงานที่เกี่ยวข้อง,",
      en: "Dear Concerned Department,",
    },
    intro: {
      th: `แผนการดำเนินการแก้ไขของ CAR ${opts.carNo} ได้รับการอนุมัติจากผู้แทนฝ่ายบริหาร (MR) แล้ว`,
      en: `The corrective action plan for CAR ${opts.carNo} has been approved by the Management Representative (MR).`,
    },
    closingTh: "กรุณาดำเนินการตามแผนที่ได้รับการอนุมัติ และเตรียมพร้อมสำหรับการติดตามตรวจสอบในขั้นตอนถัดไป",
    closingEn: "Please proceed according to the approved plan and be prepared for the upcoming verification.",
    actionLabel: "ดู CAR / View CAR",
    actionUrl: url,
  });

  for (const to of opts.recipients) {
    await sendMail({
      to,
      cc: opts.cc,
      subject: `[CAR] อนุมัติแผนแก้ไขแล้ว / Plan Approved – ${opts.carNo}`,
      bodyHtml: html,
      senderAccessToken: opts.senderAccessToken,
    });
  }
}

// ─── Plan rejected ─────────────────────────────────────────────────────────────
export async function sendCarPlanRejectedEmail(opts: {
  carId: string;
  carNo: string;
  targetEmail: string;
  comment?: string;
  cc?: string[];
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/car/${opts.carId}`);
  const commentLine = opts.comment
    ? `ความคิดเห็น MR: ${opts.comment}`
    : undefined;

  const html = carMailHtml({
    carNo: opts.carNo,
    statusBadgeTh: "ปฏิเสธแผนแก้ไข — กรุณาแก้ไขและส่งใหม่",
    statusBadgeEn: "Plan Rejected — Please Revise and Resubmit",
    greeting: {
      th: "เรียน หน่วยงานที่เกี่ยวข้อง,",
      en: "Dear Concerned Department,",
    },
    intro: {
      th: `แผนการดำเนินการแก้ไขของ CAR ${opts.carNo} ถูกปฏิเสธโดยผู้แทนฝ่ายบริหาร (MR)${commentLine ? ` — ${commentLine}` : ""}`,
      en: `The corrective action plan for CAR ${opts.carNo} was rejected by the Management Representative (MR)${opts.comment ? ` — Comment: ${opts.comment}` : ""}.`,
    },
    closingTh: "กรุณาแก้ไขแผนการดำเนินการแก้ไขและส่งกลับภายใน 7 วัน",
    closingEn: "Please revise the corrective action plan and resubmit within 7 days.",
    actionLabel: "แก้ไขแผน / Revise Plan",
    actionUrl: url,
  });

  await sendMail({
    to: opts.targetEmail,
    cc: opts.cc,
    subject: `[CAR] ปฏิเสธแผนแก้ไข / Plan Rejected – ${opts.carNo}`,
    bodyHtml: html,
    senderAccessToken: opts.senderAccessToken,
  });
}

// ─── Verify pass (MR sign to close) ───────────────────────────────────────────
export async function sendCarVerifyPassEmail(opts: {
  carId: string;
  carNo: string;
  mrEmail: string;
  token: string;
  senderAccessToken?: string | null;
}): Promise<void> {
  const signUrl = getAppUrl(`/approve/car/${opts.carId}/mr?token=${opts.token}`);

  const html = carMailHtml({
    carNo: opts.carNo,
    statusBadgeTh: "ผ่านการตรวจติดตามแล้ว — รอ MR เซ็นปิด CAR",
    statusBadgeEn: "Verification Passed — MR Signature Required to Close",
    greeting: {
      th: "เรียน ผู้แทนฝ่ายบริหาร (Management Representative),",
      en: "Dear Management Representative (MR),",
    },
    intro: {
      th: `CAR ${opts.carNo} ผ่านการตรวจติดตามแล้ว กรุณาเซ็นลายมือชื่อเพื่อปิด CAR`,
      en: `CAR ${opts.carNo} has passed verification. Please sign to officially close this CAR.`,
    },
    closingTh: "กรุณาคลิกปุ่มด้านล่างเพื่อเซ็นลายมือชื่อและปิด CAR ในระบบ",
    closingEn: "Please click the button below to sign and close this CAR in the system.",
    actionLabel: "เซ็นปิด CAR / Sign to Close",
    actionUrl: signUrl,
  });

  await sendMail({
    to: opts.mrEmail,
    subject: `[CAR] รอ MR เซ็นปิด / Sign to Close – ${opts.carNo}`,
    bodyHtml: html,
    senderAccessToken: opts.senderAccessToken,
  });
}

// ─── Verify 2 notification ─────────────────────────────────────────────────────
export async function sendCarVerify2NotifyEmail(opts: {
  carId: string;
  carNo: string;
  targetEmail: string;
  nextDueDate: string;
  cc?: string[];
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/car/${opts.carId}`);
  const dueTh = fmtDate(opts.nextDueDate);

  const html = carMailHtml({
    carNo: opts.carNo,
    statusBadgeTh: "ไม่ผ่านการตรวจติดตามครั้งที่ 1 — กำหนดตรวจติดตามครั้งที่ 2",
    statusBadgeEn: "Verification 1 Failed — Verification 2 Scheduled",
    greeting: {
      th: "เรียน หน่วยงานที่เกี่ยวข้อง,",
      en: "Dear Concerned Department,",
    },
    intro: {
      th: `CAR ${opts.carNo} ไม่ผ่านการตรวจติดตามครั้งที่ 1 กำหนดการตรวจติดตามครั้งที่ 2 ในวันที่ ${dueTh}`,
      en: `CAR ${opts.carNo} did not pass Verification 1. Verification 2 is scheduled for ${dueTh}.`,
    },
    carBlock: {
      responseDueTh: `กำหนดตรวจติดตามครั้งที่ 2: ${dueTh}`,
    },
    closingTh: "กรุณาดำเนินการแก้ไขปัญหาให้ครบถ้วนก่อนวันนัดหมายการตรวจติดตามครั้งที่ 2",
    closingEn: "Please ensure all corrective actions are completed before the scheduled Verification 2 date.",
    actionLabel: "ดู CAR / View CAR",
    actionUrl: url,
  });

  await sendMail({
    to: opts.targetEmail,
    cc: opts.cc,
    subject: `[CAR] กำหนดตรวจติดตามครั้งที่ 2 / Verification 2 Scheduled – ${opts.carNo}`,
    bodyHtml: html,
    senderAccessToken: opts.senderAccessToken,
  });
}

// ─── Re-CAR ────────────────────────────────────────────────────────────────────
export async function sendCarReCarEmail(opts: {
  carId: string;
  carNo: string;
  targetEmail: string;
  originalCarNo: string;
  cc?: string[];
  senderAccessToken?: string | null;
}): Promise<void> {
  const url = getAppUrl(`/car/${opts.carId}`);

  const html = carMailHtml({
    carNo: opts.carNo,
    statusBadgeTh: "ออก Re-CAR แล้ว",
    statusBadgeEn: "Re-CAR Issued",
    greeting: {
      th: "เรียน หน่วยงานที่เกี่ยวข้อง,",
      en: "Dear Concerned Department,",
    },
    intro: {
      th: `ออก Re-CAR ${opts.carNo} อ้างอิงจาก CAR ${opts.originalCarNo} เนื่องจากการดำเนินการแก้ไขไม่เป็นไปตามข้อกำหนด`,
      en: `Re-CAR ${opts.carNo} has been issued referencing CAR ${opts.originalCarNo} as the corrective actions were deemed insufficient.`,
    },
    closingTh: "กรุณาดำเนินการวิเคราะห์หาสาเหตุใหม่และส่งแผนการดำเนินการแก้ไขภายใน 7 วัน",
    closingEn: "Please conduct a new Root Cause Analysis and submit a corrective action plan within 7 days.",
    actionLabel: "ดู Re-CAR / View Re-CAR",
    actionUrl: url,
  });

  await sendMail({
    to: opts.targetEmail,
    cc: opts.cc,
    subject: `[Re-CAR] ออก Re-CAR แล้ว / Issued – ${opts.carNo} (ref: ${opts.originalCarNo})`,
    bodyHtml: html,
    senderAccessToken: opts.senderAccessToken,
  });
}
