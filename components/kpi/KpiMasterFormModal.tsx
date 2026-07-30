"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ResponsiveFormOverlay from "@/components/common/ResponsiveFormOverlay";
import { createKpiSchema } from "@/schemas/kpiSchema";
import { useCreateKpi, useUpdateKpi } from "@/hooks/api/use-kpi";
import { useKpiDepts } from "@/hooks/api/use-kpi-depts";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { KPI } from "@/generated/prisma/client";

type FormValues = z.infer<typeof createKpiSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpi?: KPI | null;
}

const inputBase = "w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 text-sm focus:outline-none focus:border-primary focus:bg-white transition-colors";
const labelBase = "text-slate-800 text-sm font-semibold mb-2 block";

export function KpiMasterFormModal({ open, onOpenChange, kpi }: Props) {
  const t = useT();
  const createMutation = useCreateKpi();
  const updateMutation = useUpdateKpi();
  const { data: kpiDepts } = useKpiDepts();
  const isEdit = !!kpi;

  const form = useForm<FormValues>({
    resolver: zodResolver(createKpiSchema),
    defaultValues: { yearly: new Date().getFullYear(), department: "", prepare: "", reviewer: "", approver: "" },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(kpi
      ? { yearly: kpi.yearly, department: kpi.department, prepare: kpi.prepare, reviewer: kpi.reviewer, approver: kpi.approver }
      : { yearly: new Date().getFullYear(), department: "", prepare: "", reviewer: "", approver: "" }
    );
  }, [open, kpi, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: kpi.id, data: values });
        toast.success(t("kpi.messages.updateSuccess"));
      } else {
        await createMutation.mutateAsync(values);
        toast.success(t("kpi.messages.createSuccess"));
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <ResponsiveFormOverlay
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t("kpi.action.edit") : t("kpi.reference.add")}
      description={isEdit ? "Edit KPI" : "Add KPI"}
      desktopContentClassName="w-[min(96vw,56rem)] max-w-2xl"
      bodyClassName="px-4 py-5 md:px-6 md:py-6"
      footer={
        <>
          <button type="button" onClick={() => onOpenChange(false)} disabled={isPending}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50">
            {t("common.cancel")}
          </button>
          <button type="submit" form="kpi-modal-form" disabled={isPending}
            className="flex min-w-22.5 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm text-white transition-colors hover:bg-[#161875] disabled:opacity-60">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("common.save")}
          </button>
        </>
      }
    >
        <form id="kpi-modal-form" className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelBase}>{t("kpi.form.year")} <span className="text-rose-600">*</span></label>
              <input type="number" className={inputBase} {...form.register("yearly", { valueAsNumber: true })} />
            </div>
            <div>
              <label className={labelBase}>{t("kpi.form.department")} <span className="text-rose-600">*</span></label>
              <select className={inputBase} {...form.register("department")}>
                <option value="">-- เลือกแผนก --</option>
                {(kpiDepts ?? []).map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
              {form.formState.errors.department && (
                <p className="text-rose-500 text-xs mt-1">{form.formState.errors.department.message}</p>
              )}
            </div>
          </div>
          <div>
            <label className={labelBase}>{t("kpi.form.prepare")} <span className="text-rose-600">*</span></label>
            <input className={inputBase} {...form.register("prepare")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelBase}>{t("kpi.form.reviewer")} <span className="text-rose-600">*</span></label>
              <input className={inputBase} {...form.register("reviewer")} />
            </div>
            <div>
              <label className={labelBase}>{t("kpi.form.approver")} <span className="text-rose-600">*</span></label>
              <input className={inputBase} {...form.register("approver")} />
            </div>
          </div>
        </form>
    </ResponsiveFormOverlay>
  );
}
