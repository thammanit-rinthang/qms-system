import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { KpiMonthlySummaryService } from "@/services/kpiMonthlySummaryService";
import { KpiService } from "@/services/kpiService";
import KpiMonthlySummaryMatrixTable from "@/components/kpi/KpiMonthlySummaryMatrixTable";
import KpiMonthlySummaryHistoryPrintBar from "@/components/kpi/KpiMonthlySummaryHistoryPrintBar";
import type { KpiYearlyPreviewData } from "@/services/kpiExportService";
import type { ApprovalSignature } from "@/generated/prisma/client";

const service = new KpiMonthlySummaryService();
const kpiService = new KpiService();

type Props = { params: Promise<{ id: string }> };

export const metadata = { title: "KPI Monthly Review — Signed Document" };

export default async function KpiMonthlyReviewHistoryPrintPage({ params }: Props) {
  await requireAuth();
  const { id } = await params;

  const doc = await service.getHistoryDocument(id);
  if (!doc || !doc.snapshot) notFound();

  const masterRevisionNo = await kpiService.getMasterRevisionNumber(doc.year);
  const preview = doc.snapshot as unknown as KpiYearlyPreviewData;
  const signatures = doc.signatures as unknown as Pick<ApprovalSignature, "step" | "action" | "signaturePath">[];

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
        <KpiMonthlySummaryHistoryPrintBar year={doc.year} cycleNo={doc.cycleNo} status={doc.status} />
        <KpiMonthlySummaryMatrixTable
          preview={preview}
          record={{ reviewerName: doc.reviewerName, approverName: doc.approverName }}
          signatures={signatures}
          revisionNo={masterRevisionNo}
          updatedAt={doc.closedAt}
        />
      </div>
    </>
  );
}
