import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import ExcelJS from "exceljs";
import { KpiExportService } from "@/services/kpiExportService";
import { QmsConfigService } from "@/services/qmsConfigService";

const filterSchema = z.object({
  department: z.string().optional(),
  yearly:     z.coerce.number().optional(),
  status:     z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireRole("QMS", "MR", "IT");

    const sp = req.nextUrl.searchParams;
    const filter = filterSchema.parse({
      department: sp.get("department") ?? undefined,
      yearly:     sp.get("yearly")     ?? undefined,
      status:     sp.get("status")     ?? undefined,
    });

    const [rows, naming] = await Promise.all([
      exportService.listKpis({
      ...(filter.department && { department: { contains: filter.department } }),
      ...(filter.yearly && { yearly: filter.yearly }),
      ...(filter.status && { status: filter.status as never }),
      }),
      qmsConfigService.getExportNamingMeta("KPI_ANNUAL", {
        label: "KPI Annual Objective",
        fileBaseName: "kpi-export",
      }),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = "QMS System";
    wb.created = new Date();

    const ws = wb.addWorksheet(naming.worksheetName);

    const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F1059" } };
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    const border: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FFCCCCCC" } };
    const allBorders: Partial<ExcelJS.Borders> = { top: border, left: border, bottom: border, right: border };
    const revisedFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC6EFCE" } };

    ws.columns = [
      { header: "Year",                    key: "yearly",     width: 8  },
      { header: "Department",              key: "department", width: 26 },
      { header: "Status",                  key: "status",     width: 20 },
      { header: "Prepare",                 key: "prepare",    width: 24 },
      { header: "Reviewer",               key: "reviewer",   width: 24 },
      { header: "Approver",                key: "approver",   width: 24 },
      { header: "Document Name",           key: "docName",    width: 30 },
      { header: "# Objectives",            key: "objCount",   width: 14 },
      { header: "Revised Objectives",      key: "revisedObjs", width: 50 },
      { header: "Objectives (summary)",    key: "objectives", width: 60 },
      { header: "Submitted At",            key: "submitted",  width: 20 },
      { header: "Published At",            key: "published",  width: 20 },
    ];

    ws.getRow(1).eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.border = allBorders;
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    ws.getRow(1).height = 22;

    for (const r of rows) {
      const isKpiRevised = (r as Record<string, unknown>).isRevision as boolean | undefined;
      const revisedObjs = r.objectives.filter((o: { isRevised?: boolean }) => (o as Record<string, unknown>).isRevised === true);
      const added = ws.addRow({
        yearly:     r.yearly,
        department: r.department,
        status:     r.status,
        prepare:    r.prepare,
        reviewer:   r.reviewer,
        approver:   r.approver,
        docName:    ((r as Record<string, unknown>).documentName as string) ?? "",
        objCount:   r.objectives.length,
        revisedObjs: revisedObjs.map((o: { objective: string }) => `[REVISED] ${o.objective}`).join(" | "),
        objectives: r.objectives.map((o: { objective: string }) => o.objective).join(" | "),
        submitted:  r.submittedAt
          ? (r.submittedAt as Date).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })
          : "",
        published:  ((r as Record<string, unknown>).publishedAt
          ? (new Date((r as Record<string, unknown>).publishedAt as string)).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })
          : ""),
      });
      added.eachCell((cell) => {
        if (isKpiRevised) {
          cell.fill = revisedFill;
          cell.font = { ...cell.font, color: { argb: 'FF000000' }, underline: true, italic: true };
        }
        cell.border = allBorders;
        cell.alignment = { vertical: "top", wrapText: false };
      });
    }

    ws.autoFilter = { from: "A1", to: "L1" };
    ws.views = [{ state: "frozen", ySplit: 1 }];

    const buffer = await wb.xlsx.writeBuffer();
    const date   = new Date().toISOString().slice(0, 10);

    return new Response(buffer as BodyInit, {
      headers: {
        "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${naming.fileBaseName}-${date}.xlsx"`,
        "Cache-Control":       "no-store",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const exportService = new KpiExportService();
const qmsConfigService = new QmsConfigService();
