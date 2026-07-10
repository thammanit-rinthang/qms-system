import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import ExcelJS from "exceljs";
import { CarExportService } from "@/services/carExportService";

const filterSchema = z.object({
  status:     z.string().optional(),
  sourceType: z.string().optional(),
  department: z.string().optional(),
  from:       z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  to:         z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
});

const SOURCE_LABEL: Record<string, string> = {
  I: "Internal Audit",
  C: "Customer Complaint",
  N: "NCR",
  O: "Other",
};

export async function GET(req: NextRequest) {
  try {
    await requireRole("QMS", "MR", "IT");

    const sp = req.nextUrl.searchParams;
    const filter = filterSchema.parse({
      status:     sp.get("status")     ?? undefined,
      sourceType: sp.get("sourceType") ?? undefined,
      department: sp.get("department") ?? undefined,
      from:       sp.get("from")       ?? undefined,
      to:         sp.get("to")         ?? undefined,
    });

    const rows = await exportService.listCars({
      ...(filter.status && { status: filter.status as never }),
      ...(filter.sourceType && { sourceType: filter.sourceType as never }),
      ...(filter.department && { targetDepartmentName: { contains: filter.department } }),
      ...(filter.from || filter.to ? { createdAt: { gte: filter.from, lte: filter.to } } : {}),
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = "QMS System";
    wb.created = new Date();

    const ws = wb.addWorksheet("CAR");

    const headerFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F1059" } };
    const headerFont: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    const border: Partial<ExcelJS.Border> = { style: "thin", color: { argb: "FFCCCCCC" } };
    const allBorders: Partial<ExcelJS.Borders> = { top: border, left: border, bottom: border, right: border };

    ws.columns = [
      { header: "CAR No.",               key: "carNo",             width: 18 },
      { header: "Issued Date",            key: "issuedAt",          width: 16 },
      { header: "Status",                 key: "status",            width: 18 },
      { header: "Source",                 key: "source",            width: 20 },
      { header: "ISO Standards",          key: "isoStandards",      width: 24 },
      { header: "Defect Detail",          key: "defect",            width: 40 },
      { header: "NC Ref",                 key: "ncRef",             width: 20 },
      { header: "Issuer",                 key: "issuer",            width: 22 },
      { header: "Target Dept.",           key: "targetDept",        width: 24 },
      { header: "Response Due",           key: "responseDue",       width: 16 },
      { header: "Responded At",           key: "respondedAt",       width: 16 },
      { header: "Root Cause",             key: "rootCause",         width: 40 },
      { header: "Immediate Action",       key: "immediateAction",   width: 40 },
      { header: "Preventive Action",      key: "preventiveAction",  width: 40 },
      { header: "Planned Completion",     key: "plannedCompletion", width: 18 },
      { header: "Verify 1 Result",        key: "v1result",          width: 14 },
      { header: "Verify 1 Date",          key: "v1date",            width: 16 },
      { header: "Verify 2 Result",        key: "v2result",          width: 14 },
      { header: "Verify 2 Date",          key: "v2date",            width: 16 },
      { header: "MR Signed By",           key: "mrSigner",          width: 22 },
      { header: "MR Signed Date",         key: "mrSignedAt",        width: 16 },
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
      const v1 = r.verifications.find((v: { round: number }) => v.round === 1);
      const v2 = r.verifications.find((v: { round: number }) => v.round === 2);

      const added = ws.addRow({
        carNo:             r.carNo,
        issuedAt:          fmt(r.issuedAt),
        status:            r.status,
        source:            SOURCE_LABEL[r.sourceType] ?? r.sourceType,
        isoStandards:      r.isoStandards.join(", "),
        defect:            r.defectDetail,
        ncRef:             r.nonConformanceRef,
        issuer:            r.issuerName ?? r.issuerId,
        targetDept:        r.targetDepartmentName ?? "",
        responseDue:       fmt(r.responseDueAt),
        respondedAt:       fmt(r.response?.respondedAt),
        rootCause:         r.response?.rootCauseSummary ?? "",
        immediateAction:   r.response?.immediateAction ?? "",
        preventiveAction:  r.response?.preventiveAction ?? "",
        plannedCompletion: fmt(r.response?.plannedCompletionDate),
        v1result:          v1?.result ?? "",
        v1date:            fmt(v1?.verifiedAt),
        v2result:          v2?.result ?? "",
        v2date:            fmt(v2?.verifiedAt),
        mrSigner:          r.mrSignature?.mrUserName ?? "",
        mrSignedAt:        fmt(r.mrSignature?.signedAt),
      });
      added.eachCell((cell) => {
        cell.border = allBorders;
        cell.alignment = { vertical: "top", wrapText: false };
      });
    }

    ws.autoFilter = { from: "A1", to: "U1" };
    ws.views = [{ state: "frozen", ySplit: 1 }];

    const buffer = await wb.xlsx.writeBuffer();
    const date   = new Date().toISOString().slice(0, 10);

    return new Response(buffer as BodyInit, {
      headers: {
        "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="car-export-${date}.xlsx"`,
        "Cache-Control":       "no-store",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const exportService = new CarExportService();
