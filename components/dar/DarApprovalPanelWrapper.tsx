"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import type { DarDetail } from "@/types/dar";
import type { SignatureType } from "@/types/dar";
import DarApprovalPanel from "./DarApprovalPanel";

interface Props {
  initialDar: DarDetail;
  currentUserId: string;
  savedSignatureUrl?: string | null;
  savedSignatureType?: SignatureType | null;
  onExternalUpdate?: (dar: DarDetail) => void;
}

export default function DarApprovalPanelWrapper({ initialDar, currentUserId, savedSignatureUrl, savedSignatureType, onExternalUpdate }: Props) {
  const t = useT();
  const router = useRouter();
  const [dar, setDar] = useState<DarDetail>(initialDar);
  const [done, setDone] = useState(false);

  function handleUpdated(updated: DarDetail) {
    setDar(updated);
    onExternalUpdate?.(updated);
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">{t("dar.approval.successFlash")}</h2>
          <p className="text-sm text-slate-500 mb-5">{dar.darNo}</p>
          <Link href="/notifications"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    );
  }

  return (
    <DarApprovalPanel
      dar={dar}
      currentUserId={currentUserId}
      savedSignatureUrl={savedSignatureUrl}
      savedSignatureType={savedSignatureType}
      onUpdated={handleUpdated}
    />
  );
}
