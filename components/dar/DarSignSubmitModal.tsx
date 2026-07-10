"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";
import SignaturePad from "@/components/shared/SignaturePad";
import type { SignatureType } from "@/types/dar";

interface Props {
  open: boolean;
  onConfirm: (dataUrl: string, type: SignatureType, saveToProfile: boolean) => void;
  onCancel: () => void;
  savedSignatureUrl?: string | null;
  savedSignatureType?: SignatureType | null;
}

export default function DarSignSubmitModal({ open, onConfirm, onCancel, savedSignatureUrl, savedSignatureType }: Props) {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-lg z-200" overlayClassName="z-[199]">
        <DialogHeader>
          <DialogTitle>{t("dar.signModal.title")}</DialogTitle>
          <p className="text-sm text-slate-400 mt-1">
            {t("dar.signModal.subtitle")}
          </p>
        </DialogHeader>
        <SignaturePad
          onConfirm={onConfirm}
          onCancel={onCancel}
          savedSignatureUrl={savedSignatureUrl}
          savedSignatureType={savedSignatureType}
        />
      </DialogContent>
    </Dialog>
  );
}
