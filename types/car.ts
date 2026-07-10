import type { CarStatus, CarSourceType, VerificationResult } from "@/generated/prisma/client";
import type { PaginatedResult } from "@/repositories/baseRepository";

export type { CarStatus, CarSourceType, VerificationResult };

export type CarListScope = "mine" | "my-department" | "all";

export const CAR_SCOPE_LABELS: Record<CarListScope, string> = {
  mine: "CAR ที่ฉันออก",
  "my-department": "CAR แผนกของฉัน",
  all: "CAR ทุกแผนก",
};

export const CAR_STATUS_LABELS: Record<CarStatus, string> = {
  DRAFT: "ฉบับร่าง",
  ISSUED: "ออก CAR แล้ว",
  RESPONDED: "ตอบกลับแล้ว",
  VERIFY_1: "รอติดตามครั้งที่ 1",
  VERIFY_2: "รอติดตามครั้งที่ 2",
  CLOSED: "ปิด CAR แล้ว",
  RE_CAR: "ออก Re-CAR",
  CANCELLED: "ยกเลิก",
};

export const CAR_STATUS_COLORS: Record<CarStatus, string> = {
  DRAFT: "bg-slate-50 text-slate-500 border-slate-200",
  ISSUED: "bg-blue-50 text-blue-600 border-blue-200",
  RESPONDED: "bg-amber-50 text-amber-600 border-amber-200",
  VERIFY_1: "bg-orange-50 text-orange-600 border-orange-200",
  VERIFY_2: "bg-orange-100 text-orange-700 border-orange-300",
  CLOSED: "bg-emerald-50 text-emerald-600 border-emerald-200",
  RE_CAR: "bg-rose-50 text-rose-600 border-rose-200",
  CANCELLED: "bg-slate-100 text-slate-400 border-slate-200",
};

export const CAR_SOURCE_LABELS: Record<CarSourceType, string> = {
  I: "(I) การตรวจติดตามคุณภาพภายใน",
  C: "(C) ข้อร้องเรียนจากลูกค้า",
  N: "(N) ปัญหาผลิตภัณฑ์ไม่เป็นไปตามข้อกำหนด",
  O: "(O) อื่นๆ",
};

export const ISO_STANDARDS = [
  "ISO 9001:2015",
  "ISO 14001:2015",
  "ISO 45001:2018",
] as const;

export type IsoStandard = (typeof ISO_STANDARDS)[number];

export type CarAttachmentRow = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  spItemId: string;
  spWebUrl: string;
  spDownloadUrl: string;
  folderPath: string;
  createdAt: string;
  uploadedBy: { id: string; name: string | null };
};

export type FiveWhyItem = { question: string; answer: string };

export type CarResponseDetail = {
  id: string;
  responderId: string;
  responderPosition: string;
  respondedAt: string;
  responseType: "FIVE_WHY" | "OTHER";
  fiveWhys: FiveWhyItem[] | null;
  whyAnalysis: string;
  additionalToolDetail: string | null;
  rootCausePerson: boolean;
  rootCauseMaterial: boolean;
  rootCauseMachine: boolean;
  rootCauseMethod: boolean;
  rootCauseOther: boolean;
  rootCauseOtherDetail: string | null;
  rootCauseSummary: string;
  immediateAction: string;
  preventiveAction: string;
  plannedCompletionDate: string;
  responderSignaturePath: string | null;
  responder: { id: string; name: string | null; employeeId: string | null };
  attachments: CarAttachmentRow[];
};

export type CarVerificationDetail = {
  id: string;
  round: number;
  verifierId: string;
  verifierPosition: string;
  verifiedAt: string;
  findings: string;
  result: VerificationResult;
  nextDueDate: string | null;
  verifierSignaturePath: string | null;
  verifier: { id: string; name: string | null; employeeId: string | null };
};

export type CarMrSignatureDetail = {
  id: string;
  mrUserId: string;
  signedAt: string;
  comment: string | null;
  mrUser: { id: string; name: string | null; employeeId: string | null };
};

export type CarMrResponseReviewDetail = {
  id: string;
  mrUserId: string;
  reviewedAt: string;
  action: "APPROVED" | "REJECTED";
  comment: string | null;
  mrUser: { id: string; name: string | null; employeeId: string | null };
};

export type CarDetail = {
  id: string;
  carNo: string;
  carYear: number;
  sequenceNo: number;
  status: CarStatus;
  sourceType: CarSourceType;
  sourceDetail: string | null;
  isoStandards: string[];
  defectDetail: string;
  nonConformanceRef: string;
  issuerPosition: string;
  issuerSignaturePath: string | null;
  issuedAt: string | null;
  responseDueAt: string | null;
  reCar: boolean;
  reCarRefId: string | null;
  reCarRef: { id: string; carNo: string } | null;
  reCarChildren: { id: string; carNo: string; status: string }[];
  createdAt: string;
  updatedAt: string;
  issuer: { id: string; name: string | null; employeeId: string | null; department: { id: string; name: string } | null };
  targetDepartment: { id: string; name: string; emailGroup: string | null };
  targetEmailGroups: string[];
  targetEmailGroupsCc: string[];
  response: CarResponseDetail | null;
  verifications: CarVerificationDetail[];
  mrSignature: CarMrSignatureDetail | null;
  mrResponseReview: CarMrResponseReviewDetail | null;
};

export type CarSummary = {
  id: string;
  carNo: string;
  carYear: number;
  status: CarStatus;
  sourceType: CarSourceType;
  defectDetail: string;
  issuedAt: string | null;
  responseDueAt: string | null;
  createdAt: string;
  targetAuthDepartmentId?: string | null;
  issuer: { id: string; name: string | null };
  targetDepartment: { id: string; name: string };
  verificationCount: number;
};

export type CarListQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: CarStatus;
  sourceType?: CarSourceType;
  scope?: CarListScope;
};

export type CarListResponse = PaginatedResult<CarSummary>;
