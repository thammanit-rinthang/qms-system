"use client";

import type { DarDetail } from "@/types/dar";
import type { SignatureType } from "@/types/dar";
import { OBJECTIVE_LABELS, DOC_TYPE_LABELS } from "@/types/dar";
import { useT } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import DarStatusBadge from "./DarStatusBadge";
import DarItemsTable from "./DarItemsTable";
import DarApprovalPanelWrapper from "./DarApprovalPanelWrapper";
import DarAttachmentUpload from "./DarAttachmentUpload";
import DarDraftActions from "./DarDraftActions";
import QmsDarActions from "./QmsDarActions";
import Link from "next/link";
import { fmtDate } from "@/lib/format";
import {
  User, Hash, Building2, Calendar, Target, FileText, FileSignature,
  MessageSquare, FileStack, Users, Paperclip, Printer, XCircle
} from "lucide-react";

interface Props {
  dar: DarDetail;
  currentUserId?: string;
  savedSignatureUrl?: string | null;
  savedSignatureType?: SignatureType | null;
  isQms?: boolean;
  readOnly?: boolean;
  hideApprovalPanel?: boolean;
}

const card = "bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-shadow duration-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]";
const cardHead = "px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between";
const cardBody = "p-6";
const sectionLabel = "text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5";
const sectionValue = "text-sm font-medium text-slate-800";

