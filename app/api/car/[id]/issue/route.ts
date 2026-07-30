import { requireAuth } from "@/lib/auth";
import { CarService } from "@/services/carService";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ForbiddenError } from "@/errors/customErrors";
import { type NextRequest } from "next/server";
import { isPrivilegedQmsRole } from "@/lib/qms-roles";

const carService = new CarService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    if (!isPrivilegedQmsRole(session.user.role)) {
      throw new ForbiddenError("เฉพาะ QMS/IT เท่านั้นที่สามารถออก CAR ได้");
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { car, emailQueued, emailSkipReason } = await carService.issueCar(
      id,
      session.user.id,
      session.user.authUserId,
      session.user.accessToken,
      typeof body.issuerSignaturePath === "string" ? body.issuerSignaturePath : null,
    );
    return sendSuccess(
      { carNo: car.carNo, issuedAt: car.issuedAt, responseDueAt: car.responseDueAt, emailQueued, emailSkipReason },
      "CAR issued successfully"
    );
  } catch (err) {
    return handleApiError(err);
  }
}
