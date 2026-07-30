import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth, requireRole } from '@/lib/auth';
import { createKpiObjectiveSchema } from '@/schemas/kpiSchema';
import { KpiService } from '@/services/kpiService';

const service = new KpiService();

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const objectives = await service.getObjectivesByKpiId(id);
    return sendSuccess(objectives, 'Objectives retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('QMS', 'MR', 'IT');
    const { id } = await params;
    const body = createKpiObjectiveSchema.omit({ kpiId: true }).parse(await request.json());
    const created = await service.addObjective({ ...body, kpiId: id });
    return sendSuccess(created, 'Objective created successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}
