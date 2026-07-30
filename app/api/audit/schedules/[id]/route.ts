import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { auditScheduleUpdateSchema } from "@/lib/validations/audit";
import { AuditPlanService } from "@/services/audit/auditPlanService";
import { type NextRequest } from "next/server";

const svc = new AuditPlanService();

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const input = auditScheduleUpdateSchema.parse(body);

    const schedule = await svc.updateSchedule(id, input, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
    });

    return sendSuccess(schedule, "Schedule updated");
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

    await svc.deleteSchedule(id, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
    });

    return sendSuccess(null, "Schedule deleted");
  } catch (err) {
    return handleApiError(err);
  }
}
