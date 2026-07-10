import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { updateMonthlyReportSchema } from '@/schemas/kpiSchema';
import { KpiMonthlyService } from '@/services/kpiMonthlyService';

const service = new KpiMonthlyService();

import { ForbiddenError } from '@/errors/customErrors';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; reportId: string }> }) {
  try {
    await requireAuth();
    const { id: kpiId, reportId } = await params;
    const report = await service.getReportById(reportId);
    if (report.kpiId !== kpiId) throw new ForbiddenError('Report does not belong to this KPI');
    return sendSuccess(report, 'Monthly report retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; reportId: string }> }) {
  try {
    const session = await requireAuth();
    const { id: kpiId, reportId } = await params;
    const body = updateMonthlyReportSchema.parse(await request.json());
    const report = await service.updateReportMetadata(reportId, body, {
      userId: session.user.id,
      role: session.user.role,
      departmentId: session.user.authDepartmentId ?? session.user.departmentId,
    });
    if (report.kpiId !== kpiId) throw new ForbiddenError('Report does not belong to this KPI');
    return sendSuccess(report, 'Monthly report updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
