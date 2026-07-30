import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { auditFindingCreateSchema } from "@/lib/validations/audit";
import { AuditFindingService } from "@/services/audit/auditFindingService";
import type { FindingStatus } from "@/generated/prisma/client";
import { type NextRequest } from "next/server";

const svc = new AuditFindingService();

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;
    const status = req.nextUrl.searchParams.get("status") as FindingStatus | null;
    const findings = await svc.listByPlan(id, status ?? undefined);
    return sendSuccess(findings, "Findings retrieved");
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const input = auditFindingCreateSchema.parse(body);

    const finding = await svc.createFinding(id, input, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
    });

    return sendSuccess(finding, "Finding created", 201);
  } catch (err) {
    return handleApiError(err);
  }
}
