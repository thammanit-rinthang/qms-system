import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import ExcelJS from "exceljs";
import { DarExportService } from "@/services/darExportService";
import { QmsConfigService } from "@/services/qmsConfigService";
import { OBJECTIVE_LABELS, DOC_TYPE_LABELS, DAR_STATUS_LABELS } from "@/types/dar";
import type { DarObjective, DarDocType, DarStatus } from "@/types/dar";
import { isPrivilegedQmsRole } from "@/lib/qms-roles";

const filterSchema = z.object({
  status: z.string().optional(),
  department: z.string().optional(),
  docType: z.string().optional(),
  objective: z.string().optional(),
  search: z.string().optional(),
  user: z.string().optional(),
  userId: z.string().optional(),
  year: z.string().optional(),
  month: z.string().optional(),
  from: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  to: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
});

const exportService = new DarExportService();
const qmsConfigService = new QmsConfigService();

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const isPrivileged = isPrivilegedQmsRole(session.user.role);

    const sp = req.nextUrl.searchParams;
    const filter = filterSchema.parse({
      status: sp.get("status") ?? undefined,
      department: sp.get("department") ?? undefined,
      docType: sp.get("docType") ?? undefined,
      objective: sp.get("objective") ?? undefined,
      search: sp.get("search") ?? undefined,
      user: sp.get("user") ?? undefined,
      userId: sp.get("userId") ?? undefined,
      year: sp.get("year") ?? undefined,
      month: sp.get("month") ?? undefined,
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
    });

    let fromDate = filter.from;
    let toDate = filter.to;
    if (filter.year) {
      const yearVal = parseInt(filter.year, 10);
      if (!Number.isNaN(yearVal)) {
        if (filter.month) {
          const monthMap: Record<string, number> = {
            jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
            jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
            january: 1, february: 2, march: 3, april: 4, june: 6,
            july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
          };
          let monthVal = parseInt(filter.month, 10);
          if (Number.isNaN(monthVal) && monthMap[filter.month.toLowerCase()]) {
            monthVal = monthMap[filter.month.toLowerCase()];
          }
          if (!Number.isNaN(monthVal) && monthVal >= 1 && monthVal <= 12) {
            fromDate = new Date(yearVal, monthVal - 1, 1);
            toDate = new Date(yearVal, monthVal, 0, 23, 59, 59, 999);
          } else {
            fromDate = new Date(yearVal, 0, 1);
            toDate = new Date(yearVal, 11, 31, 23, 59, 59, 999);
          }
        } else {
          fromDate = new Date(yearVal, 0, 1);
          toDate = new Date(yearVal, 11, 31, 23, 59, 59, 999);
        }
      }
    }

    const [rows, naming] = await Promise.all([
      exportService.listDars({
        ...(filter.status && { status: filter.status as never }),
        ...(filter.department && { requesterDepartmentName: { contains: filter.department, mode: "insensitive" } }),
        ...(filter.docType && { docType: filter.docType }),
        ...(filter.objective && { objective: filter.objective }),
        ...(filter.userId && { OR: [{ requesterId: filter.userId }, { requesterAuthUserId: filter.userId }] }),
        ...(filter.user && { requesterName: { contains: filter.user, mode: "insensitive" } }),
        ...(filter.search && {
          OR: [
            { darNo: { contains: filter.search, mode: "insensitive" } },
            { objective: { contains: filter.search, mode: "insensitive" } },
            { docType: { contains: filter.search, mode: "insensitive" } },
            { reason: { contains: filter.search, mode: "insensitive" } },
            { requesterName: { contains: filter.search, mode: "insensitive" } },
          ],
        }),
        ...(!isPrivileged && { OR: [{ requesterId: session.user.id }, { requesterAuthUserId: session.user.id }] }),
        ...(fromDate || toDate ? { requestDate: { gte: fromDate, lte: toDate } } : {}),
      }),
      qmsConfigService.getExportNamingMeta("DAR", {
        label: "Document Action Request (DAR)",
        fileBaseName: "dar-export",
        worksheetName: "DAR",
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

    ws.columns = [
      { header: "เลขที่คำขอ (DAR No.)", key: "darNo", width: 22 },
      { header: "วันที่ยื่นคำขอ", key: "requestDate", width: 18 },
      { header: "แผนก", key: "department", width: 24 },
      { header: "ผู้ยื่นคำขอ", key: "requester", width: 24 },
      { header: "วัตถุประสงค์", key: "objective", width: 32 },
      { header: "ประเภทเอกสาร", key: "docType", width: 22 },
      { header: "สถานะ", key: "status", width: 18 },
      { header: "เลขที่เอกสารในคำขอ", key: "docNumbers", width: 40 },
      { header: "ชื่อเอกสารในคำขอ", key: "docNames", width: 50 },
      { header: "Revision", key: "revisions", width: 18 },
      { header: "วันกำหนดใช้", key: "effectiveDates", width: 24 },
      { header: "ผู้ดำเนินการ QMS", key: "qmsUser", width: 24 },
      { header: "วันที่ QMS ดำเนินการ", key: "qmsDate", width: 18 },
    ];

    ws.getRow(1).eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.border = allBorders;
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    ws.getRow(1).height = 24;

    for (const row of rows) {
      const objectiveLabel = OBJECTIVE_LABELS[row.objective as DarObjective] || row.objective;
      const docTypeLabel = DOC_TYPE_LABELS[row.docType as DarDocType] || row.docType;
      const statusLabel = DAR_STATUS_LABELS[row.status as DarStatus] || row.status;

      const added = ws.addRow({
        darNo: row.darNo ?? "",
        requestDate: row.requestDate.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" }),
        department: row.requesterDepartmentName ?? "",
        requester: row.requesterName ?? row.requesterId,
        objective: objectiveLabel,
        docType: docTypeLabel,
        status: statusLabel,
        docNumbers: row.items.map((item: { docNumber: string }) => item.docNumber).join(", "),
        docNames: row.items.map((item: { docName: string }) => item.docName).join(", "),
        revisions: row.items.map((item: { revision: string }) => item.revision).join(", "),
        effectiveDates: row.items.map((item: { effectiveDate?: Date | null }) => (
          item.effectiveDate
            ? item.effectiveDate.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })
            : "-"
        )).join(", "),
        qmsUser: row.qmsProcessing?.qmsUserName ?? "",
        qmsDate: row.qmsProcessing?.processDate
          ? row.qmsProcessing.processDate.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" })
          : "",
      });
      added.eachCell((cell) => {
        cell.border = allBorders;
        cell.alignment = { vertical: "top", wrapText: false };
      });
    }

    ws.autoFilter = { from: "A1", to: "M1" };
    ws.views = [{ state: "frozen", ySplit: 1 }];

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
