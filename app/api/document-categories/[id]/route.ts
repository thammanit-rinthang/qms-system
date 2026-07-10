import { NextRequest } from 'next/server';
import { requireRole } from '@/lib/auth';
import { DocumentCategoryService } from '@/services/documentCategoryService';
import { updateDocumentCategorySchema } from '@/schemas/documentCategorySchema';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';
import { z } from 'zod';

const svc = new DocumentCategoryService();
const paramSchema = z.object({ id: z.string().uuid() });

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireRole('QMS', 'IT', 'MR');
    const { id } = paramSchema.parse(await params);

    const data = await req.json();
    const validated = updateDocumentCategorySchema.parse(data);

    const category = await svc.updateCategory(id, validated);
    return sendSuccess(category, 'Category updated successfully');
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await requireRole('QMS', 'IT', 'MR');
    const { id } = paramSchema.parse(await params);

    await svc.deleteCategory(id);
    return sendSuccess(null, 'Category deleted successfully');
  } catch (err) {
    return handleApiError(err);
  }
}
