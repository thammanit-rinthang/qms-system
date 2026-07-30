import { requireAuth } from "@/lib/auth";
import PageHeader from "@/components/common/PageHeader";
import AuditDashboardClient from "@/components/audit/AuditDashboardClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ภาพรวมการตรวจสอบ - QMS" };

export default async function AuditDashboardPage() {
  await requireAuth();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="ภาพรวมการตรวจสอบ"
        subtitle="Audit Dashboard"
      />
      <AuditDashboardClient />
    </div>
  );
}
