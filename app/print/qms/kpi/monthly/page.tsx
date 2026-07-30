import { requireAuth } from "@/lib/auth";
import { KpiExportService } from "@/services/kpiExportService";
import { KpiMonthlySummaryService } from "@/services/kpiMonthlySummaryService";
import { KpiService } from "@/services/kpiService";
import { ApprovalSignatureRepository } from "@/repositories/approvalSignatureRepository";
import KpiMonthlyReviewPrintTemplate from "@/components/kpi/KpiMonthlyReviewPrintTemplate";

const exportService = new KpiExportService();
const summaryService = new KpiMonthlySummaryService();
const kpiService = new KpiService();
const approvalSignatureRepo = new ApprovalSignatureRepository();

type Props = { searchParams: Promise<{ year?: string; kpiId?: string }> };

export const metadata = { title: "KPI Monthly Review" };

export default async function KpiMonthlyReviewPrintPage({ searchParams }: Props) {
  const session = await requireAuth();

  const params = await searchParams;
  const yearParsed = params.year ? parseInt(params.year, 10) : new Date().getFullYear();
  const year = Number.isNaN(yearParsed) ? new Date().getFullYear() : yearParsed;

  const [preview, record, masterRevisionNo] = await Promise.all([
    exportService.getYearlyPreview({ year, kpiId: params.kpiId }),
    summaryService.getByYear(year),
    kpiService.getMasterRevisionNumber(year),
  ]);
  const signatures = record ? await approvalSignatureRepo.findByDocument("KPI_MONTHLY_SUMMARY", record.id) : [];

  return (
    <KpiMonthlyReviewPrintTemplate
      preview={preview}
      year={year}
      record={record}
      signatures={signatures}
      role={session.user.role}
      userId={session.user.id}
      authUserId={session.user.authUserId ?? null}
      masterRevisionNo={masterRevisionNo}
    />
  );
}
