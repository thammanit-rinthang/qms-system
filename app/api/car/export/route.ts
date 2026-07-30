import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import ExcelJS from "exceljs";
import { CarExportService } from "@/services/carExportService";
import { QmsConfigService } from "@/services/qmsConfigService";
import { CAR_STATUS_LABELS, type CarStatus } from "@/types/car";

type ExportRow = {
  carNo: string;
  issuedAt: Date | null;
  defectDetail: string;
  targetDepartmentName: string | null;
  responseDueAt: Date | null;
  status: string;
  response: {
    responderName: string | null;
    responderDepartment: string | null;
    respondedAt: Date | null;
    plannedCompletionDate: Date | null;
  } | null;
  verifications: Array<{
    round: number;
    verifiedAt: Date | null;
    findings: string | null;
    nextDueDate: Date | null;
    verifierName: string | null;
  }>;
  mrSignature: {
    signedAt: Date | null;
    comment: string | null;
  } | null;
};

const filterSchema = z.object({
  search:     z.string().optional(),
  status:     z.string().optional(),
  sourceType: z.string().optional(),
  department: z.string().optional(),
  from:       z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  to:         z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
});

const exportService = new CarExportService();
const qmsConfigService = new QmsConfigService();

export async function GET(req: NextRequest) {
  try {
    await requireRole("QMS", "MR", "IT");

    const sp = req.nextUrl.searchParams;
    const filter = filterSchema.parse({
      search:     sp.get("search")     ?? undefined,
      status:     sp.get("status")     ?? undefined,
      sourceType: sp.get("sourceType") ?? undefined,
      department: sp.get("department") ?? undefined,
      from:       sp.get("from")       ?? undefined,
      to:         sp.get("to")         ?? undefined,
    });

    const [rawRows, naming] = await Promise.all([
      exportService.listCars({
        ...(filter.search && { OR: [{ carNo: { contains: filter.search, mode: "insensitive" as const } }, { defectDetail: { contains: filter.search, mode: "insensitive" as const } }] }),
        ...(filter.status && { status: filter.status as never }),
        ...(filter.sourceType && { sourceType: filter.sourceType as never }),
        ...(filter.department && { targetDepartmentName: { contains: filter.department } }),
        ...(filter.from || filter.to ? { createdAt: { gte: filter.from, lte: filter.to } } : {}),
      }),
      qmsConfigService.getExportNamingMeta("CAR", {
        label: "Corrective Action Register",
        fileBaseName: "car-register",
      }),
    ]);
    const rows = rawRows as unknown as ExportRow[];

    const wb = new ExcelJS.Workbook();
    const templatePath = "docs/template/FM-MR-11 Rev.02  ทะเบียนใบแจ้งดำเนินการแก้ไข.xlsx";
    await wb.xlsx.readFile(templatePath);

    const ws = wb.worksheets[0];
    ws.name = naming.worksheetName;

    const filterYearStr = filter.from ? filter.from.getFullYear().toString() : new Date().getFullYear().toString();
    ws.getCell("R2").value = filterYearStr;

    const refRow = ws.getRow(9);
    const rowStyles = Array.from({ length: 18 }).map((_, c) => {
      const cell = refRow.getCell(c + 1);
      return {
        font: cell.font,
        border: cell.border,
        fill: cell.fill,
        alignment: cell.alignment,
        numFmt: cell.numFmt,
      };
    });

    const fmt = (d: Date | null | undefined) =>
      d ? d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" }) : "";

    const startRow = 9;
    let closedCount = 0;
    let inProcessCount = 0;

    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx];
      const v1 = r.verifications.find((v) => v.round === 1);
      const v2 = r.verifications.find((v) => v.round === 2);

      if (r.status === "CLOSED") closedCount++;
      else if (!["CANCELLED", "DRAFT"].includes(r.status)) inProcessCount++;

      const currentRowNum = startRow + idx;
      const currentRow = ws.getRow(currentRowNum);

      const editorSection = r.response?.responderDepartment ?? r.targetDepartmentName ?? "";
      const followerSection = r.verifications.length > 0 ? "QMS/MR" : "";

      currentRow.getCell(1).value = idx + 1;
      currentRow.getCell(2).value = r.carNo;
      currentRow.getCell(3).value = fmt(r.issuedAt);
      currentRow.getCell(4).value = r.defectDetail;
      currentRow.getCell(5).value = r.targetDepartmentName ?? "";
      currentRow.getCell(6).value = r.response?.responderName ?? "";
      currentRow.getCell(7).value = editorSection;
      currentRow.getCell(8).value = v1?.verifierName ?? "";
      currentRow.getCell(9).value = followerSection;
      currentRow.getCell(10).value = fmt(r.responseDueAt);
      currentRow.getCell(11).value = fmt(r.response?.respondedAt);
      currentRow.getCell(12).value = fmt(r.response?.plannedCompletionDate);
      currentRow.getCell(13).value = fmt(v1?.verifiedAt);
      currentRow.getCell(14).value = fmt(v1?.nextDueDate);
      currentRow.getCell(15).value = fmt(v2?.verifiedAt);
      currentRow.getCell(16).value = fmt(r.mrSignature?.signedAt);
      currentRow.getCell(17).value = CAR_STATUS_LABELS[r.status as CarStatus] ?? r.status;
      currentRow.getCell(18).value = r.mrSignature?.comment ?? v1?.findings ?? "";

      for (let c = 1; c <= 18; c++) {
        const targetCell = currentRow.getCell(c);
        const style = rowStyles[c - 1];
        if (style) {
          if (style.font) targetCell.font = style.font;
          if (style.border) targetCell.border = style.border;
          if (style.fill) targetCell.fill = style.fill;
          if (style.alignment) targetCell.alignment = style.alignment;
          if (style.numFmt) targetCell.numFmt = style.numFmt;
        }
      }
    }

    ws.getCell("B24").value = `Total CAR :`;
    ws.getCell("C24").value = rows.length;
    ws.getCell("D24").value = "Item";
    ws.getCell("B25").value = `Closed :`;
    ws.getCell("C25").value = closedCount;
    ws.getCell("D25").value = "Item";
    ws.getCell("B26").value = `In Process :`;
    ws.getCell("C26").value = inProcessCount;
    ws.getCell("D26").value = "Item";

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
