"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Trash2, Send } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { ActionPillButton } from "@/components/common/ActionButtons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import DarEditModal from "./DarEditModal";
import DarSignSubmitModal from "./DarSignSubmitModal";
import DarReviewerSelectModal from "./DarReviewerSelectModal";
import type { SignatureType } from "@/types/dar";
import type { ReviewerCandidate } from "@/hooks/api/use-reviewer-candidates";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/error-message";

interface Props {
  darId: string;
  previousReviewer?: ReviewerCandidate | null;
}

export default function DarDraftActions({ darId, previousReviewer = null }: Props) {
  const t = useT();
  const router = useRouter();
  const locale = useLocale();
  const isTh = locale === "th";

  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showReviewerModal, setShowReviewerModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingSignature, setPendingSignature] = useState<{ dataUrl: string; type: SignatureType; saveToProfile: boolean } | null>(null);

  const { mutate: deleteDar, isPending: deleting } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/dar/${darId}`, { method: "DELETE" });
      const json = await res.json() as { error: string | null };
      if (!res.ok || json.error) throw new Error(json.error || t("error"));
    },
    onSuccess: () => {
      router.push("/dar");
      router.refresh();
    },
    onError: (err) => setError(err.message || t("errorRetry")),
  });

  function handleDelete() {
    setError(null);
    deleteDar();
  }

  function handleSubmitClick() {
    setShowSignModal(true);
  }

  function handleSignConfirm(dataUrl: string, type: SignatureType, saveToProfile: boolean) {
    const signature = { dataUrl, type, saveToProfile };
    setPendingSignature(signature);
    setShowSignModal(false);
    if (previousReviewer) {
      void submitToReviewer(previousReviewer, signature);
      return;
    }
    setShowReviewerModal(true);
  }

  function handleSignCancel() {
    setShowSignModal(false);
  }

  function handleReviewerBack() {
    setShowReviewerModal(false);
    setShowSignModal(true);
  }

  async function submitToReviewer(
    reviewer: ReviewerCandidate,
    signature: { dataUrl: string; type: SignatureType; saveToProfile: boolean },
  ) {
    setIsSubmitting(true);
    try {
      const submitRes = await fetch(`/api/dar/${darId}/submit`, { method: "POST" });
      const submitJson = await submitRes.json() as { error: string | null };
      if (!submitRes.ok || submitJson.error) {
        toast.error(getErrorMessage(submitJson.error, isTh ? "เกิดข้อผิดพลาด" : "An error occurred"));
        return;
      }

      const approveRes = await fetch(`/api/dar/${darId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureDataUrl: signature.dataUrl,
          signatureType: signature.type,
          saveSignature: signature.saveToProfile,
        }),
      });
      const approveJson = await approveRes.json() as { error: string | null };
      if (!approveRes.ok || approveJson.error) {
        toast.error(getErrorMessage(approveJson.error, isTh ? "เกิดข้อผิดพลาดในการลงลายมือชื่อ" : "Signature error"));
        return;
      }

      const assignRes = await fetch(`/api/dar/${darId}/assign-reviewer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerUserId: reviewer.id }),
      });
      const assignJson = await assignRes.json() as { error: string | null };
      if (!assignRes.ok || assignJson.error) {
        toast.error(getErrorMessage(assignJson.error, isTh ? "เกิดข้อผิดพลาดในการกำหนดผู้ตรวจสอบ" : "Reviewer assignment error"));
        return;
      }

      toast.success(isTh ? "ส่งคำขอสำเร็จ" : "Request submitted successfully");
      setShowReviewerModal(false);
      router.refresh();
    } catch {
      toast.error(isTh ? "เกิดข้อผิดพลาด กรุณาลองใหม่" : "An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSend(reviewer: ReviewerCandidate) {
    if (!pendingSignature) return;
    await submitToReviewer(reviewer, pendingSignature);
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <ActionPillButton
          tone="edit"
          label={t("edit")}
          onClick={() => setShowEditModal(true)}
          className="h-11 min-w-11 px-3 text-sm"
        />
        <Button
          size="sm"
          disabled={isSubmitting}
          onClick={handleSubmitClick}
          className="h-11 px-4 text-sm gap-2"
        >
          {isSubmitting
            ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            : <Send className="w-4 h-4" />}
          {t("submitRequest")}
        </Button>
        <ActionPillButton
          tone="delete"
          label={t("deleteDraft")}
          onClick={() => setShowConfirm(true)}
          className="h-11 min-w-11 px-3 text-sm"
        />
      </div>

      <DarEditModal darId={showEditModal ? darId : null} onClose={() => { setShowEditModal(false); router.refresh(); }} />

      <Dialog open={showConfirm} onOpenChange={(open) => !deleting && setShowConfirm(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-rose-600" />
              </div>
              <DialogTitle className="text-base">{t("confirmDeleteDraft")}</DialogTitle>
            </div>
          </DialogHeader>
          <p className="text-sm text-slate-600">{t("deleteDraftMsg")}</p>
          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleting}
              onClick={() => { setShowConfirm(false); setError(null); }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              disabled={deleting}
              onClick={handleDelete}
              className="bg-rose-600 text-white hover:bg-rose-700 gap-2"
            >
              {deleting && <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
              {t("confirmDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DarSignSubmitModal
        open={showSignModal}
        onConfirm={handleSignConfirm}
        onCancel={handleSignCancel}
      />

      <DarReviewerSelectModal
        open={showReviewerModal}
        isSending={isSubmitting}
        onBack={handleReviewerBack}
        onSend={handleSend}
      />
    </>
  );
}
