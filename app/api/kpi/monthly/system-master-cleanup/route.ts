import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireRole } from '@/lib/auth';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { KpiMonthlyService } from '@/services/kpiMonthlyService';

const service = new KpiMonthlyService();
const emptySchema = z.object({});

export async function GET(_request: NextRequest) {
  try {
    await requireRole('QMS', 'MR', 'IT');
    emptySchema.parse({});
    const summary = await service.getSystemMasterCleanupSummary();
    return sendSuccess(summary, 'SYSTEM_MASTER monthly cleanup summary retrieved');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(_request: NextRequest) {
  try {
    const session = await requireAuth();
    await requireRole('QMS', 'MR', 'IT');
    emptySchema.parse({});
    const result = await service.cleanupSystemMasterMonthlyReports({
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      departmentId: session.user.authDepartmentId ?? session.user.departmentId,
      accessToken: session.user.accessToken,
    });
    return sendSuccess(result, 'SYSTEM_MASTER monthly data cleaned up successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
