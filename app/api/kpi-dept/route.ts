import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole, requireAuth } from '@/lib/auth';
import { KpiDeptService } from '@/services/kpiDeptService';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

const svc = new KpiDeptService();

const createSchema = z.object({
  name: z.string().min(1).max(100),
  emailGroup: z.string().max(100).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireAuth();
    const depts = await svc.listActive();
    return sendSuccess(depts);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('QMS', 'IT', 'MR');
    const data = createSchema.parse(await req.json());
    const dept = await svc.create(data);
    return sendSuccess(dept, 'Department created', 201);
  } catch (err) {
    return handleApiError(err);
  }
}
