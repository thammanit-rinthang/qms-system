import { type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";

const nullableDate = z.union([z.null(), z.coerce.date()]);

const darSchema = z.object({
  id: z.string(),
  requestDate: z.coerce.date(),
  status: z.string(),
  docType: z.string(),
  objective: z.string(),
  requesterDepartmentName: z.string().nullable(),
  departmentId: z.string(),
});

const carSchema = z.object({
  id: z.string(),
  issuedAt: nullableDate,
  createdAt: z.coerce.date(),
  status: z.string(),
  targetDepartmentName: z.string().nullable(),
  responseDueAt: nullableDate,
});

const kpiSchema = z.object({
  id: z.string(),
  actualResult: z.number().nullable(),
  achievedStatus: z.string(),
  kpiObjective: z.object({ target: z.number(), unit: z.string().nullable(), objective: z.string() }),
  monthlyReport: z.object({
    month: z.string(),
    year: z.number(),
    kpi: z.object({ department: z.string() }),
  }),
});

const auditSchema = z.object({
  id: z.string(),
  createdAt: z.coerce.date(),
  category: z.string(),
  status: z.string(),
  departmentId: z.string().nullable(),
});

const bodySchema = z.object({
  module: z.enum(["dar", "car", "kpi", "audit"]),
  year: z.string(),
  department: z.string(),
  form: z.string(),
  purpose: z.string(),
  dars: z.array(darSchema),
  cars: z.array(carSchema),
  kpis: z.array(kpiSchema),
  auditFindings: z.array(auditSchema),
});

const colors = {
  navy: "FF0F1059",
  blue: "FF1D4ED8",
  cyan: "FF0EA5E9",
  slate: "FFF1F5F9",
  border: "FFE2E8F0",
  text: "FF0F172A",
  muted: "FF64748B",
  amber: "FFFFF7ED",
  amberText: "FFB45309",
  rose: "FFFFF1F2",
  roseText: "FFBE123C",
  green: "FFECFDF5",
  greenText: "FF047857",
};

const border: Partial<ExcelJS.Border> = { style: "thin", color: { argb: colors.border } };
const allBorders: Partial<ExcelJS.Borders> = { top: border, left: border, bottom: border, right: border };

function styleTitle(ws: ExcelJS.Worksheet, range: string, title: string) {
  ws.mergeCells(range);
  const cell = ws.getCell(range.split(":")[0]);
  cell.value = title;
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.navy } };
  cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 18 };
  cell.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(Number(cell.row)).height = 34;
}

function styleHeader(row: ExcelJS.Row) {
  row.height = 26;
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors.blue } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = allBorders;
  });
}

function styleDataRows(ws: ExcelJS.Worksheet, startRow: number) {
  for (let rowNumber = startRow; rowNumber <= ws.lastRow!.number; rowNumber += 1) {
    const row = ws.getRow(rowNumber);
    row.eachCell((cell) => {
      cell.border = allBorders;
      cell.font = { color: { argb: colors.text }, size: 10 };
      cell.alignment = { vertical: "top", wrapText: true };
      if (rowNumber % 2 === 0) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFCFE" } };
    });
  }
}

