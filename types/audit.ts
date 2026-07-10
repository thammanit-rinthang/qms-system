import type {
  AuditPlanStatus,
  AuditType,
  AuditMode,
  AuditorRole,
  FindingCategory,
  FindingSeverity,
  FindingStatus,
  AuditAppointmentStatus,
} from "@/generated/prisma/client";
import type { PaginatedResult } from "@/repositories/baseRepository";

export type {
  AuditPlanStatus,
  AuditType,
  AuditMode,
  AuditorRole,
  FindingCategory,
  FindingSeverity,
  FindingStatus,
  AuditAppointmentStatus,
};

// ─── Labels / Colors ─────────────────────────────────────────────────────────

export const AUDIT_PLAN_STATUS_LABELS: Record<AuditPlanStatus, string> = {
  DRAFT: "ฉบับร่าง",
  PENDING_REVIEW: "รอ Reviewer ลงนาม",
  PENDING_APPROVAL: "รอ Approver ลงนาม",
  PLANNED: "วางแผนแล้ว",
  ANNOUNCED: "ประกาศแล้ว",
  IN_PROGRESS: "กำลังดำเนินการ",
  WAITING_CORRECTIVE: "รอแก้ไข",
  READY_TO_CLOSE: "พร้อมปิด",
  CLOSED: "ปิดแล้ว",
  CANCELLED: "ยกเลิก",
};

export const AUDIT_PLAN_STATUS_COLORS: Record<AuditPlanStatus, string> = {
  DRAFT: "bg-slate-50 text-slate-500 border-slate-200",
  PENDING_REVIEW: "bg-violet-50 text-violet-600 border-violet-200",
  PENDING_APPROVAL: "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200",
  PLANNED: "bg-blue-50 text-blue-600 border-blue-200",
  ANNOUNCED: "bg-indigo-50 text-indigo-600 border-indigo-200",
  IN_PROGRESS: "bg-amber-50 text-amber-600 border-amber-200",
  WAITING_CORRECTIVE: "bg-orange-50 text-orange-600 border-orange-200",
  READY_TO_CLOSE: "bg-teal-50 text-teal-600 border-teal-200",
  CLOSED: "bg-emerald-50 text-emerald-600 border-emerald-200",
  CANCELLED: "bg-slate-100 text-slate-400 border-slate-200",
};

export const AUDIT_TYPE_LABELS: Record<AuditType, string> = {
  INTERNAL: "ตรวจสอบภายใน",
  EXTERNAL: "ตรวจสอบภายนอก",
};

export const AUDIT_MODE_LABELS: Record<AuditMode, string> = {
  SYSTEM: "ระบบ",
  FILE_UPLOAD: "อัปโหลดไฟล์",
};

export const AUDITOR_ROLE_LABELS: Record<AuditorRole, string> = {
  LEAD: "ผู้นำทีม",
  MEMBER: "สมาชิก",
  OBSERVER: "ผู้สังเกตการณ์",
};

export const FINDING_CATEGORY_LABELS: Record<FindingCategory, string> = {
  NC: "ข้อบกพร่อง (NC)",
  OBSERVATION: "ข้อสังเกต",
  OFI: "โอกาสในการปรับปรุง (OFI)",
};

export const FINDING_SEVERITY_LABELS: Record<FindingSeverity, string> = {
  MINOR: "เล็กน้อย",
  MAJOR: "สำคัญ",
  CRITICAL: "วิกฤต",
};

export const FINDING_STATUS_LABELS: Record<FindingStatus, string> = {
  OPEN: "เปิด",
  RESPONDED: "ตอบกลับแล้ว",
  VERIFIED: "ยืนยันแล้ว",
  CLOSED: "ปิดแล้ว",
  REOPENED: "เปิดใหม่",
  REJECTED: "ปฏิเสธ",
};

