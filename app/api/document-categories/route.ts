import { NextRequest } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth';
import { DocumentCategoryService } from '@/services/documentCategoryService';
import { documentCategoryQuerySchema, createDocumentCategorySchema } from '@/schemas/documentCategorySchema';
import { sendSuccess } from '@/lib/apiResponse';
import { handleApiError } from '@/lib/apiErrorHandler';

const svc = new DocumentCategoryService();

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = req.nextUrl;
    const parsed = documentCategoryQuerySchema.parse({
      departmentId: searchParams.get('departmentId') || undefined,
    });

    const categories = await svc.listByDepartment(parsed.departmentId);
    return sendSuccess(categories, 'Categories retrieved successfully');
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole('QMS', 'IT', 'MR');

    const data = await req.json();
    const validated = createDocumentCategorySchema.parse(data);

    const category = await svc.createCategory(validated);
    return sendSuccess(category, 'Category created successfully', 201);
  } catch (err) {
    return handleApiError(err);
  }
}
