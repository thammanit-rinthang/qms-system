import { NextRequest } from "next/server";
import { z } from "zod";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { requireAuth } from "@/lib/auth";
import { KpiMonthlySummaryService } from "@/services/kpiMonthlySummaryService";
import { ApprovalSignatureRepository } from "@/repositories/approvalSignatureRepository";

const service = new KpiMonthlySummaryService();
const approvalSignatureRepo = new ApprovalSignatureRepository();

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { year } = querySchema.parse({ year: req.nextUrl.searchParams.get("year") });

    const record = await service.getByYear(year);
    const signatures = record ? await approvalSignatureRepo.findByDocument("KPI_MONTHLY_SUMMARY", record.id) : [];

    return sendSuccess({ record, signatures });
  } catch (error) {
    return handleApiError(error);
  }
}
