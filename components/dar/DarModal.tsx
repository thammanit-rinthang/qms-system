"use client";

import { useState } from "react";
import DarForm from "./DarForm";
import { useT } from "@/lib/i18n";
import ResponsiveFormOverlay from "@/components/common/ResponsiveFormOverlay";
import { Button } from "@/components/ui/button";
import { useDepartments } from "@/hooks/api/use-departments";

type RequesterInfo = {
  name: string | null;
  employeeId: string | null;
  department: string | null;
  requestDate: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  requesterInfo: RequesterInfo;
};

export default function DarModal({ isOpen, onClose, requesterInfo }: Props) {
  const t = useT();
  const [tempId] = useState(() => crypto.randomUUID());

  const { data: departments = [], isLoading: depsLoading, isError, refetch } = useDepartments();

  return (
    <ResponsiveFormOverlay
      open={isOpen}
      onOpenChange={(value) => { if (!value) onClose(); }}
      title={t("dar.drawer.title")}
      description={t("dar.drawer.subtitle")}
      desktopContentClassName="w-[min(96vw,72rem)] max-w-4xl"
      bodyClassName="space-y-4 px-4 py-5 md:px-6 md:py-6"
    >
          {depsLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-primary animate-spin" />
              <span className="text-slate-400 text-sm">{t("common.loading")}</span>
            </div>
          )}

          {isError && !depsLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <p className="text-slate-800 font-semibold text-base mb-1">{t("dar.drawer.depsError")}</p>
              <Button variant="outline" onClick={() => refetch()}>
                {t("dar.drawer.tryAgain")}
              </Button>
            </div>
          )}

          {!depsLoading && !isError && (
            <DarForm
              mode="create"
              tempId={tempId}
              departments={departments}
              requesterInfo={requesterInfo}
              onClose={onClose}
            />
          )}
    </ResponsiveFormOverlay>
  );
}
