import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import KpiApproveActionClient from "@/components/approve/KpiApproveActionClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "KPI — Approve" };

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
