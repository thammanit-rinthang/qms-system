import { NotificationRepository } from "@/repositories/notificationRepository";
import { logger } from "@/lib/logger";
import { carMailHtml, getAppUrl, fmtDate } from "./carEmailService";

const repo = new NotificationRepository();

export type CarNotifEvent =
  | "ISSUED"
  | "RESPONDED"
  | "MR_REVIEW"
  | "PLAN_APPROVED"
  | "PLAN_REJECTED"
  | "QMS_NOTIFY"
  | "VERIFY_1_PASS"
  | "VERIFY_2_SCHEDULED"
  | "VERIFY_FAILED_DEPT"
  | "RE_CAR_DEPT"
  | "CLOSED"
  | "RE_CAR"
  | "REMINDER";

/** helper — true if snapshot unknown (assume can receive email) or m365Linked */
export function canReceiveEmail(m365Linked: boolean | null | undefined): boolean {
  return m365Linked !== false; // null/undefined → assume yes
}

// Bilingual titles
const TITLES: Record<CarNotifEvent, string> = {
  ISSUED:             "CAR ออกแล้ว / CAR Issued",
  RESPONDED:          "แผนกตอบกลับ CAR แล้ว / Department Responded",
  MR_REVIEW:          "รออนุมัติแผนแก้ไข (MR) / MR Review Required",
  PLAN_APPROVED:      "อนุมัติแผนแก้ไขแล้ว / Corrective Action Plan Approved",
  PLAN_REJECTED:      "ปฏิเสธแผนแก้ไข — แก้ไขใหม่ / Plan Rejected — Revise & Resubmit",
  QMS_NOTIFY:         "แผนแก้ไขได้รับการอนุมัติ — เตรียมตรวจติดตาม / Plan Approved — Prepare for Verification",
  VERIFY_1_PASS:      "ผ่านการตรวจติดตาม — รอ MR เซ็นปิด / Verification Passed — Sign to Close",
  VERIFY_2_SCHEDULED: "กำหนดการตรวจติดตามครั้งที่ 2 / Verification 2 Scheduled",
  VERIFY_FAILED_DEPT: "ผลการตรวจสอบ: ไม่ผ่าน — กรุณาแก้ไขให้เรียบร้อย / Verification Failed — Please Complete Corrective Actions",
  RE_CAR_DEPT:        "ไม่ผ่านการตรวจสอบรอบที่ 2 — ออก Re-CAR ใหม่ / Failed Round 2 — Re-CAR Issued",
  CLOSED:             "ปิด CAR แล้ว / CAR Closed",
  RE_CAR:             "ออก Re-CAR ใหม่ / Re-CAR Issued",
  REMINDER:           "เตือน: CAR ยังไม่ได้ตอบกลับ / Reminder: Response Pending",
};

