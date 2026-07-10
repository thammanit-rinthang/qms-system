import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { auditAttachmentCreateSchema } from "@/lib/validations/audit";
import { AuditAttachmentRepository } from "@/repositories/audit/auditAttachmentRepository";
import { type NextRequest } from "next/server";

const repo = new AuditAttachmentRepository();

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const sp = req.nextUrl.searchParams;
    const resourceType = sp.get("resourceType") ?? "";
    const resourceId = sp.get("resourceId") ?? "";
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
