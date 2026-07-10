"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { useQuery } from "@tanstack/react-query";
import { useKpiMonthlyList } from "@/hooks/api/use-kpi-monthly";
import { KpiMonthlyTable } from "@/components/kpi/KpiMonthlyTable";
import KpiMonthlyDetailModal from "@/components/kpi/KpiMonthlyDetailModal";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Building2, Info, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."] as const;
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const STATUSES = ["DRAFT", "PENDING_REVIEW", "PENDING_APPROVAL", "APPROVED", "REJECTED"] as const;

type MonthlyStatus = typeof STATUSES[number];
type UserRole = "USER" | "IT" | "QMS" | "MR";
const PRIVILEGED_ROLES: UserRole[] = ["IT", "QMS", "MR"];
function isPrivileged(role: UserRole): boolean {
  return PRIVILEGED_ROLES.includes(role);
}

// dot color per status
const DOT_COLOR: Record<MonthlyStatus, string> = {
  DRAFT:            "bg-amber-400",
  PENDING_REVIEW:   "bg-sky-400",
  PENDING_APPROVAL: "bg-violet-500",
  APPROVED:         "bg-emerald-500",
  REJECTED:         "bg-rose-500",
};
const DOT_LABEL: Record<MonthlyStatus, string> = {
  DRAFT:            "ยังไม่ส่ง",
  PENDING_REVIEW:   "รออนุมัติ",
  PENDING_APPROVAL: "รออนุมัติขั้นสุดท้าย",
  APPROVED:         "อนุมัติแล้ว",
  REJECTED:         "ถูกปฏิเสธ",
};

interface MonthEntry { id: string; status: MonthlyStatus }
interface DeptSummaryRow {
  id: string;
  department: string;
  yearly: number;
  objectiveCount: number;
  months: Record<string, MonthEntry | null>;
}

function useKpiMonthlySummary(year: number) {
  return useQuery<DeptSummaryRow[]>({
    queryKey: ["kpiMonthlySummary", year],
    queryFn: async () => {
      const res = await fetch(`/api/kpi/monthly-summary?year=${year}`);
      if (!res.ok) throw new Error("Failed to load summary");
      const json = await res.json();
      return json.data ?? [];
    },
  });
}

interface Props {
  userRole: UserRole;
  userId?: string;
}

function RoleBanner({ role }: { role: UserRole }) {
  const t = useT();
  const privileged = isPrivileged(role);
  return (
    <div className={cn(
      "flex items-start gap-3 rounded-xl border px-4 py-3",
      privileged ? "border-emerald-200 bg-emerald-50" : "border-sky-200 bg-sky-50"
    )}>
      {privileged
        ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        : <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
      }
      <p className={cn("text-sm", privileged ? "text-emerald-700" : "text-sky-700")}>
        {privileged
          ? <><span className="font-semibold">{role}</span>{" — "}{t("kpi.rolePrivilegedDesc")}</>
          : t("kpi.roleUserDesc")
        }
      </p>
    </div>
  );
}

