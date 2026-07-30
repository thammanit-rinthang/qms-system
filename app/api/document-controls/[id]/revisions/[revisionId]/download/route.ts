import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { DocumentControlService } from '@/services/documentControlService';
import { handleApiError } from '@/lib/apiErrorHandler';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { getFileInfo } from '@/lib/sharepoint';
import { AuditService } from '@/services/auditService';
import { z } from 'zod';

const docService = new DocumentControlService();

type Params = { params: Promise<{ id: string; revisionId: string }> };

const paramsSchema = z.object({
  id: z.string().min(1, 'id is required'),
  revisionId: z.string().min(1, 'revisionId is required'),
});

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const rawParams = await params;
    const { id, revisionId } = paramsSchema.parse(rawParams);

    const doc = await docService.getDocument(id);
    if (doc.status !== 'ACTIVE') {
      throw new ValidationError('เอกสารนี้ถูกยกเลิกหรือยังไม่เปิดใช้งาน ไม่สามารถดาวน์โหลดได้');
    }

    const revision = (doc.revisions ?? []).find((r) => r.id === revisionId);
    if (!revision) {
      throw new NotFoundError('Revision not found');
    }
    if (revision.status !== 'ACTIVE') {
      throw new ValidationError('Only active revisions can be downloaded');
    }

    // Log the download action in AuditLog
    await AuditService.record({
      actorUserId: session.user.id,
      actorAuthUserId: session.user.authUserId,
      actorRole: session.user.role,
      action: 'DOWNLOAD',
      resourceType: 'DOCUMENT',
      resourceId: id,
      after: { docNumber: doc.docNumber, docName: doc.docName, revision: revision.revision },
    });

    if (revision.spItemId) {
      const info = await getFileInfo(revision.spItemId);
      if (info.downloadUrl) {
        return NextResponse.redirect(info.downloadUrl);
      }
    }

    if (revision.spDownloadUrl) {
      return NextResponse.redirect(revision.spDownloadUrl);
    }

    throw new NotFoundError('No downloadable revision found');
  } catch (err) {
    return handleApiError(err);
  }
}
