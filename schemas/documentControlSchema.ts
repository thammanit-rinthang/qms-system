import { z } from 'zod';

const DOC_STATUSES = ['DRAFT', 'ACTIVE', 'OBSOLETE'] as const;

export const createDocumentControlSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  departmentId: z.string().min(1, 'Department is required'),
  docNumber: z.string().min(1, 'Document number is required').max(50),
  docName: z.string().min(1, 'Document name is required').max(255),
  description: z.string().max(500).optional().nullable(),
  status: z.enum(DOC_STATUSES).default('DRAFT'),
});

export const updateDocumentControlSchema = createDocumentControlSchema
  .omit({ docNumber: true })
  .partial();

export const uploadRevisionSchema = z.object({
  revision: z.string().min(1, 'Revision is required').max(20),
  effectiveDate: z.string().optional().nullable(),
  status: z.enum(DOC_STATUSES).default('ACTIVE'),
});

export const documentControlQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.enum(DOC_STATUSES).optional(),
  sortBy: z.enum(['docNumber', 'docName', 'revision', 'status', 'effectiveDate', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
