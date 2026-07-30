import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { AuditAttachmentRepository } from "@/repositories/audit/auditAttachmentRepository";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { type NextRequest } from "next/server";

const repo = new AuditAttachmentRepository();

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const attachment = await repo.findById(id);
    if (!attachment) throw new NotFoundError("Attachment not found");

    const isPrivileged = session.user.role === "QMS" || session.user.role === "IT" || session.user.role === "MR";
    const actorId = session.user.authUserId ?? session.user.id;
    if (!isPrivileged && attachment.uploadedByAuthUserId !== actorId) {
      throw new ForbiddenError("Only the uploader or QMS/IT can delete this attachment");
    }

    await repo.delete(id);
    return sendSuccess(null, "Attachment deleted");
  } catch (err) {
    return handleApiError(err);
  }
}