export default function DarReadOnlyDetail({ dar, currentUserId, savedSignatureUrl, savedSignatureType, isQms = false, readOnly = false, hideApprovalPanel = false }: Props) {
  const t = useT();
  const locale = useLocale();
  const isDraft = dar.status === "DRAFT";

  const darLocale = locale === "en" ? "en-GB" : "th-TH";

  return (
    <div className="space-y-4">
      {/* Header card — DAR No. + status + actions */}
      <div className={card}>
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400 mb-1">{t("fieldDarNo")}</p>
            {dar.darNo ? (
              <p className="text-2xl font-bold text-[#0F1059] leading-tight tracking-tight">{dar.darNo}</p>
            ) : (
              <p className="text-lg font-semibold text-slate-400">{t("fieldDarNoDraft")}</p>
            )}
            <p className="text-xs text-slate-400 mt-1 font-mono">{fmtDate(dar.requestDate, darLocale)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <DarStatusBadge status={dar.status} />
            <Link 
              href={`/print/dar/${dar.id}`} 
              target="_blank" 
              className="h-8 px-3 text-xs font-medium rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Export PDF
            </Link>
            {isQms
              ? <QmsDarActions darId={dar.id} darNo={dar.darNo} />
              : isDraft && <DarDraftActions darId={dar.id} />
            }
          </div>
        </div>
      </div>

      {/* Requester info */}
      <div className={card}>
        <div className={cardHead}>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{t("sectionRequester")}</h2>
          </div>
        </div>
        <div className={`${cardBody} grid grid-cols-1 md:grid-cols-4 gap-6 bg-gradient-to-br from-white to-slate-50/30`}>
          <div className="md:col-span-1 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-inner">
              <span className="text-lg font-bold text-primary">
                {dar.requester.name?.charAt(0) ?? "?"}
              </span>
            </div>
            <div>
              <p className={sectionLabel}>{t("fieldFullName")}</p>
              <p className="text-base font-bold text-[#0F1059]">{dar.requester.name ?? "—"}</p>
            </div>
          </div>
          <div className="flex flex-col justify-center border-l border-slate-100 pl-6">
            <p className={sectionLabel}><Hash className="w-3.5 h-3.5" /> {t("fieldEmpId")}</p>
            <p className={`${sectionValue} font-mono bg-slate-100/80 px-2 py-0.5 rounded text-slate-700 w-fit`}>{dar.requester.employeeId ?? "—"}</p>
          </div>
          <div className="flex flex-col justify-center border-l border-slate-100 pl-6">
            <p className={sectionLabel}><Building2 className="w-3.5 h-3.5" /> {t("fieldDepartment")}</p>
            <p className={sectionValue}>{dar.requester.department?.name ?? "—"}</p>
          </div>
          <div className="flex flex-col justify-center border-l border-slate-100 pl-6">
            <p className={sectionLabel}><Calendar className="w-3.5 h-3.5" /> {t("fieldDate")}</p>
            <p className={`${sectionValue}`}>{fmtDate(dar.requestDate, darLocale)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Objective & Doc type */}
        <div className={`${card} h-full`}>
          <div className={cardHead}>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{t("sectionObjective")}</h2>
            </div>
          </div>
          <div className={`${cardBody} flex flex-col gap-5`}>
            <div className="flex items-start gap-4 p-4 rounded-xl border border-indigo-100 bg-indigo-50/50">
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                <FileSignature className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className={sectionLabel}>{t("fieldObjective")}</p>
                <p className="text-base font-semibold text-indigo-950">{OBJECTIVE_LABELS[dar.objective]}</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl border border-sky-100 bg-sky-50/50">
              <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <p className={sectionLabel}>{t("fieldDocType")}</p>
                <p className="text-base font-semibold text-sky-950">
                  {DOC_TYPE_LABELS[dar.docType]}
                  {dar.docTypeOther && (
                    <span className="text-sky-700 font-normal"> — {dar.docTypeOther}</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Reason */}
        <div className={`${card} h-full`}>
          <div className={cardHead}>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{t("sectionReason")}</h2>
            </div>
          </div>
          <div className={cardBody}>
            <div className="h-full min-h-[120px] p-5 rounded-xl bg-amber-50/50 border border-amber-100/50 relative">
              <MessageSquare className="w-8 h-8 text-amber-200 absolute top-4 right-4 opacity-50" />
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{dar.reason}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className={card}>
        <div className={cardHead}>
          <div className="flex items-center gap-2">
            <FileStack className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{t("sectionItems")}</h2>
            <span className="ml-2 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
              {dar.items.length} {locale === "en" ? "items" : "รายการ"}
            </span>
          </div>
        </div>
        <div className="p-0 border-t border-slate-100">
          <DarItemsTable items={dar.items} />
        </div>
      </div>

      {/* Distribution */}
      <div className={card}>
        <div className={cardHead}>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-500" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{t("sectionDistrib")}</h2>
            <span className="ml-2 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
              {dar.distributions.length} {locale === "en" ? "dept(s)" : "แผนก"}
            </span>
          </div>
        </div>
        <div className={cardBody}>
          {dar.distributions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-slate-400">
              <Users className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm">{t("noDeptFound")}</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {dar.distributions.map((d) => (
                <div
                  key={d.departmentId}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-purple-50 border border-purple-100 transition-colors hover:bg-purple-100/50"
                >
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="text-sm font-medium text-purple-900">
                    {d.department.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Attachments */}
      <div className={card}>
        <div className={cardHead}>
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{t("sectionAttach")}</h2>
            {dar.attachments.length > 0 && (
              <span className="ml-2 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                {dar.attachments.length} {locale === "en" ? "file(s)" : "ไฟล์"}
              </span>
            )}
          </div>
        </div>
        <div className={cardBody}>
          <DarAttachmentUpload
            mode="saved"
            darId={dar.id}
            initialAttachments={dar.attachments}
            canEdit={
              !readOnly &&
              !!currentUserId &&
              dar.status === "DRAFT"
            }
            readOnly={readOnly}
          />
        </div>
      </div>

      {/* Rejection reason banner */}
      {(() => {
        const rejected = dar.approvals.find((a) => a.action === "REJECTED");
        if (!rejected) return null;
        const stepLabel = rejected.stepRole === "REVIEWER" ? "Reviewer"
          : rejected.stepRole === "APPROVER_MR" ? "MR"
          : rejected.stepRole;
        return (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-rose-100 border-b border-rose-200">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="text-sm font-bold text-rose-700 uppercase tracking-wide">
                ถูกปฏิเสธ / Rejected
              </span>
            </div>
            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs font-semibold text-rose-500 uppercase tracking-wide mb-1">ปฏิเสธโดย / Rejected By</p>
                <p className="text-sm font-medium text-rose-900">{rejected.assignedUser.name ?? "—"} <span className="text-rose-400 font-normal">({stepLabel})</span></p>
              </div>
              <div>
                <p className="text-xs font-semibold text-rose-500 uppercase tracking-wide mb-1">ขั้นตอน / Step</p>
                <p className="text-sm font-medium text-rose-900">{stepLabel}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-rose-500 uppercase tracking-wide mb-1">วันที่ / Date</p>
                <p className="text-sm font-medium text-rose-900">{rejected.actionDate ? fmtDate(rejected.actionDate, darLocale) : "—"}</p>
              </div>
              {rejected.comment && (
                <div className="sm:col-span-3">
                  <p className="text-xs font-semibold text-rose-500 uppercase tracking-wide mb-1">เหตุผล / Reason</p>
                  <p className="text-sm text-rose-900 whitespace-pre-wrap bg-white/70 rounded-lg px-4 py-3 border border-rose-100">{rejected.comment}</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Approval panel */}
      {!hideApprovalPanel && currentUserId && dar.status !== "DRAFT" && (
        <DarApprovalPanelWrapper
          initialDar={dar}
          currentUserId={currentUserId}
          savedSignatureUrl={savedSignatureUrl}
          savedSignatureType={savedSignatureType}
        />
      )}
    </div>
  );
}
