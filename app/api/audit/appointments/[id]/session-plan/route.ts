import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { AuditAppointmentRepository } from "@/repositories/audit/auditAppointmentRepository";
import { AuditSessionPlanRepository } from "@/repositories/audit/auditSessionPlanRepository";
import { type NextRequest } from "next/server";
import { z } from "zod";

const teamMemberSchema = z.object({
  role: z.string(),
  name: z.string(),
  authUserId: z.string().nullable().optional(),
});

const sessionSchema = z.object({
  orderIndex: z.number().int(),
  auditDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  department: z.string(),
  remark: z.string().nullable().optional(),
  teamMembers: z.array(teamMemberSchema),
});

const ganttRowSchema = z.object({
  orderIndex: z.number().int(),
  department: z.string(),
  processes: z.array(z.string()),
  planWeeks: z.array(z.string()),
  actualWeeks: z.array(z.string()),
});

const putSchema = z.object({
  reviseNo: z.number().int().optional(),
  reviseDate: z.string().nullable().optional(),
  sessions: z.array(sessionSchema),
  ganttRows: z.array(ganttRowSchema),
});

const PRIVILEGED = new Set(["QMS", "IT", "MR"]);
const apptRepo = new AuditAppointmentRepository();
const sessionRepo = new AuditSessionPlanRepository();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const appt = await apptRepo.findById(id);
    if (!appt) throw new NotFoundError("Appointment not found");

    const plan = await sessionRepo.findByAppointmentId(id);
    return sendSuccess(plan ?? null);
  } catch (err) {
    return handleApiError(err);
  }
}


export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (!PRIVILEGED.has(session.user.role)) throw new ForbiddenError();

    const { id } = await params;
    const appt = await apptRepo.findById(id);
    if (!appt) throw new NotFoundError("Appointment not found");

    const body = putSchema.parse(await req.json());

    const plan = await sessionRepo.saveByAppointment(id, body);
    return sendSuccess(plan, "Session plan saved");
  } catch (err) {
    return handleApiError(err);
  }
}
