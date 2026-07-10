import { z } from "zod";

// ponytail: coerce.date() accepts YYYY-MM-DD, YYYY-MM-DDTHH:mm, and ISO strings —
// all formats that real HTML date/datetime-local inputs and JSON bodies produce.
const dateField = z.coerce.date();
const optionalDate = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.date().optional()
);

// ─── Plan ────────────────────────────────────────────────────────────────────

export const auditPlanCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  auditType: z.enum(["INTERNAL", "EXTERNAL"]),
  mode: z.enum(["SYSTEM", "FILE_UPLOAD"]).default("SYSTEM"),
  standard: z.string().optional(),
  standards: z.array(z.string()).default([]),
  scope: z.string().optional(),
  objective: z.string().optional(),
  sourceOrganization: z.string().optional(),
  startDate: optionalDate,
  endDate: optionalDate,
  summary: z.string().optional(),
  appointmentId: z.string().optional(),
});

export const auditPlanUpdateSchema = auditPlanCreateSchema.partial();

export const auditPlanCancelSchema = z.object({
  reason: z.string().optional(),
});

// ─── Auditor Assignment ───────────────────────────────────────────────────────

export const auditAssignAuditorsSchema = z.object({
  auditors: z.array(
    z.object({
      assigneeAuthUserId: z.string().min(1),
      assigneeNameSnapshot: z.string().optional(),
      assigneeEmailSnapshot: z.string().email().optional(),
      role: z.enum(["LEAD", "MEMBER", "OBSERVER"]).default("MEMBER"),
    })
  ).min(1, "At least one auditor required"),
});

// ─── Departments ─────────────────────────────────────────────────────────────

export const auditPlanDepartmentsSchema = z.object({
  departments: z.array(
    z.object({
      departmentId: z.string().min(1),
      departmentCode: z.string().optional(),
      departmentName: z.string().optional(),
    })
  ).min(1),
});

// ─── Schedule ────────────────────────────────────────────────────────────────

export const auditScheduleCreateSchema = z.object({
  sessionTitle: z.string().min(1, "Session title is required"),
  location: z.string().optional(),
  agenda: z.string().optional(),
  startAt: dateField,
  endAt: dateField,
  departmentId: z.string().optional(),
  departmentName: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  leadAuditorAuthUserId: z.string().optional(),
  leadAuditorNameSnapshot: z.string().optional(),
  leadAuditorEmailSnapshot: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  auditeeNotifyDept: z.boolean().default(true),
  team: z.array(z.object({
    authUserId: z.string().min(1),
    nameSnapshot: z.string().optional(),
    emailSnapshot: z.string().email().optional().or(z.literal("").transform(() => undefined)),
    role: z.enum(["LEAD_AUDITOR", "AUDITOR", "OBSERVER", "AUDITEE"]),
  })).default([]),
});

export const auditScheduleUpdateSchema = auditScheduleCreateSchema.partial();

export const auditScheduleConfirmSchema = z.object({
  status: z.enum(["CONFIRMED", "UNAVAILABLE"]),
  reason: z.string().optional(),
});

// ─── Finding ─────────────────────────────────────────────────────────────────

export const auditFindingCreateSchema = z.object({
  departmentId: z.string().optional(),
  category: z.enum(["NC", "OBSERVATION", "OFI"]),
  severity: z.enum(["MINOR", "MAJOR", "CRITICAL"]).default("MINOR"),
  clause: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  detail: z.string().min(1, "Detail is required"),
  evidenceSummary: z.string().optional(),
  ownerAuthUserId: z.string().optional(),
  ownerNameSnapshot: z.string().optional(),
  dueAt: optionalDate,
});

export const auditFindingUpdateSchema = auditFindingCreateSchema.partial();

// ─── Corrective Action Response ───────────────────────────────────────────────

export const auditCorrectiveActionSchema = z.object({
  rootCause: z.string().min(1, "Root cause is required"),
  correction: z.string().optional(),
  correctiveActionPlan: z.string().min(1, "Corrective action plan is required"),
  targetDate: dateField,
});

// ─── Verification ─────────────────────────────────────────────────────────────

export const auditVerifySchema = z.object({
  result: z.enum(["PASS", "FAIL", "REOPEN"]),
  comment: z.string().optional(),
});

// ─── Attachment ───────────────────────────────────────────────────────────────

export const auditAttachmentCreateSchema = z.object({
  resourceType: z.enum(["PLAN", "FINDING", "REPORT"]),
  resourceId: z.string().min(1),
  fileName: z.string().min(1),
  fileUrl: z.string().optional(),
  sharePointItemId: z.string().optional(),
  mimeType: z.string().optional(),
  sizeBytes: z.number().int().positive().optional(),
});

// ─── Announce ─────────────────────────────────────────────────────────────────

