/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { DocumentControlService } from '@/services/documentControlService';
import { handleApiError } from '@/lib/apiErrorHandler';
import { NotFoundError } from '@/lib/errors';

const docService = new DocumentControlService();

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;

    const doc = await docService.getDocument(id);

    // Find latest ACTIVE revision
    const latestRevision = (doc.revisions ?? []).find((r: any) => r.status === 'ACTIVE')
      ?? doc.revisions?.[0];

    if (!latestRevision?.spDownloadUrl) {
      throw new NotFoundError('No downloadable revision found');
    }

    return NextResponse.redirect(latestRevision.spDownloadUrl);
  } catch (err) {
    return handleApiError(err);
  }
}
