import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { AuditLogRepository } from '@/repositories/auditLogRepository';
import { ForbiddenError } from '@/lib/errors';
import { z } from 'zod';

type Params = { params: Promise<{ id: string }> };

const repo = new AuditLogRepository();

const paramsSchema = z.object({
  id: z.string().min(1, 'id is required'),
});

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    if (session.user.role !== 'QMS' && session.user.role !== 'MR' && session.user.role !== 'IT') {
      throw new ForbiddenError('Only QMS/MR/IT can view download audit logs');
    }

    const rawParams = await params;
    const { id } = paramsSchema.parse(rawParams);

    const { data } = await repo.findMany({
      resourceType: 'DOCUMENT',
      resourceId: id,
      action: 'DOWNLOAD',
    }, 1, 100);

    return sendSuccess(data, 'Download logs retrieved successfully');
  } catch (err) {
    return handleApiError(err);
  }
}
