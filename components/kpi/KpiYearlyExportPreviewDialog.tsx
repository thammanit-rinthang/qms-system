"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Eye, X } from "lucide-react";
import type { KpiYearlyPreviewData } from "@/services/kpiExportService";

interface Props {
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
  data: KpiYearlyPreviewData | null;
  loading?: boolean;
  downloading?: boolean;
}

const STATUS_CLASS: Record<"achieved" | "failed" | "pending", string> = {
  achieved: "bg-emerald-100 text-emerald-900",
  failed: "bg-rose-100 text-rose-900",
  pending: "bg-amber-100 text-amber-900",
};

export default function KpiYearlyExportPreviewDialog({
  open,
  onClose,
  onDownload,
  data,
  loading = false,
  downloading = false,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-[96vw] p-0 gap-0 overflow-hidden sm:max-w-[96vw]">
        <DialogHeader className="border-b border-slate-100 px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Eye className="h-4 w-4 text-[#0F1059]" />
            KPI Yearly Preview
          </DialogTitle>
          {data && (
            <p className="text-xs text-slate-500">
              Year {data.year} · {data.rows.length} objectives
            </p>
          )}
        </DialogHeader>

        <div className="max-h-[76vh] overflow-auto bg-slate-100 p-4">
          {loading ? (
            <div className="space-y-3 rounded-2xl bg-white p-5 shadow-sm">
              <Skeleton className="h-8 w-72 rounded-xl" />
              <Skeleton className="h-6 w-40 rounded-xl" />
              <Skeleton className="h-[420px] w-full rounded-2xl" />
            </div>
          ) : !data ? (
            <div className="rounded-2xl bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
              Preview data not available
            </div>
          ) : (
            <div className="mx-auto min-w-[1380px] max-w-[1600px] rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,16,89,0.08)]">
              <div className="mb-5 flex items-start justify-between gap-6 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F1059] text-lg font-bold text-white">
                    KPI
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Summary of Key Performance Results Year {data.year}
                    </h2>
                    <p className="text-sm text-slate-500">
                      สรุปผลการดําเนินงานตามวัตถุประสงค์คุณภาพ ประจําปี {data.yearBE}
                    </p>
                  </div>
                </div>
                <div className="space-y-1 text-right text-xs text-slate-500">
                  <p>Generated: {data.generatedAt}</p>
                  <p>Next target year: {data.nextYear}</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-[#0F1059] text-white">
                      <th className="border border-slate-300 px-2 py-3 text-center font-semibold">No.</th>
                      <th className="border border-slate-300 px-3 py-3 text-left font-semibold">Objective</th>
                      <th className="border border-slate-300 px-2 py-3 text-center font-semibold">Target</th>
                      <th className="border border-slate-300 px-2 py-3 text-center font-semibold">Frequency</th>
                      <th className="border border-slate-300 px-2 py-3 text-center font-semibold">Team</th>
                      {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month) => (
                        <th key={month} className="border border-slate-300 px-2 py-3 text-center font-semibold">
                          {month}
                        </th>
                      ))}
                      <th className="border border-slate-300 px-2 py-3 text-center font-semibold">Average</th>
                      <th className="border border-slate-300 px-2 py-3 text-center font-semibold">New Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <tr key={`${row.no}-${row.objective}`} className="align-top even:bg-slate-50/60">
                        <td className="border border-slate-200 px-2 py-2 text-center font-semibold text-slate-700">
                          {row.no}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-left font-medium text-slate-800">
                          {row.objective}
                        </td>
                        <td className="border border-slate-200 px-2 py-2 text-center text-slate-700">
                          {row.target}
                        </td>
                        <td className="border border-slate-200 px-2 py-2 text-center text-slate-700">
                          {row.frequency}
                        </td>
                        <td className="border border-slate-200 px-2 py-2 text-center text-slate-700">
                          {row.team}
                        </td>
                        {row.months.map((month) => (
                          <td
                            key={`${row.no}-${month.key}`}
                            className={`border border-slate-200 px-2 py-2 text-center font-semibold ${STATUS_CLASS[month.status]}`}
                          >
                            {month.value}
                          </td>
                        ))}
                        <td className="border border-slate-200 bg-slate-100 px-2 py-2 text-center font-semibold text-slate-800">
                          {row.average}
                        </td>
                        <td className="border border-slate-200 bg-slate-100 px-2 py-2 text-center text-slate-400">
                          -
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 flex items-start justify-between gap-6">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  <p className="mb-2 font-semibold text-slate-800">Legend</p>
                  <div className="flex flex-wrap gap-3">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded-sm bg-emerald-100" />
                      Achieved
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded-sm bg-rose-100" />
                      Not achieved
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-3 w-3 rounded-sm bg-amber-100" />
                      Pending
                    </span>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  Preview before export
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-slate-100 px-5 py-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="mr-1.5 h-3.5 w-3.5" />
            Close
          </Button>
          <Button
            size="sm"
            className="bg-[#0F1059] hover:bg-[#161875]"
            onClick={onDownload}
            disabled={loading || !data || downloading}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {downloading ? "Downloading..." : "Download Excel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
