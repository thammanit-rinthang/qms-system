"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarCheck, ChevronRight, FileText, Plus, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type PlanRow = {
  id: string;
  appointmentId: string;
  appointmentNo: string;
  year: number;          // Buddhist year
  title: string;
  standards: string[];
  sessionCount: number;
  ganttRowCount: number;
  reviseNo: number;
  createdAt: string;
};

type UnpairedAppt = {
  id: string;
  appointmentNo: string;
  year: number;
  title: string;
  standards: string[];
};

type Props = {
  plans: PlanRow[];
  unpaired: UnpairedAppt[];
  canCreate: boolean;
};

export function AuditSessionPlanListClient({ plans, unpaired, canCreate }: Props) {
  const router = useRouter();
  const [creating, setCreating] = useState<string | null>(null); // appointmentId being created

  async function handleCreate(appointmentId: string) {
    setCreating(appointmentId);
    try {
      const res = await fetch("/api/audit/session-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((j as { error?: { message?: string } }).error?.message ?? "Error");
      const planId = (j as { data?: { id?: string } }).data?.id;
      if (planId) router.push(`/audit/session-plans/${planId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      setCreating(null);
    }
  }

  // Group by year
  const byYear = new Map<number, PlanRow[]>();
  for (const p of plans) {
    if (!byYear.has(p.year)) byYear.set(p.year, []);
    byYear.get(p.year)!.push(p);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);

  const unpairedByYear = new Map<number, UnpairedAppt[]>();
  for (const a of unpaired) {
    if (!unpairedByYear.has(a.year)) unpairedByYear.set(a.year, []);
    unpairedByYear.get(a.year)!.push(a);
  }
  const allYears = [...new Set([...years, ...unpairedByYear.keys()])].sort((a, b) => b - a);

  if (allYears.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-16 text-center shadow-sm">
        <CalendarCheck className="h-10 w-10 text-slate-300 mb-4" />
        <p className="text-base font-semibold text-slate-700">ยังไม่มีแผนการตรวจ</p>
        <p className="text-sm text-slate-400 mt-1">สร้างได้หลัง Appointment ถูก Publish แล้ว</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {allYears.map((year) => {
        const yearEn = year - 543;
        const yearPlans = byYear.get(year) ?? [];
        const yearUnpaired = unpairedByYear.get(year) ?? [];

        return (
          <section key={year}>
            {/* Year header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900">ปี {year}</span>
                <span className="text-sm text-slate-400">({yearEn})</span>
              </div>
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-400 tabular-nums">{yearPlans.length} แผน</span>
            </div>

            <div className="space-y-3">
              {/* Existing plans */}
              {yearPlans.map((p) => (
                <Link
                  key={p.id}
                  href={`/audit/session-plans/${p.id}`}
                  className="flex items-center gap-4 rounded-2xl bg-white border border-slate-100 px-5 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] hover:border-slate-200 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#0f1059]/5 flex items-center justify-center shrink-0">
                    <Table2 className="w-5 h-5 text-[#0f1059]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-semibold text-slate-400">{p.appointmentNo}</span>
                      {p.reviseNo > 0 && (
                        <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 rounded px-1.5 py-0.5 font-medium">Rev.{p.reviseNo.toString().padStart(2, "0")}</span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 truncate">{p.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-400">{p.sessionCount} sessions</span>
                      <span className="text-slate-200">·</span>
                      <span className="text-xs text-slate-400">{p.ganttRowCount} Gantt rows</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 shrink-0 max-w-48 justify-end">
                    {p.standards.map((s) => (
                      <span key={s} className="inline-flex rounded-md bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{s}</span>
                    ))}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                </Link>
              ))}

              {/* Unpaired appointments — can create plan */}
              {canCreate && yearUnpaired.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-4 rounded-2xl bg-white border border-dashed border-slate-200 px-5 py-4"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-slate-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-semibold text-slate-400">{a.appointmentNo}</span>
                      <span className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded px-1.5 py-0.5 font-medium">Published</span>
                    </div>
                    <p className="text-sm font-medium text-slate-600 truncate">{a.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">ยังไม่มีแผนการตรวจ</p>
                  </div>
                  <div className="flex flex-wrap gap-1 shrink-0 max-w-40 justify-end">
                    {a.standards.map((s) => (
                      <span key={s} className="inline-flex rounded-md bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{s}</span>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={creating === a.id}
                    onClick={() => handleCreate(a.id)}
                    className="rounded-xl border-slate-200 text-xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    {creating === a.id ? "กำลังสร้าง..." : "สร้างแผน"}
                  </Button>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
