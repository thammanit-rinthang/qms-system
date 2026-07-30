"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Building2,
  Calendar,
  FileSignature,
  FileStack,
  FileText,
  Hash,
  History,
  MessageSquare,
  Paperclip,
  Printer,
  Target,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { FilePreviewModal, type FilePreviewTarget } from "@/components/common/FilePreviewModal";
import { fmtDate } from "@/lib/format";
import { useT } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { parseComment } from "@/lib/utils";
import type { DarDetail, DarRejectionHistoryRow, SignatureType } from "@/types/dar";
import { DOC_TYPE_LABELS, OBJECTIVE_LABELS } from "@/types/dar";
import DarApprovalPanelWrapper from "./DarApprovalPanelWrapper";
import DarAttachmentUpload from "./DarAttachmentUpload";
import DarDraftActions from "./DarDraftActions";
import DarItemsTable from "./DarItemsTable";
import DarStatusBadge from "./DarStatusBadge";
import QmsDarActions from "./QmsDarActions";
import type { ReviewerCandidate } from "@/hooks/api/use-reviewer-candidates";

interface Props {
  dar: DarDetail;
  currentUserId?: string;
  savedSignatureUrl?: string | null;
  savedSignatureType?: SignatureType | null;
  isQms?: boolean;
  readOnly?: boolean;
  hideApprovalPanel?: boolean;
  allowAttachmentEdit?: boolean;
}

const card =
  "bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-shadow duration-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]";
const cardHead =
  "px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between";
const cardBody = "p-6";
const sectionLabel =
  "text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5";
const sectionValue = "text-sm font-medium text-slate-800";

function inferMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "ppt":
      return "application/vnd.ms-powerpoint";
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "md":
      return "text/markdown";
    case "txt":
      return "text/plain";
    case "csv":
      return "text/csv";
    case "tsv":
      return "text/tab-separated-values";
    case "xml":
      return "text/xml";
    case "json":
      return "application/json";
    default:
      return "application/octet-stream";
  }
}

