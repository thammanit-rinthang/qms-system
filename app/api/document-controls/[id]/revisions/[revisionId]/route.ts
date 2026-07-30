import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { DocumentControlService } from '@/services/documentControlService';
import { handleApiError } from '@/lib/apiErrorHandler';
import { z } from 'zod';

const service = new DocumentControlService();
const paramsSchema = z.object({ id: z.string().uuid(), revisionId: z.string().uuid() });

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; revisionId: string }> }) {
  try {
    const session = await requireRole('QMS', 'IT');
    const { id, revisionId } = paramsSchema.parse(await params);
    const data = await service.deleteRevision(id, revisionId, session.user.role);
    return NextResponse.json({ data, error: null });
  } catch (err) {
    return handleApiError(err);
  }
}
