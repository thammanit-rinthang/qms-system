import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import KpiApproveActionClient from "@/components/approve/KpiApproveActionClient";
import FmMr01ApprovalPageClient from "@/components/kpi/FmMr01ApprovalPageClient";
import { KpiRepository } from "@/repositories/kpiRepository";
import { ApprovalSignatureRepository } from "@/repositories/approvalSignatureRepository";
import { QmsConfigService } from "@/services/qmsConfigService";
import { KpiService } from "@/services/kpiService";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "KPI - Approve" };

const kpiRepo = new KpiRepository();
const approvalSignatureRepo = new ApprovalSignatureRepository();
const qmsConfigService = new QmsConfigService();
const kpiService = new KpiService();

export default async function KpiApproverPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string; kpiId?: string; year?: string; month?: string }>;
}) {
  await requireAuth();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const type = sp.type ?? "kpi";

  if (type === "kpi-monthly" && !sp.kpiId) redirect("/approve");

  if (type !== "kpi-monthly") {
    const masterKpi = await kpiRepo.findByIdWithRelations(id);

    if (masterKpi?.department === "SYSTEM_MASTER") {
      const [kpis, signatures, footerConfig] = await Promise.all([
        kpiRepo.findForExport({ yearly: masterKpi.yearly }).then((rows) =>
          Promise.all(
            rows
              .filter((row) => row.department !== "SYSTEM_MASTER")
              .map((row) => kpiService.getKpiById(row.id)),
          ),
        ),
        approvalSignatureRepo.findByDocument("KPI", id),
        qmsConfigService.getSingleFooterConfig("KPI_ANNUAL"),
      ]);

      return (
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6">
          <FmMr01ApprovalPageClient
            approvalDocumentId={id}
            mode="approver"
            year={masterKpi.yearly}
            kpis={kpis}
            masterKpi={masterKpi}
            signatures={signatures}
            footerConfig={footerConfig}
          />
        </div>
      );
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <KpiApproveActionClient
        id={id}
        mode="approver"
        type={type === "kpi-monthly" ? "kpi-monthly" : "kpi"}
        kpiId={sp.kpiId}
      />
    </div>
  );
}
