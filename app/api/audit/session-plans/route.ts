import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { AuditSessionPlanRepository } from "@/repositories/audit/auditSessionPlanRepository";
import { AuditAppointmentRepository } from "@/repositories/audit/auditAppointmentRepository";
import { type NextRequest } from "next/server";
import { z } from "zod";

const createSchema = z.object({ appointmentId: z.string().min(1) });

const PRIVILEGED = new Set(["QMS", "IT", "MR"]);
const repo = new AuditSessionPlanRepository();
const apptRepo = new AuditAppointmentRepository();

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (!PRIVILEGED.has(session.user.role)) throw new ForbiddenError();

    const body = createSchema.parse(await req.json());

    const appt = await apptRepo.findById(body.appointmentId);
    if (!appt) throw new NotFoundError("Appointment not found");
    if (appt.status !== "PUBLISHED") throw new ValidationError("Appointment must be PUBLISHED to create a session plan");

    const plan = await repo.upsertForAppointment(body.appointmentId);
    return sendSuccess({ id: plan.id }, "Session plan ready");
  } catch (err) {
    return handleApiError(err);
  }
}
