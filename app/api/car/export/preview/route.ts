import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { CarExportService } from "@/services/carExportService";

type ExportRow = {
  carNo: string;
  issuedAt: Date | null;
  defectDetail: string;
  targetDepartmentName: string | null;
  responseDueAt: Date | null;
  status: string;
  response: {
    responderName: string | null;
    responderDepartment: string | null;
    respondedAt: Date | null;
    plannedCompletionDate: Date | null;
  } | null;
  verifications: Array<{
    round: number;
    verifiedAt: Date | null;
    nextDueDate: Date | null;
    verifierName: string | null;
    findings: string | null;
  }>;
  mrSignature: {
    signedAt: Date | null;
    comment: string | null;
  } | null;
};

const filterSchema = z.object({
  search:     z.string().optional(),
  status:     z.string().optional(),
  sourceType: z.string().optional(),
  department: z.string().optional(),
  from:       z.string().optional(),
  to:         z.string().optional(),
});

const exportService = new CarExportService();

export async function GET(req: NextRequest) {
  try {
    await requireRole("QMS", "MR", "IT");

    const sp = req.nextUrl.searchParams;
    const filter = filterSchema.parse({
      search:     sp.get("search")     ?? undefined,
      status:     sp.get("status")     ?? undefined,
      sourceType: sp.get("sourceType") ?? undefined,
      department: sp.get("department") ?? undefined,
      from:       sp.get("from")       ?? undefined,
      to:         sp.get("to")         ?? undefined,
    });

    const rawRows = await exportService.listCars({
      ...(filter.search && { OR: [{ carNo: { contains: filter.search, mode: "insensitive" as const } }, { defectDetail: { contains: filter.search, mode: "insensitive" as const } }] }),
      ...(filter.status && { status: filter.status as never }),
      ...(filter.sourceType && { sourceType: filter.sourceType as never }),
      ...(filter.department && { targetDepartmentName: { contains: filter.department } }),
      ...(filter.from || filter.to ? {
        createdAt: {
          ...(filter.from ? { gte: new Date(filter.from) } : {}),
          ...(filter.to ? { lte: new Date(filter.to) } : {}),
        }
      } : {}),
    });
    const rows = rawRows as unknown as ExportRow[];

    const fmtDate = (d: Date | null | undefined) =>
      d ? d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" }) : "";

    const data = rows.map((r, idx) => {
      const v1 = r.verifications.find((v) => v.round === 1);
      const v2 = r.verifications.find((v) => v.round === 2);
      const editorSection = r.response?.responderDepartment ?? r.targetDepartmentName ?? "";
      const followerSection = r.verifications.length > 0 ? "QMS/MR" : "";

      return {
        no: idx + 1,
        carNo: r.carNo,
        issuedAt: fmtDate(r.issuedAt),
        defectDetail: r.defectDetail,
        department: r.targetDepartmentName ?? "",
        editor: r.response?.responderName ?? "",
        editorSection,
        follower: v1?.verifierName ?? "",
        followerSection,
        dueDate: fmtDate(r.responseDueAt),
        replyDate: fmtDate(r.response?.respondedAt),
        plannedFinish: fmtDate(r.response?.plannedCompletionDate),
        follow1st: fmtDate(v1?.verifiedAt),
        dueDate2nd: fmtDate(v1?.nextDueDate),
        follow2nd: fmtDate(v2?.verifiedAt),
        closingDate: fmtDate(r.mrSignature?.signedAt),
        status: r.status,
        remark: r.mrSignature?.comment ?? v1?.findings ?? "",
      };
    });

    return Response.json({ data });
  } catch (err) {
    return handleApiError(err);
  }
}
