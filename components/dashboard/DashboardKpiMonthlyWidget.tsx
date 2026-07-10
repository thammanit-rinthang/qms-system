"use client";

import Link from "next/link";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";

interface KpiItem { department: string; kpiId: string }

interface Props {
  currentMonth: string;
  ok: KpiItem[];
  ng: KpiItem[];
  notSubmitted: KpiItem[];
}

const MONTH_TH: Record<string, string> = {
  Jan:'ม.ค.', Feb:'ก.พ.', Mar:'มี.ค.', Apr:'เม.ย.', May:'พ.ค.', Jun:'มิ.ย.',
  Jul:'ก.ค.', Aug:'ส.ค.', Sep:'ก.ย.', Oct:'ต.ค.', Nov:'พ.ย.', Dec:'ธ.ค.',
};

function DeptList({ items, linkClass }: { items: KpiItem[]; linkClass: string }) {
  const t = useT();
  if (items.length === 0) return null;
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item, i) => (
        <li key={item.kpiId} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 transition-colors">
          <span className="text-[11px] text-slate-300 font-mono w-4 shrink-0">{i + 1}</span>
          <span className="text-xs text-slate-700 flex-1 truncate">{item.department}</span>
          <Link href={`/qms/kpi/${item.kpiId}`} className={`text-[11px] shrink-0 hover:underline ${linkClass}`}>
            {t("dashboard.kpi.viewKpi")}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardKpiMonthlyWidget({ currentMonth, ok, ng, notSubmitted }: Props) {
  const t = useT();
  const locale = useLocale();
  const monthDisplay = locale === "th" ? (MONTH_TH[currentMonth] ?? currentMonth) : currentMonth;
  const total = ok.length + ng.length + notSubmitted.length;

  const sections = [
    {
      key: "ok",
      items: ok,
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
      label: t("dashboard.kpi.statusApproved"),
      count: ok.length,
      countClass: "text-emerald-600 bg-emerald-50",
      linkClass: "text-emerald-700",
      emptyText: t("dashboard.kpi.widgetAllOk"),
    },
    {
      key: "ng",
      items: ng,
      icon: <XCircle className="w-4 h-4 text-rose-500" />,
      label: "NG",
      count: ng.length,
      countClass: "text-rose-600 bg-rose-50",
      linkClass: "text-rose-600",
      emptyText: null,
    },
    {
      key: "notSubmitted",
      items: notSubmitted,
      icon: <Clock className="w-4 h-4 text-amber-500" />,
      label: t("dashboard.kpi.statusDraft"),
      count: notSubmitted.length,
      countClass: "text-amber-700 bg-amber-50",
      linkClass: "text-amber-700",
      emptyText: null,
    },
  ];

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-[rgb(15,16,89)]">
            {t("dashboard.kpi.monthlyWidgetTitle")} {monthDisplay}
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {total} {t("dashboard.kpi.deptUnit")}
          </p>
        </div>
        <Link href="/qms/kpi/monthly" className="text-xs text-[rgb(15,16,89)] font-semibold hover:underline">
          {t("dashboard.kpi.viewAll")}
        </Link>
      </div>

      {total === 0 ? (
        <p className="p-6 text-center text-sm text-slate-400">{t("dashboard.kpi.widgetNoData")}</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {sections.map((s) => (
            <div key={s.key}>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50/60">
                {s.icon}
                <span className="text-xs font-semibold text-slate-600 flex-1">{s.label}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.countClass}`}>
                  {s.count}
                </span>
              </div>
              {s.items.length > 0
                ? <DeptList items={s.items} linkClass={s.linkClass} />
                : s.emptyText && (
                    <p className="px-4 py-2 text-[11px] text-slate-400">{s.emptyText}</p>
                  )
              }
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
