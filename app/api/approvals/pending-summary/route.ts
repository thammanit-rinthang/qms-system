import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ApprovalsService } from "@/services/approvalsService";

const approvalsService = new ApprovalsService();

export async function GET() {
  try {
    const session = await requireAuth();
    const data = await approvalsService.getPendingSummaryForUser(
      session.user.id,
      session.user.authUserId,
      session.user.role,
    );
    return sendSuccess(data, "Pending approvals retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
