import { z } from 'zod';

export const createDocumentCategorySchema = z.object({
  departmentId: z.string().min(1, 'Department is required'),
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().max(500).optional().nullable(),
  order: z.coerce.number().int().min(0).default(0),
});

export const updateDocumentCategorySchema = createDocumentCategorySchema
  .omit({ departmentId: true })
  .partial();

export const documentCategoryQuerySchema = z.object({
  departmentId: z.string().min(1, 'Department ID is required'),
});
