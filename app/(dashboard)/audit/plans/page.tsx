import { requireAuth } from "@/lib/auth";
import PageHeader from "@/components/common/PageHeader";
import AuditPlanListTable from "@/components/audit/AuditPlanListTable";
import { AuditPlanService } from "@/services/audit/auditPlanService";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "แผนการตรวจสอบ - QMS" };

const auditPlanService = new AuditPlanService();

export default async function AuditPlansPage() {
  const session = await requireAuth();

  const role = session.user.role;
  const isPrivileged = role === "QMS" || role === "IT" || role === "MR";
  const canEdit = role === "QMS" || role === "IT";

  const raw = await auditPlanService.listPlans({ page: 1, limit: 20 });
  const initialData = {
    ...raw,
    data: raw.data.map((p) => ({
      ...p,
      startDate: p.startDate instanceof Date ? p.startDate.toISOString() : (p.startDate ?? null),
      endDate: p.endDate instanceof Date ? p.endDate.toISOString() : (p.endDate ?? null),
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
      updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
    })),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="แผนการตรวจสอบ"
        subtitle="Audit Plans"
        actions={
          canEdit ? (
            <Button asChild>
              <Link href="/audit/plans/new">
                <Plus className="mr-1.5 h-4 w-4" />
                สร้างแผนใหม่
              </Link>
            </Button>
          ) : undefined
        }
      />
      <AuditPlanListTable
        initialData={initialData}
        isPrivileged={isPrivileged}
        canEdit={canEdit}
      />
    </div>
  );
}
