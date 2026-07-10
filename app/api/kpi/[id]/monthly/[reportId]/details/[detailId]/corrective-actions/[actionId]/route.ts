import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { KpiMonthlyService } from '@/services/kpiMonthlyService';

const service = new KpiMonthlyService();

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ actionId: string }> }) {
  try {
    await requireAuth();
    const { actionId } = await params;
    await service.deleteCorrectiveAction(actionId);
    return sendSuccess(null, 'Corrective action deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
