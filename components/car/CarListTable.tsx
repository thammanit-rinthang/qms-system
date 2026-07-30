"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ClipboardList, FileSpreadsheet, Eye } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { useUrlFilters } from "@/hooks/use-url-filters";
import FilterBar from "@/components/common/FilterBar";
import Pagination from "@/components/common/Pagination";
import { Button } from "@/components/ui/button";
import { ActionIconButton, ActionPillButton } from "@/components/common/ActionButtons";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CarStatusBadge from "./CarStatusBadge";
import CarFormModal from "./CarFormModal";
import CarPreviewExportDialog, { type PreviewRow } from "./CarPreviewExportDialog";
import { CAR_SCOPE_LABELS, CAR_SOURCE_LABELS, CAR_STATUS_LABELS, type CarDetail, type CarListResponse, type CarListScope, type CarSourceType, type CarStatus, type CarSummary } from "@/types/car";
import { fmtDate } from "@/lib/format";
import RichTextView from "@/components/shared/RichTextView";

const FOLLOW_UP_VALUES = ["near-due-v1", "overdue-v1", "near-due-v2", "overdue-v2"] as const;
const FOLLOW_UP_LABELS: Record<string, string> = {
  "near-due-v1": "ใกล้กำหนดตรวจครั้งที่ 1",
  "overdue-v1": "เลยกำหนดตรวจครั้งที่ 1",
  "near-due-v2": "ใกล้กำหนดตรวจครั้งที่ 2",
  "overdue-v2": "เลยกำหนดตรวจครั้งที่ 2",
};
const FOLLOW_UP_COLORS: Record<string, string> = {
  "near-due-v1": "text-amber-600 bg-amber-50 border-amber-200",
  "overdue-v1": "text-rose-600 bg-rose-50 border-rose-200",
  "near-due-v2": "text-amber-600 bg-amber-50 border-amber-200",
  "overdue-v2": "text-rose-600 bg-rose-50 border-rose-200",
};

interface Props {
  initialData?: CarListResponse;
  isPrivileged?: boolean;
  canEditDelete?: boolean;
  initialScope?: CarListScope;
  allowAllScope?: boolean;
  myAuthDeptId?: string | null;
}

type CarListQuery = {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  sourceType?: string;
  scope: CarListScope;
};

const PAGE_SIZE = 20;
const STATUS_VALUES: CarStatus[] = ["DRAFT", "ISSUED", "RESPONDED", "VERIFY_1", "VERIFY_2", "CLOSED", "RE_CAR", "CANCELLED"];
const SOURCE_VALUES: CarSourceType[] = ["I", "C", "N", "O"];

function CompactRichText({ content }: { content: string }) {
  return (
    <div className="max-h-12 overflow-hidden text-sm text-slate-700 [&_.rich-view]:text-sm [&_.rich-view]:leading-snug [&_.rich-view_*]:my-0 [&_p]:my-0">
      <RichTextView content={content} />
    </div>
  );
}

