"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createKpiObjectiveSchema } from "@/schemas/kpiSchema";
import { useT } from "@/lib/i18n";
import { KPI_UNITS, isPresetUnit } from "@/lib/kpi-units";
import ResponsiveFormOverlay from "@/components/common/ResponsiveFormOverlay";
import GraphUserPicker, { type GraphUserResult } from "@/components/shared/GraphUserPicker";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { KPIObjective } from "@/generated/prisma/client";

const bodySchema = createKpiObjectiveSchema.omit({ kpiId: true });
type FormValues = z.infer<typeof bodySchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objective?: KPIObjective | null;
  onSubmit: (values: FormValues) => Promise<void>;
}

const inputBase = "w-full bg-slate-50/50 border rounded-xl px-4 py-2.5 text-slate-700 text-sm focus:outline-none focus:bg-white transition-colors";
const inputDefault = "border-slate-200 focus:border-[#0F1059]";
const inputError = "border-rose-300 text-rose-700 focus:border-rose-500";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-rose-600 text-xs mt-1">{message}</p>;
}

export default function KpiObjectiveFormModal({ open, onOpenChange, objective, onSubmit }: Props) {
  const t = useT();
  const isEdit = !!objective;
  const [customUnit, setCustomUnit] = useState("");
  const [responsible, setResponsible] = useState<GraphUserResult | null>(null);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(bodySchema),
    defaultValues: {
      target: 0,
      unit: undefined,
      objective: "",
      frequency: "Every Month",
      calculationFormula: "",
      actionPlanGuidelines: "",
      referenceDocuments: "",
      responsibleAuthUserId: "",
      responsibleNameSnapshot: "",
      responsibleEmailSnapshot: "",
      responsibleEmployeeId: "",
    },
  });

  const unitValue = watch("unit");
  const isOther = unitValue === "other" || (!!unitValue && !isPresetUnit(unitValue));

  useEffect(() => {
    if (!open) return;
    const savedUnit = (objective as { unit?: string | null } | undefined)?.unit ?? undefined;
    const isCustom = !!savedUnit && !isPresetUnit(savedUnit);
    const savedResponsible = objective?.responsibleAuthUserId
      ? {
          id: objective.responsibleAuthUserId,
          name: objective.responsibleNameSnapshot ?? "",
          email: objective.responsibleEmailSnapshot ?? "",
          employeeId: objective.responsibleEmployeeId ?? null,
          department: null,
          jobTitle: null,
        }
      : null;
    setCustomUnit(isCustom ? savedUnit! : "");
    setResponsible(savedResponsible);
    reset(objective
      ? {
          target: objective.target,
          unit: isCustom ? "other" : savedUnit,
          objective: objective.objective,
          frequency: objective.frequency,
          calculationFormula: objective.calculationFormula,
          actionPlanGuidelines: objective.actionPlanGuidelines,
          referenceDocuments: objective.referenceDocuments ?? "",
          responsibleAuthUserId: objective.responsibleAuthUserId ?? "",
          responsibleNameSnapshot: objective.responsibleNameSnapshot ?? "",
          responsibleEmailSnapshot: objective.responsibleEmailSnapshot ?? "",
          responsibleEmployeeId: objective.responsibleEmployeeId ?? "",
        }
      : {
          target: 0,
          unit: undefined,
          objective: "",
          frequency: "Every Month",
          calculationFormula: "",
          actionPlanGuidelines: "",
          referenceDocuments: "",
          responsibleAuthUserId: "",
          responsibleNameSnapshot: "",
          responsibleEmailSnapshot: "",
          responsibleEmployeeId: "",
        }
    );
  }, [open, objective, reset]);

  return (
    <ResponsiveFormOverlay
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t("kpi.objective.editTitle") : t("kpi.objective.createTitle")}
      desktopContentClassName="w-[min(96vw,64rem)] max-w-3xl"
      bodyClassName="space-y-5 px-4 py-5 md:px-6 md:py-6"
      footer={
        <>
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="kpi-objective-form" className="rounded-xl bg-primary hover:bg-[#161875]" disabled={isSubmitting}>
            {isSubmitting ? t("common.loading") : t("common.save")}
          </Button>
        </>
      }
    >
        <form id="kpi-objective-form" className="space-y-5"
          onSubmit={handleSubmit(async (values) => {
            const finalUnit = values.unit === "other" ? (customUnit.trim() || undefined) : values.unit;
            await onSubmit({
              ...values,
              unit: finalUnit,
              responsibleAuthUserId: responsible?.id ?? "",
              responsibleNameSnapshot: responsible?.name ?? "",
              responsibleEmailSnapshot: responsible?.email ?? "",
              responsibleEmployeeId: responsible?.employeeId ?? "",
            });
            onOpenChange(false);
          })}>

          {/* Target + Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-800 text-sm font-semibold mb-2 block">
                {t("kpi.form.target")} <span className="text-rose-600">*</span>
              </label>
              <input type="number" step="0.01" aria-invalid={!!errors.target}
                className={cn(inputBase, errors.target ? inputError : inputDefault)}
                {...register("target", { valueAsNumber: true })} />
              <FieldError message={errors.target?.message} />
            </div>

            <div>
              <label className="text-slate-800 text-sm font-semibold mb-2 block">
                {t("kpi.form.unit")}
                <span className="text-slate-400 text-xs font-normal ml-1">{t("common.optional")}</span>
              </label>
              <Select
                value={isOther ? "other" : (unitValue ?? "")}
                onValueChange={(v) => {
                  setValue("unit", v || undefined, { shouldValidate: true });
                  if (v !== "other") setCustomUnit("");
                }}
              >
                <SelectTrigger className={cn(inputBase, inputDefault, "h-10.5")}>
                  <SelectValue placeholder={t("kpi.form.unitPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {KPI_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>{t(u.labelKey as Parameters<typeof t>[0])}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isOther && (
                <input
                  type="text"
                  className={cn(inputBase, inputDefault, "mt-2")}
                  placeholder={t("kpi.form.unitCustomPlaceholder")}
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                />
              )}
              <FieldError message={errors.unit?.message} />
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="text-slate-800 text-sm font-semibold mb-2 block">
              {t("kpi.form.measurementFrequency")} <span className="text-rose-600">*</span>
            </label>
            <Select value={watch("frequency")} onValueChange={(v) => setValue("frequency", v, { shouldValidate: true })}>
              <SelectTrigger className={cn(inputBase, inputDefault, "h-10.5")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Every Month">{t("kpi.form.frequencyMonthly")}</SelectItem>
                <SelectItem value="Quarterly">{t("kpi.form.frequencyQuarterly")}</SelectItem>
                <SelectItem value="Yearly">{t("kpi.form.frequencyYearly")}</SelectItem>
              </SelectContent>
            </Select>
            <FieldError message={errors.frequency?.message} />
          </div>

          {/* Objective text */}
          <div>
            <label className="text-slate-800 text-sm font-semibold mb-2 block">
              {t("kpi.form.objectiveDetails")} <span className="text-rose-600">*</span>
            </label>
            <textarea rows={3} aria-invalid={!!errors.objective}
              className={cn(inputBase, "resize-none", errors.objective ? inputError : inputDefault)}
              {...register("objective")} />
            <FieldError message={errors.objective?.message} />
          </div>

          {/* Calculation Formula */}
          <div>
            <label className="text-slate-800 text-sm font-semibold mb-2 block">
              {t("kpi.form.calculationFormula")} <span className="text-rose-600">*</span>
            </label>
            <textarea rows={2} aria-invalid={!!errors.calculationFormula}
              className={cn(inputBase, "resize-none", errors.calculationFormula ? inputError : inputDefault)}
              {...register("calculationFormula")} />
            <FieldError message={errors.calculationFormula?.message} />
          </div>

          {/* Action Plan Guidelines */}
          <div>
            <label className="text-slate-800 text-sm font-semibold mb-2 block">
              {t("kpi.form.actionPlanGuidelines")} <span className="text-rose-600">*</span>
            </label>
            <textarea rows={3} aria-invalid={!!errors.actionPlanGuidelines}
              className={cn(inputBase, "resize-none", errors.actionPlanGuidelines ? inputError : inputDefault)}
              {...register("actionPlanGuidelines")} />
            <FieldError message={errors.actionPlanGuidelines?.message} />
          </div>

          <div>
            <GraphUserPicker
              label={t("kpi.form.responsiblePerson")}
              value={responsible}
              onChange={(user) => {
                setResponsible(user);
                setValue("responsibleAuthUserId", user?.id ?? "", { shouldValidate: true });
                setValue("responsibleNameSnapshot", user?.name ?? "", { shouldValidate: true });
                setValue("responsibleEmailSnapshot", user?.email ?? "", { shouldValidate: true });
                setValue("responsibleEmployeeId", user?.employeeId ?? "", { shouldValidate: false });
              }}
              placeholder={t("kpi.form.responsiblePersonPlaceholder")}
              required
              error={
                (errors.responsibleAuthUserId?.message || errors.responsibleNameSnapshot?.message)
                  ? t("kpi.form.responsiblePersonRequired")
                  : errors.responsibleEmailSnapshot?.message
                  ? t("kpi.form.responsibleEmailRequired")
                  : undefined
              }
            />
          </div>

          {/* Reference Documents */}
          <div>
            <label className="text-slate-800 text-sm font-semibold mb-2 block">
              {t("kpi.form.referenceDocuments")}
              <span className="text-slate-400 text-xs font-normal ml-1">{t("common.optional")}</span>
            </label>
            <input type="text" className={cn(inputBase, inputDefault)} {...register("referenceDocuments")} />
          </div>
        </form>
    </ResponsiveFormOverlay>
  );
}
