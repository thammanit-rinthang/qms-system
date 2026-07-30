import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { NotFoundError } from "@/lib/errors";
import ExcelJS from "exceljs";
import { AuditSessionPlanRepository } from "@/repositories/audit/auditSessionPlanRepository";
import { AuditAppointmentRepository } from "@/repositories/audit/auditAppointmentRepository";
import { AuditPlanRepository } from "@/repositories/audit/auditPlanRepository";
import { UserPreferenceRepository } from "@/repositories/userPreferenceRepository";
import { QmsConfigService } from "@/services/qmsConfigService";
import { getAuthCenterProfileMap } from "@/lib/auth-center-profile-map";

const sessionRepo = new AuditSessionPlanRepository();
const apptRepo = new AuditAppointmentRepository();
const auditPlanRepo = new AuditPlanRepository();
const userPrefRepo = new UserPreferenceRepository();
const qmsConfigService = new QmsConfigService();

// Format date into Thai Buddhist Era / English format (e.g. 21 เมษายน 2569 / 21-Apr-2026)
function formatBilingualDate(dateStr: string | Date | null | undefined): { th: string; en: string } {
  if (!dateStr) return { th: "-", en: "-" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { th: "-", en: "-" };

  const monthsTh = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const date = d.getDate();
  const monthTh = monthsTh[d.getMonth()];
  const monthEn = monthsEn[d.getMonth()];
  const yearTh = d.getFullYear() + 543;
  const yearEn = d.getFullYear();

  return {
    th: `${date} ${monthTh} ${yearTh}`,
    en: `${date}-${monthEn}-${yearEn}`
  };
}

// Format time range (e.g. 09:00 น. - 12:00 น. / 09:00 AM - 12:00 PM)
function formatBilingualTime(start: string, end: string): { th: string; en: string } {
  const cleanStart = (start || "").trim();
  const cleanEnd = (end || "").trim();
  if (!cleanStart && !cleanEnd) return { th: "-", en: "-" };

  const to12Hr = (timeStr: string) => {
    const parts = timeStr.split(":");
    if (parts.length < 2) return timeStr;
    const hrs = parseInt(parts[0]);
    const mins = parts[1];
    const ampm = hrs >= 12 ? "PM" : "AM";
    const hrs12 = hrs % 12 || 12;
    return `${String(hrs12).padStart(2, "0")}:${mins} ${ampm}`;
  };

  return {
    th: `${cleanStart} น. - ${cleanEnd} น.`,
    en: `${to12Hr(cleanStart)} - ${to12Hr(cleanEnd)}`
  };
}

// Helper to translate department names to bilingual style
function getBilingualDept(dept: string): { th: string; en: string } {
  const d = dept.trim().toLowerCase();
  if (d.includes("managing director") || d.includes("ผู้บริหารสูงสุด")) {
    return { th: "ผู้บริหารสูงสุด/ผู้บริหารระดับสูง", en: "MD-Managing Director" };
  }
  if (d.includes("document control") || d.includes("mr-management") || d.includes("dc-document")) {
    return { th: "ตัวแทนฝ่ายบริหาร/ควบคุมเอกสาร", en: "MR-Management/DC-Document Control" };
  }
  if (d.includes("human resources") || d.includes("hr-human")) {
    return { th: "ทรัพยากรบุคคล", en: "HR-Human Resources" };
  }
  if (d.includes("general affairs") || d.includes("ga-general")) {
    return { th: "ธุรการทั่วไป", en: "GA-General Affairs" };
  }
  if (d.includes("sales") || d.includes("marketing")) {
    return { th: "ฝ่ายขายและการตลาด", en: "Sales and Marketing" };
  }
  if (d.includes("planning") || d.includes("pn-planning")) {
    return { th: "วางแผนการผลิต", en: "PN-Planning" };
  }
  if (d.includes("engineering") || d.includes("วิศวกรรม")) {
    return { th: "วิศวกรรม (ออกแบบ)", en: "EN-Engineering (Design)" };
  }
  if (d.includes("mold") || d.includes("แม่พิมพ์")) {
    return { th: "แม่พิมพ์", en: "Mold" };
  }
  if (d.includes("production #3") || d.includes("factory #3")) {
    return { th: "ฝ่ายผลิต ( Factory #3 )", en: "PD-Production #3 (Melting and casting aluminum.)" };
  }
  if (d.includes("production #5") || d.includes("factory #5")) {
    return { th: "ฝ่ายผลิต ( Factory #5 )", en: "PD-Production #5 (Aluminum forging.)" };
  }
  if (d.includes("production #2") || d.includes("factory #2")) {
    return { th: "ฝ่ายผลิต ( Factory #2 )", en: "PD-Production #2 (Assemble)" };
  }
  if (d.includes("production #4") || d.includes("factory #4")) {
    return { th: "ฝ่ายผลิต ( Factory #4 )", en: "PD-Production #4 (Machining & UV Print)" };
  }
  if (d.includes("quality assurance") || d.includes("qa-quality")) {
    return { th: "ประกันคุณภาพ", en: "QA-Quality Assurance" };
  }
  if (d.includes("purchasing") || d.includes("pur-purchasing")) {
    return { th: "ฝ่ายจัดซื้อ", en: "PUR-Purchasing" };
  }
  if (d.includes("warehouse") || d.includes("wh-warehouse")) {
    return { th: "คลังสินค้า", en: "WH-warehouse" };
  }
  if (d.includes("accounting") || d.includes("acc-accounting")) {
    return { th: "บัญชี", en: "ACC-Accounting" };
  }
  if (d.includes("information technology") || d.includes("it-information")) {
    return { th: "เทคโนโลยีสารสนเทศ", en: "IT-Information Technology" };
  }
  if (d.includes("safety") || d.includes("she-safety")) {
    return { th: "สิ่งแวดล้อม อาชีวอนามัยและความปลอดภัย", en: "SHE-Safety Health and environment" };
  }
  if (d.includes("maintenance") || d.includes("mn-maintenance")) {
    return { th: "ซ่อมบำรุง", en: "MN-Maintenance" };
  }
  if (d.includes("management review")) {
    return { th: "ประชุมทบทวนโดยฝ่ายบริหาร", en: "Management Review Meeting" };
  }
  return { th: dept, en: dept };
}

// Convert name into short bilingual prefix style (e.g. MR.SURAK S.)
function formatShortName(fullName: string): string {
  if (!fullName) return "";
  const clean = fullName.trim();
  let name = clean;
  if (clean.includes("/")) {
    name = clean.split("/")[1]?.trim() || clean.split("/")[0]?.trim();
  }
  
  let prefix = "";
  let nameWithoutPrefix = name;
  const prefixes = ["mr.", "ms.", "mrs.", "นาย", "นางสาว", "นาง"];
  for (const pf of prefixes) {
    if (name.toLowerCase().startsWith(pf)) {
      prefix = pf.toUpperCase().replace("นาย", "MR.").replace("นางสาว", "MS.").replace("นาง", "MRS.");
      if (!prefix.endsWith(".")) prefix += ".";
      nameWithoutPrefix = name.substring(pf.length).trim();
      break;
    }
  }

  const parts = nameWithoutPrefix.split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0];
    const lastInit = parts[parts.length - 1].substring(0, 1).toUpperCase();
    return `${prefix ? prefix + " " : ""}${first.toUpperCase()} ${lastInit}.`;
  }
  return name.toUpperCase();
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

