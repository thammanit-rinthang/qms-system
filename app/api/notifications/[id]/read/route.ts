import { requireAuth } from "@/lib/auth";
import { NotificationRepository } from "@/repositories/notificationRepository";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { z } from "zod";

const repo = new NotificationRepository();
const paramSchema = z.object({ id: z.string().uuid() });
type Params = { params: Promise<{ id: string }> };

export async function PATCH(_req: Request, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = paramSchema.parse(await params);
    const recipientId = session.user.authUserId ?? session.user.id;
    await repo.markRead(id, recipientId);
    return sendSuccess({ id }, "Marked as read");
  } catch (err) {
    return handleApiError(err);
  }
}
