import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { sendSuccess } from "@/lib/apiResponse";
import { QmsSummaryService } from "@/services/qmsSummaryService";
import { z } from "zod";

const qmsSummaryService = new QmsSummaryService();
const qmsPendingCountSchema = z.object({});

export async function GET() {
  try {
    qmsPendingCountSchema.parse({});
    await requireAuth();
    const data = await qmsSummaryService.getPendingCountSummary();
    return sendSuccess({ count: data.pendingCount, ...data }, "QMS pending count retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
