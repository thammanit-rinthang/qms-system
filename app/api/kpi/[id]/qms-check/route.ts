import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireRole } from '@/lib/auth';
import { KpiService } from '@/services/kpiService';
import { qmsCheckKpiSchema } from '@/schemas/kpiSchema';

const service = new KpiService();

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole('QMS', 'IT', 'MR');
    const { id } = await params;
    const body = qmsCheckKpiSchema.parse(await _request.json().catch(() => ({})));
    const updated = await service.qmsCheckKpi(id, {
      userId: session.user.id,
      authUserId: session.user.authUserId,
      role: session.user.role,
      departmentId: session.user.authDepartmentId ?? session.user.departmentId,
      accessToken: session.user.accessToken,
    }, body);
    return sendSuccess(updated, 'KPI QMS checked successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
