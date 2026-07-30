"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, History, FileText } from "lucide-react";

interface HistorySignature {
  step: string;
  action: string;
  actionDate: string | null;
  signerName: string | null;
  signerEmail: string | null;
  signaturePath: string | null;
  comment: string | null;
}

interface HistoryCycle {
  id: string;
  cycleNo: number;
  status: string;
  prepareBy: string | null;
  reviewerName: string | null;
  approverName: string | null;
  submittedAt: string | null;
  closedAt: string;
  signatures: HistorySignature[];
  snapshot: unknown;
}

const STATUS_LABEL_TH: Record<string, string> = {
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ถูกตีกลับ",
  DRAFT: "ยังไม่ส่งรีวิว",
};

const STEP_LABEL_TH: Record<string, string> = {
  PREPARER: "ผู้จัดทำ",
  REVIEWER: "ผู้ตรวจสอบ",
  APPROVER: "ผู้อนุมัติ",
};

interface Props {
  open: boolean;
  onClose: () => void;
  year: number;
}

export default function KpiMonthlySummaryHistoryDialog({ open, onClose, year }: Props) {
  const [loading, setLoading] = useState(false);
  const [cycles, setCycles] = useState<HistoryCycle[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/kpi/monthly-summary-review/history?year=${year}`)
      .then((res) => res.json())
      .then((json) => setCycles(json.data ?? []))
      .finally(() => setLoading(false));
  }, [open, year]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0 rounded-2xl">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <History className="h-5 w-5 text-indigo-600" />
            ประวัติการส่งรีวิว / Submission History — Year {year}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {!loading && cycles.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-10">ไม่มีประวัติรอบก่อนหน้า / No prior rounds yet</p>
          )}

          {!loading &&
            cycles.map((cycle) => (
              <div key={cycle.id} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5">
                  <span className="text-sm font-semibold text-slate-700">
                    รอบที่ / Round {cycle.cycleNo} — เอกสารที่เซ็นครบแล้ว ({STATUS_LABEL_TH[cycle.status] ?? cycle.status})
                  </span>
                  <span className="text-xs text-slate-400">
                    ปิดเมื่อ / Closed: {new Date(cycle.closedAt).toLocaleString("th-TH")}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="text-xs text-slate-500 space-y-0.5">
                    {cycle.signatures.map((sig) => (
                      <p key={sig.step}>
                        <span className="font-medium text-slate-600">{STEP_LABEL_TH[sig.step] ?? sig.step}:</span>{" "}
                        {sig.signerName ?? "-"}
                        {sig.actionDate ? ` · ${new Date(sig.actionDate).toLocaleDateString("th-TH")}` : ""}
                      </p>
                    ))}
                  </div>
                  {cycle.snapshot ? (
                    <a
                      href={`/print/qms/kpi/monthly/history/${cycle.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F1059] hover:bg-[#161875] text-white text-xs font-medium px-3 py-2 shrink-0"
                    >
                      <FileText className="h-3.5 w-3.5" /> ดูเอกสาร / View Document
                    </a>
                  ) : (
                    <span className="text-[11px] text-slate-300 shrink-0">ไม่มีเอกสารย้อนหลัง</span>
                  )}
                </div>
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
