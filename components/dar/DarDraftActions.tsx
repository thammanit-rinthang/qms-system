"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Trash2, Send } from "lucide-react";
import { useT } from "@/lib/i18n";
import { ActionPillButton } from "@/components/common/ActionButtons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import DarEditModal from "./DarEditModal";

interface Props {
  darId: string;
}

export default function DarDraftActions({ darId }: Props) {
  const t = useT();
  const router = useRouter();

  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const { mutate: submitDar, isPending: submitting } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/dar/${darId}/submit`, { method: "POST" });
      const json = await res.json() as { error: string | null };
      if (!res.ok || json.error) throw new Error(json.error || t("error"));
    },
    onSuccess: () => router.refresh(),
    onError: (err) => setError(err.message || t("errorRetry")),
  });

  function handleDelete() {
    setError(null);
    deleteDar();
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
          disabled={submitting}
          onClick={() => submitDar()}
          className="h-11 px-4 text-sm gap-2"
        >
          {submitting
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
    </>
  );
}
