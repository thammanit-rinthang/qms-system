"use client";

import { useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import type { DarDetail } from "@/types/dar";
import type { SignatureType } from "@/types/dar";
import DarReadOnlyDetail from "./DarReadOnlyDetail";
import DarApprovalPanelWrapper from "./DarApprovalPanelWrapper";
import ApproveSuccessScreen from "@/components/shared/ApproveSuccessScreen";

interface Props {
  dar: DarDetail;
  currentUserId: string;
  savedSignatureUrl?: string | null;
  savedSignatureType?: SignatureType | null;
  isAssignedReviewer: boolean;
  darNo: string | null;
  darId: string;
  isMrApprove?: boolean;
  redirectToApproveOnAction?: boolean;
}

export default function DarReviewLayout({
  dar: initialDar,
  currentUserId,
  savedSignatureUrl,
  savedSignatureType,
  isAssignedReviewer,
  darNo,
  darId,
  isMrApprove = false,
  redirectToApproveOnAction = false,
}: Props) {
  const t = useT();
  const [dar, setDar] = useState<DarDetail>(initialDar);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [successDone, setSuccessDone] = useState(false);

  const myPendingStep = dar.approvals.find(
    (a) => a.assignedUser.id === currentUserId && a.action === "PENDING",
  );
  const canAct = !!myPendingStep;

  const resolvedBannerTitle = isMrApprove ? t("dar.approve.bannerTitle") : t("dar.review.bannerTitle");
  const resolvedBannerDesc = isMrApprove ? t("dar.approve.bannerDesc") : t("dar.review.bannerDesc");
  const resolvedBreadcrumb = isMrApprove ? t("dar.approve.breadcrumb") : t("dar.review.breadcrumb");

  if (successDone) {
    return (
      <ApproveSuccessScreen
        title="ดำเนินการเรียบร้อย"
        subtitle={`${isMrApprove ? "อนุมัติ" : "ตรวจสอบ"} DAR ${darNo ?? ""} เรียบร้อยแล้ว`}
        backHref="/approve"
        backLabel="กลับหน้าหลัก"
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Banner */}
      {isAssignedReviewer && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">{resolvedBannerTitle}</p>
            <p className="text-xs text-amber-700 mt-0.5">{resolvedBannerDesc}</p>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/dar" className="hover:text-slate-600 transition-colors">{t("dar.title")}</Link>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <Link href={`/dar/${darId}`} className="hover:text-slate-600 transition-colors truncate">
          {darNo ?? t("dar.field.darNoDraft")}
        </Link>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-slate-600 font-medium">{resolvedBreadcrumb}</span>
      </nav>

      <>
      {/* ── Desktop: two-column layout ── */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_380px] lg:gap-6 lg:items-start">
        {/* Left — DAR detail (scrollable) */}
        <div>
          <DarReadOnlyDetail
            dar={dar}
            currentUserId={currentUserId}
            savedSignatureUrl={savedSignatureUrl}
            savedSignatureType={savedSignatureType}
            readOnly
            hideApprovalPanel
          />
        </div>

        {/* Right — sticky approval panel */}
        <div className="sticky top-6">
              <DarApprovalPanelWrapper
                initialDar={dar}
                currentUserId={currentUserId}
                savedSignatureUrl={savedSignatureUrl}
                savedSignatureType={savedSignatureType}
                onExternalUpdate={(updated) => {
                  setDar(updated);
                  if (redirectToApproveOnAction) setSuccessDone(true);
                }}
              />
            </div>
          </div>

      {/* ── Mobile: full detail + floating bar ── */}
      <div className="lg:hidden">
        <DarReadOnlyDetail
          dar={dar}
          currentUserId={currentUserId}
          savedSignatureUrl={savedSignatureUrl}
          savedSignatureType={savedSignatureType}
          readOnly
          hideApprovalPanel
        />
      </div>

      {/* Floating bottom bar — mobile only */}
      {isAssignedReviewer && canAct && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40">
          {/* Sheet overlay */}
          {sheetOpen && (
            <div
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setSheetOpen(false)}
            />
          )}

          {/* Sheet panel */}
          <div className={`relative z-50 bg-white border-t border-slate-200 shadow-[0_-8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 ${sheetOpen ? "rounded-t-2xl" : ""}`}>
            {sheetOpen ? (
              <div className="max-h-[85vh] overflow-y-auto overscroll-contain">
                {/* Handle bar */}
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-slate-200" />
                </div>
                <div className="px-4 pb-8">
                  <DarApprovalPanelWrapper
                    initialDar={dar}
                    currentUserId={currentUserId}
                    savedSignatureUrl={savedSignatureUrl}
                    savedSignatureType={savedSignatureType}
                    onExternalUpdate={(updated) => {
                      setDar(updated);
                      if (redirectToApproveOnAction) setSuccessDone(true);
                    }}
                  />
                </div>
              </div>
            ) : (
              /* Collapsed bar */
              <div className="flex items-center gap-3 px-4 py-3 safe-area-inset-bottom">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 font-medium">{t("dar.review.floatPending")}</p>
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {myPendingStep?.stepRole === "REVIEWER" ? t("dar.approval.stepReviewer") : t("dar.approval.stepApproverMr")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSheetOpen(true)}
                  className="shrink-0 h-10 px-5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 active:scale-95 transition-all"
                >
                  {t("dar.review.floatAction")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      </>
    </div>
  );
}
