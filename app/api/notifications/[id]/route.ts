import { requireAuth } from "@/lib/auth";
import { NotificationRepository } from "@/repositories/notificationRepository";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";

const repo = new NotificationRepository();
type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const recipientId = session.user.authUserId ?? session.user.id;
    await repo.deleteOne(id, recipientId);
    return sendSuccess({ id }, "Deleted");
  } catch (err) {
    return handleApiError(err);
  }
}
