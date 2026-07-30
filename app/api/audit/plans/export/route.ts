import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import ExcelJS from "exceljs";
import { QmsConfigService } from "@/services/qmsConfigService";
import { AuditPlanRepository } from "@/repositories/audit/auditPlanRepository";

const filterSchema = z.object({
  search:    z.string().optional(),
  auditType: z.enum(["INTERNAL", "EXTERNAL"]).optional(),
  status:    z.enum([
    "DRAFT",
    "PENDING_REVIEW",
    "PENDING_APPROVAL",
    "PLANNED",
    "ANNOUNCED",
    "IN_PROGRESS",
    "WAITING_CORRECTIVE",
    "READY_TO_CLOSE",
    "CLOSED",
    "CANCELLED"
  ]).optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireRole("QMS", "MR", "IT");

    const sp = req.nextUrl.searchParams;
    const filter = filterSchema.parse({
      search:    sp.get("search")    || undefined,
      auditType: sp.get("auditType") || undefined,
      status:    sp.get("status")    || undefined,
    });

    const [rows, naming] = await Promise.all([
      planRepo.findForExport({
        search:    filter.search,
        auditType: filter.auditType,
        status:    filter.status,
      }),
      qmsConfigService.getExportNamingMeta("AUDIT_PLAN", {
        label: "Audit Plans",
        fileBaseName: "audit-plans-export",
        worksheetName: "Plans",
      }),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = "QMS System";
    wb.created = new Date();
    wb.title = naming.label;

    const ws = wb.addWorksheet(naming.worksheetName);

    const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F1059" } };
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    const border: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FFCCCCCC" } };
    const allBorders: Partial<ExcelJS.Borders> = { top: border, left: border, bottom: border, right: border };

    ws.columns = [
      { header: "Audit No.",  key: "auditNo",   width: 18 },
      { header: "Title",      key: "title",     width: 36 },
      { header: "Audit Type", key: "auditType", width: 14 },
      { header: "Standard",   key: "standard",  width: 20 },
      { header: "Status",     key: "status",    width: 18 },
      { header: "Start Date", key: "startDate", width: 16 },
      { header: "End Date",   key: "endDate",   width: 16 },
      { header: "Scope",      key: "scope",     width: 24 },
      { header: "Objective",  key: "objective", width: 24 },
{ header: "Prepare (ผู้จัดทำ)", key: "owner", width: 24 },
      { header: "Reviewer",   key: "reviewer",  width: 24 },
      { header: "Approver",   key: "approver",  width: 24 },
      { header: "Created At", key: "createdAt", width: 16 },
      { header: "Updated At", key: "updatedAt", width: 16 },
    ];

    ws.getRow(1).eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.border = allBorders;
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    ws.getRow(1).height = 22;

    const fmt = (d: Date | null | undefined) =>
      d ? d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" }) : "";

    for (const r of rows) {
      const added = ws.addRow({
        auditNo:   r.auditNo,
        title:     r.title,
        auditType: r.auditType,
        standard:  r.standard ?? "",
        status:    r.status,
        startDate: fmt(r.startDate),
        endDate:   fmt(r.endDate),
        scope:     r.scope ?? "",
        objective: r.objective ?? "",
        owner:     r.ownerNameSnapshot ?? r.ownerEmail ?? "",
        reviewer:  r.reviewerNameSnapshot ?? r.reviewerEmail ?? "",
        approver:  r.approverNameSnapshot ?? r.approverEmail ?? "",
        createdAt: fmt(r.createdAt),
        updatedAt: fmt(r.updatedAt),
      });
      added.eachCell((cell) => {
        cell.border = allBorders;
        cell.alignment = { vertical: "top", wrapText: false };
      });
    }

    ws.autoFilter = { from: "A1", to: "N1" };
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

const planRepo = new AuditPlanRepository();
const qmsConfigService = new QmsConfigService();