export default function DarReadOnlyDetail({
  dar,
  currentUserId,
  savedSignatureUrl,
  savedSignatureType,
  isQms = false,
  readOnly = false,
  hideApprovalPanel = false,
  allowAttachmentEdit = false,
}: Props) {
  const t = useT();
  const locale = useLocale();
  const isDraft = dar.status === "DRAFT";
  const canManageDar = isQms || isDraft;
  const attachmentsEditable = allowAttachmentEdit || (!readOnly && canManageDar);
  const rejected = dar.approvals.find((approval) => approval.action === "REJECTED");
  const [previewTarget, setPreviewTarget] = useState<FilePreviewTarget | null>(null);

  const { data: footerConfigData } = useQuery({
    queryKey: ["qms-footer-config-single", "DAR"],
    queryFn: async () => {
      const res = await fetch("/api/qms/footer-config");
      if (!res.ok) throw new Error("Failed to load footer config");
      const json = await res.json();
      return (json.data ?? []).find((config: { moduleKey: string }) => config.moduleKey === "DAR") as
        | { prefix: string; label: string }
        | undefined;
    },
  });

  const darLocale = locale === "en" ? "en-GB" : "th-TH";
  const isTh = locale === "th";

  const OBJECTIVE_LABELS_EN: Record<string, string> = {
    PREPARE_NEW: "Prepare New Document",
    REQUEST_COPY_CONTROLLED: "Request Controlled Copy",
    REQUEST_COPY_UNCONTROLLED: "Request Uncontrolled Copy",
    REVISE: "Revise Document",
    CANCEL: "Cancel Document",
  };

  const DOC_TYPE_LABELS_EN: Record<string, string> = {
    MANUAL: "Manual (M)",
    FORMAT: "Format (FM)",
    DRAWING: "Drawing",
    PROCEDURE: "Procedure (P)",
    SOP: "SOP",
    SIP: "SIP",
    IPQC: "IPQC",
    OTHER: "Other",
  };

  const objectiveLabel = isTh
    ? OBJECTIVE_LABELS[dar.objective]
    : (OBJECTIVE_LABELS_EN[dar.objective] ?? dar.objective);

  const docTypeLabel = isTh
    ? DOC_TYPE_LABELS[dar.docType]
    : (DOC_TYPE_LABELS_EN[dar.docType] ?? dar.docType);

  const stepRoleLabel = (stepRole: DarDetail["approvals"][number]["stepRole"]) => {
    if (stepRole === "REVIEWER") return isTh ? "ผู้ตรวจสอบ" : "Reviewer";
    if (stepRole === "APPROVER_MR") return isTh ? "ผู้แทนฝ่ายบริหาร" : "Management Representative";
    if (stepRole === "PREPARER") return isTh ? "ผู้จัดทำ" : "Preparer";
    if (stepRole === "QMS_PROCESSOR") return isTh ? "ผู้ดำเนินการ QMS" : "QMS Processor";
    return stepRole;
  };

  const rejectedStepLabel = rejected
    ? stepRoleLabel(rejected.stepRole)
    : null;
  const rejectedComment = rejected?.comment ? parseComment(rejected.comment) : null;
  const previousReviewerStep = dar.approvals.find((approval) => approval.stepRole === "REVIEWER");
  const previousReviewer: ReviewerCandidate | null = previousReviewerStep
    ? {
        id: previousReviewerStep.assignedUser.authUserId ?? previousReviewerStep.assignedUser.id,
        name: previousReviewerStep.assignedUser.name ?? previousReviewerStep.assignedUser.employeeId ?? "Reviewer",
        email: null,
        employeeId: previousReviewerStep.assignedUser.employeeId,
        department: previousReviewerStep.assignedUser.department?.name ?? null,
        jobTitle: null,
      }
    : null;
  const rejectionHistoryEntries: DarRejectionHistoryRow[] = dar.rejectionHistory.length > 0
    ? dar.rejectionHistory
    : rejected
      ? [{
          id: rejected.id,
          stepRole: rejected.stepRole,
          actionDate: rejected.actionDate ?? "",
          comment: rejected.comment ?? "",
          rejectedBy: rejected.assignedUser,
        }]
      : [];

  const openCommentAttachmentPreview = (file: { fileName: string; spItemId: string }) => {
    setPreviewTarget({
      fileName: file.fileName,
      mimeType: inferMimeType(file.fileName),
      sharePointItemId: file.spItemId,
    });
  };

  return (
    <div className="space-y-4">
      {rejected && rejectedStepLabel ? (
        <div className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50">
          <div className="flex items-center gap-2 border-b border-rose-200 bg-rose-100 px-5 py-3">
            <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span className="text-sm font-bold uppercase tracking-wide text-rose-700">
              {isTh ? "ถูกส่งคืน" : "Returned"}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-rose-500">
                {isTh ? "ส่งคืนโดย" : "Returned By"}
              </p>
              <p className="text-sm font-medium text-rose-900">
                {rejected.assignedUser.name ?? "-"}{" "}
                <span className="font-normal text-rose-400">({rejectedStepLabel})</span>
              </p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-rose-500">
                {isTh ? "ขั้นตอน" : "Step"}
              </p>
              <p className="text-sm font-medium text-rose-900">{rejectedStepLabel}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-rose-500">
                {isTh ? "วันที่" : "Date"}
              </p>
              <p className="text-sm font-medium text-rose-900">
                {rejected.actionDate ? fmtDate(rejected.actionDate, darLocale) : "-"}
              </p>
            </div>
            {rejectedComment ? (
              <div className="flex flex-col gap-2 sm:col-span-3">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-rose-500">
                    {isTh ? "เหตุผล" : "Reason"}
                  </p>
                  <p className="whitespace-pre-wrap rounded-lg border border-rose-100 bg-white/70 px-4 py-3 text-sm text-rose-900">
                    {rejectedComment.text || "-"}
                  </p>
                </div>
                {rejectedComment.attachments.length > 0 ? (
                  <div className="flex flex-col gap-1.5 rounded-lg border border-rose-100 bg-rose-50/50 px-4 py-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-rose-500">
                      {isTh ? "ไฟล์แนบ (การส่งคืน)" : "Rejection Attachments"}
                    </p>
                    <div className="flex flex-col gap-1">
                      {rejectedComment.attachments.map((file, idx) => (
                        <button
                          key={`${file.spItemId}-${idx}`}
                          type="button"
                          onClick={() => openCommentAttachmentPreview(file)}
                          className="inline-flex items-center gap-1.5 text-left text-xs text-blue-600 underline hover:text-blue-800"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          {file.fileName}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={card}>
        <div className="flex flex-col justify-between gap-4 px-6 py-5 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-xs text-slate-400">{t("fieldDarNo")}</p>
            {dar.darNo ? (
              <p className="text-2xl font-bold leading-tight tracking-tight text-[#0F1059]">
                {dar.darNo}
              </p>
            ) : (
              <p className="text-lg font-semibold text-slate-400">{t("fieldDarNoDraft")}</p>
            )}
            <p className="mt-1 font-mono text-xs text-slate-400">
              {fmtDate(dar.requestDate, darLocale)}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <DarStatusBadge status={dar.status} />
            <Link
              href={`/print/dar/${dar.id}`}
              target="_blank"
              className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200"
            >
              <Printer className="h-3.5 w-3.5" />
              Export PDF
            </Link>
            {isQms ? (
              <QmsDarActions darId={dar.id} darNo={dar.darNo} darStatus={dar.status} />
            ) : isDraft ? (
              <DarDraftActions darId={dar.id} previousReviewer={previousReviewer} />
            ) : null}
          </div>
        </div>
      </div>

      <div className={card}>
        <div className={cardHead}>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
              {t("sectionRequester")}
            </h2>
          </div>
        </div>
        <div
          className={`${cardBody} grid grid-cols-1 gap-6 bg-gradient-to-br from-white to-slate-50/30 md:grid-cols-4`}
        >
          <div className="flex items-center gap-4 md:col-span-1">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 shadow-inner">
              <span className="text-lg font-bold text-primary">
                {dar.requester.name?.charAt(0) ?? "?"}
              </span>
            </div>
            <div>
              <p className={sectionLabel}>{t("fieldFullName")}</p>
              <p className="text-base font-bold text-[#0F1059]">{dar.requester.name ?? "-"}</p>
            </div>
          </div>
          <div className="flex flex-col justify-center border-l border-slate-100 pl-6">
            <p className={sectionLabel}>
              <Hash className="h-3.5 w-3.5" /> {t("fieldEmpId")}
            </p>
            <p
              className={`${sectionValue} w-fit rounded bg-slate-100/80 px-2 py-0.5 font-mono text-slate-700`}
            >
              {dar.requester.employeeId ?? "-"}
            </p>
          </div>
          <div className="flex flex-col justify-center border-l border-slate-100 pl-6">
            <p className={sectionLabel}>
              <Building2 className="h-3.5 w-3.5" /> {t("fieldDepartment")}
            </p>
            <p className={sectionValue}>{dar.requester.department?.name ?? "-"}</p>
          </div>
          <div className="flex flex-col justify-center border-l border-slate-100 pl-6">
            <p className={sectionLabel}>
              <Calendar className="h-3.5 w-3.5" /> {t("fieldDate")}
            </p>
            <p className={sectionValue}>{fmtDate(dar.requestDate, darLocale)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={`${card} h-full`}>
          <div className={cardHead}>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-indigo-500" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                {t("sectionObjective")}
              </h2>
            </div>
          </div>
          <div className={`${cardBody} flex flex-col gap-5`}>
            <div className="flex items-start gap-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                <FileSignature className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className={sectionLabel}>{t("fieldObjective")}</p>
                <p className="text-base font-semibold text-indigo-950">
                  {objectiveLabel}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 rounded-xl border border-sky-100 bg-sky-50/50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100">
                <FileText className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <p className={sectionLabel}>{t("fieldDocType")}</p>
                <p className="text-base font-semibold text-sky-950">
                  {docTypeLabel}
                  {dar.docTypeOther ? (
                    <span className="font-normal text-sky-700"> - {dar.docTypeOther}</span>
                  ) : null}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={`${card} h-full`}>
          <div className={cardHead}>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                {t("sectionReason")}
              </h2>
            </div>
          </div>
          <div className={cardBody}>
            <div className="relative h-full min-h-[120px] rounded-xl border border-amber-100/50 bg-amber-50/50 p-5">
              <MessageSquare className="absolute right-4 top-4 h-8 w-8 text-amber-200 opacity-50" />
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {dar.reason}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={card}>
        <div className={cardHead}>
          <div className="flex items-center gap-2">
            <FileStack className="h-4 w-4 text-emerald-500" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
              {t("sectionItems")}
            </h2>
            <span className="ml-2 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
              {dar.items.length} {locale === "en" ? "items" : "รายการ"}
            </span>
          </div>
        </div>
        <div className="border-t border-slate-100 p-0">
          <DarItemsTable items={dar.items} />
        </div>
      </div>

      <div className={card}>
        <div className={cardHead}>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-500" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
              {t("sectionDistrib")}
            </h2>
            <span className="ml-2 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-700">
              {dar.distributions.length} {locale === "en" ? "dept(s)" : "แผนก"}
            </span>
          </div>
        </div>
        <div className={cardBody}>
          {dar.distributions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-slate-400">
              <Users className="mb-2 h-8 w-8 opacity-20" />
              <p className="text-sm">{t("noDeptFound")}</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {dar.distributions.map((distribution) => (
                <div
                  key={distribution.departmentId}
                  className="flex items-center gap-2 rounded-lg border border-purple-100 bg-purple-50 px-3.5 py-1.5 transition-colors hover:bg-purple-100/50"
                >
                  <div className="h-2 w-2 rounded-full bg-purple-400" />
                  <span className="text-sm font-medium text-purple-900">
                    {distribution.department.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={card}>
        <div className={cardHead}>
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
              {t("sectionAttach")}
            </h2>
            {dar.attachments.length > 0 ? (
              <span className="ml-2 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                {dar.attachments.length} {locale === "en" ? "file(s)" : "ไฟล์"}
              </span>
            ) : null}
          </div>
        </div>
        <div className={cardBody}>
          <DarAttachmentUpload
            mode="saved"
            darId={dar.id}
            initialAttachments={dar.attachments}
            canEdit={!!currentUserId && attachmentsEditable}
            readOnly={!attachmentsEditable}
          />
        </div>
      </div>

      {dar.attachmentActions.length > 0 ? (
        <div className={card}>
          <div className={cardHead}>
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-blue-500" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                {isTh ? "ประวัติการแก้ไขไฟล์แนบ" : "Attachment Edit History"}
              </h2>
            </div>
          </div>
          <div className={cardBody}>
            <ul className="flex flex-col gap-2">
              {dar.attachmentActions.map((h) => (
                <li key={h.id} className="rounded-lg bg-slate-50 px-3 py-2 text-[13px]">
                  <p className="text-slate-700">
                    <span className={h.action === "DELETE" ? "text-error font-semibold" : "text-success font-semibold"}>
                      {h.action === "DELETE" ? (isTh ? "ลบ" : "Deleted") : (isTh ? "เพิ่ม" : "Added")}
                    </span>{" "}
                    &ldquo;{h.fileName}&rdquo; {isTh ? "โดย" : "by"} {h.actorName ?? "-"} ({h.actorRole})
                  </p>
                  {h.remark && <p className="text-slate-500 mt-0.5">{isTh ? "หมายเหตุ" : "Remark"}: {h.remark}</p>}
                  <p className="text-slate-400 text-[11px] mt-0.5">{fmtDate(h.createdAt)}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {rejectionHistoryEntries.length > 0 ? (
        <div className={card}>
          <div className={cardHead}>
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-rose-500" />
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
                {isTh ? "ประวัติการส่งคืน" : "Rejection History"}
              </h2>
              <span className="ml-2 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                {rejectionHistoryEntries.length}
              </span>
            </div>
          </div>
          <div className="space-y-3 p-6">
            {rejectionHistoryEntries.map((entry, index) => {
              const parsed = parseComment(entry.comment);
              return (
                <div key={entry.id} className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-rose-500">
                        {isTh ? `ครั้งที่ ${rejectionHistoryEntries.length - index}` : `Reject #${rejectionHistoryEntries.length - index}`}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-rose-900">
                        {entry.rejectedBy.name ?? "-"}{" "}
                        <span className="font-normal text-rose-500">({stepRoleLabel(entry.stepRole)})</span>
                      </p>
                    </div>
                    <p className="text-xs font-medium text-slate-500">
                      {entry.actionDate ? fmtDate(entry.actionDate, darLocale) : "-"}
                    </p>
                  </div>

                  <div className="rounded-lg border border-rose-100 bg-white/80 px-4 py-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {isTh ? "ความเห็น / เหตุผล" : "Comment / Reason"}
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                      {parsed.text || "-"}
                    </p>
                  </div>

                  {parsed.attachments.length > 0 ? (
                    <div className="mt-3 rounded-lg border border-rose-100 bg-white/70 px-4 py-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {isTh ? "ไฟล์แนบประกอบ" : "Attachments"}
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {parsed.attachments.map((file, fileIndex) => (
                          <button
                            key={`${entry.id}-${file.spItemId}-${fileIndex}`}
                            type="button"
                            onClick={() => openCommentAttachmentPreview(file)}
                            className="inline-flex items-center gap-1.5 text-left text-xs text-[#0F1059] underline-offset-2 hover:underline"
                          >
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{file.fileName}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {!hideApprovalPanel && currentUserId && dar.status !== "DRAFT" ? (
        <DarApprovalPanelWrapper
          initialDar={dar}
          currentUserId={currentUserId}
          savedSignatureUrl={savedSignatureUrl}
          savedSignatureType={savedSignatureType}
        />
      ) : null}

      <div className="mt-4 flex select-none justify-end font-mono text-xs text-slate-400">
        {footerConfigData?.prefix || "ไม่มีหมายเลขเอกสาร"} {footerConfigData?.label || "ไม่มีชื่อเอกสาร"}
      </div>

      {previewTarget ? (
        <FilePreviewModal
          target={previewTarget}
          onClose={() => setPreviewTarget(null)}
          allowDownload={false}
        />
      ) : null}
    </div>
  );
}