async function fetchCars(query: CarListQuery): Promise<CarListResponse> {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("limit", String(query.limit));
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.sourceType) params.set("sourceType", query.sourceType);
  params.set("scope", query.scope);

  const res = await fetch(`/api/car?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch CARs");
  const json = await res.json();
  return {
    data: json.data ?? [],
    meta: json.meta ?? { page: query.page, limit: query.limit, total: 0 },
  };
}

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
              <Skeleton className="h-4 rounded w-24" />
              <Skeleton className="h-4 rounded w-24" />
              <Skeleton className="h-4 rounded flex-1" />
              <Skeleton className="h-5 rounded-full w-24" />
              <Skeleton className="h-4 rounded w-20" />
              <Skeleton className="h-4 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CarListTable({
  initialData,
  isPrivileged = false,
  canEditDelete = false,
  initialScope = "my-department",
  allowAllScope = false,
  myAuthDeptId,
}: Props) {
  const t = useT();
  const queryClient = useQueryClient();
  const [editCar, setEditCar] = useState<CarDetail | null>(null);
  const [editLoadingId, setEditLoadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CarSummary | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<CarSummary | null>(null);

  const handleExportExcel = () => {
    setExporting(true);
    const sp = new URLSearchParams();
    if (params.search) sp.set("search", params.search);
    if (params.status) sp.set("status", params.status);
    if (params.sourceType) sp.set("sourceType", params.sourceType);
    window.open(`/api/car/export?${sp.toString()}`, "_blank");
    setTimeout(() => setExporting(false), 2000);
  };

  async function handleEdit(car: CarSummary) {
    setEditLoadingId(car.id);
    try {
      const res = await fetch(`/api/car/${car.id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to load CAR");
      setEditCar(json.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load CAR");
    } finally {
      setEditLoadingId(null);
    }
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/car/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message ?? "Failed to cancel CAR");
      }
    },
    onSuccess: () => {
      toast.success("ยกเลิก CAR สำเร็จ");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["cars"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hardDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/car/${id}?permanent=true`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message ?? "Failed to delete CAR");
      }
    },
    onSuccess: () => {
      toast.success("ลบ CAR สำเร็จ");
      setHardDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["cars"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const { params, rawValues, setParam, clearAll, hasFilters } = useUrlFilters({
    keys: ["scope", "search", "status", "sourceType", "page", "followUp"] as const,
    searchKey: "search",
    debounceMs: 300,
  });

  const page = Math.max(1, Number(params.page || "1"));
  const scope = (params.scope || initialScope) as CarListScope;
  const query = {
    page,
    limit: PAGE_SIZE,
    search: params.search || undefined,
    status: params.status || undefined,
    sourceType: params.sourceType || undefined,
    scope,
  };

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["cars", isPrivileged ? "privileged" : "user", query.scope, query.search, query.status, query.sourceType, query.page, query.limit],
    queryFn: () => fetchCars(query),
    initialData,
  });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const previewQuery = useQuery<{ data: PreviewRow[] }>({
    queryKey: ["car-export-preview", params.search, params.status, params.sourceType],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (params.search) sp.set("search", params.search);
      if (params.status) sp.set("status", params.status);
      if (params.sourceType) sp.set("sourceType", params.sourceType);
      const res = await fetch(`/api/car/export/preview?${sp.toString()}`);
      if (!res.ok) throw new Error("Failed to load preview");
      return res.json();
    },
    enabled: previewOpen,
  });

  const rawCars = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = data?.meta.total ? Math.ceil(data.meta.total / data.meta.limit) : 0;
  const basePath = isPrivileged ? "/qms/car" : "/car";
  const scopeOptions = allowAllScope
    ? (["mine", "my-department", "all"] as const)
    : (["mine", "my-department"] as const);

  function isMyDept(car: (typeof rawCars)[number]) {
    if (myAuthDeptId) return car.targetAuthDepartmentId === myAuthDeptId;
    return false;
  }

  const shouldGroupByMyDepartment = scope === "all" && Boolean(myAuthDeptId);
  let cars = shouldGroupByMyDepartment
    ? [...rawCars].sort((a, b) => Number(isMyDept(b)) - Number(isMyDept(a)))
    : rawCars;

  if (params.followUp) {
    cars = cars.filter((c) => c.followUpStatus === params.followUp);
  }

  const myDeptBoundary = cars.findIndex((c) => !isMyDept(c));

  if (isLoading && !initialData) {
    return <TableSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-6">
        <p className="text-slate-800 font-semibold text-base mb-1">{t("common.error")}</p>
        <p className="text-slate-400 text-sm mb-4">{t("common.errorRetry")}</p>
        <Button variant="outline" onClick={() => refetch()}>
          {t("common.retry")}
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
        searchPlaceholder={`${t("common.search")} CAR`}
        filters={[
          {
            key: "scope",
            label: "ขอบเขต",
            allLabel: "เลือกขอบเขต",
            options: scopeOptions.map((value) => ({
              value,
              label: CAR_SCOPE_LABELS[value],
            })),
            minWidth: "12rem",
          },
          {
            key: "status",
            label: t("car.list.colStatus"),
            allLabel: "All statuses",
            options: STATUS_VALUES.map((status) => ({
              value: status,
              label: CAR_STATUS_LABELS[status],
            })),
          },
          {
            key: "sourceType",
            label: t("car.list.colType"),
            allLabel: "All types",
            options: SOURCE_VALUES.map((sourceType) => ({
              value: sourceType,
              label: CAR_SOURCE_LABELS[sourceType],
            })),
          },
          {
            key: "followUp",
            label: "ติดตาม",
            allLabel: "ทั้งหมด",
            options: FOLLOW_UP_VALUES.map((v) => ({
              value: v,
              label: FOLLOW_UP_LABELS[v],
            })),
            minWidth: "11rem",
          },
        ]}
        filterValues={{
          scope,
          status: params.status || "",
          sourceType: params.sourceType || "",
          followUp: params.followUp || "",
        }}
        onFilterChange={(key, value) => {
          setParam(key, value);
          setParam("page", "1");
        }}
        hasActiveFilters={hasFilters}
        onClearAll={clearAll}
        clearLabel="Clear"
        resultCount={params.followUp ? cars.length : cars.length}
        totalCount={total}
        countLabel="CARs"
      />

      {/* Follow-up status indicators — show if any cars have non-normal followUpStatus */}
      {cars.some((c) => c.followUpStatus !== "normal") && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          {cars.filter((c) => c.followUpStatus !== "normal").slice(0, 5).map((c) => (
            <span
              key={c.id}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${FOLLOW_UP_COLORS[c.followUpStatus] ?? ""}`}
            >
              <span className="w-1.5 h-1.5 rounded-full currentColor opacity-70" />
              {FOLLOW_UP_LABELS[c.followUpStatus]} — {c.carNo}
            </span>
          ))}
          {cars.filter((c) => c.followUpStatus !== "normal").length > 5 && (
            <span className="text-[11px] text-slate-400">
              +{cars.filter((c) => c.followUpStatus !== "normal").length - 5} รายการ
            </span>
          )}
        </div>
      )}

      {/* Export / Preview actions */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-slate-600 border-slate-200 hover:bg-slate-50 h-8"
          onClick={() => setPreviewOpen(true)}
        >
          <Eye className="h-3.5 w-3.5 mr-1.5" />
          Preview
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 h-8"
          onClick={handleExportExcel}
        >
          <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
          ส่งออก Excel
        </Button>
      </div>

      {cars.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-6">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-slate-400">
            <ClipboardList className="w-6 h-6" />
          </div>
          <p className="text-slate-800 font-semibold text-base mb-1">{t("common.noData")}</p>
          <p className="text-slate-400 text-sm">{t("car.list.empty")}</p>
        </div>
      ) : (
        <>
          <div className="lg:hidden space-y-3">
            {shouldGroupByMyDepartment && myDeptBoundary !== 0 && (
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">แผนกของฉัน</p>
            )}
            {cars.map((car, idx) => {
              const isOverdue = !!car.responseDueAt && new Date(car.responseDueAt) < new Date() && car.status === "ISSUED";
              return (
                <React.Fragment key={car.id}>
                  {shouldGroupByMyDepartment && idx === myDeptBoundary && myDeptBoundary > 0 && (
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 pt-2">แผนกอื่นๆ</p>
                  )}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="font-mono font-semibold text-blue-600 truncate">{car.carNo}</p>
                      <p className="text-sm text-slate-700 mt-1">{CAR_SOURCE_LABELS[car.sourceType] ?? car.sourceType}</p>
                    </div>
                    <CarStatusBadge status={car.status} />
                  </div>
                  {car.followUpStatus !== "normal" && (
                    <div className="mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${FOLLOW_UP_COLORS[car.followUpStatus] ?? ""}`}>
                        {FOLLOW_UP_LABELS[car.followUpStatus]}
                      </span>
                    </div>
                  )}
                  <div className="mb-3">
                    <CompactRichText content={car.defectDetail} />
                  </div>
                  <div className="space-y-1.5 text-xs mb-3">
                    <p className="text-slate-500">
                      {t("car.list.colDept")}: <span className="text-slate-700">{car.targetDepartment.name}</span>
                    </p>
                    <p className="text-slate-500">
                      {t("car.detail.labelIssuer")}: <span className="text-slate-700">{car.issuer.name ?? "-"}</span>
                    </p>
                    <p className="text-slate-500">
                      {t("car.list.colIssuedAt")}: <span className="text-slate-700 font-mono">{fmtDate(car.issuedAt)}</span>
                    </p>
                    <p className={`font-mono ${isOverdue ? "text-rose-600 font-semibold" : "text-slate-500"}`}>
                      {t("car.list.colDueAt")}: <span>{fmtDate(car.responseDueAt)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 border-t border-slate-100 pt-3">
                    <ActionPillButton tone="view" label="ดูรายละเอียด" asChild>
                      <Link href={`${basePath}/${car.id}`} />
                    </ActionPillButton>
                    {canEditDelete && car.status === "DRAFT" && (
                      <ActionPillButton
                        tone="edit"
                        label="แก้ไข"
                        onClick={() => handleEdit(car)}
                        loading={editLoadingId === car.id}
                      />
                    )}
                    {canEditDelete && (
                      <ActionPillButton
                        tone="delete"
                        label="ลบถาวร"
                        onClick={() => setHardDeleteTarget(car)}
                      />
                    )}
                    {canEditDelete && !["CANCELLED", "CLOSED", "DRAFT"].includes(car.status) && (
                      <ActionPillButton
                        tone="cancel"
                        label="ยกเลิก"
                        onClick={() => setDeleteTarget(car)}
                      />
                    )}
                  </div>
                </div>
                </React.Fragment>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("car.list.colCarNo")}</TableHead>
                    <TableHead>{t("car.list.colType")}</TableHead>
                    <TableHead>{t("car.list.colDept")}</TableHead>
                    <TableHead>{t("car.list.colDetail")}</TableHead>
                    <TableHead className="text-center">{t("car.list.colStatus")}</TableHead>
                    <TableHead className="text-center">ติดตาม</TableHead>
                    <TableHead className="text-center">{t("car.list.colIssuedAt")}</TableHead>
                    <TableHead className="text-center">{t("car.list.colDueAt")}</TableHead>
                    <TableHead className="text-center w-24">การจัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cars.map((car, idx) => {
                    const isOverdue = !!car.responseDueAt && new Date(car.responseDueAt) < new Date() && car.status === "ISSUED";
                    return (
                      <React.Fragment key={car.id}>
                        {shouldGroupByMyDepartment && idx === 0 && myDeptBoundary !== 0 && (
                          <TableRow key="label-mine">
                            <TableCell colSpan={9} className="py-1.5 px-4 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">แผนกของฉัน</TableCell>
                          </TableRow>
                        )}
                        {shouldGroupByMyDepartment && idx === myDeptBoundary && myDeptBoundary > 0 && (
                          <TableRow key="label-others">
                            <TableCell colSpan={9} className="py-1.5 px-4 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide border-t border-slate-200">แผนกอื่นๆ</TableCell>
                          </TableRow>
                        )}
                      <TableRow key={car.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell>
                          <Link href={`${basePath}/${car.id}`} className="font-mono font-semibold text-blue-600 hover:underline">
                            {car.carNo}
                          </Link>
                        </TableCell>
                        <TableCell className="text-slate-600 text-xs">
                          {CAR_SOURCE_LABELS[car.sourceType] ?? car.sourceType}
                        </TableCell>
                        <TableCell className="text-slate-700">{car.targetDepartment.name}</TableCell>
                        <TableCell className="max-w-xs align-top">
                          <CompactRichText content={car.defectDetail} />
                        </TableCell>
                        <TableCell className="text-center">
                          <CarStatusBadge status={car.status} />
                        </TableCell>
                        <TableCell className="text-center">
                          {car.followUpStatus !== "normal" ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap ${FOLLOW_UP_COLORS[car.followUpStatus] ?? ""}`}>
                              {FOLLOW_UP_LABELS[car.followUpStatus]}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-300">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-500 text-xs text-center font-mono">
                          {fmtDate(car.issuedAt)}
                        </TableCell>
                        <TableCell className={`text-xs text-center font-mono ${isOverdue ? "text-rose-600 font-semibold" : "text-slate-500"}`}>
                          {fmtDate(car.responseDueAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1.5">
                            <ActionIconButton tone="view" label="ดูรายละเอียด" asChild>
                              <Link href={`${basePath}/${car.id}`} />
                            </ActionIconButton>
                            {canEditDelete && car.status === "DRAFT" && (
                              <ActionIconButton
                                tone="edit"
                                label="แก้ไข"
                                onClick={() => handleEdit(car)}
                                loading={editLoadingId === car.id}
                              />
                            )}
                            {canEditDelete && (
                              <ActionIconButton
                                tone="delete"
                                label="ลบถาวร"
                                onClick={() => setHardDeleteTarget(car)}
                              />
                            )}
                            {canEditDelete && !["CANCELLED", "CLOSED", "DRAFT"].includes(car.status) && (
                              <ActionIconButton
                                tone="cancel"
                                label="ยกเลิก"
                                onClick={() => setDeleteTarget(car)}
                              />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          <Pagination
            page={page}
            totalPages={Math.max(totalPages, 1)}
            total={total}
            countLabel="CARs"
            onPageChange={(nextPage) => setParam("page", String(nextPage))}
          />
        </>
      )}

      {isFetching && !isLoading ? (
        <p className="text-xs text-slate-400 text-right">{t("common.loading")}</p>
      ) : null}

      {editCar && (
        <CarFormModal
          open
          onClose={() => setEditCar(null)}
          editCar={editCar}
          onSuccess={() => {
            setEditCar(null);
            queryClient.invalidateQueries({ queryKey: ["cars"] });
          }}
        />
      )}

      <Dialog open={!!hardDeleteTarget} onOpenChange={(open) => !open && setHardDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการลบ CAR</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            คุณต้องการ<span className="font-semibold text-rose-600">ลบถาวร</span>{" "}
            <span className="font-mono font-semibold text-slate-800">{hardDeleteTarget?.carNo}</span>{" "}
            ออกจากระบบ? การกระทำนี้<span className="font-semibold">ไม่สามารถย้อนกลับได้</span>
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHardDeleteTarget(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={() => hardDeleteTarget && hardDeleteMutation.mutate(hardDeleteTarget.id)}
              disabled={hardDeleteMutation.isPending}
            >
              {hardDeleteMutation.isPending ? "กำลังลบ..." : "ลบถาวร"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ยืนยันการยกเลิก CAR</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            คุณต้องการยกเลิก{" "}
            <span className="font-mono font-semibold text-slate-800">{deleteTarget?.carNo}</span>{" "}
            ใช่หรือไม่?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "กำลังยกเลิก..." : "ยืนยันยกเลิก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CarPreviewExportDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onExport={handleExportExcel}
        rows={previewQuery.data?.data ?? []}
        loading={previewQuery.isLoading}
        exporting={exporting}
      />
    </div>
  );
}
