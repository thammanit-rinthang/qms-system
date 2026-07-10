import { requireRole } from '@/lib/auth';
import { KpiDeptService } from '@/services/kpiDeptService';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

const svc = new KpiDeptService();

export async function POST() {
  try {
    const session = await requireRole('QMS', 'IT', 'MR');
    const result = await svc.syncFromAuthCenter(session.user.accessToken);
    return sendSuccess(result, `Synced: ${result.created} new, ${result.skipped} already exist`);
  } catch (err) {
    return handleApiError(err);
  }
}
