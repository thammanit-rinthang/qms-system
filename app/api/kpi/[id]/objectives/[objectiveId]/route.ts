import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { updateKpiObjectiveSchema } from '@/schemas/kpiSchema';
import { KpiService } from '@/services/kpiService';

const service = new KpiService();

export async function GET(_req: NextRequest, { params }: { params: Promise<{ objectiveId: string }> }) {
  try {
    await requireAuth();
    const { objectiveId } = await params;
    const obj = await service.getObjectiveById(objectiveId);
    return sendSuccess(obj, 'Objective retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ objectiveId: string }> }) {
  try {
    await requireAuth();
    const { objectiveId } = await params;
    const body = updateKpiObjectiveSchema.parse(await request.json());
    const updated = await service.updateObjective(objectiveId, body);
    return sendSuccess(updated, 'Objective updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ objectiveId: string }> }) {
  try {
    await requireAuth();
    const { objectiveId } = await params;
    await service.deleteObjective(objectiveId);
    return sendSuccess(null, 'Objective deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}
