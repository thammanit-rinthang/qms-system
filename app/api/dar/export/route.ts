import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import ExcelJS from "exceljs";
import { DarExportService } from "@/services/darExportService";

const filterSchema = z.object({
  status:     z.string().optional(),
  department: z.string().optional(),
  from:       z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  to:         z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
});

export async function GET(req: NextRequest) {
  try {
    await requireRole("QMS", "MR", "IT");

    const sp = req.nextUrl.searchParams;
    const filter = filterSchema.parse({
      status:     sp.get("status")     ?? undefined,
      department: sp.get("department") ?? undefined,
      from:       sp.get("from")       ?? undefined,
      to:         sp.get("to")         ?? undefined,
    });

    const rows = await exportService.listDars({
      ...(filter.status && { status: filter.status as never }),
      ...(filter.department && { requesterDepartmentName: { contains: filter.department } }),
      ...(filter.from || filter.to ? { requestDate: { gte: filter.from, lte: filter.to } } : {}),
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = "QMS System";
    wb.created = new Date();

    const ws = wb.addWorksheet("DAR");

    const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F1059" } };
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    const border: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FFCCCCCC" } };
    const allBorders: Partial<ExcelJS.Borders> = { top: border, left: border, bottom: border, right: border };

    ws.columns = [
      { header: "DAR No.",           key: "darNo",          width: 20 },
      { header: "Request Date",      key: "requestDate",    width: 18 },
      { header: "Department",        key: "department",     width: 24 },
      { header: "Requester",         key: "requester",      width: 24 },
      { header: "Objective",         key: "objective",      width: 40 },
      { header: "Doc Type",          key: "docType",        width: 16 },
      { header: "Status",            key: "status",         width: 18 },
      { header: "Doc Numbers",       key: "docNumbers",     width: 40 },
      { header: "Doc Names",         key: "docNames",       width: 50 },
      { header: "QMS Processed By",  key: "qmsUser",        width: 24 },
      { header: "QMS Process Date",  key: "qmsDate",        width: 18 },
    ];

    ws.getRow(1).eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.border = allBorders;
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    ws.getRow(1).height = 22;

    for (const r of rows) {
      const added = ws.addRow({
        darNo:       r.darNo ?? "",
        requestDate: r.requestDate.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" }),
        department:  r.requesterDepartmentName ?? "",
        requester:   r.requesterName ?? r.requesterId,
        objective:   r.objective,
        docType:     r.docType,
        status:      r.status,
        docNumbers:  r.items.map((i: { docNumber: string }) => i.docNumber).join(", "),
        docNames:    r.items.map((i: { docName: string }) => i.docName).join(", "),
        qmsUser:     r.qmsProcessing?.qmsUserName ?? "",
        qmsDate:     r.qmsProcessing?.processDate
          ? r.qmsProcessing.processDate.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })
          : "",
      });
      added.eachCell((cell) => {
        cell.border = allBorders;
        cell.alignment = { vertical: "top", wrapText: false };
      });
    }

    ws.autoFilter = { from: "A1", to: "K1" };
    ws.views = [{ state: "frozen", ySplit: 1 }];

    const buffer = await wb.xlsx.writeBuffer();
    const date   = new Date().toISOString().slice(0, 10);

    return new Response(buffer as BodyInit, {
      headers: {
        "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="dar-export-${date}.xlsx"`,
        "Cache-Control":       "no-store",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const exportService = new DarExportService();
