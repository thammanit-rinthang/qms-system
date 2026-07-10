import { requireAuth } from "@/lib/auth";
import KpiMonthlyClient from "@/components/kpi/KpiMonthlyClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Monthly KPI" };

export default async function KpiMonthlyPage() {
  const session = await requireAuth();
  const role = (session?.user?.role ?? "USER") as "USER" | "IT" | "QMS" | "MR";
  const userId = session?.user?.id ?? "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <KpiMonthlyClient userRole={role} userId={userId} />
    </div>
  );
}
