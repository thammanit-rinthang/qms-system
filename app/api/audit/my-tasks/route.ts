import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { AuditPlanService } from "@/services/audit/auditPlanService";

const auditPlanService = new AuditPlanService();

export async function GET() {
  try {
    const session = await requireAuth();
    const authUserId = session.user.authUserId ?? session.user.id;

    const result = await auditPlanService.getMyTasks(authUserId);

    return sendSuccess(result, "My tasks retrieved");
  } catch (err) {
    return handleApiError(err);
  }
}
