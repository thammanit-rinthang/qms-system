import { NextRequest } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { DocumentControlService } from '@/services/documentControlService';
import { documentControlQuerySchema, createDocumentControlSchema } from '@/schemas/documentControlSchema';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

const docService = new DocumentControlService();

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = req.nextUrl;
    const parsed = documentControlQuerySchema.parse({
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
      search: searchParams.get('search') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      status: searchParams.get('status') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || undefined,
    });

    const result = await docService.listDocuments(parsed.page, parsed.limit, {
      search: parsed.search,
      categoryId: parsed.categoryId,
      status: parsed.status,
      sortBy: parsed.sortBy,
      sortOrder: parsed.sortOrder,
    });

    return sendSuccess(result.data, 'Documents retrieved successfully', 200, result.meta);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole('QMS', 'IT', 'MR');

    const data = await req.json();
    const validatedData = createDocumentControlSchema.parse(data);

    const doc = await docService.createDocument(session.user.id, validatedData, session.user.authUserId);
    return sendSuccess(doc, 'Document created successfully', 201);
  } catch (err) {
    return handleApiError(err);
  }
}
