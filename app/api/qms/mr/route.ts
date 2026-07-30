
import { requireRole } from "@/lib/auth";
import { UserService } from "@/services/userService";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";

const userService = new UserService();

export async function GET() {
  try {
    const session = await requireRole("QMS", "IT", "MR");
    const users = await userService.getAllUsers(session.user.accessToken);
    return sendSuccess(users, "Users retrieved successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
