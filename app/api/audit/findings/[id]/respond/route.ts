import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { auditCorrectiveActionSchema } from "@/lib/validations/audit";
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
    const input = auditCorrectiveActionSchema.parse(body);

    const finding = await svc.respondToFinding(id, input, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
    });

    return sendSuccess(finding, "Response submitted");
  } catch (err) {
    return handleApiError(err);
  }
}
