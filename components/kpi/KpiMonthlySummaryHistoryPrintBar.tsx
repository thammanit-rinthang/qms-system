"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";

interface Props {
  year: number;
  cycleNo: number;
  status: string;
}

export default function KpiMonthlySummaryHistoryPrintBar({ year, cycleNo, status }: Props) {
  return (
    <div className="no-print max-w-[280mm] mx-auto mb-4 flex flex-wrap items-center justify-between gap-2 px-2">
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" className="rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 h-9 font-semibold text-xs gap-1.5">
          <Link href={`/print/qms/kpi/monthly?year=${year}`}>
            <ArrowLeft className="w-3.5 h-3.5" />
            ย้อนกลับ / Back
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-bold text-slate-800">KPI Monthly Review — ปี {year} · รอบที่ {cycleNo}</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">เอกสารที่เซ็นครบแล้ว / Signed document — {status}</p>
        </div>
      </div>
      <Button type="button" className="bg-primary hover:bg-[#161875] text-white h-9 rounded-xl font-medium px-5" onClick={() => window.print()}>
        <Printer className="mr-1.5 h-4 w-4" />
        Print
      </Button>
    </div>
  );
}
