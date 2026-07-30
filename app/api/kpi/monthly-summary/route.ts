import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth } from '@/lib/auth';
import { KpiService } from '@/services/kpiService';
import { z } from 'zod';

const kpiService = new KpiService();

const querySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});

export async function GET(request: NextRequest) {
  try {
    await requireAuth();
    const { year } = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const data = await kpiService.getMonthlySummary(year);
    return sendSuccess(data, 'Monthly summary retrieved');
  } catch (error) {
    return handleApiError(error);
  }
}
