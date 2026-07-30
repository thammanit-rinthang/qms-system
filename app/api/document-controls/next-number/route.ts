import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { DocumentControlService } from '@/services/documentControlService';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { z } from 'zod';

const docService = new DocumentControlService();

const querySchema = z.object({
  categoryId: z.string().min(1, 'categoryId is required'),
  departmentId: z.string().min(1, 'departmentId is required'),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = req.nextUrl;
    const { categoryId, departmentId } = querySchema.parse({
      categoryId: searchParams.get('categoryId') || undefined,
      departmentId: searchParams.get('departmentId') || undefined,
    });

    const nextNumber = await docService.previewNextDocNumber(categoryId, departmentId);
    return sendSuccess({ nextNumber }, 'Next document number retrieved successfully');
  } catch (err) {
    return handleApiError(err);
  }
}
