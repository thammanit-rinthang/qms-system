import type { DarStatus, ApprovalStep, ApprovalAction, SignatureType } from "@/generated/prisma/client";
export type { ApprovalStep, ApprovalAction, SignatureType, DarStatus };

export type DarObjective =
  | "PREPARE_NEW"
  | "REQUEST_COPY_CONTROLLED"
  | "REQUEST_COPY_UNCONTROLLED"
  | "REVISE"
  | "CANCEL";

export type DarDocType =
  | "MANUAL"
  | "FORMAT"
  | "DRAWING"
  | "PROCEDURE"
  | "SOP"
  | "SIP"
  | "IPQC"
  | "OTHER";

export const OBJECTIVE_LABELS: Record<DarObjective, string> = {
  PREPARE_NEW: "จัดทำเอกสารใหม่",
  REQUEST_COPY_CONTROLLED: "ขอสำเนาฉบับควบคุม",
  REQUEST_COPY_UNCONTROLLED: "ขอสำเนาฉบับไม่ควบคุม",
  REVISE: "แก้ไขเอกสาร",
  CANCEL: "ยกเลิกเอกสาร",
};

export const DOC_TYPE_LABELS: Record<DarDocType, string> = {
  MANUAL: "คู่มือ / Manual (M)",
  FORMAT: "แบบฟอร์ม / Format (FM)",
  DRAWING: "แบบวาด / Drawing",
  PROCEDURE: "ขั้นตอน / Procedure (P)",
  SOP: "SOP",
  SIP: "SIP",
  IPQC: "IPQC",
  OTHER: "อื่นๆ / Other",
};

export const DAR_STATUS_LABELS: Record<DarStatus, string> = {
  DRAFT: "ฉบับร่าง",
  PENDING_REVIEW: "รอตรวจสอบ",
  PENDING_APPROVE: "รออนุมัติ",
  QMS_PROCESSING: "QMS ดำเนินการ",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};

export type DarItemInput = {
  itemNo: number;
  docNumber: string;
  docName: string;
  revision: string;
  effectiveDate?: string | null;
};

export type DarAttachmentRow = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  spItemId: string;
  spWebUrl: string;
  spDownloadUrl: string;
  folderPath: string;
  remark?: string | null;
  createdAt: string;
  uploadedBy: { id: string; name: string | null };
};

export type DarAttachmentActionRow = {
  id: string;
  attachmentId: string | null;
  fileName: string;
  action: "ADD" | "DELETE";
  remark: string | null;
  actorName: string | null;
  actorRole: string;
  createdAt: string;
};

export type DarRequester = {
  id: string;
  authUserId?: string | null;
  name: string | null;
  employeeId: string | null;
  email?: string | null;
  department: { id: string; name: string } | null;
};

export type DarDistributionItem = {
  departmentId: string;
  department: { id: string; name: string };
};

export type DarApprovalRow = {
  id: string;
  stepRole: ApprovalStep;
  action: ApprovalAction;
  actionDate: string | null;
  signatureUsedUrl: string | null;
  signatureTypeUsed: SignatureType | null;
  comment: string | null;
  assignedUser: {
    id: string;
    authUserId?: string | null;
    name: string | null;
    employeeId: string | null;
    department: { id: string; name: string } | null;
  };
};

export type DarRejectionHistoryRow = {
  id: string;
  stepRole: ApprovalStep;
  actionDate: string;
  comment: string;
  rejectedBy: {
    id: string;
    authUserId?: string | null;
    name: string | null;
    employeeId: string | null;
    department: { id: string; name: string } | null;
  };
};

export type ReviewerCandidate = {
  id: string;
  name: string | null;
  email: string;
  employeeId: string | null;
  department: { id: string; name: string } | null;
  msUserId: string | null;
};

export type DarDetail = {
  id: string;
  darNo: string | null;
  requestDate: string;
  objective: DarObjective;
  docType: DarDocType;
  docTypeOther: string | null;
  reason: string;
  status: DarStatus;
  requester: DarRequester;
  items: DarItemInput[];
  distributions: DarDistributionItem[];
  approvals: DarApprovalRow[];
  rejectionHistory: DarRejectionHistoryRow[];
  attachments: DarAttachmentRow[];
  attachmentActions: DarAttachmentActionRow[];
  qmsProcessing: {
    chkHasAttachment: boolean;
    chkPrintAndValidate: boolean;
    chkRenumber: boolean;
    chkImpactInvestigated: boolean;
    chkSubmitVerification: boolean;
    chkGetBackProcess: boolean;
    chkCopyDistribute: boolean;
    comments: string | null;
    processDate: string | null;
    qmsUserId: string;
    qmsAuthUserId?: string | null;
    qmsUserName?: string | null;
    qmsUserEmployeeId?: string | null;
  } | null;
};

export type DarSummary = {
  id: string;
  darNo: string | null;
  requestDate: string;
  objective: DarObjective;
  docType: DarDocType;
  status: DarStatus;
  itemCount: number;
};

export type TempAttachmentInput = {
  spItemId: string;
  spWebUrl: string;
  spDownloadUrl: string;
  folderPath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

export type CreateDarInput = {
  objective: DarObjective;
  docType: DarDocType;
  docTypeOther?: string;
  reason: string;
  items: Omit<DarItemInput, "itemNo">[];
  distributionDepartmentIds: string[];
  tempAttachments?: TempAttachmentInput[];
};
