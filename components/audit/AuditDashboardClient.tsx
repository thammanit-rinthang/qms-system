"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ClipboardList,
  ListChecks,
  Search,
  TrendingUp,
} from "lucide-react";
import { useAuditDashboard } from "@/hooks/api/use-audit-dashboard";
import AuditFindingStatusBadge from "./AuditFindingStatusBadge";
import { Button } from "@/components/ui/button";
import {
  FINDING_CATEGORY_LABELS,
  FINDING_SEVERITY_COLORS,
  FINDING_SEVERITY_LABELS,
} from "@/types/audit";
import { cn } from "@/lib/utils";

// ─── Metric Card ─────────────────────────────────────────────────────────────

type MetricCardProps = {
  label: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
};

function MetricCard({ label, value, icon, colorClass, bgClass }: MetricCardProps) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 flex items-center gap-4">
      <div className={cn("w-11 h-11 rounded-lg flex items-center justify-center shrink-0", bgClass)}>
        <span className={colorClass}>{icon}</span>
      </div>
      <div>
        <p className="text-[11px] text-slate-500 font-medium leading-tight">{label}</p>
        <p className={cn("text-2xl font-black font-mono leading-tight mt-0.5", colorClass)}>{value}</p>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-slate-100 rounded-xl h-20" />
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-100 rounded-xl h-64" />
        <div className="bg-slate-100 rounded-xl h-64" />
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AuditDashboardClient() {
  const { data, isLoading, error } = useAuditDashboard();

  if (isLoading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-6">
        <p className="text-slate-800 font-semibold text-base mb-1">เกิดข้อผิดพลาด</p>
        <p className="text-slate-400 text-sm mb-4">ไม่สามารถโหลดข้อมูลได้</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          ลองใหม่
        </Button>
      </div>
    );
  }

  const { counts, upcomingSchedules, recentFindings } = data;

  const metrics: MetricCardProps[] = [
    {
      label: "แผนทั้งหมด",
      value: counts.totalPlans,
      icon: <ClipboardList className="h-5 w-5" />,
      colorClass: "text-slate-600",
      bgClass: "bg-slate-100",
    },
    {
      label: "กำลังดำเนินการ",
      value: counts.inProgressPlans,
      icon: <TrendingUp className="h-5 w-5" />,
      colorClass: "text-amber-600",
      bgClass: "bg-amber-50",
    },
    {
      label: "รอแก้ไข",
      value: counts.waitingCorrectivePlans,
      icon: <AlertTriangle className="h-5 w-5" />,
      colorClass: "text-orange-600",
      bgClass: "bg-orange-50",
    },
    {
      label: "ข้อบกพร่องที่เปิดอยู่",
      value: counts.openFindings,
      icon: <Search className="h-5 w-5" />,
      colorClass: "text-blue-600",
      bgClass: "bg-blue-50",
    },
    {
      label: "เกินกำหนดแก้ไข",
      value: counts.overdueCorrectiveActions,
      icon: <Clock className="h-5 w-5" />,
      colorClass: "text-rose-600",
      bgClass: "bg-rose-50",
    },
    {
      label: "รอลงนาม",
      value: counts.pendingSignoffs,
      icon: <CheckCircle2 className="h-5 w-5" />,
      colorClass: "text-teal-600",
      bgClass: "bg-teal-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* Two-column section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Schedules */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-blue-500" />
            <h2 className="text-sm font-bold text-primary">
              กำหนดการ 7 วันข้างหน้า
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {upcomingSchedules.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                ไม่มีกำหนดการที่จะถึง
              </p>
            ) : (
              upcomingSchedules.map((s) => (
                <Link
                  key={s.id}
                  href={`/audit/plans/${s.planId}`}
                  className="flex flex-col gap-1 px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-primary leading-snug line-clamp-1 flex-1">
                      {s.planTitle}
                    </p>
                    <span className="text-xs text-muted-foreground font-mono shrink-0">
                      {s.planAuditNo}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">{s.sessionTitle}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                    <span className="text-[11px] text-slate-400">
                      {new Date(s.startAt).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                      })}{" "}
                      {new Date(s.startAt).toLocaleTimeString("th-TH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {s.location && (
                      <span className="text-[11px] text-slate-400 truncate">· {s.location}</span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent Open Findings */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <h2 className="text-sm font-bold text-primary">
              ข้อบกพร่องที่เปิดอยู่ล่าสุด
            </h2>
          </div>
          <div className="divide-y divide-slate-100">
            {recentFindings.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                ไม่มีข้อบกพร่องที่เปิดอยู่
              </p>
            ) : (
              recentFindings.map((f) => (
                <Link
                  key={f.id}
                  href={`/audit/plans/${f.planId}`}
                  className="flex flex-col gap-1 px-5 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-primary leading-snug line-clamp-1 flex-1">
                      {f.findingNo} — {f.title}
                    </p>
                    <AuditFindingStatusBadge status={f.status} />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
                      {FINDING_CATEGORY_LABELS[f.category]}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-medium rounded px-1.5 py-0.5 border",
                        FINDING_SEVERITY_COLORS[f.severity],
                      )}
                    >
                      {FINDING_SEVERITY_LABELS[f.severity]}
                    </span>
                    {f.ownerNameSnapshot && (
                      <span className="text-[11px] text-slate-400 truncate">
                        {f.ownerNameSnapshot}
                      </span>
                    )}
                  </div>
                  {f.dueAt && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                      <span
                        className={cn(
                          "text-[11px]",
                          new Date(f.dueAt) < new Date()
                            ? "text-rose-500 font-medium"
                            : "text-slate-400",
                        )}
                      >
                        ครบกำหนด{" "}
                        {new Date(f.dueAt).toLocaleDateString("th-TH", {
                          day: "numeric",
                          month: "short",
                          year: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
