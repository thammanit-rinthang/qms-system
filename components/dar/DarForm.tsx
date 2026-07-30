"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDarForm } from "@/hooks/use-dar-form";
import { toast } from "sonner";
import DarRequesterSection from "./DarRequesterSection";
import DarObjectiveSection from "./DarObjectiveSection";
import DarItemsSection from "./DarItemsSection";
import DarDistributionSection from "./DarDistributionSection";
import DarFormActions from "./DarFormActions";
import DarAttachmentUpload from "./DarAttachmentUpload";
import DarSignSubmitModal from "./DarSignSubmitModal";
import DarReviewerSelectModal from "./DarReviewerSelectModal";
import type { DarDetail, DarObjective, DarDocType, TempAttachmentInput, SignatureType } from "@/types/dar";
import type { ReviewerUser } from "./DarReviewerSelectModal";
import { useT } from "@/lib/i18n";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  mode: "create" | "edit";
  initialData?: DarDetail;
  departments: { id: string; name: string }[];
  requesterInfo: {
    name: string | null;
    employeeId: string | null;
    department: string | null;
    requestDate: string;
  };
  tempId: string;
  hideSubmit?: boolean;
  savedSignatureUrl?: string | null;
  savedSignatureType?: SignatureType | null;
  onClose?: () => void;
};

export default function DarForm({ mode, initialData, departments, requesterInfo, tempId, hideSubmit = false, savedSignatureUrl, savedSignatureType, onClose }: Props) {
  const t = useT();

  const { data: footerConfigData } = useQuery({
    queryKey: ["qms-footer-config-single", "DAR"],
    queryFn: async () => {
      const res = await fetch("/api/qms/footer-config");
      if (!res.ok) throw new Error("Failed to load footer config");
      const json = await res.json();
      return (json.data ?? []).find((c: { moduleKey: string }) => c.moduleKey === "DAR") as { prefix: string; label: string } | undefined;
    },
  });

  const {
    state, errors, isSaving, isSubmitting,
    savedDarId, setTempAttachments,
    setField, saveDraft, validateAndStart, submitWithReviewer,
  } = useDarForm(
    mode,
    initialData,
    (msg) => toast.success(msg),
    (msg) => toast.error(msg),
  );

  // Multi-step submit flow state
  const [showSignModal, setShowSignModal] = useState(false);
  const [showReviewerModal, setShowReviewerModal] = useState(false);
  const [pendingSignature, setPendingSignature] = useState<{ dataUrl: string; type: SignatureType; saveToProfile: boolean } | null>(null);

  const isFormComplete =
    !!state.objective &&
    !!state.docType &&
    state.reason.trim().length > 0 &&
    state.items.length > 0 &&
    state.items.every((item) => item.docNumber.trim() && item.docName.trim() && item.revision.trim()) &&
    (state.docType !== "OTHER" || state.docTypeOther.trim().length > 0);

  async function handleSubmitClick() {
    if (!isFormComplete) return;
    const isValid = await validateAndStart();
    if (!isValid) return;
    setShowSignModal(true);
  }

  function handleSignConfirm(dataUrl: string, type: SignatureType, saveToProfile: boolean) {
    setPendingSignature({ dataUrl, type, saveToProfile });
    setShowSignModal(false);
    setShowReviewerModal(true);
  }

  function handleSignCancel() {
    setShowSignModal(false);
  }

  function handleReviewerBack() {
    setShowReviewerModal(false);
    setShowSignModal(true);
  }

  async function handleSend(reviewer: ReviewerUser) {
    if (!pendingSignature) return;
    const ok = await submitWithReviewer(pendingSignature.dataUrl, pendingSignature.type, pendingSignature.saveToProfile, reviewer);
    setShowReviewerModal(false);
    if (ok) {
      onClose?.();
    } else {
      setPendingSignature(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <DarRequesterSection
        name={requesterInfo.name}
        employeeId={requesterInfo.employeeId}
        department={requesterInfo.department}
        requestDate={requesterInfo.requestDate}
      />

      <DarObjectiveSection
        objective={state.objective}
        docType={state.docType}
        docTypeOther={state.docTypeOther}
        onObjectiveChange={(v: DarObjective) => setField("objective", v)}
        onDocTypeChange={(v: DarDocType) => setField("docType", v)}
        onDocTypeOtherChange={(v) => setField("docTypeOther", v)}
        errors={{ objective: errors.objective, docType: errors.docType, docTypeOther: errors.docTypeOther }}
      />

      {/* Reason section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
        <h2 className="text-slate-800 text-base font-semibold mb-4">
          {t("sectionReason")} <span className="text-rose-600">*</span>
        </h2>
        <Textarea
          className={errors.reason ? "border-rose-400 focus-visible:border-rose-500" : ""}
          placeholder={t("phReasonForRequest")}
          value={state.reason}
          onChange={(e) => setField("reason", e.target.value)}
          maxLength={2000}
        />
        {errors.reason && <p className="text-rose-600 text-xs mt-1">{errors.reason}</p>}
      </div>

      <DarItemsSection
        items={state.items}
        onChange={(items) => setField("items", items)}
        errors={errors}
      />

      <DarDistributionSection
        departments={departments}
        selected={state.distributionDepartmentIds}
        onChange={(ids) => setField("distributionDepartmentIds", ids)}
      />

      {/* Attachment section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
        <h2 className="text-slate-800 text-base font-semibold mb-2">{t("sectionAttach")}</h2>
        <p className="text-slate-400 text-sm mb-4">{t("attachDesc")}</p>

        {savedDarId ? (
          <DarAttachmentUpload
            mode="saved"
            darId={savedDarId}
            initialAttachments={initialData?.attachments ?? []}
            canEdit
          />
        ) : (
          <DarAttachmentUpload
            mode="temp"
            tempId={tempId}
            onTempItemsChange={(items: TempAttachmentInput[]) => setTempAttachments(items)}
          />
        )}
      </div>

      <DarFormActions
        mode={mode}
        isSaving={isSaving}
        isSubmitting={isSubmitting}
        disableSubmit={!isFormComplete}
        onSaveDraft={saveDraft}
        onSubmit={handleSubmitClick}
        hideSubmit={hideSubmit}
      />

      <DarSignSubmitModal
        open={showSignModal}
        onConfirm={handleSignConfirm}
        onCancel={handleSignCancel}
        savedSignatureUrl={savedSignatureUrl}
        savedSignatureType={savedSignatureType}
      />

      <DarReviewerSelectModal
        open={showReviewerModal}
        isSending={isSubmitting}
        onBack={handleReviewerBack}
        onSend={handleSend}
      />

      {/* Footer document name */}
      <div className="flex justify-end text-xs text-slate-400 font-mono mt-4 select-none">
        {footerConfigData?.prefix || "ไม่มีหมายเลขเอกสาร"} {footerConfigData?.label || "ไม่มีชื่อเอกสาร"}
      </div>

    </div>
  );
}
