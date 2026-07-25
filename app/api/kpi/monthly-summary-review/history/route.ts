import { NextRequest } from "next/server";
import { z } from "zod";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { requireAuth } from "@/lib/auth";
import { KpiMonthlySummaryService } from "@/services/kpiMonthlySummaryService";

const service = new KpiMonthlySummaryService();

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { year } = querySchema.parse({ year: req.nextUrl.searchParams.get("year") });

    const history = await service.getHistory(year);
    return sendSuccess(history);
  } catch (error) {
    return handleApiError(error);
  }
}
