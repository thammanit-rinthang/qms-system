import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ForbiddenError, ValidationError, NotFoundError } from "@/lib/errors";
import { auditAttachmentCreateSchema } from "@/lib/validations/audit";
import { AuditAttachmentRepository } from "@/repositories/audit/auditAttachmentRepository";
import { AuditPlanRepository } from "@/repositories/audit/auditPlanRepository";
import { AuditFindingRepository } from "@/repositories/audit/auditFindingRepository";
import { type NextRequest } from "next/server";

const repo = new AuditAttachmentRepository();
const planRepo = new AuditPlanRepository();
const findingRepo = new AuditFindingRepository();

// Attachments belong to an audit plan (directly, or via a finding/report on the plan). Only the
// plan owner, an assigned auditor, or a privileged QMS role may read or attach to it — otherwise
// any authenticated user could forge evidence records or harvest SharePoint links by enumerating ids.
async function authorizeResource(
  session: { user: { id: string; authUserId?: string; role: string } },
  resourceType: string,
  resourceId: string,
): Promise<void> {
  if (["QMS", "IT", "MR"].includes(session.user.role)) return;

  let planId = resourceId;
  if (resourceType === "FINDING") {
    const finding = await findingRepo.findDetailById(resourceId);
    if (!finding) throw new NotFoundError("Finding");
    planId = (finding as { planId: string }).planId;
  }

  const plan = await planRepo.findWithAuditors(planId);
  if (!plan) throw new NotFoundError("Plan");
  const actorId = session.user.authUserId ?? session.user.id;
  const isOwner = plan.ownerAuthUserId === actorId;
  const isAuditor = plan.auditors.some((a: { assigneeAuthUserId: string }) => a.assigneeAuthUserId === actorId);
  if (!isOwner && !isAuditor) throw new ForbiddenError();
}

function assertSharePointUrl(url: string | undefined): void {
  if (!url) return;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ValidationError("fileUrl must be a valid URL");
  }
  // ponytail: SharePoint web URLs only — blocks planting arbitrary phishing/malware links as "evidence"
  if (parsed.protocol !== "https:" || !parsed.hostname.toLowerCase().endsWith(".sharepoint.com")) {
    throw new ValidationError("fileUrl must be a SharePoint URL");
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const sp = req.nextUrl.searchParams;
    const resourceType = sp.get("resourceType") ?? "";
    const resourceId = sp.get("resourceId") ?? "";
    if (!resourceId) throw new ValidationError("resourceId is required");
    await authorizeResource(session, resourceType, resourceId);
    const attachments = await repo.findByResource(resourceType, resourceId);
    return sendSuccess(attachments, "Attachments retrieved");
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const input = auditAttachmentCreateSchema.parse(body);

    await authorizeResource(session, input.resourceType, input.resourceId);
    assertSharePointUrl(input.fileUrl);

    const attachment = await repo.create({
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      fileName: input.fileName,
      fileUrl: input.fileUrl ?? null,
      sharePointItemId: input.sharePointItemId ?? null,
      mimeType: input.mimeType ?? null,
      sizeBytes: input.sizeBytes ?? null,
      uploadedByAuthUserId: session.user.authUserId ?? session.user.id,
    } as Parameters<typeof repo.create>[0]);

    return sendSuccess(attachment, "Attachment saved", 201);
  } catch (err) {
    return handleApiError(err);
  }
}
