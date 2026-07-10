import { requireRole } from '@/lib/auth';
import { DocControlDeptService } from '@/services/docControlDeptService';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

const svc = new DocControlDeptService();

export async function POST() {
  try {
    const session = await requireRole('QMS', 'IT', 'MR');
    const result = await svc.syncFromAuthCenter(session.user.accessToken);
    return sendSuccess(result, `Synced: ${result.created} new, ${result.skipped} already exist`);
  } catch (err) {
    return handleApiError(err);
  }
}
