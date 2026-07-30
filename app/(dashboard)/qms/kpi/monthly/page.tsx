import KpiMonthlyClient from "@/components/kpi/KpiMonthlyClient";
import type { Metadata } from "next";
import { QmsConfigService } from "@/services/qmsConfigService";
import { requireAuth } from "@/lib/auth";

export const metadata: Metadata = { title: "Monthly KPI" };

export default async function KpiMonthlyPage() {
  const qmsConfigService = new QmsConfigService();
  const [session, footerConfig] = await Promise.all([
    requireAuth(),
    qmsConfigService.getSingleFooterConfig("KPI_MONTHLY"),
  ]);
  const footerPrefix = footerConfig?.prefix || "FM-KPI-02";
  const monthlyFormDocName = footerConfig?.label || "KPI Monthly Report";
  
  const role = (session?.user?.role ?? "USER") as "USER" | "IT" | "QMS" | "MR";
  const userId = session?.user?.id ?? "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <KpiMonthlyClient 
        userRole={role} 
        userId={userId} 
        monthlyFormDocName={`${footerPrefix} ${monthlyFormDocName}`.trim()} 
      />
    </div>
  );
}
