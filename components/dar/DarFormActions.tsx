"use client";

import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

type Props = {
  isSaving: boolean;
  isSubmitting: boolean;
  disableSubmit?: boolean;
  onSaveDraft: () => void;
  onSubmit: () => void;
  mode: "create" | "edit";
  hideSubmit?: boolean;
};

export default function DarFormActions({ isSaving, isSubmitting, disableSubmit = false, onSaveDraft, onSubmit, mode, hideSubmit = false }: Props) {
  const t = useT();
  const isLoading = isSaving || isSubmitting;

  return (
    <div className="card-premium p-5">
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Button variant="ghost" size="sm" className=" gap-1 order-2 sm:order-1"
          type="button"
          onClick={onSaveDraft}
          disabled={isLoading}
          
        >
          {isSaving && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />}
          {mode === "create" ? t("saveDraft") : t("saveEdits")}
        </Button>
        {!hideSubmit && (
          <Button size="sm" className=" gap-1 order-1 sm:order-2"
            type="button"
            onClick={onSubmit}
            disabled={isLoading || disableSubmit}
          >
            {isSubmitting && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />}
            {t("submitRequest")}
          </Button>
        )}
      </div>
    </div>
  );
}