// Bilingual intro sentences per event
const INTRO: Record<CarNotifEvent, { th: string; en: string }> = {
  ISSUED:             { th: "มีการออก CAR ใหม่สำหรับหน่วยงานของท่าน กรุณาดำเนินการวิเคราะห์และตอบกลับภายใน 7 วัน", en: "A new Corrective Action Request has been issued to your department. Please submit your response within 7 days." },
  RESPONDED:          { th: "หน่วยงานที่เกี่ยวข้องได้ส่งแผนการดำเนินการแก้ไขเรียบร้อยแล้ว", en: "The responsible department has submitted a corrective action plan." },
  MR_REVIEW:          { th: "CAR ได้รับแผนการดำเนินการแก้ไขแล้ว กรุณาตรวจสอบและให้ความเห็นชอบ", en: "A corrective action plan has been submitted. Please review and approve or reject." },
  PLAN_APPROVED:      { th: "ผู้แทนฝ่ายบริหาร (MR) อนุมัติแผนการดำเนินการแก้ไขแล้ว กรุณาดำเนินการตามแผน", en: "The Management Representative has approved the corrective action plan. Please proceed accordingly." },
  PLAN_REJECTED:      { th: "ผู้แทนฝ่ายบริหาร (MR) ปฏิเสธแผนการดำเนินการแก้ไข กรุณาแก้ไขและส่งใหม่ภายใน 7 วัน", en: "The Management Representative has rejected the corrective action plan. Please revise and resubmit within 7 days." },
  QMS_NOTIFY:         { th: "ผู้แทนฝ่ายบริหาร (MR) อนุมัติแผนแก้ไขแล้ว กรุณาเตรียมการตรวจติดตาม (Verification) ตามวันที่แผนกำหนด", en: "The MR has approved the corrective action plan. Please prepare for verification follow-up on the scheduled date." },
  VERIFY_1_PASS:      { th: "CAR ผ่านการตรวจติดตามแล้ว กรุณาลงนามเพื่อปิด CAR ในระบบ", en: "The CAR has passed verification. Please sign to officially close this CAR." },
  VERIFY_2_SCHEDULED: { th: "CAR ไม่ผ่านการตรวจติดตามครั้งที่ 1 กำหนดการตรวจติดตามครั้งที่ 2 แล้ว", en: "The CAR did not pass Verification 1. Verification 2 has been scheduled." },
  VERIFY_FAILED_DEPT: { th: "ผลการตรวจสอบพบว่าการดำเนินการแก้ไขยังไม่ครบถ้วน กรุณาดำเนินการแก้ไขให้เรียบร้อยและเตรียมรับการตรวจสอบรอบที่ 2", en: "Verification found that corrective actions are incomplete. Please complete all actions and prepare for the Round 2 verification." },
  RE_CAR_DEPT:        { th: "CAR ไม่ผ่านการตรวจสอบรอบที่ 2 QMS จะออก Re-CAR ใหม่ กรุณาเตรียมดำเนินการแก้ไขอีกครั้ง", en: "This CAR failed Round 2 verification. A Re-CAR will be issued. Please prepare to resubmit corrective actions." },
  CLOSED:             { th: "CAR ปิดเรียบร้อยแล้ว การดำเนินการแก้ไขได้รับการยืนยันครบถ้วน", en: "The CAR has been officially closed. All corrective actions have been confirmed complete." },
  RE_CAR:             { th: "มีการออก Re-CAR ใหม่อ้างอิงจาก CAR เดิม กรุณาดำเนินการแก้ไขใหม่ภายใน 7 วัน", en: "A new Re-CAR has been issued referencing the original CAR. Please submit a new response within 7 days." },
  REMINDER:           { th: "CAR ยังคงรอการตอบกลับจากหน่วยงานของท่าน กรุณาดำเนินการโดยเร็วที่สุด", en: "The CAR is still awaiting a response from your department. Please take action as soon as possible." },
};

const STATUS: Record<CarNotifEvent, { th: string; en: string }> = {
  ISSUED:             { th: "ออก CAR แล้ว",                             en: "CAR Issued" },
  REMINDER:           { th: "แจ้งเตือน — รอการตอบกลับ",                 en: "Reminder — Response Pending" },
  RESPONDED:          { th: "ได้รับการตอบกลับแล้ว",                     en: "CAR Response Received" },
  MR_REVIEW:          { th: "รออนุมัติแผนแก้ไข (MR)",                   en: "MR Review Required" },
  PLAN_APPROVED:      { th: "อนุมัติแผนแก้ไขแล้ว",                     en: "Corrective Action Plan Approved" },
  PLAN_REJECTED:      { th: "ปฏิเสธแผนแก้ไข",                          en: "Plan Rejected — Revise & Resubmit" },
  QMS_NOTIFY:         { th: "เตรียมตรวจติดตาม",                         en: "Prepare for Verification" },
  VERIFY_1_PASS:      { th: "ผ่านการตรวจติดตาม — รอ MR เซ็นปิด",       en: "Verification Passed — Sign to Close" },
  VERIFY_2_SCHEDULED: { th: "กำหนดตรวจติดตามครั้งที่ 2",                en: "Verification 2 Scheduled" },
  VERIFY_FAILED_DEPT: { th: "ไม่ผ่าน — แก้ไขให้เรียบร้อย",              en: "Failed — Complete Corrective Actions" },
  RE_CAR_DEPT:        { th: "ไม่ผ่านรอบ 2 — รอ Re-CAR",                 en: "Failed Round 2 — Re-CAR Pending" },
  CLOSED:             { th: "ปิด CAR แล้ว",                             en: "CAR Closed" },
  RE_CAR:             { th: "ออก Re-CAR แล้ว",                          en: "Re-CAR Issued" },
};

