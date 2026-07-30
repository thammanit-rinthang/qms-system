import { requireAuth } from "@/lib/auth";
import { CarService } from "@/services/carService";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ForbiddenError } from "@/errors/customErrors";
import { isPrivilegedQmsRole } from "@/lib/qms-roles";

const carService = new CarService();

export async function GET() {
  try {
    const session = await requireAuth();
    if (!isPrivilegedQmsRole(session.user.role)) {
      throw new ForbiddenError();
    }

    const nextNumber = await carService.previewNextCarNo();
    return sendSuccess({ nextNumber }, "Next CAR number retrieved");
  } catch (err) {
    return handleApiError(err);
  }
}
