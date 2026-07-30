"use client";

import { useT } from "@/lib/i18n";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ActionIconButton, ActionPillButton } from "@/components/common/ActionButtons";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/common/EmptyState";
import { Calendar, Briefcase, ChevronLeft, ChevronRight, UserCheck, UserCog } from "lucide-react";
import type { KpiWithUsers } from "@/hooks/api/use-kpi";

interface Props {
  data: KpiWithUsers[];
  isLoading: boolean;
  onEdit: (kpi: KpiWithUsers) => void;
  onDelete: (id: string) => void;
  canEdit?: boolean;
  meta?: { page: number; limit: number; total: number };
  onPageChange?: (page: number) => void;
}

function resolvedName(user: { name: string | null; email: string } | null | undefined, fallback: string): string {
  return user?.name || user?.email || fallback || "—";
}

export function KpiMasterTable({ data, isLoading, onEdit, onDelete, canEdit, meta, onPageChange }: Props) {
  const t = useT();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="hidden lg:block bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-11 w-full rounded-xl" />)}
          </div>
        </div>
        <div className="lg:hidden space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-16 flex justify-center items-center">
        <EmptyState title={t("kpi.reference.table.empty")} />
      </div>
    );
  }

  const totalPages = meta ? Math.ceil(meta.total / meta.limit) || 1 : 1;

  return (
    <>
      {/* Mobile / Tablet List */}
      <div className="lg:hidden space-y-3">
        {data.map((kpi) => (
          <div key={kpi.id} className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-4 flex flex-col gap-3">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-base text-primary leading-snug">{kpi.department}</h3>
                <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-500">
                  <Briefcase className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{kpi.prepare || "—"}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 bg-slate-50/50 px-3 py-1.5 rounded-xl border border-slate-100 shrink-0">
                <Calendar className="w-3.5 h-3.5" />
                <span className="font-mono text-slate-700 text-sm">{kpi.yearly}</span>
              </div>
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <p className="flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-slate-500 w-16 shrink-0">{t("kpi.form.reviewer")}:</span>
                <span className="text-slate-700 font-medium">{resolvedName(kpi.reviewerUser, kpi.reviewer)}</span>
              </p>
              <p className="flex items-center gap-1.5">
                <UserCog className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-slate-500 w-16 shrink-0">{t("kpi.form.approver")}:</span>
                <span className="text-slate-700 font-medium">{resolvedName(kpi.approverUser, kpi.approver)}</span>
              </p>
            </div>

            {canEdit && (
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <ActionPillButton tone="edit" label={t("kpi.reference.action.edit")} onClick={() => onEdit(kpi)} className="flex-1 justify-center" />
                <ActionPillButton tone="delete" label={t("kpi.reference.action.delete")} onClick={() => onDelete(kpi.id)} className="flex-1 justify-center" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500 w-20">{t("kpi.reference.table.year")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("kpi.form.department")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("kpi.form.prepare")}</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-amber-400" />{t("kpi.form.reviewer")}
                </span>
              </TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <UserCog className="w-3.5 h-3.5 text-sky-400" />{t("kpi.form.approver")}
                </span>
              </TableHead>
              {canEdit && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((kpi) => (
              <TableRow key={kpi.id} className="hover:bg-slate-50/50">
                <TableCell className="font-mono text-sm text-slate-700">{kpi.yearly}</TableCell>
                <TableCell className="text-sm text-slate-800 font-medium">{kpi.department}</TableCell>
                <TableCell className="text-sm text-slate-600">{kpi.prepare || "—"}</TableCell>
                <TableCell className="text-sm text-slate-700 font-medium">
                  {resolvedName(kpi.reviewerUser, kpi.reviewer)}
                </TableCell>
                <TableCell className="text-sm text-slate-700 font-medium">
                  {resolvedName(kpi.approverUser, kpi.approver)}
                </TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <ActionIconButton tone="edit" label={t("kpi.reference.action.edit")} onClick={() => onEdit(kpi)} />
                      <ActionIconButton tone="delete" label={t("kpi.reference.action.delete")} onClick={() => onDelete(kpi.id)} />
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta && (
        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <p className="text-sm text-slate-500">
            {meta.page} / {totalPages}
            <span className="text-slate-400 ml-2">({meta.total} {t("kpi.reference.table.totalItems")})</span>
          </p>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-slate-200" disabled={meta.page === 1} onClick={() => onPageChange?.(meta.page - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-slate-700 px-2">{meta.page} / {totalPages}</span>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-slate-200" disabled={meta.page >= totalPages} onClick={() => onPageChange?.(meta.page + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
