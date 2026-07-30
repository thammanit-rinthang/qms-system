"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { parseComment } from "@/lib/utils";
import { FilePreviewModal, type FilePreviewTarget } from "@/components/common/FilePreviewModal";

type ApprovalAction = "PENDING" | "APPROVED" | "REJECTED";
type ApprovalStep = "PREPARER" | "REVIEWER" | "APPROVER";

export type KpiApprovalSignature = {
  step: string;
  action: ApprovalAction;
  actionDate?: string | Date | null;
  signaturePath?: string | null;
  comment?: string | null;
  signerUser?: {
    id: string;
    name?: string | null;
    email?: string | null;
    department?: { name: string } | null;
  } | null;
};

type StepConfig = { step: ApprovalStep; labelKey: string };

const KPI_STEPS: StepConfig[] = [
  { step: "PREPARER", labelKey: "dar.approval.stepPreparer" },
  { step: "REVIEWER", labelKey: "dar.approval.stepReviewer" },
  { step: "APPROVER", labelKey: "dar.approval.stepApproverMr" },
];

export const KPI_MONTHLY_STEPS: StepConfig[] = [
  { step: "PREPARER", labelKey: "dar.approval.stepPreparer" },
  { step: "REVIEWER", labelKey: "dar.approval.stepReviewer" },
];

interface Props {
  signatures: KpiApprovalSignature[];
  preparerName?: string | null;
  reviewerName?: string | null;
  approverName?: string | null;
  /** "horizontal" (default in detail page) or "vertical" (sidebar panel) */
  layout?: "horizontal" | "vertical";
  /** Override the default 3-step config. Pass KPI_MONTHLY_STEPS for monthly reports. */
  steps?: StepConfig[];
}

