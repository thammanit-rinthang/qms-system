"use client";

import type { KPIObjective } from "@/generated/prisma/client";
import { useT } from "@/lib/i18n";
import { KPI_UNITS, isPresetUnit } from "@/lib/kpi-units";
import { ActionIconButton, ActionPillButton } from "@/components/common/ActionButtons";

function UnitLabel({ unit, t }: { unit: string | null | undefined; t: ReturnType<typeof useT> }) {
  if (!unit) return null;
  if (isPresetUnit(unit)) {
    const labelKey = KPI_UNITS.find(u => u.value === unit)?.labelKey;
    return <span className="ml-0.5 text-slate-400 font-normal">{labelKey ? t(labelKey as Parameters<typeof t>[0]) : unit}</span>;
  }
  return <span className="ml-0.5 text-slate-400 font-normal">{unit}</span>;
}
interface Props {
  data: KPIObjective[];
  canEdit: boolean;
  onEdit: (row: KPIObjective) => void;
  onDelete: (id: string) => void;
}

export default function KpiObjectiveTable({ data, canEdit, onEdit, onDelete }: Props) {
  const t = useT();

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10 text-center text-sm text-slate-400">
        {t("kpi.objective.table.empty")}
      </div>
    );
  }

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-4 py-3 text-left">{t("kpi.objective.table.objective")}</th>
              <th className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-4 py-3 text-center">{t("kpi.objective.table.target")}</th>
              <th className="text-xs font-semibold uppercase tracking-wide text-slate-500 px-4 py-3 text-center">{t("kpi.objective.table.frequency")}</th>
              {canEdit && <th className="w-20" />}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-sm text-slate-800 font-medium max-w-xs">
                  <p className="line-clamp-2">{row.objective}</p>
                </td>
                <td className="px-4 py-3 text-center font-mono text-sm text-primary font-semibold">
                  {row.target}<UnitLabel unit={row.unit} t={t} />
                </td>
                <td className="px-4 py-3 text-center text-sm text-slate-600">{row.frequency}</td>
                {canEdit && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <ActionIconButton tone="edit" label={t("kpi.action.edit")} onClick={() => onEdit(row)} />
                      <ActionIconButton tone="delete" label={t("kpi.action.delete")} onClick={() => onDelete(row.id)} />
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="lg:hidden space-y-3">
        {data.map((row) => (
          <div key={row.id} className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 space-y-2">
            <p className="text-sm font-semibold text-slate-800">{row.objective}</p>
            <div className="flex gap-4 text-xs text-slate-500">
              <span>{t("kpi.objective.table.target")}: <strong className="text-primary">{row.target}<UnitLabel unit={row.unit} t={t} /></strong></span>
              <span>{t("kpi.objective.table.frequency")}: <strong className="text-slate-700">{row.frequency}</strong></span>
            </div>
            {canEdit && (
              <div className="flex gap-2 pt-1 border-t border-slate-100">
                <ActionPillButton tone="edit" label={t("kpi.action.edit")} onClick={() => onEdit(row)} className="flex-1 justify-center" />
                <ActionPillButton tone="delete" label={t("kpi.action.delete")} onClick={() => onDelete(row.id)} className="flex-1 justify-center" />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
