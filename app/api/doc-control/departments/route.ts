import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { DocControlDeptService } from '@/services/docControlDeptService';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

const svc = new DocControlDeptService();

const createSchema = z.object({
  name: z.string().min(1).max(100),
  emailGroup: z.string().max(100).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireRole('QMS', 'IT', 'MR');
    const depts = await svc.list();
    return sendSuccess(depts);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('QMS', 'IT', 'MR');
    const body = await req.json();
    const data = createSchema.parse(body);
    const dept = await svc.create(data);
    return sendSuccess(dept, 'Department created', 201);
  } catch (err) {
    return handleApiError(err);
  }
}
