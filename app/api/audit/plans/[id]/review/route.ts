import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { reviewPlan } from "@/services/audit/auditPlanWorkflowService";
import { type NextRequest } from "next/server";
import { z } from "zod";

const reviewSchema = z.object({ signaturePath: z.string().nullable().optional() });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = reviewSchema.parse(await req.json().catch(() => ({})));

    const plan = await reviewPlan(id, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      accessToken: session.user.accessToken,
      nameSnapshot: session.user.name,
      signaturePath: body.signaturePath ?? null,
    });

    return sendSuccess(plan, "Plan reviewed");
  } catch (err) {
    return handleApiError(err);
  }
}
