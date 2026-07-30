"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;
const MONTH_TH: Record<string, string> = {
  Jan:'ม.ค.', Feb:'ก.พ.', Mar:'มี.ค.', Apr:'เม.ย.', May:'พ.ค.', Jun:'มิ.ย.',
  Jul:'ก.ค.', Aug:'ส.ค.', Sep:'ก.ย.', Oct:'ต.ค.', Nov:'พ.ย.', Dec:'ธ.ค.',
};
const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-amber-400',
  PENDING_REVIEW: 'bg-blue-400',
  PENDING_APPROVAL: 'bg-indigo-500',
  APPROVED: 'bg-emerald-500',
  REJECTED: 'bg-rose-500',
};
const STATUS_LABEL_KEYS: Record<string, string> = {
  DRAFT: 'dashboard.kpi.statusDraft',
  PENDING_REVIEW: 'dashboard.kpi.statusPendingReview',
  PENDING_APPROVAL: 'dashboard.kpi.statusPendingApproval',
  APPROVED: 'dashboard.kpi.statusApproved',
  REJECTED: 'dashboard.kpi.statusRejected',
};

export interface KpiMatrixRow {
  department: string;
  kpiId: string;
  months: Record<string, string | null>;
}

interface KpiAlert { department: string; kpiId: string }

interface Props {
  year: number;
  noKpiDepartments: string[];
  matrix: KpiMatrixRow[];
  currentMonth: string;
  notSubmittedThisMonth: KpiAlert[];
  ngThisMonth: KpiAlert[];
}

function StatusDot({ status, labelMap }: { status: string | null; labelMap: Record<string, string> }) {
  if (!status) return <span className="w-3 h-3 rounded-full bg-slate-200 inline-block" title={labelMap.noData} />;
  return (
    <span
      className={`w-3 h-3 rounded-full inline-block ${STATUS_COLOR[status] ?? 'bg-slate-300'}`}
      title={labelMap[status] ?? status}
    />
  );
}

const LEGEND_KEYS = [
  { color: 'bg-amber-400',   key: 'dashboard.kpi.statusDraft' },
  { color: 'bg-blue-400',    key: 'dashboard.kpi.statusPendingReview' },
  { color: 'bg-indigo-500',  key: 'dashboard.kpi.statusPendingApproval' },
  { color: 'bg-emerald-500', key: 'dashboard.kpi.statusApproved' },
  { color: 'bg-rose-500',    key: 'dashboard.kpi.statusRejected' },
  { color: 'bg-slate-200',   key: 'dashboard.kpi.statusNoData' },
];

export default function DashboardKpiMonthlySection({ year, noKpiDepartments, matrix, currentMonth, notSubmittedThisMonth, ngThisMonth }: Props) {
  const t = useT();
  const locale = useLocale();
  const MONTH_DISPLAY = locale === "th" ? (MONTH_TH[currentMonth] ?? currentMonth) : currentMonth;
  const labelMap: Record<string, string> = {
    ...Object.fromEntries(Object.entries(STATUS_LABEL_KEYS).map(([k, v]) => [k, t(v)])),
    noData: t("dashboard.kpi.statusNoData"),
  };
  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[rgb(15,16,89)]">
          {t("dashboard.kpi.monthlyTitle")} {year}
        </h2>
        <Link
          href="/qms/kpi/monthly"
          className="text-xs text-[rgb(15,16,89)] font-semibold hover:underline"
        >
          {t("dashboard.kpi.viewAll")}
        </Link>
      </div>

      {noKpiDepartments.length > 0 && (
        <div className="px-6 pt-4">
          <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200">
            <div className="flex items-center gap-1.5 text-rose-600 text-xs font-semibold w-full mb-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {t("dashboard.kpi.noKpiWarning")} {year}
            </div>
            {noKpiDepartments.map((d) => (
              <span key={d} className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-xs font-medium">
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {(notSubmittedThisMonth.length > 0 || ngThisMonth.length > 0) && (
        <div className="px-6 pt-4 flex flex-col gap-3">
          {notSubmittedThisMonth.length > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 overflow-hidden">
              <div className="flex items-center gap-1.5 text-amber-700 text-xs font-semibold px-4 py-2.5 border-b border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {t("dashboard.kpi.notSubmittedThisMonth")} {MONTH_DISPLAY}
                <span className="ml-auto font-normal text-amber-600">{notSubmittedThisMonth.length} {t("dashboard.kpi.deptUnit")}</span>
              </div>
              <ul className="divide-y divide-amber-100">
                {notSubmittedThisMonth.map((item, i) => (
                  <li key={item.kpiId} className="flex items-center gap-3 px-4 py-2 hover:bg-amber-100/50 transition-colors">
                    <span className="text-[11px] text-amber-400 font-mono w-5 shrink-0">{i + 1}.</span>
                    <span className="text-xs font-medium text-amber-900 flex-1">{item.department}</span>
                    <Link href={`/qms/kpi/${item.kpiId}`} className="text-[11px] text-amber-700 hover:underline shrink-0">
                      {t("dashboard.kpi.viewKpi")}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ngThisMonth.length > 0 && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 overflow-hidden">
              <div className="flex items-center gap-1.5 text-rose-600 text-xs font-semibold px-4 py-2.5 border-b border-rose-200">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {t("dashboard.kpi.ngThisMonth")} {MONTH_DISPLAY}
                <span className="ml-auto font-normal text-rose-500">{ngThisMonth.length} {t("dashboard.kpi.deptUnit")}</span>
              </div>
              <ul className="divide-y divide-rose-100">
                {ngThisMonth.map((item, i) => (
                  <li key={item.kpiId} className="flex items-center gap-3 px-4 py-2 hover:bg-rose-100/50 transition-colors">
                    <span className="text-[11px] text-rose-300 font-mono w-5 shrink-0">{i + 1}.</span>
                    <span className="text-xs font-medium text-rose-900 flex-1">{item.department}</span>
                    <Link href={`/qms/kpi/${item.kpiId}`} className="text-[11px] text-rose-600 hover:underline shrink-0">
                      {t("dashboard.kpi.viewKpi")}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {matrix.length > 0 ? (
        <div className="p-6 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-left pr-6 pb-2 font-semibold text-slate-500 whitespace-nowrap min-w-36">
                  {t("dashboard.kpi.colDepartment")}
                </th>
                {MONTHS.map((m) => (
                  <th key={m} className="pb-2 font-semibold text-slate-500 text-center w-9">
                    {MONTH_TH[m]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.kpiId} className="border-t border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="pr-6 py-2.5 text-slate-700 font-medium whitespace-nowrap">
                    {row.department}
                  </td>
                  {MONTHS.map((m) => (
                    <td key={m} className="py-2.5 text-center">
                      <StatusDot status={row.months[m] ?? null} labelMap={labelMap} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-slate-100">
            {LEGEND_KEYS.map((item) => (
              <div key={item.key} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.color}`} />
                {t(item.key)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="p-6 text-center text-sm text-slate-400">
          {t("dashboard.kpi.noApprovedKpi")} {year}
        </p>
      )}
    </div>
  );
}
