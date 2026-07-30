import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { auditSignRequestSchema } from "@/lib/validations/audit";
import { AuditSignReportService } from "@/services/audit/auditSignReportService";
import { type NextRequest } from "next/server";

const svc = new AuditSignReportService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const input = auditSignRequestSchema.parse(body);

    const result = await svc.issueSignRequest(id, input, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      accessToken: session.user.accessToken,
    });

    return sendSuccess(result, "Sign request issued");
  } catch (err) {
    return handleApiError(err);
  }
}
