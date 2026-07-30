"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, FileText, RotateCcw, History, ArrowRight } from "lucide-react";
import KpiMonthlySummaryReviewDialog from "@/components/kpi/KpiMonthlySummaryReviewDialog";
import KpiMonthlySummaryHistoryDialog from "@/components/kpi/KpiMonthlySummaryHistoryDialog";
import KpiMonthlySummaryMatrixTable from "@/components/kpi/KpiMonthlySummaryMatrixTable";
import type { KpiYearlyPreviewData } from "@/services/kpiExportService";
import type { KPIMonthlySummaryReview, ApprovalSignature } from "@/generated/prisma/client";

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
  /** Revision number of the KPI Yearly master document — shown in the print header. */
  masterRevisionNo: number;
}

export default function KpiMonthlyReviewPrintTemplate({ preview, year, record, signatures, role, userId, authUserId, masterRevisionNo }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const isPrivileged = role === "QMS" || role === "IT" || role === "MR";
  const status = record?.status ?? "DRAFT";

  const isAssignedReviewer = !!record && (authUserId && record.reviewerAuthUserId ? record.reviewerAuthUserId === authUserId : record.reviewerUserId === userId);
  const isAssignedApprover = !!record && (authUserId && record.approverAuthUserId ? record.approverAuthUserId === authUserId : record.approverUserId === userId);

  const canSubmit = isPrivileged && status !== "PENDING_REVIEW" && status !== "PENDING_APPROVAL";
  const canReview = status === "PENDING_REVIEW" && isAssignedReviewer;
  const canApprove = status === "PENDING_APPROVAL" && isAssignedApprover;
  const canRecall = isPrivileged && (status === "PENDING_REVIEW" || status === "PENDING_APPROVAL");

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
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" className="rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 h-9 font-semibold text-xs gap-1.5">
              <Link href={`/qms/kpi/monthly?year=${year}`}>
                <ArrowLeft className="w-3.5 h-3.5" />
                ย้อนกลับ / Back
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-bold text-slate-800">KPI Monthly Review — ปี {preview.yearBE} / {preview.year}</h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">สถานะเอกสาร: {STATUS_LABEL_TH[status] ?? status}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isPrivileged && (
              <Button variant="outline" className="rounded-xl" onClick={() => setHistoryOpen(true)}>
                <History className="mr-1.5 h-4 w-4" />
                ประวัติ / History
              </Button>
            )}

            {canRecall && (
              <Button variant="outline" className="rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50" disabled={busy}
                onClick={() => callAction("recall")}>
                <RotateCcw className="mr-1.5 h-4 w-4" />
                ยกเลิกรีวิว / Recall
              </Button>
            )}

            {canReview && (
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                onClick={() => router.push(`/approve/kpi-monthly-summary/${year}/reviewer`)}>
                <ArrowRight className="mr-1.5 h-4 w-4" />
                ไปตรวจสอบ / Go to Review
              </Button>
            )}

            {canApprove && (
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                onClick={() => router.push(`/approve/kpi-monthly-summary/${year}/approver`)}>
                <ArrowRight className="mr-1.5 h-4 w-4" />
                ไปอนุมัติ / Go to Approve
              </Button>
            )}

            {canSubmit && (
              <Button className="bg-primary hover:bg-[#161875] text-white rounded-xl" onClick={() => setDialogOpen(true)}>
                <FileText className="mr-1.5 h-4 w-4" />
                ส่งขอรีวิว / Submit Review
              </Button>
            )}

            <Button type="button" className="bg-primary hover:bg-[#161875] text-white h-9 rounded-xl font-medium px-5" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        <KpiMonthlySummaryMatrixTable
          preview={preview}
          record={record}
          signatures={signatures}
          revisionNo={masterRevisionNo}
          updatedAt={record?.updatedAt}
        />
      </div>

      {dialogOpen && (
        <KpiMonthlySummaryReviewDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          year={year}
          onSuccess={() => router.refresh()}
        />
      )}

      {historyOpen && (
        <KpiMonthlySummaryHistoryDialog
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          year={year}
        />
      )}
    </>
  );
}
