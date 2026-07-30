import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { CarRepository } from "@/repositories/carRepository";
import type { CarStatus } from "@/generated/prisma/client";
import ExcelJS from "exceljs";
import { QmsConfigService } from "@/services/qmsConfigService";

const querySchema = z.object({
  dueFilter: z.string().optional(),
  status: z.string().optional(),
});

const carRepository = new CarRepository();
const qmsConfigService = new QmsConfigService();

export async function GET(req: NextRequest) {
  try {
    await requireRole("QMS", "MR", "IT");

    const { searchParams } = req.nextUrl;
    const query = querySchema.parse({
      dueFilter: searchParams.get("dueFilter") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    const parsedStatus = (query.status && query.status !== "all" ? query.status : undefined) as CarStatus | undefined;

    const data = await carRepository.findStatusReport(query.dueFilter, parsedStatus);

    // Export to Excel
    const naming = await qmsConfigService.getExportNamingMeta("CAR_STATUS", {
      label: "CAR Status Report",
      fileBaseName: "car-status-report",
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = "QMS System";
    wb.created = new Date();

    const ws = wb.addWorksheet(naming.worksheetName);

    const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F1059" } };
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    const border: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FFCCCCCC" } };
    const allBorders: Partial<ExcelJS.Borders> = { top: border, left: border, bottom: border, right: border };

    ws.columns = [
      { header: "CAR Number",   key: "carNo",                width: 18 },
      { header: "Issue Date",   key: "issuedAt",             width: 16 },
      { header: "Detail",       key: "defectDetail",         width: 35 },
      { header: "Operator",     key: "targetDepartmentName", width: 22 },
      { header: "Due Date",     key: "responseDueAt",        width: 16 },
      { header: "Follow-up",    key: "followUp",             width: 25 },
      { header: "Closing Date", key: "closingDate",          width: 16 },
      { header: "Status",       key: "status",               width: 15 },
      { header: "Remark",       key: "remark",               width: 35 },
    ];

    ws.getRow(1).eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.border = allBorders;
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    ws.getRow(1).height = 24;

    const fmt = (d: Date | null | undefined) =>
      d ? d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" }) : "";

    for (const r of data) {
      const added = ws.addRow({
        carNo: r.carNo,
        issuedAt: fmt(r.issuedAt),
        defectDetail: r.defectDetail,
        targetDepartmentName: r.targetDepartmentName,
        responseDueAt: fmt(r.responseDueAt),
        followUp: r.followUp,
        closingDate: fmt(r.closingDate),
        status: r.status,
        remark: r.remark,
      });
      added.eachCell((cell) => {
        cell.border = allBorders;
        cell.alignment = { vertical: "top", wrapText: false };
      });
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
