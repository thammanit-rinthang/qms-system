import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { auditFindingUpdateSchema } from "@/lib/validations/audit";
import { AuditFindingService } from "@/services/audit/auditFindingService";
import { type NextRequest } from "next/server";

const svc = new AuditFindingService();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const finding = await svc.getById(id);
    return sendSuccess(finding, "Finding retrieved");
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const input = auditFindingUpdateSchema.parse(body);

    const finding = await svc.updateFinding(id, input, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
    });

    return sendSuccess(finding, "Finding updated");
  } catch (err) {
    return handleApiError(err);
  }
}
