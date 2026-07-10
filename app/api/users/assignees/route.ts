import { requireAuth } from '@/lib/auth';
import { UserRepository } from '@/repositories/userRepository';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

const repo = new UserRepository();

export async function GET() {
  try {
    await requireAuth();
    const assignees = await repo.findAssignees();
    return sendSuccess(assignees, 'Assignees retrieved successfully');
  } catch (err) {
    return handleApiError(err);
  }
}
