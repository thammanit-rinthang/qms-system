import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ForbiddenError } from "@/errors/customErrors";
import { CarService } from "@/services/carService";

const carService = new CarService();

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "QMS" && session.user.role !== "IT") {
      throw new ForbiddenError("เฉพาะ QMS/IT เท่านั้นที่สามารถส่ง reminder ได้");
    }

    const { id } = await params;
    await carService.sendReminder(id, session.user.accessToken);
    return sendSuccess(null, "Reminder sent");
  } catch (err) {
    return handleApiError(err);
  }
}
