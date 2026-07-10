import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { DocControlDeptService } from '@/services/docControlDeptService';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

const svc = new DocControlDeptService();

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  emailGroup: z.string().max(100).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('QMS', 'IT', 'MR');
    const { id } = await params;
    const body = await req.json();
    const data = updateSchema.parse(body);
    const dept = await svc.update(id, data);
    return sendSuccess(dept);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole('QMS', 'IT', 'MR');
    const { id } = await params;
    await svc.delete(id);
    return sendSuccess(null, 'Department deleted');
  } catch (err) {
    return handleApiError(err);
  }
}
