import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { sendSuccess } from "@/lib/apiResponse";
import { CarService } from "@/services/carService";

const carService = new CarService();

export async function GET() {
  try {
    const session = await requireAuth();
    const deptId = session.user.authDepartmentId ?? null;
    if (!deptId) return sendSuccess({ count: 0 });

    const count = await carService.countPendingForDept(deptId);

    return sendSuccess({ count });
  } catch (err) {
    return handleApiError(err);
  }
}
