import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { createCorrectiveActionSchema } from '@/schemas/kpiSchema';
import { KpiMonthlyService } from '@/services/kpiMonthlyService';

const service = new KpiMonthlyService();

export async function GET(_req: NextRequest, { params }: { params: Promise<{ detailId: string }> }) {
  try {
    await requireAuth();
    const { detailId } = await params;
    const actions = await service.listCorrectiveActions(detailId);
    return sendSuccess(actions, 'Corrective actions retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ detailId: string }> }) {
  try {
    await requireAuth();
    const { detailId } = await params;
    const body = createCorrectiveActionSchema.omit({ monthlyDetailId: true }).parse(await request.json());
    const created = await service.addCorrectiveAction({ ...body, monthlyDetailId: detailId, dueDate: new Date(body.dueDate) });
    return sendSuccess(created, 'Corrective action created successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}
