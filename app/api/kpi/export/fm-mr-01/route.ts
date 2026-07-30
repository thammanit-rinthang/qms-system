import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { KpiRepository } from "@/repositories/kpiRepository";
import { ApprovalSignatureRepository } from "@/repositories/approvalSignatureRepository";
import { QmsConfigService } from "@/services/qmsConfigService";
import { KpiService } from "@/services/kpiService";
import { formatKpiAnnualRevisionTag } from "@/lib/kpi-annual-document";

const kpiRepo = new KpiRepository();
const approvalSignatureRepo = new ApprovalSignatureRepository();
const qmsConfigService = new QmsConfigService();
const kpiService = new KpiService();

const querySchema = z.object({
  year: z.coerce.number().int().optional(),
});

interface ObjectiveSnapshot {
  id: string;
  target: number;
  unit: string | null;
  objective: string;
  frequency: string;
  calculationFormula: string;
  actionPlanGuidelines: string;
  referenceDocuments: string | null;
  responsibleNameSnapshot?: string | null;
  responsibleEmployeeId?: string | null;
  responsibleEmailSnapshot?: string | null;
  revisionChangeType?: string | null;
}

interface RemovedObjectiveSnapshot {
  id: string;
  revisionChangeType: "REMOVED";
  originalObjective: {
    objective: string;
    target: number;
    unit: string | null;
    frequency: string;
    calculationFormula: string;
    actionPlanGuidelines: string;
    referenceDocuments: string | null;
    responsibleNameSnapshot?: string | null;
    responsibleEmployeeId?: string | null;
    responsibleEmailSnapshot?: string | null;
  };
}

interface KpiItem {
  id: string;
  yearly: number;
  department: string;
  status: string;
  prepare: string;
  reviewer: string;
  approver: string;
  objectives?: ObjectiveSnapshot[];
  removedObjectives?: RemovedObjectiveSnapshot[];
}