function addDetailSheet(
  wb: ExcelJS.Workbook,
  name: string,
  columns: Array<{ header: string; key: string; width: number }>,
  rows: Array<Record<string, string | number | Date | null>>,
) {
  const ws = wb.addWorksheet(name);
  ws.columns = columns;
  ws.addRows(rows);
  styleHeader(ws.getRow(1));
  styleDataRows(ws, 2);
  ws.views = [{ state: "frozen", ySplit: 1 }];
  if (rows.length > 0) ws.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + columns.length)}${rows.length + 1}` };
  return ws;
}

export async function POST(req: NextRequest) {
  try {
    await requireRole("QMS", "MR", "IT");
    const body = bodySchema.parse(await req.json());
    const wb = new ExcelJS.Workbook();
    wb.creator = "QMS System";
    wb.created = new Date();

    const openCars = body.cars.filter((car) => car.status !== "CLOSED" && car.status !== "CANCELLED");
    const overdueCars = openCars.filter((car) => car.responseDueAt && car.responseDueAt < new Date());
    const passedKpis = body.kpis.filter((kpi) => kpi.achievedStatus === "OK");
    const moduleLabels = { dar: "DAR", car: "CAR", kpi: "KPI", audit: "AUDIT" } as const;
    const moduleLabel = moduleLabels[body.module];
    const moduleCount = body.module === "dar" ? body.dars.length : body.module === "car" ? body.cars.length : body.module === "kpi" ? body.kpis.length : body.auditFindings.length;
    const modulePending = body.module === "dar"
      ? body.dars.filter((dar) => !["COMPLETED", "CANCELLED"].includes(dar.status)).length
      : body.module === "car"
        ? openCars.length
        : body.module === "kpi"
          ? passedKpis.length
          : body.auditFindings.filter((finding) => !["CLOSED", "COMPLETED"].includes(finding.status)).length;
    const moduleAttention = body.module === "car"
      ? overdueCars.length
      : body.module === "kpi"
        ? body.kpis.filter((kpi) => kpi.achievedStatus !== "OK").length
        : body.module === "audit"
          ? body.auditFindings.filter((finding) => ["MAJOR", "CRITICAL"].includes(finding.category)).length
          : body.dars.filter((dar) => ["REJECTED", "CANCELLED"].includes(dar.status)).length;
    const moduleRate = body.module === "kpi" && body.kpis.length ? `${Math.round((passedKpis.length / body.kpis.length) * 100)}%` : moduleAttention;

    const summary = wb.addWorksheet("Summary");
    summary.getColumn(1).width = 24;
    summary.getColumn(2).width = 18;
    summary.getColumn(3).width = 4;
    summary.getColumn(4).width = 24;
    summary.getColumn(5).width = 18;
    summary.getColumn(6).width = 4;
    summary.getColumn(7).width = 24;
    summary.getColumn(8).width = 18;
    styleTitle(summary, "A1:H1", `QMS ${moduleLabel} REPORT`);
    summary.mergeCells("A2:H2");
    summary.getCell("A2").value = `ปี ${body.year}  |  หน่วยงาน: ${body.department === "ALL" ? "ทั้งหมด" : body.department}  |  สร้างเมื่อ ${new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`;
    summary.getCell("A2").font = { italic: true, color: { argb: colors.muted }, size: 10 };
    summary.getCell("A2").alignment = { vertical: "middle" };
    summary.getRow(2).height = 22;

    summary.getCell("A4").value = "EXECUTIVE OVERVIEW";
    summary.getCell("A4").font = { bold: true, color: { argb: colors.navy }, size: 12 };
    const cards = [
      [`${moduleLabel} รายการ`, moduleCount, colors.slate, colors.navy],
      [body.module === "kpi" ? "ผ่านเป้าหมาย" : "กำลังดำเนินการ", modulePending, colors.amber, colors.amberText],
      [body.module === "kpi" ? "ไม่ผ่านเป้าหมาย" : "ต้องติดตาม", moduleRate, colors.rose, colors.roseText],
      ["ปีข้อมูล", body.year, colors.green, colors.greenText],
    ] as const;
    ["A", "C", "E", "G"].forEach((column, index) => {
      const label = summary.getCell(`${column}5`);
      const value = summary.getCell(`${column}6`);
      label.value = cards[index][0];
      value.value = cards[index][1];
      label.fill = { type: "pattern", pattern: "solid", fgColor: { argb: cards[index][2] } };
      value.fill = { type: "pattern", pattern: "solid", fgColor: { argb: cards[index][2] } };
      label.font = { bold: true, color: { argb: colors.muted }, size: 10 };
      value.font = { bold: true, color: { argb: cards[index][3] }, size: 22 };
      label.alignment = { horizontal: "center", vertical: "middle" };
      value.alignment = { horizontal: "center", vertical: "middle" };
      summary.mergeCells(`${column}5:${String.fromCharCode(column.charCodeAt(0) + 1)}5`);
      summary.mergeCells(`${column}6:${String.fromCharCode(column.charCodeAt(0) + 1)}6`);
      summary.getCell(`${column}5`).border = allBorders;
      summary.getCell(`${column}6`).border = allBorders;
    });
    summary.getRow(5).height = 24;
    summary.getRow(6).height = 42;

    summary.getCell("A9").value = `${moduleLabel} DATA`;
    summary.getCell("A9").font = { bold: true, color: { argb: colors.navy }, size: 12 };
    [
      ["Dataset", "Records"],
      [moduleLabel, moduleCount],
    ].forEach((values, rowIndex) => {
      summary.getRow(10 + rowIndex).values = values;
    });
    styleHeader(summary.getRow(10));
    styleDataRows(summary, 11);
    summary.views = [{ state: "frozen", ySplit: 2 }];

    if (body.module === "dar") addDetailSheet(wb, "DAR", [
      { header: "ID", key: "id", width: 30 },
      { header: "Request Date", key: "requestDate", width: 16 },
      { header: "Department", key: "department", width: 26 },
      { header: "Document Type", key: "docType", width: 22 },
      { header: "Objective", key: "objective", width: 34 },
      { header: "Status", key: "status", width: 22 },
    ], body.dars.map((dar) => ({ id: dar.id, requestDate: dar.requestDate, department: dar.requesterDepartmentName ?? dar.departmentId, docType: dar.docType, objective: dar.objective, status: dar.status })));

    if (body.module === "car") addDetailSheet(wb, "CAR", [
      { header: "ID", key: "id", width: 30 },
      { header: "Issued / Created", key: "createdAt", width: 18 },
      { header: "Department", key: "department", width: 28 },
      { header: "Status", key: "status", width: 18 },
      { header: "Response Due", key: "responseDueAt", width: 18 },
      { header: "SLA", key: "sla", width: 16 },
    ], body.cars.map((car) => ({ id: car.id, createdAt: car.issuedAt ?? car.createdAt, department: car.targetDepartmentName ?? "-", status: car.status, responseDueAt: car.responseDueAt, sla: car.responseDueAt && car.responseDueAt < new Date() && !["CLOSED", "CANCELLED"].includes(car.status) ? "OVERDUE" : "On track" })));

    if (body.module === "kpi") addDetailSheet(wb, "KPI", [
      { header: "ID", key: "id", width: 30 },
      { header: "Year", key: "year", width: 10 },
      { header: "Month", key: "month", width: 14 },
      { header: "Department", key: "department", width: 28 },
      { header: "Objective", key: "objective", width: 34 },
      { header: "Actual", key: "actual", width: 14 },
      { header: "Target", key: "target", width: 14 },
      { header: "Unit", key: "unit", width: 12 },
      { header: "Status", key: "status", width: 16 },
    ], body.kpis.map((kpi) => ({ id: kpi.id, year: kpi.monthlyReport.year, month: kpi.monthlyReport.month, department: kpi.monthlyReport.kpi.department, objective: kpi.kpiObjective.objective, actual: kpi.actualResult, target: kpi.kpiObjective.target, unit: kpi.kpiObjective.unit ?? "", status: kpi.achievedStatus })));

    if (body.module === "audit") addDetailSheet(wb, "Audit", [
      { header: "ID", key: "id", width: 30 },
      { header: "Created Date", key: "createdAt", width: 18 },
      { header: "Department", key: "department", width: 26 },
      { header: "Category", key: "category", width: 22 },
      { header: "Status", key: "status", width: 18 },
    ], body.auditFindings.map((finding) => ({ id: finding.id, createdAt: finding.createdAt, department: finding.departmentId ?? "-", category: finding.category, status: finding.status })));

    for (const sheet of wb.worksheets) {
      sheet.eachRow((row) => row.eachCell((cell) => {
        if (cell.value instanceof Date) cell.numFmt = "dd/mm/yyyy";
      }));
    }

    const buffer = await wb.xlsx.writeBuffer();
    return new Response(buffer as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="QMS-${body.module.toUpperCase()}-${body.year}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
