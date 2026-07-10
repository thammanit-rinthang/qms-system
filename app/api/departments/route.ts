
import { requireAuth } from "@/lib/auth";
import { DepartmentService } from "@/services/departmentService";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";

const deptService = new DepartmentService();

export async function GET() {
  try {
    const session = await requireAuth();
    const departments = await deptService.getActiveDepartments(session.user.accessToken);
    const res = sendSuccess(departments, "Active departments retrieved successfully");
    res.headers.set("Cache-Control", "s-maxage=3600");
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
