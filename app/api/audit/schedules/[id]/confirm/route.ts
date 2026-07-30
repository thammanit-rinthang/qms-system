import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { auditScheduleConfirmSchema } from "@/lib/validations/audit";
import { AuditPlanService } from "@/services/audit/auditPlanService";
import { type NextRequest } from "next/server";

const svc = new AuditPlanService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const input = auditScheduleConfirmSchema.parse(body);

    const schedule = await svc.confirmSchedule(id, input, {
      userId: session.user.id,
      authUserId: session.user.authUserId ?? session.user.id,
      role: session.user.role,
      nameSnapshot: session.user.name ?? null,
      accessToken: session.user.accessToken ?? null,
      departmentId: session.user.authDepartmentId ?? session.user.departmentId ?? null,
    });

    return sendSuccess(schedule, "Schedule confirmation updated");
  } catch (err) {
    return handleApiError(err);
  }
}
