"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
}

export default function KpiObjectiveRejectDialog({ open, onOpenChange, onConfirm }: Props) {
  const t = useT();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      await onConfirm(reason.trim());
      setReason("");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!loading && !next) setReason("");
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{t("kpi.monthly.actions.reject")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm text-slate-600">{t("kpi.monthly.drawer.rejectionReason")}</p>
          <Textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t("kpi.monthly.drawer.rejectionPlaceholder")}
            className="rounded-xl"
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t("common.cancel")}
          </Button>
          <Button
            className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
            onClick={submit}
            disabled={loading || !reason.trim()}
          >
            {t("kpi.monthly.actions.reject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

