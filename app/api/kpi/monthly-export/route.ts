import { type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { KpiExportService, type KpiYearlyPreviewRow } from "@/services/kpiExportService";
import { QmsConfigService } from "@/services/qmsConfigService";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const filterSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  kpiId: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
});

const exportService = new KpiExportService();
const qmsConfigService = new QmsConfigService();

const borderThin: ExcelJS.Border = { style: "thin", color: { argb: "FF000000" } };
const allBorders: Partial<ExcelJS.Borders> = {
  top: borderThin,
  left: borderThin,
  bottom: borderThin,
  right: borderThin,
};
const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F1059" } };
const achievedFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF92D050" } };
const failedFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF5050" } };
const pendingFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };

function toBuddhistYear(year: number) {
  return year + 543;
}

function formatUpdateDate(date: Date) {
  return date.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" });
}

function applyDataCellStyle(cell: ExcelJS.Cell, status: "achieved" | "failed" | "pending") {
  cell.border = allBorders;
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.font = { name: "Leelawadee", size: 9 };
  if (status === "achieved") {
    cell.fill = achievedFill;
  } else if (status === "failed") {
    cell.fill = failedFill;
    cell.font = { name: "Leelawadee", size: 9, color: { argb: "FFFFFFFF" } };
  } else {
    cell.fill = pendingFill;
  }
}

function isPercentUnit(unit: string | null | undefined) {
  if (!unit) return false;
  const normalized = unit.trim().toLowerCase();
  return normalized === "%" || normalized === "percent";
}

function applyNumericCellValue(cell: ExcelJS.Cell, value: number | null, unit: string | null | undefined) {
  if (value === null) {
    cell.value = "";
    return;
  }
  cell.value = value;
  if (isPercentUnit(unit) && value >= 0 && value <= 1) {
    cell.numFmt = "0.00%";
  } else if (!Number.isInteger(value)) {
    cell.numFmt = "0.00";
  } else {
    cell.numFmt = "0";
  }
}

function buildLegend(ws: ExcelJS.Worksheet, startRow: number) {
  ws.getCell(startRow, 1).value = "หมายเหตุ/Note :";
  ws.getCell(startRow, 1).font = { name: "Leelawadee", size: 9, bold: true };

  const swatches: Array<[number, ExcelJS.Fill, string]> = [
    [3, achievedFill, "Achieve Target"],
    [6, failedFill, "Not Achieve Target"],
    [9, pendingFill, "Not yet"],
  ];
  swatches.forEach(([col, fill, label]) => {
    const swatchCell = ws.getCell(startRow, col);
    swatchCell.fill = fill;
    swatchCell.border = allBorders;
    const labelCell = ws.getCell(startRow, col + 1);
    labelCell.value = label;
    labelCell.font = { name: "Leelawadee", size: 9 };
    labelCell.alignment = { horizontal: "left", vertical: "middle" };
  });

  ws.getRow(startRow).height = 18;
  return startRow + 2;
}

function buildSignatureBlock(ws: ExcelJS.Worksheet, startRow: number) {
  const labels = [
    ["A", "F", "ผู้จัดทำ / Prepared By"],
    ["G", "L", "ผู้ตรวจสอบ / Reviewed By"],
    ["M", "R", "ผู้อนุมัติ / Approved By"],
  ] as const;

  const lineRow = startRow;
  const labelRow = startRow + 1;

  labels.forEach(([from, to, label]) => {
    ws.mergeCells(`${from}${lineRow}:${to}${lineRow}`);
    const lineCell = ws.getCell(`${from}${lineRow}`);
    lineCell.value = "( ______________________________ )";
    lineCell.font = { name: "Leelawadee", size: 9 };
    lineCell.alignment = { horizontal: "center", vertical: "bottom" };

    ws.mergeCells(`${from}${labelRow}:${to}${labelRow}`);
    const labelCell = ws.getCell(`${from}${labelRow}`);
    labelCell.value = label;
    labelCell.font = { name: "Leelawadee", size: 9, bold: true };
    labelCell.alignment = { horizontal: "center", vertical: "top" };
  });

  ws.getRow(lineRow).height = 26;
  ws.getRow(labelRow).height = 18;

  return labelRow + 1;
}

