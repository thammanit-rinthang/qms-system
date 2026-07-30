import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { DocumentControlService } from '@/services/documentControlService';
import { handleApiError } from '@/lib/apiErrorHandler';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { getFileInfo } from '@/lib/sharepoint';
import { AuditService } from '@/services/auditService';

const docService = new DocumentControlService();

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const doc = await docService.getDocument(id);

    if (doc.status !== 'ACTIVE') {
      throw new ValidationError('เอกสารนี้ถูกยกเลิกหรือยังไม่เปิดใช้งาน ไม่สามารถดาวน์โหลดได้');
    }

    const latestRevision = (doc.revisions ?? []).find((revision) => revision.status === 'ACTIVE')
      ?? doc.revisions?.[0];

    if (!latestRevision) {
      throw new NotFoundError('No downloadable revision found');
    }

    // Log the download action in AuditLog
    await AuditService.record({
      actorUserId: session.user.id,
      actorAuthUserId: session.user.authUserId,
      actorRole: session.user.role,
      action: 'DOWNLOAD',
      resourceType: 'DOCUMENT',
      resourceId: id,
      after: { docNumber: doc.docNumber, docName: doc.docName, revision: latestRevision.revision },
    });

    // Prefer a fresh @microsoft.graph.downloadUrl fetched on-demand so that
    // the link never expires (Graph pre-signed URLs are only valid for ~1 hour).
    if (latestRevision.spItemId) {
      const info = await getFileInfo(latestRevision.spItemId);
      if (info.downloadUrl) {
        return NextResponse.redirect(info.downloadUrl);
      }
    }

    // Fallback: use the stored URL (may be stale for old records without spItemId)
    if (latestRevision.spDownloadUrl) {
      return NextResponse.redirect(latestRevision.spDownloadUrl);
    }

    throw new NotFoundError('No downloadable revision found');
  } catch (err) {
    return handleApiError(err);
  }
}
