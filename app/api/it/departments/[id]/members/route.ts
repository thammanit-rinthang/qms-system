import { type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { getAuthCenterDepartmentMembers } from "@/lib/auth-center-admin-client";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { NotFoundError } from "@/errors/customErrors";

type Params = { params: Promise<{ id: string }> };

export async function GET(
  _req: NextRequest,
  { params }: Params,
) {
  try {
    const session = await requireRole("IT");
    const { id } = await params;

    // `id` is the department code (authDepartmentId)
    const result = await getAuthCenterDepartmentMembers(id, { accessToken: session.user.accessToken });
    if (!result) throw new NotFoundError("ไม่พบแผนก");

    return sendSuccess({
      ...result,
      // Label clearly as Auth Center source so UI can show appropriate indicator
      _dataSource: "auth_center",
      _note: "Member data comes from Auth Center. Local business assignments may differ.",
    }, "Department members retrieved successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
