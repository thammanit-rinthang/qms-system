"use client";

import { useT } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import type { DarApprovalRow } from "@/types/dar";

const STEP_ORDER: DarApprovalRow["stepRole"][] = ["PREPARER", "REVIEWER", "APPROVER_MR", "QMS_PROCESSOR"];

interface Props {
  approvals: DarApprovalRow[];
}

export default function DarApprovalTimeline({ approvals }: Props) {
  const t = useT();
  const locale = useLocale();

  const stepLabel = (role: DarApprovalRow["stepRole"]) => {
    switch (role) {
      case "PREPARER":
        return t("dar.approval.stepPreparer");
      case "REVIEWER":
        return t("dar.approval.stepReviewer");
      case "APPROVER_MR":
      case "APPROVER":
      case "APPROVER_DCC":
        return t("dar.approval.stepApproverMr");
      case "QMS_PROCESSOR":
        return "QMS";
      case "REQUESTER":
      case "REQUESTER_MANAGER":
      default:
        return role;
    }
  };

  const actionLabel = (action: DarApprovalRow["action"]) => ({
    APPROVED: t("dar.approval.actionApproved"),
    REJECTED: t("dar.approval.actionRejected"),
    PENDING: t("dar.approval.actionPending"),
  })[action];

  // Build a fixed 3-row list: use the real row if it exists, otherwise a placeholder
  const byRole = Object.fromEntries(approvals.map((a) => [a.stepRole, a])) as Partial<Record<DarApprovalRow["stepRole"], DarApprovalRow>>;

  return (
    <div className="flex flex-col">
      {STEP_ORDER.map((role, idx) => {
        const a = byRole[role];
        const isLast = idx === STEP_ORDER.length - 1;

        if (!a) {
          // Placeholder — step not yet created
          return (
            <div key={role} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 border-dashed border-slate-200 bg-slate-50 text-slate-300">
                  <span className="text-sm font-bold">{idx + 1}</span>
                </div>
                {!isLast && <div className="w-0.5 flex-1 my-1.5 bg-slate-100" style={{ minHeight: 32 }} />}
              </div>
              <div className="pb-6 flex-1 min-w-0 mt-2">
                <span className="text-sm font-semibold text-slate-400">{stepLabel(role)}</span>
                <p className="text-xs text-slate-300 mt-0.5">—</p>
              </div>
            </div>
          );
        }

        return (
          <div key={a.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 shadow-sm ${
                a.action === "APPROVED" ? "bg-emerald-500 border-emerald-500 text-white" :
                a.action === "REJECTED" ? "bg-rose-500 border-rose-500 text-white" :
                "bg-white border-amber-300 text-amber-500"
              }`}>
                {a.action === "APPROVED" ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
                ) : a.action === "REJECTED" ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                ) : (
                  <span className="text-sm font-bold">{idx + 1}</span>
                )}
              </div>
              {!isLast && (
                <div className={`w-0.5 flex-1 my-1.5 ${a.action === "APPROVED" ? "bg-emerald-200" : "bg-slate-100"}`} style={{ minHeight: 32 }} />
              )}
            </div>
            <div className="pb-6 flex-1 min-w-0 mt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-800">{stepLabel(a.stepRole)}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${
                  a.action === "APPROVED" ? "bg-emerald-100 text-emerald-700" :
                  a.action === "REJECTED" ? "bg-rose-100 text-rose-700" :
                  "bg-amber-100 text-amber-700"
                }`}>
                  {actionLabel(a.action)}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                  {a.assignedUser.name?.charAt(0) ?? a.assignedUser.employeeId?.charAt(0) ?? "?"}
                </div>
                <p className="text-sm text-slate-600 font-medium">
                  {a.assignedUser.name ?? a.assignedUser.employeeId ?? "—"}
                  {a.assignedUser.department && <span className="text-slate-400 font-normal"> · {a.assignedUser.department.name}</span>}
                </p>
              </div>
              {a.actionDate && (
                <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {new Date(a.actionDate).toLocaleString(locale === "en" ? "en-GB" : "th-TH", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
              {a.comment && (
                <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-3 relative">
                  <div className="absolute -top-2 left-4 w-4 h-4 bg-slate-50 border-t border-l border-slate-100 transform rotate-45" />
                  <p className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">{t("dar.approval.commentLabel")}</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{a.comment}</p>
                </div>
              )}
              {a.signatureUsedUrl && a.action === "APPROVED" && (
                <div className="mt-3 border border-slate-200 rounded-xl bg-white inline-block p-2 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.signatureUsedUrl} alt={t("dar.approval.sigAlt")} className="h-12 object-contain" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
