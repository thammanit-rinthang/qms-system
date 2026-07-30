import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireRole } from '@/lib/auth';
import { KpiService } from '@/services/kpiService';
import { reviseKpiSchema } from '@/schemas/kpiSchema';

const service = new KpiService();

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole('QMS', 'MR', 'IT');
    const { id } = await params;
    const body = reviseKpiSchema.parse(await _request.json());
    const updated = await service.reviseKpi(id, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      departmentId: session.user.authDepartmentId ?? session.user.departmentId,
      accessToken: session.user.accessToken,
    }, body.reason, body.objectiveIds);
    return sendSuccess(updated, 'KPI revised successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
