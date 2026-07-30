import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { auditPlanCreateSchema } from "@/lib/validations/audit";
import { AuditPlanService } from "@/services/audit/auditPlanService";
import type { AuditType, AuditPlanStatus } from "@/generated/prisma/client";
import { type NextRequest } from "next/server";

const svc = new AuditPlanService();

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const sp = req.nextUrl.searchParams;

    const isPrivileged =
      session.user.role === "QMS" ||
      session.user.role === "IT" ||
      session.user.role === "MR";

    const result = await svc.listPlans({
      page: Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1),
      limit: Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "20", 10) || 20)),
      auditType: (sp.get("auditType") as AuditType) || undefined,
      status: (sp.get("status") as AuditPlanStatus) || undefined,
      departmentId: sp.get("departmentId") || undefined,
      search: sp.get("search") || undefined,
      // non-privileged: scope to their own plans only
      ownerAuthUserId: isPrivileged ? undefined : (session.user.authUserId ?? session.user.id),
    });

    return sendSuccess(result.data, "Audit plans retrieved", 200, result.meta);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const input = auditPlanCreateSchema.parse(body);

    const plan = await svc.createPlan(input, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      nameSnapshot: session.user.name,
      email: session.user.email,
    });

    return sendSuccess(plan, "Audit plan created", 201);
  } catch (err) {
    return handleApiError(err);
  }
}
