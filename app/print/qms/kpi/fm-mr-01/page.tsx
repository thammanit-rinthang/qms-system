import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { KpiRepository } from "@/repositories/kpiRepository";
import { ApprovalSignatureRepository } from "@/repositories/approvalSignatureRepository";
import FmMr01PrintTemplate from "@/components/kpi/FmMr01PrintTemplate";
import { QmsConfigService } from "@/services/qmsConfigService";
import { KpiService } from "@/services/kpiService";

const kpiRepo = new KpiRepository();
const approvalSignatureRepo = new ApprovalSignatureRepository();
const qmsConfigService = new QmsConfigService();
const kpiService = new KpiService();

type Props = { searchParams: Promise<{ year?: string; mode?: string }> };

export const metadata = { title: "FM-MR-01 Master Print" };

export default async function FmMr01PrintPage({ searchParams }: Props) {
  const session = await requireAuth();
  const params = await searchParams;
  const yearStr = params.year;
  const year = yearStr ? parseInt(yearStr, 10) : new Date().getFullYear();

  if (isNaN(year)) {
    notFound();
  }

  // Fetch KPIs for the requested year with revision comparison payload.
  const kpis = await kpiRepo.findForExport({ yearly: year }).then((rows) =>
    Promise.all(
      rows
        .filter((row) => row.department !== "SYSTEM_MASTER")
        .map((row) => kpiService.getKpiById(row.id)),
    ),
  );
  
  // Fetch master KPI and its signatures
  const masterKpi = await kpiRepo.findByDepartmentYear("SYSTEM_MASTER", year);

  const [signatures, footerConfig, masterRevisionNo] = await Promise.all([
    masterKpi
      ? approvalSignatureRepo.findByDocument("KPI", masterKpi.id)
      : Promise.resolve([]),
    qmsConfigService.getSingleFooterConfig("KPI_ANNUAL"),
    kpiService.getMasterRevisionNumber(year),
  ]);

  return (
    <FmMr01PrintTemplate
      kpis={kpis}
      year={year}
      mode={params.mode}
      role={session.user.role}
      masterKpi={masterKpi}
      signatures={signatures}
      footerConfig={footerConfig}
      masterRevisionNo={masterRevisionNo}
    />
  );
}