function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 pt-1">
      {(Object.keys(DOT_LABEL) as MonthlyStatus[]).map((s) => (
        <div key={s} className="flex items-center gap-1.5">
          <span className={cn("inline-block h-2.5 w-2.5 rounded-full", DOT_COLOR[s])} />
          <span className="text-xs text-slate-500">{DOT_LABEL[s]}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-200" />
        <span className="text-xs text-slate-400">ไม่มีข้อมูล</span>
      </div>
    </div>
  );
}

function DeptDashboardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-slate-50 px-5 py-4 last:border-0">
          <div className="h-4 w-36 animate-pulse rounded-full bg-slate-100" />
          <div className="flex flex-1 gap-2">
            {Array.from({ length: 12 }).map((_, j) => (
              <div key={j} className="h-3 w-3 animate-pulse rounded-full bg-slate-100" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DeptDashboard({
  data,
  isLoading,
  onSelect,
  onDotClick,
}: {
  data: DeptSummaryRow[];
  isLoading: boolean;
  onSelect: (kpiId: string) => void;
  onDotClick: (kpiId: string, reportId: string) => void;
}) {
  if (isLoading) return <DeptDashboardSkeleton />;

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white px-6 py-16 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
          <Building2 className="h-6 w-6 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-700">ไม่มีข้อมูล</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      {/* header row */}
      <div className="flex items-center border-b border-slate-100 bg-slate-50/60 px-5 py-2.5">
        <div className="w-44 shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-400">แผนก</div>
        <div className="grid flex-1 grid-cols-12 gap-1">
          {MONTHS_TH.map((m) => (
            <div key={m} className="text-center text-[10px] font-semibold text-slate-400">{m}</div>
          ))}
        </div>
      </div>

      {/* dept rows */}
      {data.map((row, idx) => (
        <div
          key={row.id}
          className={cn(
            "flex items-center px-5 py-3.5 transition-colors hover:bg-slate-50/70",
            idx !== data.length - 1 && "border-b border-slate-50"
          )}
        >
          <button
            className="w-44 shrink-0 text-left"
            onClick={() => onSelect(row.id)}
          >
            <span className="text-sm font-semibold text-slate-800 hover:text-primary hover:underline transition-colors">
              {row.department}
            </span>
          </button>

          <div className="grid flex-1 grid-cols-12 gap-1">
            {MONTHS_EN.map((month, i) => {
              const entry = row.months[month] ?? null;
              if (!entry) {
                return (
                  <div key={month} className="flex justify-center">
                    <span
                      title={`${MONTHS_TH[i]} — ไม่มีข้อมูล`}
                      className="h-3 w-3 rounded-full bg-slate-200"
                    />
                  </div>
                );
              }
              const color = DOT_COLOR[entry.status as MonthlyStatus] ?? "bg-slate-300";
              return (
                <div key={month} className="flex justify-center">
                  <button
                    type="button"
                    title={`${MONTHS_TH[i]} — ${DOT_LABEL[entry.status as MonthlyStatus] ?? entry.status}`}
                    className={cn(
                      "h-3 w-3 rounded-full transition-transform hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      color
                    )}
                    onClick={() => onDotClick(row.id, entry.id)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* legend */}
      <div className="border-t border-slate-100 bg-slate-50/40 px-5 py-3">
        <StatusLegend />
      </div>
    </div>
  );
}

export default function KpiMonthlyClient({ userRole, userId }: Props) {
  const t = useT();
  const currentYear = new Date().getFullYear();

  const { params, setParam, setParams } = useUrlFilters({
    keys: ["mKpi", "mYear", "mMonth", "mStatus", "mPage", "mReport"],
  });

  const year = Number(params.mYear) || currentYear;
  const month = params.mMonth || undefined;
  const status = params.mStatus || undefined;
  const page = Number(params.mPage) || 1;

  const summaryQuery = useKpiMonthlySummary(year);
  const summary = summaryQuery.data ?? [];

  const selectedKpiId = params.mKpi || null;
  const selectedKpi = selectedKpiId ? summary.find((k) => k.id === selectedKpiId) : null;

  const { data, isLoading } = useKpiMonthlyList(selectedKpiId ?? "", {
    page, limit: 12, year, month, status,
  });

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i + 1);

  useEffect(() => {
    if (!params.mReport) return;
    setSelectedReportId(params.mReport);
    setModalOpen(true);
  }, [params.mReport]);

  function handleYearChange(value: string) {
    setParams({ mYear: value, mKpi: "", mMonth: "", mStatus: "", mPage: "", mReport: "" });
  }

  function handleSelectKpi(kpiId: string) {
    setParams({ mKpi: kpiId, mPage: "", mReport: "" });
  }

  function handleBack() {
    setParams({ mKpi: "", mMonth: "", mStatus: "", mPage: "", mReport: "" });
    setModalOpen(false);
    setSelectedReportId(null);
  }

  function handleDotClick(kpiId: string, reportId: string) {
    setSelectedReportId(reportId);
    setModalOpen(true);
    // also set kpiId so modal has context
    if (selectedKpiId !== kpiId) setParam("mKpi", kpiId);
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("kpi.monthly.title")} subtitle={t("kpi.monthly.subtitle")} />

      <RoleBanner role={userRole} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-100 bg-white px-5 py-3.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        {selectedKpiId && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-slate-200 text-slate-600"
            onClick={handleBack}
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            {t("common.back")}
          </Button>
        )}

        {selectedKpi && (
          <div className="inline-flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-1.5 text-sm font-semibold text-primary">
            <Building2 className="h-3.5 w-3.5" />
            {selectedKpi.department}
          </div>
        )}

        <Select value={String(year)} onValueChange={handleYearChange}>
          <SelectTrigger className="h-9 w-28 rounded-xl border-slate-200 bg-slate-50/50 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedKpiId && (
          <>
            <Select
              value={params.mMonth ?? "all"}
              onValueChange={(v) => setParam("mMonth", v === "all" ? "" : v)}
            >
              <SelectTrigger className="h-9 w-36 rounded-xl border-slate-200 bg-slate-50/50 text-sm">
                <SelectValue placeholder={t("kpi.monthly.filter.allMonths")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("kpi.monthly.filter.allMonths")}</SelectItem>
                {MONTHS_EN.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select
              value={params.mStatus ?? "all"}
              onValueChange={(v) => setParam("mStatus", v === "all" ? "" : v)}
            >
              <SelectTrigger className="h-9 w-44 rounded-xl border-slate-200 bg-slate-50/50 text-sm">
                <SelectValue placeholder={t("kpi.monthly.filter.allStatuses")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("kpi.monthly.filter.allStatuses")}</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(`kpi.monthly.status.${s}` as Parameters<typeof t>[0])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {/* Content */}
      {selectedKpiId ? (
        <KpiMonthlyTable
          data={data?.data ?? []}
          isLoading={isLoading}
          meta={data?.meta}
          onPageChange={(p) => setParam("mPage", String(p))}
          onRowClick={(row) => {
            setSelectedReportId(row.id);
            setModalOpen(true);
          }}
        />
      ) : (
        <DeptDashboard
          data={summary}
          isLoading={summaryQuery.isLoading}
          onSelect={handleSelectKpi}
          onDotClick={handleDotClick}
        />
      )}

      <KpiMonthlyDetailModal
        kpiId={selectedKpiId ?? (selectedReportId ? (summary.find(k => Object.values(k.months).some(m => m?.id === selectedReportId))?.id ?? null) : null)}
        reportId={modalOpen ? selectedReportId : null}
        open={modalOpen}
        onOpenChange={setModalOpen}
        userRole={userRole}
        userId={userId}
      />
    </div>
  );
}
