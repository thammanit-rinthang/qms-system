"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { toast } from "sonner";
import { useUrlFilters } from "@/hooks/use-url-filters";
import FilterBar from "@/components/common/FilterBar";
import Pagination from "@/components/common/Pagination";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/common/ActionButtons";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AuditPlanStatusBadge from "./AuditPlanStatusBadge";
import {
  AUDIT_TYPE_LABELS,
  AUDIT_PLAN_STATUS_LABELS,
  type AuditPlanSummary,
  type AuditPlanListResponse,
  type AuditPlanStatus,
  type AuditType,
} from "@/types/audit";
import { useAuditPlans, useCancelAuditPlan, useDeleteAuditPlan, type AuditPlanListParams } from "@/hooks/api/use-audit-plans";
import { fmtDate } from "@/lib/format";

interface Props {
  initialData?: AuditPlanListResponse;
  isPrivileged?: boolean;
  canEdit?: boolean;
}

const PAGE_SIZE = 20;
const STATUS_VALUES: AuditPlanStatus[] = [
  "DRAFT",
  "PLANNED",
  "ANNOUNCED",
  "IN_PROGRESS",
  "WAITING_CORRECTIVE",
  "READY_TO_CLOSE",
  "CLOSED",
  "CANCELLED",
];

const TYPE_VALUES: AuditType[] = ["INTERNAL", "EXTERNAL"];

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="card-premium p-4 space-y-3">
        <Skeleton className="h-8 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Skeleton className="h-8 w-full rounded-xl" />
          <Skeleton className="h-8 w-full rounded-xl" />
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-4 py-3.5 animate-pulse flex gap-4 items-center">
              <Skeleton className="h-4 rounded w-24" />
              <Skeleton className="h-4 rounded flex-1" />
              <Skeleton className="h-5 rounded-full w-20" />
              <Skeleton className="h-4 rounded w-20" />
              <Skeleton className="h-4 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AuditPlanListTable({ initialData, isPrivileged: _isPrivileged = false, canEdit = false }: Props) {
  const [cancelTarget, setCancelTarget] = useState<AuditPlanSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AuditPlanSummary | null>(null);

  const cancelMutation = useCancelAuditPlan();
  const deleteMutation = useDeleteAuditPlan();

  const { params, rawValues, setParam, clearAll, hasFilters } = useUrlFilters({
    keys: ["search", "auditType", "status", "page"] as const,
    searchKey: "search",
    debounceMs: 300,
  });

  const page = Math.max(1, Number(params.page || "1"));
  const queryParams: AuditPlanListParams = {
    page,
    limit: PAGE_SIZE,
    search: params.search || undefined,
    auditType: params.auditType || undefined,
    status: params.status || undefined,
  };

  const { data, isLoading, isFetching, isError, refetch } = useAuditPlans(queryParams, initialData);

  const plans = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = data?.meta.total ? Math.ceil(data.meta.total / PAGE_SIZE) : 0;
  const basePath = "/audit/plans";

  if (isLoading && !initialData) return <TableSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-6">
        <p className="text-slate-800 font-semibold text-base mb-1">เกิดข้อผิดพลาด</p>
        <p className="text-slate-400 text-sm mb-4">โหลดข้อมูลแผนการตรวจสอบไม่สำเร็จ</p>
        <Button variant="outline" onClick={() => refetch()}>
          ลองใหม่
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FilterBar
        searchValue={rawValues.search}
        onSearchChange={(value) => {
          setParam("search", value);
          setParam("page", "1");
        }}
        searchPlaceholder="ค้นหาแผน..."
        filters={[
          {
            key: "auditType",
            label: "ประเภท",
            allLabel: "ทุกประเภท",
            options: TYPE_VALUES.map((v) => ({ value: v, label: AUDIT_TYPE_LABELS[v] })),
          },
          {
            key: "status",
            label: "สถานะ",
            allLabel: "ทุกสถานะ",
            options: STATUS_VALUES.map((v) => ({ value: v, label: AUDIT_PLAN_STATUS_LABELS[v] })),
          },
        ]}
        filterValues={{ auditType: params.auditType || "", status: params.status || "" }}
        onFilterChange={(key, value) => {
          setParam(key, value);
          setParam("page", "1");
        }}
        hasActiveFilters={hasFilters}
        onClearAll={clearAll}
        clearLabel="ล้างตัวกรอง"
        resultCount={plans.length}
        totalCount={total}
        countLabel="แผน"
      />

      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-6">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-slate-400">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <p className="text-slate-800 font-semibold text-base mb-1">ไม่พบแผนการตรวจสอบ</p>
          <p className="text-slate-400 text-sm">ยังไม่มีแผนการตรวจสอบในระบบ</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="lg:hidden space-y-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-mono font-semibold text-blue-600 truncate">{plan.auditNo}</p>
                    <p className="text-sm text-slate-700 mt-1 font-medium line-clamp-2">{plan.title}</p>
                  </div>
                  <AuditPlanStatusBadge status={plan.status} />
                </div>
                <div className="space-y-1 text-xs mb-3">
                  <p className="text-slate-500">
                    ประเภท: <span className="text-slate-700">{AUDIT_TYPE_LABELS[plan.auditType]}</span>
                  </p>
                  {plan.standard && (
                    <p className="text-slate-500">
                      มาตรฐาน: <span className="text-slate-700">{plan.standard}</span>
                    </p>
                  )}
                  <p className="text-slate-500">
                    วันที่: <span className="text-slate-700 font-mono">{fmtDate(plan.startDate)} — {fmtDate(plan.endDate)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 border-t border-slate-100 pt-3">
                  <Link
                    href={`${basePath}/${plan.id}`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-sky-200 bg-white px-3 text-xs font-medium text-sky-700 hover:bg-sky-50"
                  >
                    ดูรายละเอียด
                  </Link>
                  {canEdit && plan.status !== "CANCELLED" && plan.status !== "CLOSED" && (
                    <button
                      type="button"
                      onClick={() => setCancelTarget(plan)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-orange-200 bg-white px-3 text-xs font-medium text-orange-500 hover:bg-orange-50"
                    >
                      ยกเลิก
                    </button>
                  )}
                  {canEdit && (plan.status === "DRAFT" || plan.status === "CANCELLED") && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(plan)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-xs font-medium text-red-500 hover:bg-red-50"
                    >
                      ลบ
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden hidden lg:block">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขที่</TableHead>
                    <TableHead>ชื่อแผน</TableHead>
                    <TableHead>ประเภท</TableHead>
                    <TableHead>มาตรฐาน</TableHead>
                    <TableHead className="text-center">สถานะ</TableHead>
                    <TableHead className="text-center">วันเริ่ม</TableHead>
                    <TableHead className="text-center">วันสิ้นสุด</TableHead>
                    <TableHead className="text-center w-24">การจัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell>
                        <Link
                          href={`${basePath}/${plan.id}`}
                          className="font-mono font-semibold text-blue-600 hover:underline"
                        >
                          {plan.auditNo}
                        </Link>
                      </TableCell>
                      <TableCell className="text-slate-800 max-w-xs truncate">{plan.title}</TableCell>
                      <TableCell className="text-slate-600 text-xs">{AUDIT_TYPE_LABELS[plan.auditType]}</TableCell>
                      <TableCell className="text-slate-500 text-xs">{plan.standard ?? "-"}</TableCell>
                      <TableCell className="text-center">
                        <AuditPlanStatusBadge status={plan.status} />
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs text-center font-mono">
                        {fmtDate(plan.startDate)}
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs text-center font-mono">
                        {fmtDate(plan.endDate)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1.5">
                          <ActionIconButton tone="view" label="ดูรายละเอียด" asChild>
                            <Link href={`${basePath}/${plan.id}`} />
                          </ActionIconButton>
                          {canEdit && plan.status !== "CANCELLED" && plan.status !== "CLOSED" && (
                            <ActionIconButton
                              tone="cancel"
                              label="ยกเลิก"
                              onClick={() => setCancelTarget(plan)}
                            />
                          )}
                          {canEdit && (plan.status === "DRAFT" || plan.status === "CANCELLED") && (
                            <ActionIconButton
                              tone="delete"
                              label="ลบ"
                              onClick={() => setDeleteTarget(plan)}
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <Pagination
            page={page}
            totalPages={Math.max(totalPages, 1)}
            total={total}
            countLabel="แผน"
            onPageChange={(p) => setParam("page", String(p))}
          />
        </>
      )}

      {isFetching && !isLoading && (
        <p className="text-xs text-slate-400 text-right">กำลังโหลด...</p>
      )}


      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบแผน</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            คุณต้องการลบ{" "}
            <span className="font-mono font-semibold text-slate-800">{deleteTarget?.auditNo}</span>{" "}
            ออกจากระบบถาวร ใช่หรือไม่?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(
                    { id: deleteTarget.id },
                    {
                      onSuccess: () => {
                        toast.success("ลบแผนสำเร็จ");
                        setDeleteTarget(null);
                      },
                      onError: (err) => toast.error(err.message),
                    }
                  );
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "กำลังลบ..." : "ยืนยันลบ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirm dialog */}
      <Dialog open={!!cancelTarget} onOpenChange={(v) => !v && setCancelTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการยกเลิกแผน</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            คุณต้องการยกเลิก{" "}
            <span className="font-mono font-semibold text-slate-800">{cancelTarget?.auditNo}</span>{" "}
            ใช่หรือไม่?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (cancelTarget) {
                  cancelMutation.mutate(
                    { id: cancelTarget.id },
                    {
                      onSuccess: () => {
                        toast.success("ยกเลิกแผนสำเร็จ");
                        setCancelTarget(null);
                      },
                      onError: (err) => toast.error(err.message),
                    }
                  );
                }
              }}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "กำลังยกเลิก..." : "ยืนยันยกเลิก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
