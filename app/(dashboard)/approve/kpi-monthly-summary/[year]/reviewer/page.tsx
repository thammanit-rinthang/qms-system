import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { KpiMonthlySummaryService } from "@/services/kpiMonthlySummaryService";
import { KpiExportService } from "@/services/kpiExportService";
import { ApprovalSignatureRepository } from "@/repositories/approvalSignatureRepository";
import KpiMonthlySummaryApproveActionClient from "@/components/kpi/KpiMonthlySummaryApproveActionClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "KPI Monthly Summary - Review" };

const summaryService = new KpiMonthlySummaryService();
const exportService = new KpiExportService();
const approvalSignatureRepo = new ApprovalSignatureRepository();

export default async function KpiMonthlySummaryReviewerPage({ params }: { params: Promise<{ year: string }> }) {
  const session = await requireAuth();
  const { year: yearParam } = await params;
  const year = parseInt(yearParam, 10);

  const record = await summaryService.getByYear(year);
  if (!record) redirect("/approve");

  const [preview, signatures] = await Promise.all([
    exportService.getYearlyPreview({ year }),
    approvalSignatureRepo.findByDocument("KPI_MONTHLY_SUMMARY", record.id),
  ]);

  const isAssignedReviewer = session.user.authUserId && record.reviewerAuthUserId
    ? record.reviewerAuthUserId === session.user.authUserId
    : record.reviewerUserId === session.user.id;
  const canAct = record.status === "PENDING_REVIEW" && isAssignedReviewer;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <KpiMonthlySummaryApproveActionClient
        year={year}
        mode="reviewer"
        preview={preview}
        record={record}
        signatures={signatures}
        canAct={canAct}
      />
    </div>
  );
}
