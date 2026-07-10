"use client";

import { useState } from "react";
import DarForm from "./DarForm";
import { useT } from "@/lib/i18n";
import ResponsiveFormOverlay from "@/components/common/ResponsiveFormOverlay";
import { Button } from "@/components/ui/button";
import ConfirmModal from "@/components/common/ConfirmModal";
import { useDarDetail, useDeleteDar } from "@/hooks/api/use-dar";
import { useDepartments } from "@/hooks/api/use-departments";
import { toast } from "sonner";

type Props = {
  darId: string | null;
  onClose: () => void;
};

export default function DarEditModal({ darId, onClose }: Props) {
  const t = useT();
  const isOpen = darId !== null;

  const [tempId] = useState(() => crypto.randomUUID());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: dar, isLoading: darLoading, isError: darError, refetch } = useDarDetail(darId);
  const { data: departments = [], isLoading: depsLoading, isError: depsError } = useDepartments();
  const deleteMutation = useDeleteDar();

  const loading = darLoading || depsLoading;
  const hasError = (darError || depsError) && !loading;

  async function handleDelete() {
    if (!darId) return;
    deleteMutation.mutate(darId, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        onClose();
      },
      onError: (e) => {
        toast.error(e instanceof Error ? e.message : t("common.error"));
      },
    });
  }


  if (!isOpen) return null;

  return (
    <>
      <ResponsiveFormOverlay
        open={isOpen}
        onOpenChange={(value) => {
          if (!value) {
            if (showDeleteConfirm) setShowDeleteConfirm(false);
            else onClose();
          }
        }}
        title={t("dar.editDrawer.title")}
        description={dar?.darNo
          ? `${t("dar.editDrawer.darNoPrefix")} ${dar.darNo}`
          : t("dar.editDrawer.draft")}
        desktopContentClassName="w-[min(96vw,72rem)] max-w-4xl"
        bodyClassName="space-y-4 px-4 py-5 md:px-6 md:py-6"
      >
          <div className="flex items-center justify-between">
            <div />
            {dar?.status === "DRAFT" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                aria-label={t("dar.editDrawer.deleteLabel")}
                className="text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 sm:mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="hidden sm:inline">{t("common.delete")}</span>
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {loading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-primary animate-spin" />
                <span className="text-slate-400 text-sm">{t("common.loading")}</span>
              </div>
            )}

            {hasError && !loading && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                </div>
                <p className="text-slate-800 font-semibold text-base mb-1">{t("dar.editDrawer.loadError")}</p>
                <Button variant="outline" onClick={() => refetch()}>
                  {t("dar.drawer.tryAgain")}
                </Button>
              </div>
            )}

            {!loading && !hasError && dar && (
              <DarForm
                mode="edit"
                tempId={tempId}
                initialData={dar}
                departments={departments}
                requesterInfo={{
                  name: dar.requester.name,
                  employeeId: dar.requester.employeeId,
                  department: dar.requester.department?.name ?? null,
                  requestDate: dar.requestDate,
                }}
              />
            )}
          </div>
      </ResponsiveFormOverlay>

      {showDeleteConfirm && (
        <ConfirmModal
          title={t("dar.editDrawer.deleteConfirmTitle")}
          message={
            (dar?.darNo ?? t("dar.editDrawer.draft")) + "\n" +
            t("dar.editDrawer.deleteIrreversible")
          }
          confirmLabel={t("dar.editDrawer.deleteForever")}
          cancelLabel={t("common.cancel")}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          loading={deleteMutation.isPending}
          danger={true}
        />
      )}
    </>
  );
}
