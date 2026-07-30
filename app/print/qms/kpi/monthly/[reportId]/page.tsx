import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApprovalSignatureRepository } from "@/repositories/approvalSignatureRepository";
import FmMr03PrintTemplate from "@/components/kpi/FmMr03PrintTemplate";

const approvalSignatureRepo = new ApprovalSignatureRepository();

type Props = { params: Promise<{ reportId: string }> };

export const metadata = { title: "FM-MR-03 Quality Objectives Report" };

export default async function FmMr03PrintPage({ params }: Props) {
  await requireAuth();
  const { reportId } = await params;

  const report = await db.kPIMonthlyReport.findUnique({
    where: { id: reportId },
    include: {
      kpi: {
        include: {
          objectives: {
            orderBy: { createdAt: "asc" }
          },
        },
      },
      details: {
        include: {
          kpiObjective: true,
          correctiveActions: { orderBy: { times: 'asc' } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!report) {
    notFound();
  }

  // Fetch all monthly reports of the same year to construct the 12-month grid
  const allYearReports = await db.kPIMonthlyReport.findMany({
    where: { kpiId: report.kpiId, year: report.year },
    include: {
      details: true,
    },
  });

  // Fetch signatures
  const signatures = await approvalSignatureRepo.findByDocument("KPI_MONTHLY", reportId);
  const preparerSig = signatures.find(s => s.step === "PREPARER" && s.action === "APPROVED") || null;
  const reviewerSig = signatures.find(s => s.step === "REVIEWER" && s.action === "APPROVED") || null;

  return (
    <FmMr03PrintTemplate
      report={report}
      allYearReports={allYearReports}
      preparerSig={preparerSig}
      reviewerSig={reviewerSig}
    />
  );
}
