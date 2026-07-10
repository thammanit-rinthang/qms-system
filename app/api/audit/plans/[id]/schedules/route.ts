import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { auditScheduleCreateSchema } from "@/lib/validations/audit";
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
    const schedules = await svc.getSchedulesByPlan(id);
    return sendSuccess(schedules, "Schedules retrieved");
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const input = auditScheduleCreateSchema.parse(body);

    const schedule = await svc.createSchedule(id, input, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      accessToken: session.user.accessToken ?? null,
    } as Parameters<typeof svc.createSchedule>[2] & { accessToken?: string | null });

    return sendSuccess(schedule, "Schedule created", 201);
  } catch (err) {
    return handleApiError(err);
  }
}
