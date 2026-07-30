import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { carVerify2DueDateSchema } from "@/lib/validations/car";
import { CarService } from "@/services/carService";

const carService = new CarService();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const input = carVerify2DueDateSchema.parse(await req.json());

    const car = await carService.setVerify2DueDate(
      id,
      session.user.id,
      input,
      session.user.authUserId,
      session.user.departmentId,
      session.user.authDepartmentId,
      session.user.role,
      session.user.accessToken,
    );

    return sendSuccess(car, "CAR verification round 2 date saved successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
