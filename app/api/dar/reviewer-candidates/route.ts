
import { requireAuth } from "@/lib/auth";
import { DarService } from "@/services/darService";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";

const darService = new DarService();

export async function GET() {
  try {
    const session = await requireAuth();
    const candidates = await darService.getReviewerCandidates(session.user.accessToken);
    return sendSuccess(candidates, "Reviewer candidates retrieved successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
