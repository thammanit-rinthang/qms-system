import { z } from 'zod';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export const createKpiSchema = z.object({
  yearly: z.number().int().min(2000).max(2100),
  department: z.string().min(1, 'Department is required'),
  prepare: z.string().min(1, 'Preparer is required'),
  reviewer: z.string().min(1, 'Reviewer is required'),
  approver: z.string().min(1, 'Approver is required'),
  documentName: z.string().max(500).nullable().optional(),
});

export const autoCreateKpiSchema = z.object({
  yearly: z.number().int().min(2000).max(2100),
  department: z.string().min(1, 'Department is required'),
  prepare: z.string().optional().default(''),
  reviewer: z.string().optional().default(''),
  approver: z.string().optional().default(''),
  documentName: z.string().max(500).nullable().optional(),
});

export const updateKpiSchema = createKpiSchema.partial();

export const kpiQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  yearly: z.coerce.number().int().positive().optional(),
  department: z.string().optional(),
});

export const createKpiObjectiveSchema = z.object({
  kpiId: z.string().uuid('Invalid KPI ID'),
  target: z.number().positive('Target must be a positive number'),
  unit: z.string().min(1).optional(),
  objective: z.string().min(1, 'Objective is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  calculationFormula: z.string().min(1, 'Calculation formula is required'),
  actionPlanGuidelines: z.string().min(1, 'Action plan guidelines are required'),
  referenceDocuments: z.string().optional(),
  responsibleAuthUserId: z.string().min(1, 'Responsible person is required'),
  responsibleNameSnapshot: z.string().min(1, 'Responsible person is required'),
  responsibleEmailSnapshot: z.string().email('Responsible email is required'),
  responsibleEmployeeId: z.string().optional(),
});

export const updateKpiObjectiveSchema = createKpiObjectiveSchema.omit({ kpiId: true }).partial();

export const createMonthlyReportSchema = z.object({
  kpiId: z.string().uuid('Invalid KPI ID'),
  month: z.enum(MONTHS),
  year: z.number().int().min(2000).max(2100),
});

export const updateMonthlyDetailSchema = z.object({
  actualResult: z.number().nullable().optional(),
  achievedStatus: z.enum(['PENDING', 'OK', 'NOT_OK']).optional(),
});

export const updateMonthlyReportSchema = z.object({
  remark: z.string().max(5000).nullable().optional(),
  documentName: z.string().max(500).nullable().optional(),
});

export const monthlyAttachmentUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(1),
});

export const createCorrectiveActionSchema = z.object({
  monthlyDetailId: z.string().uuid('Invalid monthly detail ID'),
  times: z.number().int().positive(),
  rootCause: z.string().min(1, 'Root cause is required'),
  guidelines: z.string().min(1, 'Guidelines are required'),
  responsiblePerson: z.string().min(1, 'Responsible person is required'),
  dueDate: z.string().datetime({ offset: true }).or(z.string().date()),
});

export const monthlyQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  year: z.coerce.number().int().positive().optional(),
  month: z.enum(MONTHS).optional(),
  department: z.string().optional(),
  status: z.enum(['DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'QMS_CHECK', 'ANNOUNCED', 'REJECTED']).optional(),
});

export const rejectReportSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
  attachments: z.array(
    z.object({
      fileName: z.string(),
      spItemId: z.string(),
      spWebUrl: z.string(),
    })
  ).optional().nullable(),
});

export const submitKpiObjectivesSchema = z.object({
  prepareSignature: z.string().min(1, 'Signature is required'),
  reviewerUserId: z.string().min(1, 'Reviewer is required'),
  reviewerAuthUserId: z.string().optional().nullable(),
  reviewerName: z.string().max(255).optional().nullable(),
  reviewerEmail: z.string().email().optional().nullable(),
  approverUserId: z.string().min(1, 'Approver is required'),
  approverAuthUserId: z.string().optional().nullable(),
  approverName: z.string().max(255).optional().nullable(),
  approverEmail: z.string().email().optional().nullable(),
  preparerAuthUserId: z.string().optional().nullable(),
});

export const qmsCheckKpiSchema = z.object({
  signatureDataUrl: z.string().optional(),
  saveSignature: z.boolean().optional(),
});

export const publishKpiSchema = z.object({
  documentName: z.string().max(500).nullable().optional(),
  toGroupEmails: z.array(z.string()).optional(),
  ccGroupEmails: z.array(z.string()).optional(),
  wysiwygContent: z.string().optional(),
});

export const copyKpiSchema = z.object({
  sourceKpiId: z.string().uuid('Invalid KPI ID'),
  targetYear: z.number().int().min(2000).max(2100),
});

export const reviseKpiSchema = z.object({
  reason: z.string().min(1, 'Revision reason is required'),
  objectiveIds: z.array(z.string().uuid()).optional(),
});

export const reviewApproveAttachmentSchema = z.object({
  attachments: z.array(
    z.object({
      fileName: z.string(),
      spItemId: z.string(),
      spWebUrl: z.string(),
    })
  ).optional().nullable(),
  signatureDataUrl: z.string().optional(),
  saveSignature: z.boolean().optional(),
  signatureType: z.string().optional(),
});
