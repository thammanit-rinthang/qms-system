import { requireAuth } from "@/lib/auth";
import { listAuthCenterAppMembers } from "@/lib/auth-center-admin-client";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";

export async function GET() {
  try {
    const session = await requireAuth();
    const users = await listAuthCenterAppMembers({ accessToken: session.user.accessToken });
    const result = users.map((u) => ({
      id: u.id,
      name: u.displayName ?? u.email ?? u.id,
      email: u.email ?? null,
      department: null,
      jobTitle: null,
      employeeId: u.employeeId ?? null,
    }));
    return sendSuccess(result, "Users retrieved");
  } catch (err) {
    return handleApiError(err);
  }
}
