import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import KpiPrintTemplate from "@/components/kpi/KpiPrintTemplate";
import { KpiService } from "@/services/kpiService";
import { QmsConfigService } from "@/services/qmsConfigService";

const kpiService = new KpiService();
const qmsConfigService = new QmsConfigService();

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const [kpi, footerConfig] = await Promise.all([
    db.kPI.findUnique({ where: { id }, select: { department: true, yearly: true } }),
    qmsConfigService.getSingleFooterConfig("KPI_ANNUAL"),
  ]);

  const title = footerConfig.label.trim() || "KPI Annual Objective";
  return { title: kpi ? `${kpi.department} ${kpi.yearly} - ${title}` : title };
}

export default async function PrintKpiPage({ params }: Props) {
  const [session, { id }] = await Promise.all([requireAuth(), params]);
  void session;

  try {
    const [kpi, footerConfig] = await Promise.all([
      kpiService.getKpiById(id),
      qmsConfigService.getSingleFooterConfig("KPI_ANNUAL"),
    ]);

    return <KpiPrintTemplate kpi={kpi} footerConfig={footerConfig} />;
  } catch {
    notFound();
  }
}
