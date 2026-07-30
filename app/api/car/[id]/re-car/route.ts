import { requireAuth } from "@/lib/auth";
import { CarService } from "@/services/carService";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ForbiddenError } from "@/errors/customErrors";
import { type NextRequest } from "next/server";
import { isPrivilegedQmsRole } from "@/lib/qms-roles";

const carService = new CarService();

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (!isPrivilegedQmsRole(session.user.role)) {
      throw new ForbiddenError("เฉพาะ QMS/IT เท่านั้นที่สามารถสร้าง Re-CAR ได้");
    }

    const { id } = await params;
    const result = await carService.createReCar(id, session.user.id, session.user.authUserId, session.user.accessToken);
    return sendSuccess(result, "Re-CAR created successfully", 201);
  } catch (err) {
    return handleApiError(err);
  }
}