const querySchema = z.object({
  type: z.enum(["gantt", "session"]).default("session"),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await requireAuth();

    const { planId } = await params;
    const sp = req.nextUrl.searchParams;
    const validated = querySchema.parse({
      type: sp.get("type") || undefined,
    });
    const type = validated.type;
    const isGantt = type === "gantt";

    const [naming, footerConfig] = await Promise.all([
      qmsConfigService.getExportNamingMeta("AUDIT_PLAN", {
        label: isGantt ? "Internal Audit Plan (FM-MR-06)" : "Internal Audit Program (FM-MR-07)",
        fileBaseName: "AUDIT_PLAN",
        worksheetName: isGantt ? "Gantt Plan" : "Sessions",
      }),
      qmsConfigService.getSingleFooterConfig("AUDIT_PLAN").catch(() => null),
    ]);

    let plan = await sessionRepo.findDetailById(planId);
    if (!plan) {
      const sp = await sessionRepo.findByAppointmentId(planId);
      if (sp) {
        plan = await sessionRepo.findDetailById(sp.id);
      } else {
        const appt = await apptRepo.findDetailById(planId);
        if (appt) {
          const newSp = await sessionRepo.upsertForAppointment(planId);
          plan = await sessionRepo.findDetailById(newSp.id);
        }
      }
    }

    if (!plan) throw new NotFoundError("Session plan not found");

    const auditPlan = await auditPlanRepo.findByAppointmentId(plan.appointmentId);
    let ownerSignaturePath: string | null = null;
    let ownerNameSnapshot: string | null = null;
    let ownerPositionSnapshot: string | null = null;
    let reviewerPositionSnapshot: string | null = null;
    let approverPositionSnapshot: string | null = null;
    let planSignoffs: Array<{ id: string; signedRole: string; signedByAuthUserId: string; signerNameSnapshot: string | null; signaturePath: string | null; signedAt: Date; position?: string | null }> = [];

    if (auditPlan) {
      const ownerPref = await userPrefRepo.findByAuthUserId(auditPlan.ownerAuthUserId);
      ownerSignaturePath = ownerPref?.savedSignatureUrl || null;
      ownerNameSnapshot = auditPlan.ownerNameSnapshot;
      planSignoffs = auditPlan.signoffs.map(s => ({
        id: s.id,
        signedRole: s.signedRole,
        signedByAuthUserId: s.signedByAuthUserId,
        signerNameSnapshot: s.signerNameSnapshot,
        signaturePath: s.signaturePath,
        signedAt: s.signedAt,
      }));

      if (auditPlan.schedules.length > 0) {
        const mappedSessions = auditPlan.schedules.map((s, idx) => {
          const start = new Date(s.startAt);
          const end = new Date(s.endAt);
          const startTime = `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`;
          const endTime = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;

          const teamMembers = s.team.map((tm) => ({
            id: tm.id,
            role: tm.role,
            name: tm.nameSnapshot || "",
            authUserId: tm.authUserId,
          }));

          return {
            id: s.id,
            planId: plan.id,
            orderIndex: idx,
            auditDate: s.startAt,
            startTime,
            endTime,
            department: s.departmentName || s.sessionTitle,
            remark: s.unavailableReason,
            teamMembers,
          };
        });
        Object.assign(plan, { sessions: mappedSessions });
      }
    }

    const appt = plan.appointment as unknown as {
      id: string;
      appointmentNo: string;
      year: number;
      title: string;
      standards: string[];
      status: string;
      publishedAt: Date | null;
      ownerAuthUserId: string | null;
      ownerSignaturePath: string | null;
      ownerNameSnapshot: string | null;
      reviewerAuthUserId: string | null;
      reviewerNameSnapshot: string | null;
      approverAuthUserId: string | null;
      approverNameSnapshot: string | null;
      updatedAt: Date;
      members: Array<{ id: string; authUserId: string; name: string; department: string | null; role: string }>;
      signoffs: Array<{ id: string; signedRole: string; signedByAuthUserId: string; signerNameSnapshot: string | null; signaturePath: string | null; signedAt: Date; position?: string | null }>;
    };

    const lookupUserIds = new Set<string>();
    if (auditPlan?.ownerAuthUserId) lookupUserIds.add(auditPlan.ownerAuthUserId);
    if (auditPlan?.reviewerAuthUserId) lookupUserIds.add(auditPlan.reviewerAuthUserId);
    if (auditPlan?.approverAuthUserId) lookupUserIds.add(auditPlan.approverAuthUserId);
    planSignoffs.forEach((s) => {
      if (s.signedByAuthUserId) lookupUserIds.add(s.signedByAuthUserId);
    });

    if (appt.ownerAuthUserId) lookupUserIds.add(appt.ownerAuthUserId);
    if (appt.reviewerAuthUserId) lookupUserIds.add(appt.reviewerAuthUserId);
    if (appt.approverAuthUserId) lookupUserIds.add(appt.approverAuthUserId);
    appt.signoffs.forEach((s) => {
      if (s.signedByAuthUserId) lookupUserIds.add(s.signedByAuthUserId);
    });

    const profileMap = await getAuthCenterProfileMap(
      Array.from(lookupUserIds).filter(Boolean) as string[],
      session.user.accessToken,
    );

    ownerPositionSnapshot = auditPlan?.ownerAuthUserId
      ? (profileMap.get(auditPlan.ownerAuthUserId)?.jobTitle ?? null)
      : (appt.ownerAuthUserId
        ? (profileMap.get(appt.ownerAuthUserId)?.jobTitle ?? null)
        : null);

    reviewerPositionSnapshot = auditPlan?.reviewerAuthUserId
      ? (profileMap.get(auditPlan.reviewerAuthUserId)?.jobTitle ?? null)
      : (appt.reviewerAuthUserId
        ? (profileMap.get(appt.reviewerAuthUserId)?.jobTitle ?? null)
        : null);

    approverPositionSnapshot = auditPlan?.approverAuthUserId
      ? (profileMap.get(auditPlan.approverAuthUserId)?.jobTitle ?? null)
      : (appt.approverAuthUserId
        ? (profileMap.get(appt.approverAuthUserId)?.jobTitle ?? null)
        : null);

    planSignoffs = planSignoffs.map(s => ({
      ...s,
      position: profileMap.get(s.signedByAuthUserId)?.jobTitle ?? null,
    }));

    if (auditPlan) {
      appt.ownerSignaturePath = ownerSignaturePath;
      appt.ownerNameSnapshot = ownerNameSnapshot;
      appt.signoffs = planSignoffs;
    } else {
      appt.signoffs = appt.signoffs.map(s => ({
        ...s,
        position: profileMap.get(s.signedByAuthUserId)?.jobTitle ?? null,
      }));
    }

    const yearEn = appt.year - 543;
    const preparerSignoff = appt.signoffs.find((s) => s.signedRole === "PREPARER");
    const reviewerSignoff = appt.signoffs.find((s) => s.signedRole === "REVIEWER");
    const approverSignoff = appt.signoffs.find((s) => s.signedRole === "APPROVER");

    const docCode = isGantt ? "FM-MR-06" : "FM-MR-07";
    const docRev = "Rev.01";
    const docDate = "01-03-2025";
    const docPrefix = footerConfig?.prefix?.trim() || `${docCode} : ${docRev} : ${docDate}`;

    const wb = new ExcelJS.Workbook();
    wb.creator = "QMS System";
    wb.created = new Date();
    wb.title = naming.label;

    const ws = wb.addWorksheet(naming.worksheetName);

    // Standard Styles
    const brandColor = "0F1059";
    const titleFont = { name: "Sarabun", size: 14, bold: true, color: { argb: "000000" } };
    const descFont = { name: "Sarabun", size: 9, color: { argb: "666666" } };
    const headerFont = { name: "Sarabun", size: 10, bold: true, color: { argb: "FFFFFF" } };
    const bodyFont = { name: "Sarabun", size: 10, color: { argb: "000000" } };
    const boldBodyFont = { name: "Sarabun", size: 10, bold: true, color: { argb: "000000" } };

    const borderStyleThin = { style: "thin" as const, color: { argb: "000000" } };

    const cellBorders = {
      top: borderStyleThin,
      left: borderStyleThin,
      bottom: borderStyleThin,
      right: borderStyleThin,
    };

    const headerFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: brandColor } };
    const teamHeaderFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "F1F5F9" } };

    if (isGantt) {
      // ─── FM-MR-06 (Gantt Plan) ──────────────────────────────────────────────────
      ws.views = [{ showGridLines: true }];

      // A1:Q3 - Header block (NDC logo details on left, Title center, Revise right)
      // Since it's Excel, we can construct a neat border-table structure
      ws.mergeCells("A1:C3");
      const logoCell = ws.getCell("A1");
      logoCell.value = "NDC INDUSTRIAL";
      logoCell.font = { name: "Sarabun", size: 12, bold: true, color: { argb: brandColor } };
      logoCell.alignment = { vertical: "middle", horizontal: "center" };

      ws.mergeCells("D1:N3");
      const titleCell = ws.getCell("D1");
      titleCell.value = `แผนการตรวจติดตามคุณภาพภายในและประชุม MRW ประจำปี พ.ศ. ${appt.year}\nInternal Audit Plan and MRW Meeting for the year ${yearEn}\nระบบบริหารจัดการด้านคุณภาพ สิ่งแวดล้อม อาชีวอนามัยและความปลอดภัย / Quality Management System Environment, Occupational Health and Safety`;
      titleCell.font = titleFont;
      titleCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

      ws.mergeCells("O1:P2");
      const reviseNoLabel = ws.getCell("O1");
      reviseNoLabel.value = "แก้ไขครั้งที่ / Revise No.";
      reviseNoLabel.font = { name: "Sarabun", size: 9, bold: true };
      reviseNoLabel.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

      const reviseNoVal = ws.getCell("Q1");
      ws.mergeCells("Q1:Q2");
      reviseNoVal.value = String(plan.reviseNo ?? 0).padStart(2, "0");
      reviseNoVal.font = boldBodyFont;
      reviseNoVal.alignment = { vertical: "middle", horizontal: "center" };

      ws.mergeCells("O3:P3");
      const reviseDateLabel = ws.getCell("O3");
      reviseDateLabel.value = "วันที่แก้ไข / Revise Date";
      reviseDateLabel.font = { name: "Sarabun", size: 9, bold: true };
      reviseDateLabel.alignment = { vertical: "middle", horizontal: "center" };

      const reviseDateVal = ws.getCell("Q3");
      const revDate = plan.reviseDate ? new Date(plan.reviseDate) : new Date(appt.publishedAt || appt.updatedAt);
      reviseDateVal.value = revDate.toLocaleDateString("en-GB").replace(/\//g, "-");
      reviseDateVal.font = boldBodyFont;
      reviseDateVal.alignment = { vertical: "middle", horizontal: "center" };

      // Apply borders to the header grid A1:Q3
      for (let r = 1; r <= 3; r++) {
        for (let c = 1; c <= 17; c++) {
          ws.getCell(r, c).border = cellBorders;
        }
      }

      // Column widths
      ws.getColumn("A").width = 6;   // No
      ws.getColumn("B").width = 25;  // Dept
      ws.getColumn("C").width = 38;  // Process
      ws.getColumn("D").width = 10;  // Action
      for (let c = 5; c <= 16; c++) {
        ws.getColumn(c).width = 5;   // Week columns
      }
      ws.getColumn("Q").width = 12;  // Remark

      // Table headers starting at Row 5
      ws.mergeCells("A5:A6");
      ws.getCell("A5").value = "ลำดับ\nNo.";
      ws.mergeCells("B5:B6");
      ws.getCell("B5").value = "หน่วยงาน\nDepartment";
      ws.mergeCells("C5:C6");
      ws.getCell("C5").value = "กระบวนการตรวจ\nExamination process";
      ws.mergeCells("D5:D6");
      ws.getCell("D5").value = "การดำเนินการ\nAction";

      ws.mergeCells("E5:F5");
      ws.getCell("E5").value = `Apr-${String(yearEn).substring(2)}`;
      ws.mergeCells("G5:J5");
      ws.getCell("G5").value = `May-${String(yearEn).substring(2)}`;
      ws.mergeCells("K5:N5");
      ws.getCell("K5").value = `Jun-${String(yearEn).substring(2)}`;
      ws.mergeCells("O5:P5");
      ws.getCell("O5").value = `Jul-${String(yearEn).substring(2)}`;

      ws.mergeCells("Q5:Q6");
      ws.getCell("Q5").value = "หมายเหตุ\nRemark";

      const weekLabels = ["W3", "W4", "W1", "W2", "W3", "W4", "W1", "W2", "W3", "W4", "W1", "W2"];
      weekLabels.forEach((lbl, idx) => {
        ws.getCell(6, 5 + idx).value = lbl;
      });

      // Style Table headers (Row 5 & Row 6)
      for (let r = 5; r <= 6; r++) {
        for (let c = 1; c <= 17; c++) {
          const cell = ws.getCell(r, c);
          cell.font = headerFont;
          cell.fill = headerFill;
          cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
          cell.border = cellBorders;
        }
      }

      // Gantt weeks keys
      const ganttWeeksKeys = [
        `${yearEn}-4-W3`, `${yearEn}-4-W4`,
        `${yearEn}-5-W1`, `${yearEn}-5-W2`, `${yearEn}-5-W3`, `${yearEn}-5-W4`,
        `${yearEn}-6-W1`, `${yearEn}-6-W2`, `${yearEn}-6-W3`, `${yearEn}-6-W4`,
        `${yearEn}-7-W1`, `${yearEn}-7-W2`
      ];

      // Render Gantt rows (2 rows per database Gantt Row)
      let currentRow = 7;
      plan.ganttRows.forEach((row, idx) => {
        const deptLabel = getBilingualDept(row.department);

        // Row spans (merge Row 1 & Row 2 for details)
        ws.mergeCells(`A${currentRow}:A${currentRow + 1}`);
        ws.getCell(`A${currentRow}`).value = idx + 1;

        ws.mergeCells(`B${currentRow}:B${currentRow + 1}`);
        ws.getCell(`B${currentRow}`).value = `${deptLabel.th}\n(${deptLabel.en})`;

        ws.mergeCells(`C${currentRow}:C${currentRow + 1}`);
        ws.getCell(`C${currentRow}`).value = row.processes.map(p => `• ${p}`).join("\n");

        ws.mergeCells(`Q${currentRow}:Q${currentRow + 1}`);
        ws.getCell(`Q${currentRow}`).value = ""; // Remarks

        // Action column labels
        ws.getCell(`D${currentRow}`).value = "Plan";
        ws.getCell(`D${currentRow + 1}`).value = "Actual";

        // Gantt check week indicators
        ganttWeeksKeys.forEach((weekKey, wIdx) => {
          const planCell = ws.getCell(currentRow, 5 + wIdx);
          const actCell = ws.getCell(currentRow + 1, 5 + wIdx);

          if (row.planWeeks.includes(weekKey)) {
            // Draw a light blue pattern or text indicating Plan
            planCell.fill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFD3E2F2" } };
            planCell.value = "Plan";
          }
          if (row.actualWeeks.includes(weekKey)) {
            // Solid dark blue fill for Actual
            actCell.fill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FF0F1059" } };
            actCell.font = { name: "Sarabun", size: 8, bold: true, color: { argb: "FFFFFF" } };
            actCell.value = "Done";
          }
        });

        // Style the cells
        for (let r = currentRow; r <= currentRow + 1; r++) {
          for (let c = 1; c <= 17; c++) {
            const cell = ws.getCell(r, c);
            cell.font = bodyFont;
            cell.border = cellBorders;
            if (c === 1 || c === 4 || (c >= 5 && c <= 16)) {
              cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
            } else {
              cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
            }
          }
        }

        currentRow += 2;
      });

      // Notes & Legend
      ws.getCell(`A${currentRow + 1}`).value = "หมายเหตุ / Note:";
      ws.getCell(`A${currentRow + 1}`).font = boldBodyFont;

      ws.mergeCells(`B${currentRow + 1}:C${currentRow + 1}`);
      ws.getCell(`B${currentRow + 1}`).value = "Plan: สีฟ้าน้ำเงินอ่อน (Light Blue fill) | Done: สีน้ำเงินทึบ (Solid dark blue fill)";
      ws.getCell(`B${currentRow + 1}`).font = descFont;

      // Increment row for signatures
      currentRow += 3;
      
      // Signatures layout table
      ws.mergeCells(`A${currentRow}:F${currentRow}`);
      ws.getCell(`A${currentRow}`).value = "Prepared by";
      ws.mergeCells(`G${currentRow}:L${currentRow}`);
      ws.getCell(`G${currentRow}`).value = "Reviewed by";
      ws.mergeCells(`M${currentRow}:Q${currentRow}`);
      ws.getCell(`M${currentRow}`).value = "Approved by";

      for (let c = 1; c <= 17; c++) {
        const cell = ws.getCell(currentRow, c);
        cell.font = boldBodyFont;
        cell.fill = teamHeaderFill;
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = cellBorders;
      }

      ws.mergeCells(`A${currentRow + 1}:F${currentRow + 2}`);
      ws.getCell(`A${currentRow + 1}`).value = `${preparerSignoff?.signerNameSnapshot || appt.ownerNameSnapshot || "-"}\n${preparerSignoff?.position || ownerPositionSnapshot || "QMS Officer"}`;
      
      ws.mergeCells(`G${currentRow + 1}:L${currentRow + 2}`);
      ws.getCell(`G${currentRow + 1}`).value = `${reviewerSignoff?.signerNameSnapshot || (appt.reviewerNameSnapshot ?? "-")}\n${reviewerSignoff?.position || reviewerPositionSnapshot || "Management Representative"}`;

      ws.mergeCells(`M${currentRow + 1}:Q${currentRow + 2}`);
      ws.getCell(`M${currentRow + 1}`).value = `${approverSignoff?.signerNameSnapshot || (appt.approverNameSnapshot ?? "-")}\n${approverSignoff?.position || approverPositionSnapshot || "Managing Director"}`;

      for (let r = currentRow + 1; r <= currentRow + 2; r++) {
        for (let c = 1; c <= 17; c++) {
          const cell = ws.getCell(r, c);
          cell.font = bodyFont;
          cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
          cell.border = cellBorders;
        }
      }

      ws.mergeCells(`A${currentRow + 3}:F${currentRow + 3}`);
      ws.getCell(`A${currentRow + 3}`).value = `Date: ${formatDateSign(preparerSignoff?.signedAt || appt.publishedAt || appt.updatedAt)}`;

      ws.mergeCells(`G${currentRow + 3}:L${currentRow + 3}`);
      ws.getCell(`G${currentRow + 3}`).value = `Date: ${formatDateSign(reviewerSignoff?.signedAt)}`;

      ws.mergeCells(`M${currentRow + 3}:Q${currentRow + 3}`);
      ws.getCell(`M${currentRow + 3}`).value = `Date: ${formatDateSign(approverSignoff?.signedAt)}`;

      for (let c = 1; c <= 17; c++) {
        const cell = ws.getCell(currentRow + 3, c);
        cell.font = boldBodyFont;
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = cellBorders;
      }

      // Bottom revision code
      ws.mergeCells(`A${currentRow + 5}:Q${currentRow + 5}`);
      const revCell = ws.getCell(`A${currentRow + 5}`);
      revCell.value = docPrefix;
      revCell.font = descFont;
      revCell.alignment = { vertical: "middle", horizontal: "right" };

    } else {
      // ─── FM-MR-07 (Session List) ────────────────────────────────────────────────
      ws.views = [{ showGridLines: true }];

      // Header block
      ws.mergeCells("A1:B3");
      const logoCell = ws.getCell("A1");
      logoCell.value = "NDC INDUSTRIAL";
      logoCell.font = { name: "Sarabun", size: 12, bold: true, color: { argb: brandColor } };
      logoCell.alignment = { vertical: "middle", horizontal: "center" };

      ws.mergeCells("C1:F3");
      const titleCell = ws.getCell("C1");
      titleCell.value = `ประกาศการตรวจติดตามภายในในระบบบริหารจัดการด้านคุณภาพ สิ่งแวดล้อม อาชีวอนามัยและความปลอดภัย ครั้งที่ 1 / ${appt.year}\nAnnouncement of the Internal Audit for the Quality, Environmental, and Occupational Health and Safety Management Systems 1st/${yearEn}\nระบบบริหารจัดการด้านคุณภาพ สิ่งแวดล้อม อาชีวอนามัยและความปลอดภัย/Quality Management System Environment, Occupational Health and Safety`;
      titleCell.font = titleFont;
      titleCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

      ws.mergeCells("G1:G2");
      const reviseNoLabel = ws.getCell("G1");
      reviseNoLabel.value = "แก้ไขครั้งที่\nRevise No.";
      reviseNoLabel.font = { name: "Sarabun", size: 8, bold: true };
      reviseNoLabel.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

      const reviseNoVal = ws.getCell("H1");
      ws.mergeCells("H1:H2");
      reviseNoVal.value = String(plan.reviseNo ?? 0).padStart(2, "0");
      reviseNoVal.font = boldBodyFont;
      reviseNoVal.alignment = { vertical: "middle", horizontal: "center" };

      const reviseDateLabel = ws.getCell("G3");
      reviseDateLabel.value = "วันที่แก้ไข / Revise Date";
      reviseDateLabel.font = { name: "Sarabun", size: 8, bold: true };
      reviseDateLabel.alignment = { vertical: "middle", horizontal: "center" };

      const reviseDateVal = ws.getCell("H3");
      const revDate = plan.reviseDate ? new Date(plan.reviseDate) : new Date(appt.publishedAt || appt.updatedAt);
      reviseDateVal.value = revDate.toLocaleDateString("en-GB").replace(/\//g, "-");
      reviseDateVal.font = boldBodyFont;
      reviseDateVal.alignment = { vertical: "middle", horizontal: "center" };

      // Apply borders to the header grid A1:H3
      for (let r = 1; r <= 3; r++) {
        for (let c = 1; c <= 8; c++) {
          ws.getCell(r, c).border = cellBorders;
        }
      }

      // Column widths
      ws.getColumn("A").width = 6;   // No
      ws.getColumn("B").width = 20;  // Date
      ws.getColumn("C").width = 18;  // Time
      ws.getColumn("D").width = 28;  // Inspected department
      ws.getColumn("E").width = 36;  // Auditor Team
      ws.getColumn("F").width = 18;  // Auditee
      ws.getColumn("G").width = 12;  // Remark
      ws.getColumn("H").width = 4;   // Spacing

      // Table Headers starting at Row 5
      const tableHeaders = [
        "ลำดับ\nNo.",
        "วันที่\nAudit Date",
        "เวลา\nAudit Time",
        "หน่วยงานที่ถูกตรวจ\nAgencies that have been inspected",
        "ทีมตรวจติดตาม\nAuditor Team",
        "ผู้รับการตรวจ\nAuditee",
        "หมายเหตุ\nRemark"
      ];

      tableHeaders.forEach((h, idx) => {
        const cell = ws.getCell(5, idx + 1);
        cell.value = h;
        cell.font = headerFont;
        cell.fill = headerFill;
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cell.border = cellBorders;
      });
      ws.getRow(5).height = 36;

      // Group lead auditors to assign letters A-J
      const leadAuditors = Array.from(
        new Set(
          (plan.sessions || []).flatMap((s) => s.teamMembers.filter((m) => m.role === "LEAD_AUDITOR").map((m) => m.name))
        )
      ).sort();

      const teamLetters: Record<string, string> = {};
      leadAuditors.forEach((leadName, idx) => {
        teamLetters[leadName] = String.fromCharCode(65 + idx);
      });

      // Data Rows
      let currentRow = 6;
      plan.sessions.forEach((s, idx) => {
        const dateInfo = formatBilingualDate(s.auditDate);
        const timeInfo = formatBilingualTime(s.startTime, s.endTime);
        const deptInfo = getBilingualDept(s.department);

        const leadNames = s.teamMembers.filter((tm) => tm.role === "LEAD_AUDITOR").map((tm) => tm.name);
        const otherAuditors = s.teamMembers.filter((tm) => tm.role === "AUDITOR").map((tm) => tm.name);
        const observers = s.teamMembers.filter((tm) => tm.role === "OBSERVER").map((tm) => tm.name);
        const auditees = s.teamMembers.filter((tm) => tm.role === "AUDITEE").map((tm) => tm.name);

        const leadLetter = leadNames[0] ? (teamLetters[leadNames[0]] || "") : "";
        const teamDisplayParts: string[] = [];

        if (leadNames.length > 0) {
          const formattedLeads = leadNames.map(l => formatShortName(l)).join(", ");
          teamDisplayParts.push(leadLetter ? `${leadLetter} ${formattedLeads}` : formattedLeads);
        }
        if (otherAuditors.length > 0) {
          teamDisplayParts.push(otherAuditors.map(a => formatShortName(a)).join(", "));
        }
        if (observers.length > 0) {
          teamDisplayParts.push(`(Obs: ${observers.map(o => formatShortName(o)).join(", ")})`);
        }

        const auditeeDisplay = auditees.length > 0 
          ? auditees.map(a => formatShortName(a)).join(", ") 
          : `พนักงานแผนก ${deptInfo.th} / ${deptInfo.en} Staff`;

        ws.getRow(currentRow).height = 36;
        ws.getCell(currentRow, 1).value = idx + 1;
        ws.getCell(currentRow, 2).value = `${dateInfo.th}\n(${dateInfo.en})`;
        ws.getCell(currentRow, 3).value = `${timeInfo.th}\n(${timeInfo.en})`;
        ws.getCell(currentRow, 4).value = `${deptInfo.th}\n(${deptInfo.en})`;
        ws.getCell(currentRow, 5).value = teamDisplayParts.join(", ");
        ws.getCell(currentRow, 6).value = auditeeDisplay;
        ws.getCell(currentRow, 7).value = s.remark || "-";

        for (let c = 1; c <= 7; c++) {
          const cell = ws.getCell(currentRow, c);
          cell.font = bodyFont;
          cell.border = cellBorders;
          if (c === 1 || c === 2 || c === 3 || c === 6) {
            cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
          } else {
            cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
          }
        }

        currentRow++;
      });

      // Notes
      ws.getCell(`A${currentRow + 1}`).value = "หมายเหตุ (Note) :";
      ws.getCell(`A${currentRow + 1}`).font = boldBodyFont;

      ws.mergeCells(`B${currentRow + 1}:G${currentRow + 1}`);
      ws.getCell(`B${currentRow + 1}`).value = "1. หากมีการขอเลื่อน Audit จากเวลาที่กำหนดไว้ จะต้องมีหลักฐานจากผู้ขอเลื่อน ในการเลื่อนการ Audit";
      ws.getCell(`B${currentRow + 1}`).font = descFont;

      ws.mergeCells(`B${currentRow + 2}:G${currentRow + 2}`);
      ws.getCell(`B${currentRow + 2}`).value = "2. รายชื่อ Observer ลำดับที่ 5,6,7,8,9 หมายถึง ผู้สังเกตการณ์ที่จะต้องเข้าร่วม Audit เป็นหลัก";
      ws.getCell(`B${currentRow + 2}`).font = descFont;

      // ─── Compiled Team List Table ───
      currentRow += 4;
      ws.mergeCells(`A${currentRow}:G${currentRow}`);
      ws.getCell(`A${currentRow}`).value = "รายชื่อคณะทำงานผู้ตรวจติดตามภายใน / Internal Auditor Name List";
      ws.getCell(`A${currentRow}`).font = boldBodyFont;
      ws.getCell(`A${currentRow}`).alignment = { vertical: "middle", horizontal: "left" };

      currentRow++;
      const teamHeaders = [
        "Team / No.", "1 (Lead)", "2", "3", "4", "5 (Obs)", "6", "7", "8", "9"
      ];
      teamHeaders.forEach((h, idx) => {
        const cell = ws.getCell(currentRow, idx + 1);
        cell.value = h;
        cell.font = { name: "Sarabun", size: 9, bold: true, color: { argb: "000000" } };
        cell.fill = teamHeaderFill;
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = cellBorders;
      });

      // Dynamically compile internal auditor teams list (A-J)
      const compiledTeams = leadAuditors.map((leadName, index) => {
        const letter = String.fromCharCode(65 + index);
        const teamSessions = (plan.sessions || [])
          .filter((s) => s.teamMembers.some((tm) => tm.role === "LEAD_AUDITOR" && tm.name === leadName));

        const auditorsList = Array.from(
          new Set(
            teamSessions.flatMap((s) => s.teamMembers.filter((tm) => tm.role === "AUDITOR").map((tm) => tm.name))
          )
        );

        const observersList = Array.from(
          new Set(
            teamSessions.flatMap((s) => s.teamMembers.filter((tm) => tm.role === "OBSERVER").map((tm) => tm.name))
          )
        );

        return [
          `Team ${letter}`,
          formatShortName(leadName),
          auditorsList[0] ? formatShortName(auditorsList[0]) : "-",
          auditorsList[1] ? formatShortName(auditorsList[1]) : "-",
          auditorsList[2] ? formatShortName(auditorsList[2]) : "-",
          observersList[0] ? formatShortName(observersList[0]) : "-",
          observersList[1] ? formatShortName(observersList[1]) : "-",
          observersList[2] ? formatShortName(observersList[2]) : "-",
          observersList[3] ? formatShortName(observersList[3]) : "-",
          observersList[4] ? formatShortName(observersList[4]) : "-",
        ];
      });

      compiledTeams.forEach((teamRow) => {
        currentRow++;
        teamRow.forEach((val, colIdx) => {
          const cell = ws.getCell(currentRow, colIdx + 1);
          cell.value = val;
          cell.font = bodyFont;
          cell.border = cellBorders;
          cell.alignment = { vertical: "middle", horizontal: "center" };
        });
      });

      // Signatures
      currentRow += 3;
      ws.mergeCells(`A${currentRow}:C${currentRow}`);
      ws.getCell(`A${currentRow}`).value = "Prepared by";
      ws.mergeCells(`D${currentRow}:F${currentRow}`);
      ws.getCell(`D${currentRow}`).value = "Reviewed by";
      ws.mergeCells(`G${currentRow}:H${currentRow}`);
      ws.getCell(`G${currentRow}`).value = "Approved by";

      for (let c = 1; c <= 8; c++) {
        const cell = ws.getCell(currentRow, c);
        cell.font = boldBodyFont;
        cell.fill = teamHeaderFill;
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = cellBorders;
      }

      ws.mergeCells(`A${currentRow + 1}:C${currentRow + 2}`);
      ws.getCell(`A${currentRow + 1}`).value = `${preparerSignoff?.signerNameSnapshot || appt.ownerNameSnapshot || "-"}\n${preparerSignoff?.position || ownerPositionSnapshot || "QMS Officer"}`;
      
      ws.mergeCells(`D${currentRow + 1}:F${currentRow + 2}`);
      ws.getCell(`D${currentRow + 1}`).value = `${reviewerSignoff?.signerNameSnapshot || (appt.reviewerNameSnapshot ?? "-")}\n${reviewerSignoff?.position || reviewerPositionSnapshot || "Management Representative"}`;

      ws.mergeCells(`G${currentRow + 1}:H${currentRow + 2}`);
      ws.getCell(`G${currentRow + 1}`).value = `${approverSignoff?.signerNameSnapshot || (appt.approverNameSnapshot ?? "-")}\n${approverSignoff?.position || approverPositionSnapshot || "Managing Director"}`;

      for (let r = currentRow + 1; r <= currentRow + 2; r++) {
        for (let c = 1; c <= 8; c++) {
          const cell = ws.getCell(r, c);
          cell.font = bodyFont;
          cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
          cell.border = cellBorders;
        }
      }

      ws.mergeCells(`A${currentRow + 3}:C${currentRow + 3}`);
      ws.getCell(`A${currentRow + 3}`).value = `Date: ${formatDateSign(preparerSignoff?.signedAt || appt.publishedAt || appt.updatedAt)}`;

      ws.mergeCells(`D${currentRow + 3}:F${currentRow + 3}`);
      ws.getCell(`D${currentRow + 3}`).value = `Date: ${formatDateSign(reviewerSignoff?.signedAt)}`;

      ws.mergeCells(`G${currentRow + 3}:H${currentRow + 3}`);
      ws.getCell(`G${currentRow + 3}`).value = `Date: ${formatDateSign(approverSignoff?.signedAt)}`;

      for (let c = 1; c <= 8; c++) {
        const cell = ws.getCell(currentRow + 3, c);
        cell.font = boldBodyFont;
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = cellBorders;
      }

      // Bottom rev code
      ws.mergeCells(`A${currentRow + 5}:H${currentRow + 5}`);
      const revCell = ws.getCell(`A${currentRow + 5}`);
      revCell.value = docPrefix;
      revCell.font = descFont;
      revCell.alignment = { vertical: "middle", horizontal: "right" };
    }

    const buffer = await wb.xlsx.writeBuffer();
    const date = new Date().toISOString().slice(0, 10);

    return new Response(buffer as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${naming.fileBaseName}-${date}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });

  } catch (err) {
    return handleApiError(err);
  }
}