export const auditAnnounceSchema = z.object({
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  deliveryMode: z.enum(["LINK", "ATTACHMENT", "BOTH"]).default("LINK"),
  recipientEmails: z.array(z.string().email()).optional().default([]),
});

// ─── Sign ─────────────────────────────────────────────────────────────────────

export const auditInAppSignSchema = z.object({
  signedRole: z.string().min(1),
});

export const auditSignRequestSchema = z.object({
  targetAuthUserId: z.string().min(1),
  targetEmail: z.string().email(),
  targetName: z.string().optional(),
  signedRole: z.string().min(1),
});

export const auditSignConsumeSchema = z.object({
  token: z.string().min(1),
  signedRole: z.string().min(1),
});

// ─── Report ───────────────────────────────────────────────────────────────────

export const auditReportSchema = z.object({
  summary: z.string().optional(),
  conclusion: z.string().optional(),
});

// ─── Plan Submit (wizard step 3) ─────────────────────────────────────────────

export const auditPlanSubmitSchema = z.object({
  signedRole: z.string().default("PREPARER"),
  signaturePath: z.string().optional(),
  reviewerAuthUserId: z.string().min(1, "Reviewer required"),
  reviewerEmail: z.string().email("Invalid reviewer email"),
  reviewerNameSnapshot: z.string().optional(),
  approverAuthUserId: z.string().min(1, "Approver required"),
  approverEmail: z.string().email("Invalid approver email"),
  approverNameSnapshot: z.string().optional(),
  emailGroupMails: z.array(z.string()).default([]),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type AuditPlanCreateInput = z.infer<typeof auditPlanCreateSchema>;
export type AuditPlanUpdateInput = z.infer<typeof auditPlanUpdateSchema>;
export type AuditAssignAuditorsInput = z.infer<typeof auditAssignAuditorsSchema>;
export type AuditPlanDepartmentsInput = z.infer<typeof auditPlanDepartmentsSchema>;
export type AuditScheduleCreateInput = z.infer<typeof auditScheduleCreateSchema>;
export type AuditScheduleUpdateInput = z.infer<typeof auditScheduleUpdateSchema>;
export type AuditScheduleConfirmInput = z.infer<typeof auditScheduleConfirmSchema>;
export type AuditFindingCreateInput = z.infer<typeof auditFindingCreateSchema>;
export type AuditFindingUpdateInput = z.infer<typeof auditFindingUpdateSchema>;
export type AuditCorrectiveActionInput = z.infer<typeof auditCorrectiveActionSchema>;
export type AuditVerifyInput = z.infer<typeof auditVerifySchema>;
export type AuditAttachmentCreateInput = z.infer<typeof auditAttachmentCreateSchema>;
export type AuditAnnounceInput = z.infer<typeof auditAnnounceSchema>;
export type AuditInAppSignInput = z.infer<typeof auditInAppSignSchema>;
export type AuditSignRequestInput = z.infer<typeof auditSignRequestSchema>;
export type AuditSignConsumeInput = z.infer<typeof auditSignConsumeSchema>;
export type AuditReportInput = z.infer<typeof auditReportSchema>;
export type AuditPlanSubmitInput = z.infer<typeof auditPlanSubmitSchema>;

// ─── Appointment ──────────────────────────────────────────────────────────────

export const auditAppointmentCreateSchema = z.object({
  year: z.number().int().min(2500).max(2999),
  title: z.string().min(1),
  standards: z.array(z.string()).default([]),
  members: z.array(z.object({
    authUserId: z.string().min(1),
    name: z.string().min(1),
    department: z.string().optional(),
    role: z.string().min(1),
    standards: z.array(z.string()).default([]),
    orderIndex: z.number().int().default(0),
  })).default([]),
  reviewerAuthUserId: z.string().min(1),
  reviewerEmail: z.string().email().or(z.literal("")).or(z.null()).transform((v) => v ?? ""),
  reviewerNameSnapshot: z.string().optional(),
  approverAuthUserId: z.string().min(1),
  approverEmail: z.string().email().or(z.literal("")).or(z.null()).transform((v) => v ?? ""),
  approverNameSnapshot: z.string().optional(),
  emailGroupMails: z.array(z.string().email("Invalid email")).default([]),
  emailGroupMailsCc: z.array(z.string().email("Invalid email")).default([]),
});

export type AuditAppointmentCreateInput = z.infer<typeof auditAppointmentCreateSchema>;

export const auditAppointmentUpdateSchema = auditAppointmentCreateSchema.partial();
export type AuditAppointmentUpdateInput = z.infer<typeof auditAppointmentUpdateSchema>;

export const auditAppointmentRejectSchema = z.object({
  reason: z.string().min(1),
  signedRole: z.enum(["REVIEWER", "APPROVER"]),
});

export type AuditAppointmentRejectInput = z.infer<typeof auditAppointmentRejectSchema>;
