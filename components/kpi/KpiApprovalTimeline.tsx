"use client";

import { useT } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";

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
                {sig?.comment && (
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1">{t("dar.approval.commentLabel")}</p>
                    <p className="text-xs text-slate-700 leading-relaxed">{sig.comment}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  /* ── VERTICAL layout (sidebar / approve panel) ─────────────── */
  return (
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
              {sig.comment && (
                <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <p className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">{t("dar.approval.commentLabel")}</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{sig.comment}</p>
                </div>
              )}
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
}
