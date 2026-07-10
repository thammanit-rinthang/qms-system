import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { AnnouncementRepository } from "@/repositories/announcementRepository";

const repo = new AnnouncementRepository();

export async function GET() {
  try {
    await requireAuth();
    const rows = await repo.findActivePublic(new Date());
    return sendSuccess(rows, "OK");
  } catch (error) {
    return handleApiError(error);
  }
}