export async function GET(req: NextRequest) {
  try {
    // Only authenticated users can access/export
    await requireAuth();

    const sp = req.nextUrl.searchParams;
    const { year: parsedYear } = querySchema.parse({
      year: sp.get("year") ?? undefined,
    });

    const year = parsedYear ?? new Date().getFullYear();

    // Fetch KPIs for the requested year with revision comparison payload
    const kpis = await kpiRepo.findForExport({ yearly: year }).then((rows) =>
      Promise.all(
        rows
          .filter((row) => row.department !== "SYSTEM_MASTER")
          .map((row) => kpiService.getKpiById(row.id)),
      ),
    ) as KpiItem[];

    // Fetch master KPI and its signatures
    const masterKpi = await kpiRepo.findByDepartmentYear("SYSTEM_MASTER", year);

    const [signatures, footerConfig, masterRevisionNo] = await Promise.all([
      masterKpi
        ? approvalSignatureRepo.findByDocument("KPI", masterKpi.id)
        : Promise.resolve([]),
      qmsConfigService.getSingleFooterConfig("KPI_ANNUAL"),
      kpiService.getMasterRevisionNumber(year),
    ]);

    const naming = await qmsConfigService.getExportNamingMeta("KPI_ANNUAL", {
      label: "Annual Quality Objectives",
      fileBaseName: "KPI_ANNUAL",
      worksheetName: "FM-MR-01",
    });

    const footerPrefix = formatKpiAnnualRevisionTag(footerConfig?.prefix, masterRevisionNo);
    const footerLabel = footerConfig?.label?.trim() || "วัตถุประสงค์คุณภาพประจำปี";

    const updateDate = (() => {
      const value = masterKpi?.updatedAt ?? masterKpi?.submittedAt ?? null;
      if (!value) return "-";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "-";
      return date
        .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" })
        .replace(/ /g, "-");
    })();

    const revisionNoStr = footerPrefix.replace(/^.*\s(Rev\.\d+)$/i, "$1");

    // Build Excel Workbook
    const wb = new ExcelJS.Workbook();
    wb.creator = "QMS System";
    wb.created = new Date();
    wb.title = `FM-MR-01 ${year}`;

    const ws = wb.addWorksheet(naming.worksheetName, {
      pageSetup: { orientation: "landscape", paperSize: 9 }, // Landscape, A4
    });

    // Set Column Widths
    ws.columns = [
      { key: "department", width: 18 },
      { key: "objective", width: 34 },
      { key: "formula", width: 26 },
      { key: "guidelines", width: 32 },
      { key: "frequency", width: 16 },
      { key: "reference", width: 18 },
      { key: "responsible", width: 22 },
    ];

    // Styled Borders & Fills
    const borderThin: ExcelJS.Border = { style: "thin", color: { argb: "FF000000" } };
    const allBorders: Partial<ExcelJS.Borders> = {
      top: borderThin,
      left: borderThin,
      bottom: borderThin,
      right: borderThin,
    };
    const headerFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F1059" }, // Brand primary
    };
    const highlightFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2F0D9" }, // Light green
    };

    // Header Block: Company Info & Title
    // A1:B4 - Logo Image / Company Name
    ws.mergeCells("A1:B4");
    const logoPath = path.join(process.cwd(), "public", "logo", "logo.webp");
    if (fs.existsSync(logoPath)) {
      const logoImgId = wb.addImage({
        buffer: fs.readFileSync(logoPath) as unknown as ArrayBuffer,
        extension: "webp" as unknown as "png",
      });
      ws.addImage(logoImgId, "A1:B4");
    } else {
      const logoCell = ws.getCell("A1");
      logoCell.value = "NDC INDUSTRIAL CO., LTD.";
      logoCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF0F1059" } };
      logoCell.alignment = { horizontal: "center", vertical: "middle" };
    }

    // C1:E4 - Title Block
    ws.mergeCells("C1:E4");
    const titleCell = ws.getCell("C1");
    titleCell.value = `วัตถุประสงค์คุณภาพ สิ่งแวดล้อม อาชีวอนามัยและความปลอดภัย ประจำปี ${year}\nQuality, Environment, Occupational Health and Safety Objectives ${year}`;
    titleCell.font = { name: "Arial", size: 12, bold: true, color: { argb: "FF0F1059" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

    // F1:G4 - Metadata Block (Right side)
    const metaRows = [
      { f: "แผนงานประจำปี / Annual Work Plan", g: year.toString() },
      { f: "หน่วยงาน / Department", g: "All Department" },
      { f: "แก้ไขครั้งที่ / Revision No.", g: revisionNoStr },
      { f: "วันที่ปรับปรุง / Update date", g: updateDate },
    ];

    metaRows.forEach((r, idx) => {
      const rowNum = idx + 1;
      const fCell = ws.getCell(`F${rowNum}`);
      const gCell = ws.getCell(`G${rowNum}`);
      fCell.value = r.f;
      gCell.value = r.g;

      fCell.font = { name: "Arial", size: 8, bold: true };
      gCell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FF0F59A4" } };

      fCell.alignment = { vertical: "middle", wrapText: true, horizontal: "left" };
      gCell.alignment = { horizontal: "center", vertical: "middle" };
    });

    // Apply borders to header block A1:G4
    for (let r = 1; r <= 4; r++) {
      for (let c = 1; c <= 7; c++) {
        ws.getCell(r, c).border = allBorders;
      }
    }

    // Row 5: Empty spacing
    ws.getRow(5).height = 12;

    // Row 6: Main Table Header
    const colHeaders = [
      "หน่วยงาน\n(Departments)",
      "วัตถุประสงค์และเป้าหมาย\n(Objectives and Targets)",
      "สูตรการคำนวณ\n(Calculation Formula)",
      "แนวทางแผนการดำเนินงาน\n(Action Plan Guidelines)",
      "ความถี่ในการวัดผล\n(Measurement Frequency)",
      "เอกสารอ้างอิง\n(Reference Documents)",
      "ผู้รับผิดชอบ\n(Responsible Person)",
    ];

    ws.getRow(6).height = 32;
    colHeaders.forEach((h, idx) => {
      const cell = ws.getCell(6, idx + 1);
      cell.value = h;
      cell.fill = headerFill;
      cell.font = { name: "Arial", size: 9.5, bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = allBorders;
    });

    // Filter active KPIs (with objectives and not SYSTEM_MASTER)
    const activeKpis = kpis.filter(
      (k) => k.objectives && k.objectives.length > 0 && k.department !== "SYSTEM_MASTER"
    );

    let currentRow = 7;

    for (const kpi of activeKpis) {
      const startRow = currentRow;
      const objectives = kpi.objectives || [];
      const removedObjectives = kpi.removedObjectives || [];

      for (const obj of objectives) {
        const isHighlighted = obj.revisionChangeType === "UPDATED" || obj.revisionChangeType === "ADDED";
        const row = ws.getRow(currentRow);
        row.height = 28;

        const cellDept = ws.getCell(`A${currentRow}`);
        const cellObj = ws.getCell(`B${currentRow}`);
        const cellFormula = ws.getCell(`C${currentRow}`);
        const cellGuidelines = ws.getCell(`D${currentRow}`);
        const cellFreq = ws.getCell(`E${currentRow}`);
        const cellRef = ws.getCell(`F${currentRow}`);
        const cellResp = ws.getCell(`G${currentRow}`);

        // Set value
        cellDept.value = kpi.department;
        cellObj.value = `${obj.objective} ${obj.target} ${obj.unit || ""}`;
        cellFormula.value = obj.calculationFormula;
        cellGuidelines.value = obj.actionPlanGuidelines;
        cellFreq.value = obj.frequency;
        cellRef.value = obj.referenceDocuments || "-";

        let respVal = "-";
        if (obj.responsibleNameSnapshot || obj.responsibleEmailSnapshot) {
          respVal = obj.responsibleNameSnapshot || obj.responsibleEmailSnapshot || "";
          if (obj.responsibleEmployeeId) {
            respVal += `\n(#${obj.responsibleEmployeeId})`;
          }
        }
        cellResp.value = respVal;

        // Common alignment & border
        const dataCells = [
          cellDept,
          cellObj,
          cellFormula,
          cellGuidelines,
          cellFreq,
          cellRef,
          cellResp,
        ];
        dataCells.forEach((c) => {
          c.border = allBorders;
          c.alignment = { vertical: "top", horizontal: "left", wrapText: true };
        });

        // Specific alignments
        cellDept.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cellFreq.alignment = { vertical: "top", horizontal: "center", wrapText: true };
        cellRef.alignment = { vertical: "top", horizontal: "center", wrapText: true };
        cellResp.alignment = { vertical: "top", horizontal: "center", wrapText: true };

        // Formatting text and colors
        if (isHighlighted) {
          dataCells.forEach((c, idx) => {
            if (idx > 0) {
              c.fill = highlightFill;
              c.font = {
                name: "Arial",
                size: 9,
                bold: true,
                italic: true,
                underline: obj.revisionChangeType === "ADDED" ? true : false,
              };
            } else {
              c.font = { name: "Arial", size: 9 };
            }
          });
        } else {
          dataCells.forEach((c) => {
            c.font = { name: "Arial", size: 9 };
          });
        }

        currentRow++;
      }

      for (const removed of removedObjectives) {
        const row = ws.getRow(currentRow);
        row.height = 28;

        const cellDept = ws.getCell(`A${currentRow}`);
        const cellObj = ws.getCell(`B${currentRow}`);
        const cellFormula = ws.getCell(`C${currentRow}`);
        const cellGuidelines = ws.getCell(`D${currentRow}`);
        const cellFreq = ws.getCell(`E${currentRow}`);
        const cellRef = ws.getCell(`F${currentRow}`);
        const cellResp = ws.getCell(`G${currentRow}`);

        cellDept.value = kpi.department;
        cellObj.value = `${removed.originalObjective.objective} ${removed.originalObjective.target} ${removed.originalObjective.unit || ""} (Deleted)`;
        cellFormula.value = removed.originalObjective.calculationFormula;
        cellGuidelines.value = removed.originalObjective.actionPlanGuidelines;
        cellFreq.value = removed.originalObjective.frequency;
        cellRef.value = removed.originalObjective.referenceDocuments || "-";

        let respVal = "-";
        if (removed.originalObjective.responsibleNameSnapshot || removed.originalObjective.responsibleEmailSnapshot) {
          respVal = removed.originalObjective.responsibleNameSnapshot || removed.originalObjective.responsibleEmailSnapshot || "";
          if (removed.originalObjective.responsibleEmployeeId) {
            respVal += `\n(#${removed.originalObjective.responsibleEmployeeId})`;
          }
        }
        cellResp.value = respVal;

        const dataCells = [cellDept, cellObj, cellFormula, cellGuidelines, cellFreq, cellRef, cellResp];
        dataCells.forEach((c) => {
          c.border = allBorders;
          c.alignment = { vertical: "top", horizontal: "left", wrapText: true };
          c.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFEE2E2" },
          };
          c.font = { name: "Arial", size: 9, bold: true, italic: true, color: { argb: "FFB91C1C" } };
        });

        cellDept.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        cellFreq.alignment = { vertical: "top", horizontal: "center", wrapText: true };
        cellRef.alignment = { vertical: "top", horizontal: "center", wrapText: true };
        cellResp.alignment = { vertical: "top", horizontal: "center", wrapText: true };

        currentRow++;
      }

      // Merge departments if more than 1 objective
      const totalRows = objectives.length + removedObjectives.length;
      if (totalRows > 1) {
        ws.mergeCells(`A${startRow}:A${currentRow - 1}`);
        const mergedDeptCell = ws.getCell(`A${startRow}`);
        mergedDeptCell.font = { name: "Arial", size: 9, bold: true };
        mergedDeptCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      } else if (totalRows === 1) {
        const singleDeptCell = ws.getCell(`A${startRow}`);
        singleDeptCell.font = { name: "Arial", size: 9, bold: true };
      }
    }

    // Empty state
    if (activeKpis.length === 0) {
      ws.mergeCells(`A${currentRow}:G${currentRow}`);
      const emptyCell = ws.getCell(`A${currentRow}`);
      emptyCell.value = `ไม่มีข้อมูลสำหรับปี ${year} / No data for ${year}`;
      emptyCell.font = { name: "Arial", size: 10, italic: true };
      emptyCell.alignment = { horizontal: "center", vertical: "middle" };
      emptyCell.border = allBorders;
      currentRow++;
    }

    // Signatures Box (if approved or not in draft status)
    if (masterKpi && masterKpi.status !== "DRAFT") {
      currentRow += 2;
      const sigStartRow = currentRow;

      const preparerSig = signatures.find((s) => s.step === "PREPARER" && s.action === "APPROVED");
      const reviewerSig = signatures.find((s) => s.step === "REVIEWER" && s.action === "APPROVED");
      const approverSig = signatures.find((s) => s.step === "APPROVER" && s.action === "APPROVED");

      const formatDate = (dateVal: string | Date | null | undefined) => {
        if (!dateVal) return "-";
        const d = new Date(dateVal);
        return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
      };

      // Titles
      ws.getCell(`E${sigStartRow}`).value = "ผู้จัดทำ / Prepared By";
      ws.getCell(`F${sigStartRow}`).value = "ผู้ตรวจสอบ / Reviewed By";
      ws.getCell(`G${sigStartRow}`).value = "ผู้อนุมัติ / Approved By";

      // Digital sign status
      ws.getCell(`E${sigStartRow + 1}`).value = preparerSig?.signaturePath
        ? "Digitally Signed"
        : "ยังไม่ได้ลงชื่อ / Unsigned";
      ws.getCell(`F${sigStartRow + 1}`).value = reviewerSig?.signaturePath
        ? "Digitally Signed"
        : "ยังไม่ได้ลงชื่อ / Unsigned";
      ws.getCell(`G${sigStartRow + 1}`).value = approverSig?.signaturePath
        ? "Digitally Signed"
        : "ยังไม่ได้ลงชื่อ / Unsigned";

      // Names
      ws.getCell(`E${sigStartRow + 2}`).value = `(${masterKpi.prepare})`;
      ws.getCell(`F${sigStartRow + 2}`).value = `(${masterKpi.reviewer})`;
      ws.getCell(`G${sigStartRow + 2}`).value = `(${masterKpi.approver})`;

      // Dates
      ws.getCell(`E${sigStartRow + 3}`).value = `วันที่ / Date: ${formatDate(
        preparerSig?.actionDate
      )}`;
      ws.getCell(`F${sigStartRow + 3}`).value = `วันที่ / Date: ${formatDate(
        reviewerSig?.actionDate
      )}`;
      ws.getCell(`G${sigStartRow + 3}`).value = `วันที่ / Date: ${formatDate(
        approverSig?.actionDate
      )}`;

      // Formatting & borders for signatures
      for (let r = sigStartRow; r <= sigStartRow + 3; r++) {
        for (let c = 5; c <= 7; c++) {
          const cell = ws.getCell(r, c);
          cell.border = allBorders;
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

          if (r === sigStartRow) {
            cell.font = { name: "Arial", size: 9, bold: true };
          } else if (r === sigStartRow + 1) {
            cell.font = { name: "Arial", size: 8.5, italic: true, color: { argb: "FF475569" } };
          } else if (r === sigStartRow + 2) {
            cell.font = { name: "Arial", size: 9, bold: true };
          } else if (r === sigStartRow + 3) {
            cell.font = { name: "Arial", size: 8, color: { argb: "FF475569" } };
          }
        }
      }

      ws.getRow(sigStartRow).height = 18;
      ws.getRow(sigStartRow + 1).height = 24;
      ws.getRow(sigStartRow + 2).height = 18;
      ws.getRow(sigStartRow + 3).height = 18;

      currentRow = sigStartRow + 3;
    }

    // Footer Tag Row
    currentRow += 2;
    ws.mergeCells(`A${currentRow}:G${currentRow}`);
    const footerCell = ws.getCell(`A${currentRow}`);
    footerCell.value = `${footerPrefix} ${footerLabel}`;
    footerCell.font = { name: "Arial", size: 8, italic: true, color: { argb: "FF475569" } };
    footerCell.alignment = { horizontal: "right", vertical: "middle" };

    // Write file to response buffer
    const buffer = await wb.xlsx.writeBuffer();
    return new Response(buffer as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${naming.fileBaseName}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