export default function KpiApprovalTimeline({
  signatures,
  preparerName,
  reviewerName,
  approverName,
  layout = "vertical",
  steps = KPI_STEPS,
}: Props) {
  const t = useT();
  const locale = useLocale();
  const [preview, setPreview] = useState<FilePreviewTarget | null>(null);

  const inferMimeType = (fileName: string): string => {
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
  };


  const byStep = Object.fromEntries(
    signatures.map((s) => [s.step, s])
  ) as Partial<Record<ApprovalStep, KpiApprovalSignature>>;

  const assignedName = (step: ApprovalStep): string | null => {
    if (step === "PREPARER") return preparerName ?? null;
    if (step === "REVIEWER") return reviewerName ?? null;
    if (step === "APPROVER") return approverName ?? null;
    return null;
  };

  const actionLabel = (action: ApprovalAction) =>
    ({ APPROVED: t("dar.approval.actionApproved"), REJECTED: t("dar.approval.actionRejected"), PENDING: t("dar.approval.actionPending") })[action];

  const iconNode = (action: ApprovalAction, idx: number) => {
    if (action === "APPROVED")
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    if (action === "REJECTED")
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    return <span className="text-xs font-bold">{idx + 1}</span>;
  };

  const bubbleClass = (action: ApprovalAction) =>
    action === "APPROVED"
      ? "bg-emerald-500 border-emerald-500 text-white"
      : action === "REJECTED"
      ? "bg-rose-500 border-rose-500 text-white"
      : "bg-white border-amber-300 text-amber-500";

  const badgeClass = (action: ApprovalAction) =>
    action === "APPROVED"
      ? "bg-emerald-100 text-emerald-700"
      : action === "REJECTED"
      ? "bg-rose-100 text-rose-700"
      : "bg-amber-100 text-amber-700";

  /* ── HORIZONTAL layout ─────────────────────────────────────── */
  if (layout === "horizontal") {
    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        {steps.map(({ step, labelKey }, idx) => {
          const sig = byStep[step];
          const label = t(labelKey as never) ?? step;
          const action: ApprovalAction = sig?.action ?? "PENDING";
          const userName = sig?.signerUser?.name ?? sig?.signerUser?.email ?? assignedName(step) ?? "—";
          const deptName = sig?.signerUser?.department?.name;

          return (
            <div key={step} className="flex items-start gap-3 px-5 py-4 first:pl-0 last:pr-0 sm:first:pl-0 sm:last:pr-0">
              {/* Step indicator */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 shadow-sm mt-0.5 ${bubbleClass(action)}`}>
                {iconNode(action, idx)}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${badgeClass(action)}`}>
                    {actionLabel(action)}
                  </span>
                </div>

                {/* Name */}
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-600 shrink-0">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-sm font-semibold text-slate-800 truncate">{userName}</p>
                </div>
                {deptName && <p className="text-xs text-slate-400 truncate">{deptName}</p>}

                {/* Date */}
                {sig?.actionDate && (
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {new Date(sig.actionDate).toLocaleString(
                      locale === "en" ? "en-GB" : "th-TH",
                      { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
                    )}
                  </p>
                )}

                {/* Signature image */}
                {sig?.signaturePath && action === "APPROVED" && (
                  <div className="border border-slate-200 rounded-xl bg-white inline-block p-2 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={sig.signaturePath} alt={t("dar.approval.sigAlt")} className="h-10 object-contain max-w-30" />
                  </div>
                )}

                {/* Comment */}
                {sig?.comment && (() => {
                  const parsed = parseComment(sig.comment);
                  return (
                    <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5 flex flex-col gap-1.5">
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">{t("dar.approval.commentLabel")}</p>
                        <p className="text-xs text-slate-700 leading-relaxed">{parsed.text || "—"}</p>
                      </div>
                      {parsed.attachments && parsed.attachments.length > 0 && (
                        <div className="border-t border-slate-200/60 pt-1.5 flex flex-col gap-1">
                          {parsed.attachments.map((file, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setPreview({ fileName: file.fileName, mimeType: inferMimeType(file.fileName), sharePointItemId: file.spItemId })}
                              className="text-[11px] text-[#0F1059] hover:text-[#161875] underline inline-flex items-center gap-1 text-left"
                            >
                              {file.fileName}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
      {preview && <FilePreviewModal target={preview} onClose={() => setPreview(null)} />}
    </>
    );
  }

  /* ── VERTICAL layout (sidebar / approve panel) ─────────────── */
  const inner = (
    <div className="flex flex-col">
      {steps.map(({ step, labelKey }, idx) => {
        const sig = byStep[step];
        const isLast = idx === steps.length - 1;
        const label = t(labelKey as never) ?? step;

        if (!sig) {
          return (
            <div key={step} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 border-dashed border-slate-200 bg-slate-50 text-slate-300">
                  <span className="text-sm font-bold">{idx + 1}</span>
                </div>
                {!isLast && <div className="w-0.5 flex-1 my-1.5 bg-slate-100" style={{ minHeight: 32 }} />}
              </div>
              <div className="pb-6 flex-1 min-w-0 mt-2">
                <span className="text-sm font-semibold text-slate-400">{label}</span>
                <p className="text-xs text-slate-300 mt-0.5">{assignedName(step) ?? "—"}</p>
              </div>
            </div>
          );
        }

        const userName = sig.signerUser?.name ?? sig.signerUser?.email ?? assignedName(step) ?? "—";
        const deptName = sig.signerUser?.department?.name;
        const action = sig.action;

        return (
          <div key={step} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 shadow-sm ${bubbleClass(action)}`}>
                {iconNode(action, idx)}
              </div>
              {!isLast && (
                <div className={`w-0.5 flex-1 my-1.5 ${action === "APPROVED" ? "bg-emerald-200" : "bg-slate-100"}`} style={{ minHeight: 32 }} />
              )}
            </div>
            <div className="pb-6 flex-1 min-w-0 mt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-800">{label}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${badgeClass(action)}`}>
                  {actionLabel(action)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm text-slate-600 font-medium">
                  {userName}
                  {deptName && <span className="text-slate-400 font-normal"> · {deptName}</span>}
                </p>
              </div>
              {sig.actionDate && (
                <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {new Date(sig.actionDate).toLocaleString(
                    locale === "en" ? "en-GB" : "th-TH",
                    { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
                  )}
                </p>
              )}
              {sig.comment && (() => {
                const parsed = parseComment(sig.comment);
                return (
                  <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-3 flex flex-col gap-2">
                    <div>
                      <p className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">{t("dar.approval.commentLabel")}</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{parsed.text || "—"}</p>
                    </div>
                    {parsed.attachments && parsed.attachments.length > 0 && (
                      <div className="border-t border-slate-200/60 pt-2 flex flex-col gap-1.5">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">เอกสารแนบประกอบ</p>
                        <div className="flex flex-col gap-1">
                          {parsed.attachments.map((file, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setPreview({ fileName: file.fileName, mimeType: inferMimeType(file.fileName), sharePointItemId: file.spItemId })}
                              className="text-xs text-[#0F1059] hover:text-[#161875] underline inline-flex items-center gap-1.5 text-left"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              {file.fileName}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              {sig.signaturePath && action === "APPROVED" && (
                <div className="mt-3 border border-slate-200 rounded-xl bg-white inline-block p-2 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sig.signaturePath} alt={t("dar.approval.sigAlt")} className="h-12 object-contain" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <>
      {inner}
      {preview && <FilePreviewModal target={preview} onClose={() => setPreview(null)} />}
    </>
  );
}
