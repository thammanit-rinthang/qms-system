"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SignaturePad from "@/components/shared/SignaturePad";
import type { SignatureType } from "@/types/dar";

interface Props {
  open: boolean;
  title: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: { signatureDataUrl: string; signatureType: SignatureType; saveSignature: boolean }) => Promise<void>;
  children?: React.ReactNode;
}

export default function KpiSignatureDialog({ open, title, onOpenChange, onConfirm, children }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {children && <div className="space-y-2 border-b border-slate-100 pb-4">{children}</div>}

        <SignaturePad
          onCancel={() => onOpenChange(false)}
          onConfirm={async (dataUrl, type, saveToProfile) => {
            await onConfirm({ signatureDataUrl: dataUrl, signatureType: type, saveSignature: saveToProfile });
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
