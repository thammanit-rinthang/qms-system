import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import ExcelJS from "exceljs";
import { QmsConfigService } from "@/services/qmsConfigService";
import { AuditAppointmentRepository } from "@/repositories/audit/auditAppointmentRepository";

const filterSchema = z.object({
  year:   z.coerce.number().optional(),
  status: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireRole("QMS", "MR", "IT");

    const sp = req.nextUrl.searchParams;
    const filter = filterSchema.parse({
      year:   sp.get("year")   ?? undefined,
      status: sp.get("status") ?? undefined,
    });

    const [rows, naming] = await Promise.all([
      appointmentRepo.findForExport({
        year: filter.year,
        status: filter.status as never,
      }),
      qmsConfigService.getExportNamingMeta("AUDITOR", {
        label: "Auditor List",
        fileBaseName: "auditor-export",
        worksheetName: "Auditors",
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
      { header: "Appointment No.",    key: "apptNo",      width: 22 },
      { header: "Year",               key: "year",        width: 8  },
      { header: "Title",              key: "title",       width: 40 },
      { header: "Auditor Name",       key: "auditorName", width: 28 },
      { header: "Department",         key: "department",  width: 26 },
      { header: "Role",               key: "role",        width: 16 },
      { header: "Standards",          key: "standards",   width: 28 },
      { header: "Reviewer",           key: "reviewer",    width: 24 },
      { header: "Approver",           key: "approver",    width: 24 },
      { header: "Published At",       key: "publishedAt", width: 18 },
      { header: "Created At",         key: "createdAt",   width: 18 },
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
      for (const m of r.members) {
        const added = ws.addRow({
          apptNo:      r.appointmentNo,
          year:        r.year,
          title:       r.title,
          auditorName: m.name,
          department:  m.department ?? "",
          role:        m.role,
          standards:   m.standards.join(", "),
          reviewer:    r.reviewerNameSnapshot ?? r.reviewerEmail ?? "",
          approver:    r.approverNameSnapshot ?? r.approverEmail ?? "",
          publishedAt: fmt(r.publishedAt),
          createdAt:   fmt(r.createdAt),
        });
        added.eachCell((cell) => {
          cell.border = allBorders;
          cell.alignment = { vertical: "top", wrapText: false };
        });
      }
    }

    ws.autoFilter = { from: "A1", to: "K1" };
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

const appointmentRepo = new AuditAppointmentRepository();
const qmsConfigService = new QmsConfigService();