function buildCarHtmlBody(opts: {
  event: CarNotifEvent;
  carNo: string;
  carId: string;
  targetDepartmentName?: string;
  defectDetail?: string;
  isoStandards?: string[];
  comment?: string;
  nextDueDate?: string;
  mrReviewToken?: string | null;
  plannedCompletionDate?: string | null;
}): string {
  const { event, carNo, carId } = opts;
  const { th: statusBadgeTh, en: statusBadgeEn } = STATUS[event];
  const intro = INTRO[event];

  // MR_REVIEW — match email exactly: MR greeting, approve/reject buttons, planned date
  if (event === "MR_REVIEW") {
    const dueTh = opts.plannedCompletionDate ? fmtDate(opts.plannedCompletionDate) : undefined;
    const actionUrl = opts.mrReviewToken
      ? getAppUrl(`/approve/car/${carId}/mr-response?token=${opts.mrReviewToken}`)
      : getAppUrl(`/car/${carId}`);
    return carMailHtml({
      carNo,
      statusBadgeTh,
      statusBadgeEn,
      greeting: { th: "เรียน ผู้แทนฝ่ายบริหาร (Management Representative),", en: "Dear Management Representative (MR)," },
      intro: {
        th: `CAR ${carNo} ได้รับแผนการดำเนินการแก้ไขจากหน่วยงานที่รับผิดชอบแล้ว กรุณาตรวจสอบและให้ความเห็นชอบหรือปฏิเสธแผนดังกล่าว`,
        en: `CAR ${carNo} has received a corrective action plan. Please review and approve or reject the plan.`,
      },
      carBlock: dueTh && dueTh !== "-" ? { responseDueTh: `วันที่แผนกำหนดเสร็จ: ${dueTh}` } : undefined,
      closingTh: "กรุณาเข้าสู่ระบบเพื่อตรวจสอบและอนุมัติหรือปฏิเสธแผนการดำเนินการแก้ไข",
      closingEn: "Please log in to the system to review and approve or reject the corrective action plan.",
      actionLabel: "ตรวจสอบและอนุมัติ / Review & Approve",
      actionUrl,
    });
  }

  // VERIFY_1_PASS — MR sign to close
  if (event === "VERIFY_1_PASS") {
    const signUrl = opts.mrReviewToken
      ? getAppUrl(`/approve/car/${carId}/mr?token=${opts.mrReviewToken}`)
      : getAppUrl(`/car/${carId}`);
    return carMailHtml({
      carNo,
      statusBadgeTh,
      statusBadgeEn,
      greeting: { th: "เรียน ผู้แทนฝ่ายบริหาร (Management Representative),", en: "Dear Management Representative (MR)," },
      intro: {
        th: `CAR ${carNo} ผ่านการตรวจติดตามแล้ว กรุณาเซ็นลายมือชื่อเพื่อปิด CAR`,
        en: `CAR ${carNo} has passed verification. Please sign to officially close this CAR.`,
      },
      closingTh: "กรุณาคลิกปุ่มด้านล่างเพื่อเซ็นลายมือชื่อและปิด CAR ในระบบ",
      closingEn: "Please click the button below to sign and close this CAR in the system.",
      actionLabel: "เซ็นปิด CAR / Sign to Close",
      actionUrl: signUrl,
    });
  }

  // All other events — generic
  const actionUrl = getAppUrl(`/car/${carId}`);
  const dueTh = opts.nextDueDate ? fmtDate(opts.nextDueDate) : undefined;
  const commentTh = opts.comment ? `ความคิดเห็น / Comment: ${opts.comment}` : undefined;

  return carMailHtml({
    carNo,
    statusBadgeTh,
    statusBadgeEn,
    greeting: { th: "เรียน ผู้เกี่ยวข้อง,", en: "Dear All Concerned," },
    intro,
    carBlock: {
      targetDeptTh: opts.targetDepartmentName,
      isoStandards: opts.isoStandards,
      defectTh: opts.defectDetail,
      responseDueTh: commentTh ?? (dueTh && dueTh !== "-" ? dueTh : undefined),
    },
    closingTh: "หากมีข้อสงสัยประการใด กรุณาติดต่อเจ้าหน้าที่ระบบ QMS",
    closingEn: "If you have any questions, please contact the QMS team.",
    actionLabel: "ดู CAR / View CAR",
    actionUrl,
  });
}

