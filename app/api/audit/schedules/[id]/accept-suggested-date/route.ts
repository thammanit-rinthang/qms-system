import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { AuditPlanService } from "@/services/audit/auditPlanService";
import { type NextRequest } from "next/server";

const svc = new AuditPlanService();

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const schedule = await svc.acceptSuggestedSchedule(id, {
      userId: session.user.id,
      authUserId: session.user.authUserId ?? session.user.id,
      role: session.user.role,
      accessToken: session.user.accessToken ?? null,
    });
    return sendSuccess(schedule, "Suggested date accepted");
  } catch (err) {
    return handleApiError(err);
  }
}
