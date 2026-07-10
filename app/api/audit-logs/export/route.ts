import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { AuditLogRepository } from "@/repositories/auditLogRepository";
import ExcelJS from "exceljs";

const filterSchema = z.object({
  action:       z.string().optional(),
  resourceType: z.string().optional(),
  actorUserId:  z.string().optional(),
  search:       z.string().max(100).optional(),
  from:         z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  to:           z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
});

const repo = new AuditLogRepository();

export async function GET(req: NextRequest) {
  try {
    await requireRole("IT");

    const sp = req.nextUrl.searchParams;
    const filter = filterSchema.parse({
      action:       sp.get("action") ?? undefined,
      resourceType: sp.get("resourceType") ?? undefined,
      actorUserId:  sp.get("actorUserId") ?? undefined,
      search:       sp.get("search") ?? undefined,
      from:         sp.get("from") ?? undefined,
      to:           sp.get("to") ?? undefined,
    });

    const rows = await repo.findAllForExport(filter);

    // ── Build Excel ──────────────────────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = "QMS System";
    wb.created = new Date();

    const ws = wb.addWorksheet("Audit Log");

    // Header styling
    const headerFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F1059" },
    };
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    const borderStyle: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FFCCCCCC" } };
    const allBorders: Partial<ExcelJS.Borders> = {
      top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle,
    };

    ws.columns = [
      { header: "Date / Time",   key: "createdAt",    width: 22 },
      { header: "Actor",         key: "actorName",    width: 24 },
      { header: "Email",         key: "actorEmail",   width: 30 },
      { header: "Role",          key: "actorRole",    width: 14 },
      { header: "Action",        key: "action",       width: 16 },
      { header: "Resource Type", key: "resourceType", width: 20 },
      { header: "Resource ID",   key: "resourceId",   width: 38 },
      { header: "Before",        key: "before",       width: 40 },
      { header: "After",         key: "after",        width: 40 },
    ];

    // Style header row
    ws.getRow(1).eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.border = allBorders;
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
    });
    ws.getRow(1).height = 22;

    // Data rows
    for (const row of rows) {
      const added = ws.addRow({
        createdAt:    row.createdAt.toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }),
        actorName:    row.actorName ?? row.actorUserId,
        actorEmail:   row.actorEmail,
        actorRole:    row.actorRole,
        action:       row.action,
        resourceType: row.resourceType,
        resourceId:   row.resourceId,
        before:       row.before != null ? JSON.stringify(row.before) : "",
        after:        row.after  != null ? JSON.stringify(row.after)  : "",
      });
      added.eachCell((cell) => {
        cell.border = allBorders;
        cell.alignment = { vertical: "top", wrapText: false };
      });
    }

    // Auto-filter on header row
    ws.autoFilter = { from: "A1", to: `I1` };

    // Freeze header row
    ws.views = [{ state: "frozen", ySplit: 1 }];

    const buffer = await wb.xlsx.writeBuffer();
    const date   = new Date().toISOString().slice(0, 10);
    const filename = `audit-log-${date}.xlsx`;

    return new Response(buffer as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
