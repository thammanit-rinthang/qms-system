"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useState } from "react";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { useT } from "@/lib/i18n";
import PageHeader from "@/components/common/PageHeader";
import FilterBar from "@/components/common/FilterBar";
import { KpiMasterTable } from "@/components/kpi/KpiMasterTable";
import { KpiMasterFormDialog } from "@/components/kpi/KpiMasterFormDialog";
import KpiMonthlyClient from "@/components/kpi/KpiMonthlyClient";
import ConfirmModal from "@/components/common/ConfirmModal";
import { useKpiList, useDeleteKpi } from "@/hooks/api/use-kpi";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { KpiWithUsers } from "@/hooks/api/use-kpi";
import { toast } from "sonner";

type UserRole = "USER" | "IT" | "QMS" | "MR";

interface Props {
  canEdit: boolean;
  userRole: UserRole;
}

export default function KpiClient({ canEdit, userRole }: Props) {
  const t = useT();
  const [formOpen, setFormOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<KpiWithUsers | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [kpiToDelete, setKpiToDelete] = useState<string | null>(null);

  const { params, rawValues, setParam, clearAll, hasFilters } = useUrlFilters({
    keys: ["search", "department", "year", "page"],
    searchKey: "search",
  });

  const { data, isLoading } = useKpiList({
    page: Number(params.page) || 1,
    limit: 20,
    yearly: params.year ? Number(params.year) : undefined,
    department: params.department || undefined,
  });

  const deleteMutation = useDeleteKpi();

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }).map((_, i) => ({
    label: String(currentYear - i),
    value: String(currentYear - i),
  }));

  return (
    <div className="space-y-6">
      <PageHeader title={t("kpi.reference.title")} />

      <Tabs.Root defaultValue="setup" className="space-y-6">
        <Tabs.List className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          <Tabs.Trigger
            value="setup"
            className="px-4 py-2 text-sm font-medium rounded-lg text-slate-500 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
          >
            {t("kpi.tabs.setup")}
          </Tabs.Trigger>
          <Tabs.Trigger
            value="monthly"
            className="px-4 py-2 text-sm font-medium rounded-lg text-slate-500 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all"
          >
            {t("kpi.tabs.monthly")}
          </Tabs.Trigger>
        </Tabs.List>

        {/* KPI Setup Tab */}
        <Tabs.Content value="setup" className="space-y-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <FilterBar
                searchValue={rawValues.search}
                onSearchChange={(v) => setParam("search", v)}
                searchPlaceholder={t("kpi.reference.searchPlaceholder")}
                filters={[
                  { key: "year", label: t("kpi.reference.table.year"), options: yearOptions },
                ]}
                filterValues={params}
                onFilterChange={setParam}
                hasActiveFilters={hasFilters}
                onClearAll={clearAll}
                resultCount={data?.data.length ?? 0}
                totalCount={data?.meta.total ?? 0}
              />
            </div>
            {canEdit && (
              <Button
                onClick={() => { setEditingKpi(null); setFormOpen(true); }}
                className="shrink-0 rounded-xl bg-primary hover:bg-[#161875]"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("kpi.reference.add")}
              </Button>
            )}
          </div>

          <KpiMasterTable
            data={data?.data ?? []}
            isLoading={isLoading}
            onEdit={(kpi) => { setEditingKpi(kpi); setFormOpen(true); }}
            onDelete={(id) => { setKpiToDelete(id); setDeleteConfirmOpen(true); }}
            canEdit={canEdit}
            meta={data?.meta}
            onPageChange={(page) => setParam("page", String(page))}
          />

          <KpiMasterFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            kpi={editingKpi}
          />

          {deleteConfirmOpen && kpiToDelete && (
            <ConfirmModal
              title={t("kpi.reference.confirmDeleteTitle")}
              message={t("kpi.reference.confirmDeleteMessage")}
              confirmLabel={t("common.delete")}
              cancelLabel={t("common.cancel")}
              onConfirm={async () => {
                try {
                  await deleteMutation.mutateAsync(kpiToDelete);
                  toast.success(t("kpi.messages.deleteSuccess"));
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
                } finally {
                  setDeleteConfirmOpen(false);
                  setKpiToDelete(null);
                }
              }}
              onCancel={() => { setDeleteConfirmOpen(false); setKpiToDelete(null); }}
              loading={deleteMutation.isPending}
              danger
            />
          )}
        </Tabs.Content>

        {/* Monthly Tab */}
        <Tabs.Content value="monthly">
          <KpiMonthlyClient userRole={userRole} />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  );
}
