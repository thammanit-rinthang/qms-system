import { requireAuth } from "@/lib/auth";
import { NotificationRepository } from "@/repositories/notificationRepository";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";

const repo = new NotificationRepository();

export async function DELETE(req: Request) {
  try {
    const session = await requireAuth();
    const recipientId = session.user.authUserId ?? session.user.id;
    const { ids } = await req.json() as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) throw new Error("ids required");
    await repo.deleteMany(ids, recipientId);
    return sendSuccess({ count: ids.length }, "Deleted");
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET() {
  try {
    const session = await requireAuth();
    // Prefer Auth Center ID (used by notifyCarUser) over local DB ID
    const recipientId = session.user.authUserId ?? session.user.id;
    const notifications = await repo.findByRecipient(recipientId, 30);
    const unreadCount = await repo.countUnread(recipientId);
    return sendSuccess({ notifications, unreadCount }, "OK");
  } catch (err) {
    return handleApiError(err);
  }
}
