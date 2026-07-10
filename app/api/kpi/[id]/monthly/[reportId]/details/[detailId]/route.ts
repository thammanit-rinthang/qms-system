import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { updateMonthlyDetailSchema } from '@/schemas/kpiSchema';
import { KpiMonthlyService } from '@/services/kpiMonthlyService';

const service = new KpiMonthlyService();

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ detailId: string }> }) {
  try {
    await requireAuth();
    const { detailId } = await params;
    const body = updateMonthlyDetailSchema.parse(await request.json());
    const updated = await service.updateDetail(detailId, body);
    return sendSuccess(updated, 'Monthly detail updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
