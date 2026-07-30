import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { KpiMonthlySummaryService } from "@/services/kpiMonthlySummaryService";
import { KpiExportService } from "@/services/kpiExportService";
import { ApprovalSignatureRepository } from "@/repositories/approvalSignatureRepository";
import KpiMonthlySummaryApproveActionClient from "@/components/kpi/KpiMonthlySummaryApproveActionClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "KPI Monthly Summary - Approve" };

const summaryService = new KpiMonthlySummaryService();
const exportService = new KpiExportService();
const approvalSignatureRepo = new ApprovalSignatureRepository();

export default async function KpiMonthlySummaryApproverPage({ params }: { params: Promise<{ year: string }> }) {
  const session = await requireAuth();
  const { year: yearParam } = await params;
  const year = parseInt(yearParam, 10);

  const record = await summaryService.getByYear(year);
  if (!record) redirect("/approve");

  const [preview, signatures] = await Promise.all([
    exportService.getYearlyPreview({ year }),
    approvalSignatureRepo.findByDocument("KPI_MONTHLY_SUMMARY", record.id),
  ]);

  const isAssignedApprover = session.user.authUserId && record.approverAuthUserId
    ? record.approverAuthUserId === session.user.authUserId
    : record.approverUserId === session.user.id;
  const canAct = record.status === "PENDING_APPROVAL" && isAssignedApprover;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <KpiMonthlySummaryApproveActionClient
        year={year}
        mode="approver"
        preview={preview}
        record={record}
        signatures={signatures}
        canAct={canAct}
      />
    </div>
  );
}
