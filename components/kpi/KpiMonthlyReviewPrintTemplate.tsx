"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Printer, FileText, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import KpiMonthlySummaryReviewDialog from "@/components/kpi/KpiMonthlySummaryReviewDialog";
import type { KpiYearlyPreviewData } from "@/services/kpiExportService";
import type { KPIMonthlySummaryReview, ApprovalSignature } from "@/generated/prisma/client";

const STATUS_BG: Record<string, string> = {
  achieved: "#92D050",
  failed: "#FF5050",
  pending: "#FFFF00",
};

const STATUS_LABEL_TH: Record<string, string> = {
  DRAFT: "ยังไม่ส่งรีวิว",
  PENDING_REVIEW: "รอตรวจสอบ",
  PENDING_APPROVAL: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ถูกตีกลับ",
};

interface Props {
  preview: KpiYearlyPreviewData;
  year: number;
  record: KPIMonthlySummaryReview | null;
  signatures: ApprovalSignature[];
  role: string;
  userId: string;
  authUserId: string | null;
}

export default function KpiMonthlyReviewPrintTemplate({ preview, year, record, signatures, role, userId, authUserId }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);

  const isPrivileged = role === "QMS" || role === "IT" || role === "MR";
  const status = record?.status ?? "DRAFT";

  const isAssignedReviewer = !!record && (authUserId && record.reviewerAuthUserId ? record.reviewerAuthUserId === authUserId : record.reviewerUserId === userId);
  const isAssignedApprover = !!record && (authUserId && record.approverAuthUserId ? record.approverAuthUserId === authUserId : record.approverUserId === userId);

  const canSubmit = isPrivileged && status === "DRAFT";
  const canReview = status === "PENDING_REVIEW" && (isPrivileged || isAssignedReviewer);
  const canApprove = status === "PENDING_APPROVAL" && (isPrivileged || isAssignedApprover);
  const canRecall = isPrivileged && (status === "PENDING_REVIEW" || status === "PENDING_APPROVAL");
  const canReject = canReview || canApprove;

  const preparerSig = signatures.find((s) => s.step === "PREPARER" && s.action === "APPROVED");
  const reviewerSig = signatures.find((s) => s.step === "REVIEWER" && s.action === "APPROVED");
  const approverSig = signatures.find((s) => s.step === "APPROVER" && s.action === "APPROVED");

  async function callAction(path: string, body: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      const res = await fetch(`/api/kpi/monthly-summary-review/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, ...body }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message ?? json?.message ?? "Action failed");
      toast.success(json?.message ?? "Success");
      setShowRejectForm(false);
      setRejectReason("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed", { duration: Infinity });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @page { size: A4 landscape; margin: 10mm 8mm 8mm 8mm; }
        body { margin: 0; padding: 0; font-family: 'Leelawadee UI', 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #000; background-color: #f8fafc; }
        @media print {
          .no-print { display: none !important; }
          body { background-color: #fff; }
        }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 0.5pt solid #000; padding: 4px 6px; }
      `}} />

      <div className="py-8 bg-slate-50 min-h-screen">
        <div className="no-print max-w-[280mm] mx-auto mb-4 flex flex-wrap items-center justify-between gap-2 px-2">
          <div>
            <h1 className="text-lg font-bold text-slate-800">KPI Monthly Review — ปี {preview.yearBE} / {preview.year}</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">สถานะเอกสาร: {STATUS_LABEL_TH[status] ?? status}</p>
          </div>

          <div className="flex items-center gap-2">
            {canRecall && (
              <Button variant="outline" className="rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50" disabled={busy}
                onClick={() => callAction("recall")}>
                <RotateCcw className="mr-1.5 h-4 w-4" />
                ยกเลิกรีวิว / Recall
              </Button>
            )}

            {canReject && !showRejectForm && (
              <Button variant="outline" className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50" disabled={busy}
                onClick={() => setShowRejectForm(true)}>
                <XCircle className="mr-1.5 h-4 w-4" />
                ตีกลับ / Reject
              </Button>
            )}

            {canReview && (
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl" disabled={busy}
                onClick={() => callAction("review")}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                ตรวจสอบผ่าน / Review
              </Button>
            )}

            {canApprove && (
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl" disabled={busy}
                onClick={() => callAction("approve")}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                อนุมัติ / Approve
              </Button>
            )}

            {canSubmit && (
              <Button className="bg-[#0F1059] hover:bg-[#161875] text-white rounded-xl" onClick={() => setDialogOpen(true)}>
                <FileText className="mr-1.5 h-4 w-4" />
                ส่งขอรีวิว / Submit Review
              </Button>
            )}

            <Button type="button" className="bg-[#0F1059] hover:bg-[#161875] text-white h-9 rounded-xl font-medium px-5" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        {showRejectForm && (
          <div className="no-print max-w-[280mm] mx-auto mb-4 px-2">
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-2">
              <Textarea
                placeholder="เหตุผลที่ตีกลับ / Rejection reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="resize-none rounded-xl text-sm bg-white"
                rows={2}
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" className="rounded-xl bg-rose-600 text-white hover:bg-rose-700"
                  disabled={!rejectReason.trim() || busy}
                  onClick={() => callAction("reject", { reason: rejectReason.trim() })}>
                  ยืนยันตีกลับ / Confirm Reject
                </Button>
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setShowRejectForm(false)} disabled={busy}>
                  ยกเลิก / Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-[280mm] mx-auto bg-white p-6 shadow-sm">
          <div className="text-center mb-4">
            <div className="font-bold text-base">สรุปผลการดำเนินงานตามวัตถุประสงค์คุณภาพ ประจำปี {preview.yearBE}</div>
            <div className="font-semibold text-sm">Summary of Key Performance Results Year {preview.year}</div>
          </div>

          <table>
            <thead>
              <tr style={{ backgroundColor: "#0F1059", color: "#fff" }}>
                <th>No.</th>
                <th>Quality Objectives and Indicators</th>
                <th>Target</th>
                <th>Frequency</th>
                <th>Team</th>
                {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m) => (
                  <th key={m}>{m}</th>
                ))}
                <th>Average</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row) => (
                <tr key={row.no}>
                  <td className="text-center">{row.no}</td>
                  <td>{row.objective}</td>
                  <td className="text-center">{row.target}</td>
                  <td className="text-center">{row.frequency}</td>
                  <td className="text-center">{row.team}</td>
                  {row.months.map((month) => (
                    <td
                      key={month.key}
                      className="text-center"
                      style={{
                        backgroundColor: STATUS_BG[month.status],
                        color: month.status === "failed" ? "#fff" : "#000",
                        WebkitPrintColorAdjust: "exact",
                        printColorAdjust: "exact",
                      }}
                    >
                      {month.status === "pending" ? "" : month.value}
                    </td>
                  ))}
                  <td className="text-center font-semibold">{row.average}</td>
                </tr>
              ))}
              {preview.rows.length === 0 && (
                <tr>
                  <td colSpan={18} className="text-center italic py-4">
                    ไม่มีข้อมูลสำหรับปีนี้ / No data for this year
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="flex items-center gap-6 mt-4 text-xs">
            <span className="font-semibold">หมายเหตุ/Note :</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-4 border border-black" style={{ backgroundColor: STATUS_BG.achieved }} />
              Achieve Target
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-4 border border-black" style={{ backgroundColor: STATUS_BG.failed }} />
              Not Achieve Target
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-4 h-4 border border-black" style={{ backgroundColor: STATUS_BG.pending }} />
              Not yet
            </span>
          </div>

          {record && (
            <div className="grid grid-cols-3 gap-4 mt-6 text-xs">
              <div className="border border-black p-2 text-center">
                <div className="font-semibold">ผู้จัดทำ / Prepared By</div>
                <div className="mt-4">{preparerSig ? "Digitally Signed" : "-"}</div>
              </div>
              <div className="border border-black p-2 text-center">
                <div className="font-semibold">ผู้ตรวจสอบ / Reviewed By</div>
                <div className="mt-4">{record.reviewerName ?? "-"}</div>
                <div className="text-[10px] text-slate-500">{reviewerSig ? "Approved" : "Pending"}</div>
              </div>
              <div className="border border-black p-2 text-center">
                <div className="font-semibold">ผู้อนุมัติ / Approved By</div>
                <div className="mt-4">{record.approverName ?? "-"}</div>
                <div className="text-[10px] text-slate-500">{approverSig ? "Approved" : "Pending"}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {dialogOpen && (
        <KpiMonthlySummaryReviewDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          year={year}
          onSuccess={() => router.refresh()}
        />
      )}
    </>
  );
}
