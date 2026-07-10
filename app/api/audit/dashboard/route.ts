import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { AuditPlanService } from "@/services/audit/auditPlanService";

const auditPlanService = new AuditPlanService();

export async function GET() {
  try {
    await requireAuth();

    const result = await auditPlanService.getDashboardData();

    return sendSuccess(result, "Dashboard data retrieved");
  } catch (err) {
    return handleApiError(err);
  }
}
