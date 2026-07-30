import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { sendSuccess } from "@/lib/apiResponse";
import { KpiExportService } from "@/services/kpiExportService";

const filterSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  kpiId: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
});

const exportService = new KpiExportService();

export async function GET(req: NextRequest) {
  try {
    await requireRole("QMS", "MR", "IT");

    const sp = req.nextUrl.searchParams;
    const filter = filterSchema.parse({
      year: sp.get("year") ?? new Date().getFullYear(),
      kpiId: sp.get("kpiId") ?? undefined,
      department: sp.get("department") ?? undefined,
    });

    const preview = await exportService.getYearlyPreview(filter);
    return sendSuccess(preview, "KPI yearly preview loaded");
  } catch (error) {
    return handleApiError(error);
  }
}
