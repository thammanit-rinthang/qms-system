import { requireAuth } from "@/lib/auth";
import PageHeader from "@/components/common/PageHeader";
import AuditMyTasksClient from "@/components/audit/AuditMyTasksClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "งานตรวจสอบของฉัน - QMS" };

export default async function AuditMyTasksPage() {
  await requireAuth();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="งานตรวจสอบของฉัน"
        subtitle="My Audit Tasks"
      />
      <AuditMyTasksClient />
    </div>
  );
}
