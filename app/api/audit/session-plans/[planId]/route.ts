import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { AuditSessionPlanRepository } from "@/repositories/audit/auditSessionPlanRepository";
import { AuditService } from "@/services/auditService";
import { db } from "@/lib/db";
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
const repo = new AuditSessionPlanRepository();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    await requireAuth();
    const { planId } = await params;
    const plan = await repo.findDetailById(planId);
    if (!plan) throw new NotFoundError("Session plan not found");
    return sendSuccess(plan);
  } catch (err) {
    return handleApiError(err);
  }
}


export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await requireAuth();
    if (!PRIVILEGED.has(session.user.role)) throw new ForbiddenError();

    const { planId } = await params;
    const existing = await repo.findById(planId);
    if (!existing) throw new NotFoundError("Session plan not found");

    const body = putSchema.parse(await req.json());

    const plan = await db.$transaction(async (tx) => {
      const saved = await repo.saveById(planId, body, existing, tx);
      await AuditService.record({
        actorUserId: session.user.id,
        actorAuthUserId: session.user.authUserId,
        actorRole: session.user.role,
        action: "UPDATE",
        resourceType: "AUDIT_SCHEDULE",
        resourceId: planId,
        before: { reviseNo: existing.reviseNo },
        after: { reviseNo: body.reviseNo },
      }, tx);
      return saved;
    });

    return sendSuccess(plan, "Session plan saved");
  } catch (err) {
    return handleApiError(err);
  }
}
