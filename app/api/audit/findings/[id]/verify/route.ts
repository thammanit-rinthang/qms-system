import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { auditVerifySchema } from "@/lib/validations/audit";
import { AuditFindingService } from "@/services/audit/auditFindingService";
import { type NextRequest } from "next/server";

const svc = new AuditFindingService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const input = auditVerifySchema.parse(body);

    const finding = await svc.verifyFinding(id, input, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
    });

    return sendSuccess(finding, "Verification recorded");
  } catch (err) {
    return handleApiError(err);
  }
}
