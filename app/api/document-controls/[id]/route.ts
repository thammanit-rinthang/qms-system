import { NextRequest } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { DocumentControlService } from '@/services/documentControlService';
import { updateDocumentControlSchema } from '@/schemas/documentControlSchema';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

const docService = new DocumentControlService();

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requireAuth();
    const { id } = await params;

    const doc = await docService.getDocument(id);
    return sendSuccess(doc, 'Document retrieved successfully');
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requireRole('QMS', 'IT', 'MR');
    const { id } = await params;

    const data = await req.json();
    const validatedData = updateDocumentControlSchema.parse(data);

    const doc = await docService.updateDocument(id, session.user.id, validatedData, session.user.authUserId);
    return sendSuccess(doc, 'Document updated successfully');
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requireRole('QMS', 'IT', 'MR');
    const { id } = await params;

    await docService.deleteDocument(id, session.user.id);
    return sendSuccess(null, 'Document deleted successfully');
  } catch (err) {
    return handleApiError(err);
  }
}
