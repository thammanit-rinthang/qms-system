import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireRole } from '@/lib/auth';
import { KpiService } from '@/services/kpiService';
import { copyKpiSchema } from '@/schemas/kpiSchema';

const service = new KpiService();

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole('QMS', 'MR', 'IT');
    const body = copyKpiSchema.parse(await request.json());
    const kpi = await service.copyKpiFromPreviousYear(body.sourceKpiId, body.targetYear, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      departmentId: session.user.authDepartmentId ?? session.user.departmentId,
      accessToken: session.user.accessToken,
    });
    return sendSuccess(kpi, 'KPI copied successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
