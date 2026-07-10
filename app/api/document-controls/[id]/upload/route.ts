import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { DocumentControlService } from '@/services/documentControlService';
import { uploadRevisionSchema } from '@/schemas/documentControlSchema';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { MAX_FILE_SIZE, ALLOWED_MIME, hasValidMagicBytes } from '@/lib/fileValidation';
import { ValidationError } from '@/lib/errors';

const docService = new DocumentControlService();

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireRole('QMS', 'IT', 'MR');
    const { id } = await params;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const metadata = formData.get('metadata') as string | null;

    if (!file) throw new ValidationError('File is required');
    if (!metadata) throw new ValidationError('Metadata is required');

    const data = JSON.parse(metadata);
    const validatedData = uploadRevisionSchema.parse(data);

    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }

    if (!ALLOWED_MIME.has(file.type)) {
      throw new ValidationError(`File type ${file.type} is not allowed`);
    }

    const buffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(buffer);
    if (!hasValidMagicBytes(fileBuffer, file.type)) {
      throw new ValidationError('File signature does not match its type');
    }

    const doc = await docService.addRevision(id, session.user.id, validatedData, {
      buffer: fileBuffer,
      name: file.name,
      type: file.type,
    }, session.user.authUserId);

    return sendSuccess(doc, 'Document revision uploaded successfully');
  } catch (err) {
    return handleApiError(err);
  }
}
