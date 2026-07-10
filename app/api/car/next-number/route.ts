import { requireAuth } from "@/lib/auth";
import { CarService } from "@/services/carService";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ForbiddenError } from "@/errors/customErrors";

const carService = new CarService();

export async function GET() {
  try {
    const session = await requireAuth();
    if (session.user.role !== "QMS" && session.user.role !== "IT") {
      throw new ForbiddenError();
    }

    const nextNumber = await carService.previewNextCarNo();
    return sendSuccess({ nextNumber }, "Next CAR number retrieved");
  } catch (err) {
    return handleApiError(err);
  }
}
