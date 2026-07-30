"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { useCreateMonthlyReport } from "@/hooks/api/use-kpi-monthly";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function KpiGenerateDialog({ open, onOpenChange }: Props) {
  const t = useT();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);

  const mutation = useCreateMonthlyReport();

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i + 1);
  async function handleConfirm() {
    toast.error(t("error.title"), { duration: Infinity });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[rgb(15,16,89)] text-lg font-bold">
            {t("kpi.monthly.generateDialog.title")}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-500 -mt-2">
          {t("kpi.monthly.generateDialog.description")}
        </p>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-sm text-slate-600">
              {t("kpi.monthly.generateDialog.year")}
            </Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-slate-600">
              {t("kpi.monthly.generateDialog.month")}
            </Label>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {t(`kpi.monthly.months.${m}` as Parameters<typeof t>[0])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            {t("kpi.monthly.generateDialog.cancel")}
          </Button>
          <Button
            className="rounded-xl bg-[rgb(15,16,89)] hover:bg-[#161875]"
            onClick={handleConfirm}
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? t("common.loading") + "..."
              : t("kpi.monthly.generateDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
