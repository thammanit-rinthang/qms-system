"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { KpiYearlyPreviewData } from "@/services/kpiExportService";
import { useKpiMonthlyList } from "@/hooks/api/use-kpi-monthly";
import { KpiMonthlyTable } from "@/components/kpi/KpiMonthlyTable";
import KpiMonthlyDetailModal from "@/components/kpi/KpiMonthlyDetailModal";
import KpiYearlyExportPreviewDialog from "@/components/kpi/KpiYearlyExportPreviewDialog";
import PageHeader from "@/components/common/PageHeader";
import ConfirmModal from "@/components/common/ConfirmModal";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle, ArrowLeft, Building2, Download, Info, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."] as const;
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const MONTH_INDEX_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
};

const isMonthEditable = (m: string, y: number): boolean => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  const mIndex = MONTH_INDEX_MAP[m];
  if (mIndex === undefined) return false;
  
  if (y === currentYear && mIndex === currentMonth) return true;
  
  const prevDate = new Date(currentYear, currentMonth - 1, 1);
  if (y === prevDate.getFullYear() && mIndex === prevDate.getMonth()) return true;
  
  return false;
};
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
  monthlyFormDocName?: string;
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
  year,
}: {
  data: DeptSummaryRow[];
  isLoading: boolean;
  onSelect: (kpiId: string) => void;
  onDotClick: (kpiId: string, reportId: string) => void;
  year: number;
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
              const editable = isMonthEditable(month, year);
              return (
                <div key={month} className="flex justify-center py-0.5">
                  <button
                    type="button"
                    title={`${MONTHS_TH[i]} — ${DOT_LABEL[entry.status as MonthlyStatus] ?? entry.status} ${editable ? "(แก้ไขได้)" : "(อ่านอย่างเดียว)"}`}
                    className={cn(
                      "h-3 w-3 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      color,
                      editable
                        ? "ring-2 ring-[#0F1059] ring-offset-1 hover:scale-125 scale-100 opacity-100 animate-pulse"
                        : "opacity-35 hover:opacity-60 scale-90 hover:scale-105"
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

export default function KpiMonthlyClient({ userRole, userId, monthlyFormDocName }: Props) {
  const t = useT();
  const currentYear = new Date().getFullYear();
  const queryClient = useQueryClient();

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
  const [cleanupConfirmOpen, setCleanupConfirmOpen] = useState(false);
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);
  const cleanupStatusQuery = useQuery<{ reportCount: number }>({
    queryKey: ["kpiMonthlySystemMasterCleanup"],
    queryFn: async () => {
      const res = await fetch("/api/kpi/monthly/system-master-cleanup");
      if (!res.ok) throw new Error("Failed to load cleanup summary");
      const json = await res.json();
      return json.data;
    },
    enabled: isPrivileged(userRole),
  });
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/kpi/monthly/system-master-cleanup", {
        method: "POST",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message ?? json?.message ?? "Cleanup failed");
      }
      return json.data as {
        deletedReportCount: number;
      };
    },
    onSuccess: async (result) => {
      setCleanupConfirmOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["kpiMonthlySystemMasterCleanup"] }),
        queryClient.invalidateQueries({ queryKey: ["kpiMonthlySummary", year] }),
        queryClient.invalidateQueries({ queryKey: ["kpiMonthly"] }),
      ]);
      if (selectedKpiId) {
        handleBack();
      }
      toast.success(`Cleaned up ${result.deletedReportCount} SYSTEM_MASTER monthly report(s).`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Cleanup failed", { duration: Infinity });
    },
  });

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i + 1);
  const exportPreviewQuery = useQuery<{ data: KpiYearlyPreviewData }>({
    queryKey: ["kpiYearlyExportPreview", year, selectedKpiId],
    queryFn: async () => {
      const searchParams = new URLSearchParams({ year: String(year) });
      if (selectedKpiId) {
        searchParams.set("kpiId", selectedKpiId);
      }
      const res = await fetch(`/api/kpi/monthly-export/preview?${searchParams.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to load export preview");
      }
      return res.json();
    },
    enabled: exportPreviewOpen,
  });

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

  function handleExport() {
    setExportPreviewOpen(true);
  }

  function handleDownloadExport() {
    const searchParams = new URLSearchParams({
      year: String(year),
    });

    if (selectedKpiId) {
      searchParams.set("kpiId", selectedKpiId);
    }

    window.open(`/api/kpi/monthly-export?${searchParams.toString()}`, "_blank");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("kpi.monthly.title")}
        subtitle={t("kpi.monthly.subtitle")}
        actions={(
          <div className="flex items-center gap-2">
            {isPrivileged(userRole) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl border-slate-200"
                onClick={() => window.open(`/print/qms/kpi/monthly?year=${year}`, "_blank")}
              >
                <ShieldCheck className="mr-1.5 h-4 w-4" />
                Review
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl border-slate-200"
              onClick={handleExport}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export Excel
            </Button>
          </div>
        )}
      />

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

        {isPrivileged(userRole) && (cleanupStatusQuery.data?.reportCount ?? 0) > 0 && (
          <div className="ml-auto flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-medium text-amber-700">
              Found {cleanupStatusQuery.data?.reportCount} SYSTEM_MASTER monthly record(s)
            </span>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              className="rounded-lg"
              disabled={cleanupMutation.isPending}
              onClick={() => setCleanupConfirmOpen(true)}
            >
              Cleanup Once
            </Button>
          </div>
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
          year={year}
        />
      )}

      <KpiMonthlyDetailModal
        kpiId={selectedKpiId ?? (selectedReportId ? (summary.find(k => Object.values(k.months).some(m => m?.id === selectedReportId))?.id ?? null) : null)}
        reportId={modalOpen ? selectedReportId : null}
        open={modalOpen}
        onOpenChange={setModalOpen}
        userRole={userRole}
        userId={userId}
        monthlyFormDocName={monthlyFormDocName}
      />

      {cleanupConfirmOpen && (
        <ConfirmModal
          title="Cleanup SYSTEM_MASTER Monthly Data"
          message="This one-time admin action deletes the wrong monthly reports created under SYSTEM_MASTER and removes their related approval signatures, tokens, notifications, and audit logs. The FM-MR-01 master KPI record will remain."
          confirmLabel="Cleanup Now"
          cancelLabel="Cancel"
          loading={cleanupMutation.isPending}
          onCancel={() => setCleanupConfirmOpen(false)}
          onConfirm={() => cleanupMutation.mutate()}
        />
      )}

      <KpiYearlyExportPreviewDialog
        open={exportPreviewOpen}
        onClose={() => setExportPreviewOpen(false)}
        onDownload={handleDownloadExport}
        data={exportPreviewQuery.data?.data ?? null}
        loading={exportPreviewQuery.isLoading}
        downloading={false}
      />
    </div>
  );
}
