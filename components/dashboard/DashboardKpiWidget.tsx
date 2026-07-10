"use client";

import { useT } from "@/lib/i18n";

interface Props { kpiOk: number; kpiNg: number; kpiPending: number; kpiTotal: number }

const RING_COLORS = { ok: "#10B981", ng: "#EF4444", pending: "#F59E0B" };

export default function DashboardKpiWidget({ kpiOk, kpiNg, kpiPending, kpiTotal }: Props) {
  const t = useT();
  void kpiTotal;

  const legend = [
    { label: "OK",                                  value: kpiOk,      dotClass: "bg-emerald-500", barClass: "bg-emerald-500", textClass: "text-emerald-600" },
    { label: "NG",                                  value: kpiNg,      dotClass: "bg-rose-500",    barClass: "bg-rose-500",    textClass: "text-rose-600"    },
    { label: t("dashboard.kpi.widgetPending"),       value: kpiPending, dotClass: "bg-amber-500",   barClass: "bg-amber-500",   textClass: "text-amber-600"   },
  ];

  const detailTotal = kpiOk + kpiNg + kpiPending;

  if (detailTotal === 0) {
    return (
      <div className="py-4 text-center">
        <div className="w-20 h-20 rounded-full border-4 border-dashed border-slate-200 mx-auto flex items-center justify-center">
          <span className="text-[11px] text-slate-400">{t("dashboard.kpi.widgetNoData")}</span>
        </div>
      </div>
    );
  }

  const okPct = (kpiOk / detailTotal) * 100;
  const ngPct = ((kpiOk + kpiNg) / detailTotal) * 100;

  const ringStyle = {
    background: `conic-gradient(
      ${RING_COLORS.ok} 0% ${okPct}%,
      ${RING_COLORS.ng} ${okPct}% ${ngPct}%,
      ${RING_COLORS.pending} ${ngPct}% 100%
    )`,
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative w-28 h-28 rounded-full flex items-center justify-center" style={ringStyle}>
        <div className="absolute w-18 h-18 rounded-full bg-white flex flex-col items-center justify-center">
          <span className="text-2xl font-black font-mono text-primary leading-none">{detailTotal}</span>
          <span className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">
            {t("dashboard.kpi.widgetTotal")}
          </span>
        </div>
      </div>

      <div className="w-full space-y-2.5">
        {legend.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-sm ${item.dotClass}`} />
                <span className="text-xs font-semibold text-slate-600">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">
                  {detailTotal ? Math.round((item.value / detailTotal) * 100) : 0}%
                </span>
                <span className={`text-xs font-mono font-bold w-5 text-right ${item.textClass}`}>
                  {item.value}
                </span>
              </div>
            </div>
            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${item.barClass}`}
                style={{ width: `${detailTotal ? (item.value / detailTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
