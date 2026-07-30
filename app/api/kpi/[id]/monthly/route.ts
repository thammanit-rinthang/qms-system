import { NextRequest } from 'next/server';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { requireAuth, requireRole } from '@/lib/auth';
import { createMonthlyReportSchema, monthlyQuerySchema } from '@/schemas/kpiSchema';
import { KpiMonthlyService } from '@/services/kpiMonthlyService';
import { MonthlyStatus } from '@/generated/prisma/client';

const service = new KpiMonthlyService();

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth();
    const { id } = await params;
    const query = monthlyQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const status = (query.status && ['DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'].includes(query.status))
      ? (query.status as MonthlyStatus)
      : undefined;
    const result = await service.listReports({ page: query.page ?? 1, limit: query.limit ?? 20, year: query.year, month: query.month, status, kpiId: id });
    return sendSuccess(result.data, 'Monthly reports retrieved successfully', 200, result.meta);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('QMS', 'MR', 'IT');
    const { id } = await params;
    const body = createMonthlyReportSchema.omit({ kpiId: true }).parse(await request.json());
    const report = await service.createMonthlyReport({ ...body, kpiId: id });
    return sendSuccess(report, 'Monthly report created successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}
