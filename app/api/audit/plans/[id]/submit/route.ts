import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { auditPlanSubmitSchema } from "@/lib/validations/audit";
import { submitPlan } from "@/services/audit/auditPlanWorkflowService";
import { type NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const input = auditPlanSubmitSchema.parse(body);

    const plan = await submitPlan(id, input, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      accessToken: session.user.accessToken,
      nameSnapshot: session.user.name,
    });

    return sendSuccess(plan, "Plan submitted for review");
  } catch (err) {
    return handleApiError(err);
  }
}
