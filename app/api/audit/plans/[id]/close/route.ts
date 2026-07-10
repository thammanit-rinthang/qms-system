import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { AuditSignReportService } from "@/services/audit/auditSignReportService";
import { type NextRequest } from "next/server";

const svc = new AuditSignReportService();

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    await svc.closePlan(id, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
    });

    return sendSuccess(null, "Audit plan closed");
  } catch (err) {
    return handleApiError(err);
  }
}
