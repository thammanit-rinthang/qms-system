import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { auditPlanUpdateSchema } from "@/lib/validations/audit";
import { AuditPlanService } from "@/services/audit/auditPlanService";
import { type NextRequest } from "next/server";

const svc = new AuditPlanService();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const plan = await svc.getPlanById(id);
    return sendSuccess(plan, "Audit plan retrieved");
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const input = auditPlanUpdateSchema.parse(body);

    const plan = await svc.updatePlan(id, input, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
    });

    return sendSuccess(plan, "Audit plan updated");
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    await svc.cancelPlan(id, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
    });

    return sendSuccess(null, "Audit plan cancelled");
  } catch (err) {
    return handleApiError(err);
  }
}
