import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { CarRepository } from "@/repositories/carRepository";
import type { CarStatus } from "@/generated/prisma/client";
import ExcelJS from "exceljs";
import { QmsConfigService } from "@/services/qmsConfigService";

const querySchema = z.object({
  year: z.string().optional(),
  department: z.string().optional(),
  status: z.string().optional(),
});

const carRepository = new CarRepository();
const qmsConfigService = new QmsConfigService();

export async function GET(req: NextRequest) {
  try {
    await requireRole("QMS", "MR", "IT");

    const { searchParams } = req.nextUrl;
    const query = querySchema.parse({
      year: searchParams.get("year") ?? undefined,
      department: searchParams.get("department") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    const parsedYear = query.year ? parseInt(query.year, 10) : undefined;
    const parsedStatus = query.status as CarStatus | undefined;

    const filteredData = await carRepository.findSummaryReport(parsedYear, query.department, parsedStatus);

    // Export to Excel
    const naming = await qmsConfigService.getExportNamingMeta("CAR_SUMMARY", {
      label: "CAR Summary Report",
      fileBaseName: "car-summary-report",
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
      { header: "Department",       key: "departmentName", width: 35 },
      { header: "New CAR Count",    key: "newCount",       width: 18 },
      { header: "Closed CAR Count", key: "closedCount",    width: 18 },
      { header: "Total CAR Count",  key: "totalCount",     width: 18 },
    ];

    ws.getRow(1).eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.border = allBorders;
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    ws.getRow(1).height = 24;

    for (const r of filteredData) {
      const added = ws.addRow({
        departmentName: r.departmentName,
        newCount: r.newCount,
        closedCount: r.closedCount,
        totalCount: r.totalCount,
      });
      added.eachCell((cell) => {
        cell.border = allBorders;
        cell.alignment = { vertical: "middle", horizontal: "left" };
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
