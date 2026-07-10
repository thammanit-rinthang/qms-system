"use client";

import { useT } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import OkRatioBar from "@/components/shared/OkRatioBar";
import { cn } from "@/lib/utils";
import {
  CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, FileText, MessageSquareText, XCircle,
} from "lucide-react";
import type { AchievedStatus, MonthlyStatus } from "@/generated/prisma/client";

interface DetailSnapshot {
  id: string;
  actualResult: number | null;
  achievedStatus: AchievedStatus;
}

interface KpiMonthlyReportRow {
  id: string;
  month: string;
  year: number;
  status: MonthlyStatus;
  kpi: { id: string; department: string };
  details: DetailSnapshot[];
  remark?: string | null;
  attachmentFileName?: string | null;
}

interface Meta {
  page: number;
  total: number;
  limit: number;
}

interface Props {
  data: KpiMonthlyReportRow[];
  isLoading: boolean;
  meta?: Meta;
  onPageChange?: (page: number) => void;
  onRowClick: (row: KpiMonthlyReportRow) => void;
}

const STATUS_CONFIG: Record<MonthlyStatus, { style: string; icon: React.ElementType; label?: string }> = {
  DRAFT:            { style: "bg-slate-50 text-slate-500 border-slate-200",       icon: FileText     },
  PENDING_REVIEW:   { style: "bg-amber-50 text-amber-600 border-amber-200",       icon: Clock        },
  PENDING_APPROVAL: { style: "bg-sky-50 text-sky-600 border-sky-200",             icon: Clock        },
  APPROVED:         { style: "bg-emerald-50 text-emerald-600 border-emerald-200", icon: CheckCircle2 },
  REJECTED:         { style: "bg-rose-50 text-rose-600 border-rose-200",          icon: XCircle      },
};

function StatusBadge({ status }: { status: MonthlyStatus }) {
  const t = useT();
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", cfg.style)}>
      <Icon className="h-3 w-3" />
      {t(`kpi.monthly.status.${status}` as Parameters<typeof t>[0])}
    </span>
  );
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="divide-y divide-slate-50">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20 flex-1" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white px-6 py-16 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
        <CalendarDays className="h-6 w-6 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-700">{message}</p>
    </div>
  );
}

export function KpiMonthlyTable({ data, isLoading, meta, onPageChange, onRowClick }: Props) {
  const t = useT();
  const totalPages = meta ? Math.ceil(meta.total / meta.limit) || 1 : 1;

  if (isLoading) return <TableSkeleton />;
  if (!data.length) return <EmptyState message={t("kpi.monthly.table.empty")} />;

  return (
    <div className="space-y-3">
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t("kpi.monthly.table.month")}
              </th>
              <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t("kpi.monthly.table.objectives")}
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t("kpi.monthly.table.ok")} / {t("kpi.monthly.table.notOk")}
              </th>
              <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                {t("kpi.monthly.table.status")}
              </th>
              <th className="w-12 px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                Meta
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer transition-colors hover:bg-slate-50/70"
                onClick={() => onRowClick(row)}
              >
                <td className="whitespace-nowrap px-5 py-3.5">
                  <span className="text-sm font-semibold text-slate-800">{row.month} {row.year}</span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    {row.details.length}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <OkRatioBar details={row.details} />
                </td>
                <td className="px-5 py-3.5 text-center">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-center gap-2 text-slate-400">
                    {row.remark && <MessageSquareText className="h-3.5 w-3.5 text-primary" />}
                    {row.attachmentFileName && <FileText className="h-3.5 w-3.5 text-emerald-500" />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2.5 lg:hidden">
        {data.map((row) => (
          <button
            key={row.id}
            type="button"
            className="w-full rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-colors hover:bg-slate-50"
            onClick={() => onRowClick(row)}
          >
            <div className="mb-2.5 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">{row.month} {row.year}</p>
                <p className="mt-0.5 text-xs text-slate-400">{row.kpi.department}</p>
              </div>
              <StatusBadge status={row.status} />
            </div>
            <div className="mb-2.5">
              <OkRatioBar details={row.details} />
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {row.details.length} {t("kpi.monthly.table.objectives").toLowerCase()}
              </span>
              {row.remark && <MessageSquareText className="h-3.5 w-3.5 text-primary" />}
              {row.attachmentFileName && <FileText className="h-3.5 w-3.5 text-emerald-500" />}
            </div>
          </button>
        ))}
      </div>

      {/* Pagination */}
      {meta && totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-slate-400">
            {meta.page} / {totalPages}
            <span className="ml-1 text-slate-300">({meta.total})</span>
          </p>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={meta.page <= 1}
              onClick={() => onPageChange?.(meta.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              disabled={meta.page >= totalPages}
              onClick={() => onPageChange?.(meta.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
