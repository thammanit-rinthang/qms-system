import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { rejectPlan } from "@/services/audit/auditPlanWorkflowService";
import { z } from "zod";

const schema = z.object({
  reason: z.string().min(1, "กรุณาระบุเหตุผล"),
  signedRole: z.enum(["REVIEWER", "APPROVER"]),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireAuth();
    const body = schema.parse(await req.json());

    const updated = await rejectPlan(id, body, {
      userId: session.user.id,
      authUserId: session.user.authUserId ?? session.user.id,
      role: session.user.role,
      accessToken: session.user.accessToken ?? null,
      nameSnapshot: session.user.name ?? null,
    });

    return sendSuccess(updated, "Plan rejected");
  } catch (err) {
    return handleApiError(err);
  }
}
