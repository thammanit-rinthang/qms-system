import { requireRole } from "@/lib/auth";
import { AuditLogRepository } from "@/repositories/auditLogRepository";
import AuditLogTable from "@/components/it/AuditLogTable";
import PageHeader from "@/components/common/PageHeader";
import type { Metadata } from "next";
import en from "@/messages/en.json";

export const metadata: Metadata = {
  title: en.it.auditLog.title,
};

const repo = new AuditLogRepository();

export default async function AuditLogPage() {
  await requireRole("IT");

  // Fetch total count for subtitle
  const { total } = await repo.findMany({}, 1, 1);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        titleKey="it.auditLog.title"
        subtitleKey="it.auditLog.subtitle"
        subtitleParams={{ count: total }}
      />
      <AuditLogTable />
    </div>
  );
}