function buildHeader(ws: ExcelJS.Worksheet, wb: ExcelJS.Workbook, year: number, updatedAt: Date) {
  const buddhistYear = toBuddhistYear(year);

  ws.mergeCells("A1:B4");
  const logoPath = path.join(process.cwd(), "public", "logo", "cropped-ndc_icon_site.png");
  if (fs.existsSync(logoPath)) {
    const logoImgId = wb.addImage({
      buffer: fs.readFileSync(logoPath) as unknown as ArrayBuffer,
      extension: "png",
    });
    ws.addImage(logoImgId, "A1:B4");
  } else {
    const logoCell = ws.getCell("A1");
    logoCell.value = "NDC INDUSTRIAL CO., LTD.";
    logoCell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FF0F1059" } };
    logoCell.alignment = { horizontal: "center", vertical: "middle" };
  }

  ws.mergeCells("C1:P2");
  const titleCell = ws.getCell("C1");
  titleCell.value = `สรุปผลการดำเนินงานตามวัตถุประสงค์คุณภาพ ประจำปี ${buddhistYear}\nSummary of Key Performance Results Year ${year}`;
  titleCell.font = { name: "Leelawadee", size: 14, bold: true, color: { argb: "FF0F1059" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };

  ws.mergeCells("C3:P4");
  ws.getCell("C3").value = "NDC INDUSTRIAL CO., LTD.";
  ws.getCell("C3").font = { name: "Leelawadee", size: 11, bold: true };
  ws.getCell("C3").alignment = { horizontal: "center", vertical: "middle" };

  const metaRows: Array<[string, string]> = [
    ["Revision No.", "01"],
    ["Update วันที่", formatUpdateDate(updatedAt)],
  ];
  metaRows.forEach(([label, value], idx) => {
    const rowNum = idx * 2 + 1;
    ws.mergeCells(`Q${rowNum}:R${rowNum + 1}`);
    const labelCell = ws.getCell(`Q${rowNum}`);
    labelCell.value = `${label}\n${value}`;
    labelCell.font = { name: "Leelawadee", size: 9, bold: true };
    labelCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });

  for (let r = 1; r <= 4; r++) {
    for (let c = 1; c <= 18; c++) {
      ws.getCell(r, c).border = allBorders;
    }
  }
  ws.getRow(1).height = 22;
  ws.getRow(2).height = 22;
  ws.getRow(3).height = 18;
  ws.getRow(4).height = 18;
}

function buildTableHeader(ws: ExcelJS.Worksheet, year: number) {
  const row6 = ws.getRow(6);
  const row7 = ws.getRow(7);
  row6.height = 24;
  row7.height = 24;

  ws.mergeCells("A6:A7");
  ws.mergeCells("B6:B7");
  ws.mergeCells("C6:C7");
  ws.mergeCells("D6:D7");
  ws.mergeCells("E6:P6");
  ws.mergeCells("Q6:Q7");
  ws.mergeCells("R6:R7");

  ws.getCell("A6").value = "No.";
  ws.getCell("B6").value = "Quality Objectives and Indicators";
  ws.getCell("C6").value = "Target";
  ws.getCell("D6").value = "Frequency / Team";
  ws.getCell("E6").value = `ประจำปี ${toBuddhistYear(year)} / Year ${year}`;
  ws.getCell("Q6").value = `Average\nY ${year}`;
  ws.getCell("R6").value = `New Target\nY ${year + 1}`;

  MONTHS.forEach((month, idx) => {
    ws.getCell(7, 5 + idx).value = month;
  });

  for (let c = 1; c <= 18; c++) {
    for (let r = 6; r <= 7; r++) {
      const cell = ws.getCell(r, c);
      cell.fill = headerFill;
      cell.font = { name: "Leelawadee", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = allBorders;
    }
  }
}

function buildDataRows(ws: ExcelJS.Worksheet, rows: KpiYearlyPreviewRow[]) {
  const DATA_START_ROW = 8;

  rows.forEach((row, index) => {
    const rowNumber = DATA_START_ROW + index;
    ws.getRow(rowNumber).height = 30;

    const noCell = ws.getCell(`A${rowNumber}`);
    noCell.value = row.no;
    noCell.border = allBorders;
    noCell.alignment = { horizontal: "center", vertical: "middle" };
    noCell.font = { name: "Leelawadee", size: 9 };

    const objectiveCell = ws.getCell(`B${rowNumber}`);
    objectiveCell.value = row.objective;
    objectiveCell.border = allBorders;
    objectiveCell.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    objectiveCell.font = { name: "Leelawadee", size: 9 };

    const targetCell = ws.getCell(`C${rowNumber}`);
    targetCell.value = row.target;
    targetCell.border = allBorders;
    targetCell.alignment = { horizontal: "center", vertical: "middle" };
    targetCell.font = { name: "Leelawadee", size: 9 };

    const teamCell = ws.getCell(`D${rowNumber}`);
    teamCell.value = `${row.frequency}\n${row.team}`;
    teamCell.border = allBorders;
    teamCell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    teamCell.font = { name: "Leelawadee", size: 9 };

    row.months.forEach((month, monthIndex) => {
      const cell = ws.getCell(rowNumber, 5 + monthIndex);
      applyNumericCellValue(cell, month.status === "pending" ? null : month.numericValue, row.unit);
      applyDataCellStyle(cell, month.status);
    });

    const averageCell = ws.getCell(`Q${rowNumber}`);
    applyNumericCellValue(averageCell, row.averageNumericValue, row.unit);
    averageCell.border = allBorders;
    averageCell.alignment = { horizontal: "center", vertical: "middle" };
    averageCell.font = { name: "Leelawadee", size: 9, bold: true };

    ws.getCell(`R${rowNumber}`).border = allBorders;
  });

  if (rows.length === 0) {
    ws.mergeCells(`A${DATA_START_ROW}:R${DATA_START_ROW}`);
    const emptyCell = ws.getCell(`A${DATA_START_ROW}`);
    emptyCell.value = "ไม่มีข้อมูลสำหรับปีนี้ / No data for this year";
    emptyCell.font = { name: "Leelawadee", size: 10, italic: true };
    emptyCell.alignment = { horizontal: "center", vertical: "middle" };
    emptyCell.border = allBorders;
  }

  return DATA_START_ROW + Math.max(rows.length, 1);
}

export async function GET(req: NextRequest) {
  try {
    await requireRole("QMS", "MR", "IT");

    const sp = req.nextUrl.searchParams;
    const filter = filterSchema.parse({
      year: sp.get("year") ?? new Date().getFullYear(),
      kpiId: sp.get("kpiId") ?? undefined,
      department: sp.get("department") ?? undefined,
    });

    const [preview, naming] = await Promise.all([
      exportService.getYearlyPreview(filter),
      qmsConfigService.getExportNamingMeta("KPI_MONTHLY", {
        label: "KPI Monthly Report",
        fileBaseName: "kpi-monthly-export",
        worksheetName: "Rev.00",
      }),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = "QMS System";
    wb.created = new Date();

    const ws = wb.addWorksheet(naming.worksheetName, {
      pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1 },
    });

    ws.columns = [
      { key: "no", width: 5 },
      { key: "objective", width: 44 },
      { key: "target", width: 12 },
      { key: "team", width: 14 },
      ...MONTHS.map((month) => ({ key: month, width: 9 })),
      { key: "average", width: 12 },
      { key: "newTarget", width: 12 },
    ];

    buildHeader(ws, wb, preview.year, new Date());
    buildTableHeader(ws, preview.year);
    const afterData = buildDataRows(ws, preview.rows);
    const afterLegend = buildLegend(ws, afterData + 1);
    buildSignatureBlock(ws, afterLegend + 1);

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
