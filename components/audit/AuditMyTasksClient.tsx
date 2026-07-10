"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, Clock, ListChecks } from "lucide-react";
import { useAuditMyTasks } from "@/hooks/api/use-audit-my-tasks";
import AuditFindingStatusBadge from "./AuditFindingStatusBadge";
import AuditPlanStatusBadge from "./AuditPlanStatusBadge";
import {
  FINDING_CATEGORY_LABELS,
  FINDING_SEVERITY_COLORS,
  FINDING_SEVERITY_LABELS,
} from "@/types/audit";
import type { MyTaskFinding, MyTaskPlan, MyTaskSignoffPlan } from "@/hooks/api/use-audit-my-tasks";
import { cn } from "@/lib/utils";

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: "respond", labelTh: "ที่ต้องตอบกลับ", labelEn: "To Respond", icon: AlertTriangle },
  { id: "verify", labelTh: "ที่ต้องยืนยัน", labelEn: "To Verify", icon: CheckCircle2 },
  { id: "leading", labelTh: "แผนที่นำทีม", labelEn: "Plans I Lead", icon: ClipboardList },
  { id: "signoff", labelTh: "รอลงนาม", labelEn: "Pending Sign-offs", icon: ListChecks },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ─── Finding Row ─────────────────────────────────────────────────────────────

function FindingRow({ finding }: { finding: MyTaskFinding }) {
  const isOverdue = finding.dueAt ? new Date(finding.dueAt) < new Date() : false;

  return (
    <Link
      href={`/audit/plans/${finding.planId}`}
      className="flex flex-col gap-1.5 px-5 py-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-slate-400">{finding.planAuditNo} · {finding.planTitle}</p>
          <p className="text-xs font-semibold text-primary leading-snug mt-0.5 line-clamp-2">
            {finding.findingNo} — {finding.title}
          </p>
        </div>
        <AuditFindingStatusBadge status={finding.status} />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
          {FINDING_CATEGORY_LABELS[finding.category]}
        </span>
        <span
          className={cn(
            "text-[10px] font-medium rounded px-1.5 py-0.5 border",
            FINDING_SEVERITY_COLORS[finding.severity],
          )}
        >
          {FINDING_SEVERITY_LABELS[finding.severity]}
        </span>
        {finding.dueAt && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-slate-400 shrink-0" />
            <span className={cn("text-[11px]", isOverdue ? "text-rose-500 font-medium" : "text-slate-400")}>
              {isOverdue ? "เกินกำหนด " : "ครบกำหนด "}
              {new Date(finding.dueAt).toLocaleDateString("th-TH", {
                day: "numeric",
                month: "short",
                year: "2-digit",
              })}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── Plan Row ─────────────────────────────────────────────────────────────────

function PlanRow({ plan }: { plan: MyTaskPlan | MyTaskSignoffPlan }) {
  return (
    <Link
      href={`/audit/plans/${plan.id}`}
      className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-slate-400">{plan.auditNo}</p>
        <p className="text-xs font-semibold text-primary leading-snug mt-0.5 line-clamp-1">
          {plan.title}
        </p>
        {plan.ownerNameSnapshot && (
          <p className="text-[11px] text-slate-400 mt-0.5">{plan.ownerNameSnapshot}</p>
        )}
      </div>
      <AuditPlanStatusBadge status={plan.status} />
    </Link>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-xs text-slate-400 text-center py-10">{message}</p>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function MyTasksSkeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-slate-100 rounded-lg h-16" />
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AuditMyTasksClient() {
  const [activeTab, setActiveTab] = useState<TabId>("respond");
  const { data, isLoading, error } = useAuditMyTasks();

  const tabCounts = data
    ? {
        respond: data.toRespond.length,
        verify: data.toVerify.length,
        leading: data.leadingPlans.length,
        signoff: data.pendingSignoffs.length,
      }
    : { respond: 0, verify: 0, leading: 0, signoff: 0 };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      {/* Tab Bar */}
      <div className="border-b border-slate-100 overflow-x-auto">
        <div className="flex min-w-max">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const count = tabCounts[tab.id];
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors whitespace-nowrap",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-500 hover:text-slate-700",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.labelTh}
                {count > 0 && (
                  <span
                    className={cn(
                      "ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                      isActive
                        ? "bg-primary text-white"
                        : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {isLoading ? (
          <div className="p-5">
            <MyTasksSkeleton />
          </div>
        ) : error || !data ? (
          <p className="text-center py-10 text-rose-600 text-sm">
            ไม่สามารถโหลดข้อมูลได้ กรุณาลองอีกครั้ง
          </p>
        ) : (
          <>
            {activeTab === "respond" && (
              data.toRespond.length === 0
                ? <EmptyState message="ไม่มีข้อบกพร่องที่รอการตอบกลับจากคุณ" />
                : data.toRespond.map((f) => <FindingRow key={f.id} finding={f} />)
            )}
            {activeTab === "verify" && (
              data.toVerify.length === 0
                ? <EmptyState message="ไม่มีข้อบกพร่องที่รอการยืนยันจากคุณ" />
                : data.toVerify.map((f) => <FindingRow key={f.id} finding={f} />)
            )}
            {activeTab === "leading" && (
              data.leadingPlans.length === 0
                ? <EmptyState message="คุณไม่ได้นำทีมแผนการตรวจสอบที่ยังเปิดอยู่" />
                : data.leadingPlans.map((p) => <PlanRow key={p.id} plan={p} />)
            )}
            {activeTab === "signoff" && (
              data.pendingSignoffs.length === 0
                ? <EmptyState message="ไม่มีแผนที่รอการลงนามจากคุณ" />
                : data.pendingSignoffs.map((p) => <PlanRow key={p.id} plan={p} />)
            )}
          </>
        )}
      </div>
    </div>
  );
}