export const FINDING_STATUS_COLORS: Record<FindingStatus, string> = {
  OPEN: "bg-blue-50 text-blue-600 border-blue-200",
  RESPONDED: "bg-amber-50 text-amber-600 border-amber-200",
  VERIFIED: "bg-teal-50 text-teal-600 border-teal-200",
  CLOSED: "bg-emerald-50 text-emerald-600 border-emerald-200",
  REOPENED: "bg-orange-50 text-orange-600 border-orange-200",
  REJECTED: "bg-rose-50 text-rose-600 border-rose-200",
};

export const FINDING_SEVERITY_COLORS: Record<FindingSeverity, string> = {
  MINOR: "bg-slate-50 text-slate-500 border-slate-200",
  MAJOR: "bg-orange-50 text-orange-600 border-orange-200",
  CRITICAL: "bg-rose-50 text-rose-600 border-rose-200",
};

// ─── API Shape Types ──────────────────────────────────────────────────────────

export type AuditPlanSummary = {
  id: string;
  auditNo: string;
  title: string;
  auditType: AuditType;
  mode: AuditMode;
  status: AuditPlanStatus;
  standard: string | null;
  scope: string | null;
  startDate: string | null;
  endDate: string | null;
  ownerAuthUserId: string;
  ownerNameSnapshot: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuditDepartmentRow = {
  id: string;
  departmentId: string;
  departmentCode: string | null;
  departmentName: string | null;
};

export type AuditAuditorRow = {
  id: string;
  assigneeAuthUserId: string;
  assigneeNameSnapshot: string | null;
  assigneeEmailSnapshot: string | null;
  role: AuditorRole;
};

export type AuditScheduleConfirmStatus = "PENDING" | "CONFIRMED" | "UNAVAILABLE";

export type AuditTeamRole = "LEAD_AUDITOR" | "AUDITOR" | "OBSERVER" | "AUDITEE";

export type AuditScheduleTeamMemberRow = {
  id: string;
  authUserId: string;
  nameSnapshot: string | null;
  emailSnapshot: string | null;
  role: AuditTeamRole;
};

export const AUDIT_TEAM_ROLE_LABELS: Record<AuditTeamRole, string> = {
  LEAD_AUDITOR: "หัวผู้ตรวจสอบ",
  AUDITOR: "ผู้ตรวจสอบ",
  OBSERVER: "ผู้สังเกตการณ์",
  AUDITEE: "ผู้รับการตรวจ",
};

export type AuditScheduleRow = {
  id: string;
  planId: string;
  sessionTitle: string;
  location: string | null;
  agenda: string | null;
  startAt: string;
  endAt: string;
  departmentId: string | null;
  departmentName: string | null;
  contactEmail: string | null;
  confirmStatus: AuditScheduleConfirmStatus;
  unavailableReason: string | null;
  confirmedAt: string | null;
  confirmedByName: string | null;
  leadAuditorAuthUserId: string | null;
  leadAuditorNameSnapshot: string | null;
  leadAuditorEmailSnapshot: string | null;
  checklistDueAt: string | null;
  checklistSubmittedAt: string | null;
  checklistSubmittedByName: string | null;
  auditeeNotifyDept: boolean;
  team: AuditScheduleTeamMemberRow[];
};

export type AuditAnnouncementRow = {
  id: string;
  title: string;
  message: string | null;
  deliveryMode: string | null;
  publishedAt: string;
};

export type AuditSignoffRow = {
  id: string;
  signerAuthUserId: string;
  signerNameSnapshot: string | null;
  signedRole: string;
  signedAt: string;
};

export type AuditReportRow = {
  id: string;
  reportNo: string;
  summary: string | null;
  conclusion: string | null;
  generatedAt: string;
  pdfFileUrl: string | null;
};

export type AuditFindingRow = {
  id: string;
  planId: string;
  findingNo: string;
  departmentId: string | null;
  category: FindingCategory;
  severity: FindingSeverity;
  clause: string | null;
  title: string;
  detail: string;
  evidenceSummary: string | null;
  ownerAuthUserId: string | null;
  ownerNameSnapshot: string | null;
  status: FindingStatus;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuditCorrectiveActionRow = {
  id: string;
  rootCause: string;
  correction: string | null;
  correctiveActionPlan: string;
  targetDate: string;
  respondedAt: string;
  respondedByAuthUserId: string | null;
};

export type AuditVerificationRow = {
  id: string;
  result: "PASS" | "FAIL" | "REOPEN";
  comment: string | null;
  verifiedAt: string;
  verifiedByAuthUserId: string | null;
};

export type AuditFindingDetail = AuditFindingRow & {
  correctiveAction: AuditCorrectiveActionRow | null;
  verifications: AuditVerificationRow[];
};

export type AuditPlanDetail = AuditPlanSummary & {
  standards: string[];
  objective: string | null;
  sourceOrganization: string | null;
  summary: string | null;
  appointmentId: string | null;
  reviewerAuthUserId: string | null;
  reviewerEmail: string | null;
  reviewerNameSnapshot: string | null;
  approverAuthUserId: string | null;
  approverEmail: string | null;
  approverNameSnapshot: string | null;
  departments: AuditDepartmentRow[];
  auditors: AuditAuditorRow[];
  schedules: AuditScheduleRow[];
  announcements: AuditAnnouncementRow[];
  findings: AuditFindingRow[];
  signoffs: AuditSignoffRow[];
  report: AuditReportRow | null;
};

export type AuditAttachmentRow = {
  id: string;
  resourceType: string;
  resourceId: string;
  fileName: string;
  fileUrl: string | null;
  spDownloadUrl: string | null;
  sharePointItemId: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedByAuthUserId: string | null;
  createdAt: string;
};

export type AuditPlanListResponse = PaginatedResult<AuditPlanSummary>;
export type AuditFindingListResponse = PaginatedResult<AuditFindingRow>;

// ─── Appointment Types ────────────────────────────────────────────────────────

export const AUDIT_APPOINTMENT_STATUS_LABELS: Record<AuditAppointmentStatus, string> = {
  DRAFT: "ฉบับร่าง",
  PENDING_REVIEW: "รอผู้ตรวจสอบลงนาม",
  PENDING_APPROVAL: "รอผู้อนุมัติลงนาม",
  PUBLISHED: "เผยแพร่แล้ว",
};

export const AUDIT_APPOINTMENT_STATUS_COLORS: Record<AuditAppointmentStatus, string> = {
  DRAFT: "bg-slate-50 text-slate-500 border-slate-200",
  PENDING_REVIEW: "bg-amber-50 text-amber-600 border-amber-200",
  PENDING_APPROVAL: "bg-violet-50 text-violet-600 border-violet-200",
  PUBLISHED: "bg-emerald-50 text-emerald-600 border-emerald-200",
};

export type AuditAppointmentMemberRow = {
  id: string;
  appointmentId: string;
  authUserId: string;
  name: string;
  department: string | null;
  role: string;
  standards: string[];
  orderIndex: number;
};

export type AuditAppointmentSignoffRow = {
  id: string;
  signedByAuthUserId: string;
  signedRole: string;
  signerNameSnapshot: string | null;
  signedAt: string;
  signaturePath: string | null;
};

export type AuditAppointmentRow = {
  id: string;
  appointmentNo: string;
  year: number;
  title: string;
  standards: string[];
  status: AuditAppointmentStatus;
  rejectReason: string | null;
  ownerAuthUserId: string | null;
  ownerEmail: string | null;
  ownerNameSnapshot: string | null;
  reviewerAuthUserId: string | null;
  reviewerEmail: string | null;
  reviewerNameSnapshot: string | null;
  approverAuthUserId: string | null;
  approverEmail: string | null;
  approverNameSnapshot: string | null;
  emailGroupMails: string[];
  emailGroupMailsCc: string[];
  ownerSignaturePath: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  members: AuditAppointmentMemberRow[];
  signoffs: AuditAppointmentSignoffRow[];
};
