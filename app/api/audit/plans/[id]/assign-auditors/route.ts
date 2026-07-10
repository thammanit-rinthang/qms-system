import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { auditAssignAuditorsSchema } from "@/lib/validations/audit";
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
    const input = auditAssignAuditorsSchema.parse(body);

    const auditors = await svc.assignAuditors(id, input, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
    });

    return sendSuccess(auditors, "Auditors assigned");
  } catch (err) {
    return handleApiError(err);
  }
}
