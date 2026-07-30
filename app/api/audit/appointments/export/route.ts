import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import ExcelJS from "exceljs";
import { AuditAppointmentExportService } from "@/services/audit/auditAppointmentExportService";
import { QmsConfigService } from "@/services/qmsConfigService";

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

    const [rows, naming, auditorConfig] = await Promise.all([
      exportService.listAppointments({
        year: filter.year,
        status: filter.status as never,
      }),
      qmsConfigService.getExportNamingMeta("AUDIT_APPT", {
        label: "Audit Appointment Letter",
        fileBaseName: "audit-appointments-export",
        worksheetName: "Appointments",
      }),
      qmsConfigService.getSingleFooterConfig("AUDITOR"),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = "QMS System";
    wb.created = new Date();
    wb.title = naming.label;

    // ── Sheet 1: Appointments ────────────────────────────────────────────────
    const wsAppt = wb.addWorksheet(naming.worksheetName);

    const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F1059" } };
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    const border: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FFCCCCCC" } };
    const allBorders: Partial<ExcelJS.Borders> = { top: border, left: border, bottom: border, right: border };

    wsAppt.columns = [
      { header: "Appointment No.",    key: "apptNo",      width: 22 },
      { header: "Year",               key: "year",        width: 8  },
      { header: "Title",              key: "title",       width: 40 },
      { header: "Standards",          key: "standards",   width: 28 },
      { header: "Status",             key: "status",      width: 20 },
      { header: "Owner",              key: "owner",       width: 24 },
      { header: "Reviewer",           key: "reviewer",    width: 24 },
      { header: "Approver",           key: "approver",    width: 24 },
      { header: "Published At",       key: "publishedAt", width: 18 },
      { header: "Created At",         key: "createdAt",   width: 18 },
    ];

    wsAppt.getRow(1).eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.border = allBorders;
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    wsAppt.getRow(1).height = 22;

    const fmt = (d: Date | null | undefined) =>
      d ? d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" }) : "";

    for (const r of rows) {
      const added = wsAppt.addRow({
        apptNo:      r.appointmentNo,
        year:        r.year,
        title:       r.title,
        standards:   r.standards.join(", "),
        status:      r.status,
        owner:       r.ownerNameSnapshot ?? r.ownerEmail ?? "",
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

    wsAppt.autoFilter = { from: "A1", to: "J1" };
    wsAppt.views = [{ state: "frozen", ySplit: 1 }];

    // ── Sheet 2: Auditors (members) ──────────────────────────────────────────
    const auditorSheetLabel = auditorConfig.label.trim() || "Auditors";
    const wsMem = wb.addWorksheet(getRelatedWorksheetName(naming.worksheetName, auditorSheetLabel));

    wsMem.columns = [
      { header: "Appointment No.", key: "apptNo",     width: 22 },
      { header: "Year",            key: "year",       width: 8  },
      { header: "Auditor Name",    key: "name",       width: 28 },
      { header: "Department",      key: "department", width: 26 },
      { header: "Role",            key: "role",       width: 16 },
      { header: "Standards",       key: "standards",  width: 28 },
    ];

    wsMem.getRow(1).eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.border = allBorders;
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    wsMem.getRow(1).height = 22;

    for (const r of rows) {
      for (const m of r.members) {
        const added = wsMem.addRow({
          apptNo:     r.appointmentNo,
          year:       r.year,
          name:       m.name,
          department: m.department ?? "",
          role:       m.role,
          standards:  m.standards.join(", "),
        });
        added.eachCell((cell) => {
          cell.border = allBorders;
          cell.alignment = { vertical: "top", wrapText: false };
        });
      }
    }

    wsMem.autoFilter = { from: "A1", to: "F1" };
    wsMem.views = [{ state: "frozen", ySplit: 1 }];

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

const exportService = new AuditAppointmentExportService();
const qmsConfigService = new QmsConfigService();

function getRelatedWorksheetName(baseName: string, suffix: string): string {
  const reservedLength = suffix.length + 3;
  const trimmedBase = baseName.trim();
  const truncatedBase = trimmedBase.slice(0, Math.max(0, 31 - reservedLength)).trim();
  const worksheetBase = truncatedBase || trimmedBase.slice(0, 31).trim() || "Export";
  return `${worksheetBase} - ${suffix}`.slice(0, 31);
}
