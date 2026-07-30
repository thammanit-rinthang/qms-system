"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  danger?: boolean;
  children?: React.ReactNode;
};

export default function ConfirmModal({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  loading = false,
  danger = true,
  children,
}: Props) {
  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onCancel() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {danger && (
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
              </div>
            )}
            <DialogTitle className={danger ? "text-rose-600" : "text-[#0F1059]"}>{title}</DialogTitle>
          </div>
          <DialogDescription className="text-left mt-2">{message}</DialogDescription>
        </DialogHeader>

        {children}

        <DialogFooter className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={danger ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <div className="w-4 h-4 mr-2 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
