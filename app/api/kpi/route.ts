import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth, requireRole } from '@/lib/auth';
import { autoCreateKpiSchema, kpiQuerySchema } from '@/schemas/kpiSchema';
import { KpiService } from '@/services/kpiService';

const service = new KpiService();

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const query = kpiQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const result = await service.listKpis({ page: query.page ?? 1, limit: query.limit ?? 20, yearly: query.yearly, department: query.department });
    return sendSuccess(result.data, 'KPIs retrieved successfully', 200, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole('QMS', 'MR', 'IT');
    const body = autoCreateKpiSchema.parse(await request.json());
    const created = await service.createKpi(body);
    return sendSuccess(created, 'KPI created successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}
