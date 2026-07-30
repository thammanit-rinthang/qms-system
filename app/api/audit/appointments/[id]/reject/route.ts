import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { auditAppointmentRejectSchema } from "@/lib/validations/audit";
import { AuditAppointmentService } from "@/services/audit/auditAppointmentService";
import { type NextRequest } from "next/server";

const svc = new AuditAppointmentService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const input = auditAppointmentRejectSchema.parse(body);

    const appt = await svc.reject(id, input, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      nameSnapshot: session.user.name,
      email: session.user.email,
      accessToken: session.user.accessToken,
    });

    return sendSuccess(appt, "Appointment returned for revision");
  } catch (err) {
    return handleApiError(err);
  }
}