function buildBody(opts: {
  event: CarNotifEvent;
  carNo: string;
  targetDepartmentName?: string;
  defectDetail?: string;
  isoStandards?: string[];
  comment?: string;
  nextDueDate?: string;
}): string {
  const { th, en } = INTRO[opts.event];
  const lines: string[] = [
    `${th}`,
    `${en}`,
  ];

  if (opts.targetDepartmentName) lines.push(`หน่วยงาน / Dept: ${opts.targetDepartmentName}`);
  if (opts.isoStandards?.length)  lines.push(`ISO Standards: ${opts.isoStandards.join(", ")}`);
  if (opts.defectDetail)          lines.push(`ประเด็น / Issue: ${opts.defectDetail}`);
  if (opts.comment)               lines.push(`ความคิดเห็น / Comment: ${opts.comment}`);
  if (opts.nextDueDate)           lines.push(`กำหนดการ / Scheduled: ${opts.nextDueDate}`);

  return lines.join("\n");
}

export async function notifyCarUser(opts: {
  recipientAuthUserId: string;
  event: CarNotifEvent;
  carNo: string;
  carId: string;
  body?: string;
  targetDepartmentName?: string;
  defectDetail?: string;
  isoStandards?: string[];
  comment?: string;
  nextDueDate?: string;
  mrReviewToken?: string | null;
  plannedCompletionDate?: string | null;
}): Promise<void> {
  const body = opts.body ?? buildBody({
    event: opts.event,
    carNo: opts.carNo,
    targetDepartmentName: opts.targetDepartmentName,
    defectDetail: opts.defectDetail,
    isoStandards: opts.isoStandards,
    comment: opts.comment,
    nextDueDate: opts.nextDueDate,
  });

  const htmlBody = buildCarHtmlBody({
    event: opts.event,
    carNo: opts.carNo,
    carId: opts.carId,
    targetDepartmentName: opts.targetDepartmentName,
    defectDetail: opts.defectDetail,
    isoStandards: opts.isoStandards,
    comment: opts.comment,
    nextDueDate: opts.nextDueDate,
    mrReviewToken: opts.mrReviewToken,
    plannedCompletionDate: opts.plannedCompletionDate,
  });

  await repo.create({
    recipientId: opts.recipientAuthUserId,
    recipientAuthUserId: opts.recipientAuthUserId,
    title: `${TITLES[opts.event]} — ${opts.carNo}`,
    body,
    htmlBody,
    module: "CAR",
    resourceId: opts.carId,
    resourceType: "CAR",
  }).catch((err) => {
    logger.error("[carNotification] failed to create notification", {
      event: opts.event,
      carNo: opts.carNo,
      recipientAuthUserId: opts.recipientAuthUserId,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}
