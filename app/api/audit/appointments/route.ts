import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { auditAppointmentCreateSchema } from "@/lib/validations/audit";
import { AuditAppointmentService } from "@/services/audit/auditAppointmentService";
import { type NextRequest } from "next/server";

const svc = new AuditAppointmentService();

export async function GET(_req: NextRequest) {
  try {
    await requireAuth();
    const result = await svc.findAll();
    return sendSuccess(result, "Audit appointments retrieved");
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const input = auditAppointmentCreateSchema.parse(body);

    const appt = await svc.create(input, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      nameSnapshot: session.user.name,
      email: session.user.email,
      accessToken: session.user.accessToken,
    });

    return sendSuccess(appt, "Audit appointment created", 201);
  } catch (err) {
    return handleApiError(err);
  }
}
