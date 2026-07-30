import { z } from 'zod';

const DOC_STATUSES = ['DRAFT', 'ACTIVE', 'CANCELLED', 'OBSOLETE'] as const;
const CREATE_DOC_STATUSES = ['ACTIVE', 'CANCELLED'] as const;

const requiredDescriptionSchema = z
  .string()
  .trim()
  .min(1, 'Description is required')
  .max(500);

const distributionSchema = z.object({
  departmentName: z.string(),
  authDepartmentId: z.string().nullable(),
});

export const createDocumentControlSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  departmentId: z.string().min(1, 'Department is required'),
  docNumber: z.string().min(1, 'Document number is required').max(50),
  docName: z.string().min(1, 'Document name is required').max(255),
  description: requiredDescriptionSchema,
  status: z.enum(CREATE_DOC_STATUSES).default('ACTIVE'),
  distributions: z.array(distributionSchema).default([]),
});

export const updateDocumentControlSchema = z.object({
  categoryId: z.string().min(1, 'Category is required').optional(),
  departmentId: z.string().min(1, 'Department is required').optional(),
  docName: z.string().trim().min(1, 'Document name is required').max(255).optional(),
  description: z.string().trim().min(1, 'Description is required').max(500).optional().nullable(),
  status: z.enum(CREATE_DOC_STATUSES).optional(),
  distributions: z.array(distributionSchema).optional(),
});

export const uploadRevisionSchema = z.object({
  revision: z.string().min(1, 'Revision is required').max(20),
  effectiveDate: z.string().optional().nullable(),
  status: z.enum(DOC_STATUSES).default('ACTIVE'),
  darMasterId: z.string().optional().nullable(),
});

export const documentControlQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  categoryId: z.string().optional(),
  departmentId: z.string().optional(),
  status: z.enum(DOC_STATUSES).optional(),
  sortBy: z.enum(['docNumber', 'docName', 'revision', 'status', 'effectiveDate', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
