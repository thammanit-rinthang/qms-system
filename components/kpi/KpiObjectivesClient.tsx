"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useT } from "@/lib/i18n";
import { useKpiDepts } from "@/hooks/api/use-kpi-depts";
import PageHeader from "@/components/common/PageHeader";
import { ActionIconButton } from "@/components/common/ActionButtons";
import { useKpiList, useCreateKpi } from "@/hooks/api/use-kpi";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Building2,
  ChevronRight,
  ChevronDown,
  Plus,
  CheckCircle2,
  Clock,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Info,
  LayoutList,
  User,
  UserCheck,
  UserCog,
  Printer,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { KpiWithUsers } from "@/hooks/api/use-kpi";

interface Department { id: string; name: string; isActive?: boolean; _count?: { users: number } }

type KpiWithObjectives = KpiWithUsers & { objectives?: unknown[] };

// ── Department management modal ───────────────────────────────────────────────

interface DeptModalProps {
  mode: "create" | "edit";
  dept: Department | null;
  onClose: () => void;
  /** edit: called with (msg, null) — edit: called with (msg, deptName) on create */
  onSuccess: (msg: string, createdDeptName: string | null) => void;
}

function DepartmentModal({ mode, dept, onClose, onSuccess }: DeptModalProps) {
  const t = useT();
  const [name, setName] = useState(mode === "edit" ? (dept?.name ?? "") : "");
  const [isActive, setIsActive] = useState(mode === "edit" ? (dept?.isActive ?? true) : true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body = mode === "edit"
        ? { name: name.trim(), isActive }
        : { name: name.trim(), isActive: true };
      const url = mode === "create" ? "/api/kpi-dept" : `/api/kpi-dept/${dept!.id}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || json.error) { setError(json.error ?? t("common.error")); return; }
      onSuccess(
        mode === "create" ? t("kpi.reference.departments.addSuccess") : t("kpi.reference.departments.editSuccess"),
        mode === "create" ? name.trim() : null,
      );
    } catch {
      setError(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("kpi.reference.departments.addTitle") : t("kpi.reference.departments.editTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div>
            <label className="text-slate-800 text-sm font-semibold mb-2 block">
              {t("kpi.reference.departments.labelName")} <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t("kpi.reference.departments.placeholderName")}
              required
              maxLength={100}
              className={cn(
                "w-full bg-slate-50/50 border rounded-xl px-4 py-2.5 text-sm transition-colors focus:outline-none",
                error
                  ? "border-rose-300 text-rose-700 focus:border-rose-500"
                  : "border-slate-200 text-slate-700 focus:border-primary focus:bg-white"
              )}
            />
          </div>

          {mode === "edit" && (
            <div className="flex items-center gap-2">
              <input
                id="dept-active"
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="dept-active" className="text-sm text-slate-700 cursor-pointer">
                {t("kpi.reference.departments.labelActive")}
              </label>
            </div>
          )}

          {error && <p className="text-rose-600 text-xs -mt-1">{error}</p>}

          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />}
              {t("common.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Department management panel ───────────────────────────────────────────────

interface DeptPanelProps {
  depts: Department[];
  year: number;
  onRefresh: () => void;
  onNavigateKpi: (kpiId: string) => void;
}

function DepartmentPanel({ depts, year, onRefresh, onNavigateKpi }: DeptPanelProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [selected, setSelected] = useState<Department | null>(null);
  const [confirmDel, setConfirmDel] = useState<Department | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleSuccess(msg: string, createdDeptName: string | null) {
    setModalMode(null);
    setSelected(null);
    if (createdDeptName) {
      // Auto-create KPI for this department + current year, then navigate
      try {
        const res = await fetch("/api/kpi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ yearly: year, department: createdDeptName, prepare: "", reviewer: "", approver: "" }),
        });
        const json = await res.json();
        if (res.ok && json.data?.id) {
          onRefresh();
          onNavigateKpi(json.data.id);
          return;
        }
      } catch {
        // fall through — show success toast and refresh list
      }
    }
    toast.success(msg, { duration: 3000 });
    onRefresh();
  }

  async function executeDelete() {
    if (!confirmDel) return;
    const target = confirmDel;
    setConfirmDel(null);
    setDeletingId(target.id);
    try {
      const res = await fetch(`/api/kpi-dept/${target.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error ?? t("common.error"), { duration: Infinity });
        return;
      }
      toast.success(t("kpi.reference.departments.deleteSuccess"), { duration: 3000 });
      onRefresh();
    } catch {
      toast.error(t("common.error"), { duration: Infinity });
    } finally {
      setDeletingId(null);
    }
  }

  function requestDelete(d: Department) {
    const users = d._count?.users ?? 0;
    if (users > 0) {
      toast.error(
        t("kpi.reference.departments.cantDelete").replace("{n}", String(users)),
        { duration: Infinity }
      );
      return;
    }
    setConfirmDel(d);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Building2 className="w-4 h-4 text-slate-400" />
          {t("kpi.reference.departments.title")}
          <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
            {depts.length}
          </span>
        </span>
        <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t border-slate-100">
          {/* Actions bar */}
          <div className="px-5 py-3 flex justify-end gap-2 border-b border-slate-50">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs rounded-lg gap-1.5"
              onClick={async () => {
                try {
                  const res = await fetch("/api/kpi-dept/sync", { method: "POST" });
                  const json = await res.json() as { data: { created: number; skipped: number } };
                  if (!res.ok) throw new Error();
                  toast.success(`Synced: ${json.data.created} new department(s) added`, { duration: 3000 });
                  onRefresh();
                } catch {
                  toast.error(t("common.error"), { duration: Infinity });
                }
              }}
            >
              <Building2 className="w-3.5 h-3.5" />
              Sync from Auth Center
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs rounded-lg gap-1.5"
              onClick={() => { setSelected(null); setModalMode("create"); }}
            >
              <Plus className="w-3.5 h-3.5" />
              {t("kpi.reference.departments.add")}
            </Button>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("kpi.reference.departments.labelName")}</TableHead>
                  <TableHead className="text-center">{t("kpi.reference.departments.colUsers")}</TableHead>
                  <TableHead className="text-center">{t("kpi.reference.departments.colStatus")}</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {depts.map(d => (
                  <TableRow key={d.id} className="text-sm">
                    <TableCell>
                      <span className="font-medium text-slate-800">{d.name}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-xs text-slate-500">
                        {t("kpi.reference.departments.users").replace("{n}", String(d._count?.users ?? 0))}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {d.isActive !== false ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs">
                          {t("kpi.reference.departments.active")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 border border-slate-200 text-xs">
                          {t("kpi.reference.departments.inactive")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        <ActionIconButton
                          tone="edit"
                          label={t("common.edit")}
                          onClick={() => { setSelected(d); setModalMode("edit"); }}
                        />
                        <ActionIconButton
                          tone="delete"
                          label={t("common.delete")}
                          onClick={() => requestDelete(d)}
                          loading={deletingId === d.id}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-slate-50">
            {depts.map(d => (
              <div key={d.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{d.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t("kpi.reference.departments.users").replace("{n}", String(d._count?.users ?? 0))}
                    {" · "}
                    {d.isActive !== false ? t("kpi.reference.departments.active") : t("kpi.reference.departments.inactive")}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <ActionIconButton
                    tone="edit"
                    label={t("common.edit")}
                    onClick={() => { setSelected(d); setModalMode("edit"); }}
                  />
                  <ActionIconButton
                    tone="delete"
                    label={t("common.delete")}
                    onClick={() => requestDelete(d)}
                    loading={deletingId === d.id}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {modalMode && (
        <DepartmentModal
          mode={modalMode}
          dept={selected}
          onClose={() => { setModalMode(null); setSelected(null); }}
          onSuccess={handleSuccess}
        />
      )}

      {/* Delete confirm modal */}
      {confirmDel && (
        <Dialog open onOpenChange={() => setConfirmDel(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t("kpi.reference.departments.confirmDeleteTitle")}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-600 mt-2">
              {t("kpi.reference.departments.confirmDeleteMsg").replace("{name}", confirmDel.name)}
            </p>
            <p className="text-xs text-slate-400">{t("common.irreversible")}</p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setConfirmDel(null)}>
                {t("common.cancel")}
              </Button>
              <Button
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white"
                onClick={executeDelete}
              >
                {t("common.delete")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

type UserRole = "USER" | "IT" | "QMS" | "MR";
const PRIVILEGED_ROLES: UserRole[] = ["IT", "QMS", "MR"];
function isPrivileged(role: UserRole): boolean {
  return PRIVILEGED_ROLES.includes(role);
}

interface Props {
  role: UserRole;
  userId: string;
  userDepartmentId?: string | null;
}

const STATUS_CONFIG = {
  DRAFT:          { label: "Draft",          icon: null,          class: "bg-slate-50 text-slate-500 border-slate-200" },
  PENDING_REVIEW: { label: "Pending Review", icon: Clock,         class: "bg-amber-50 text-amber-600 border-amber-200" },
  APPROVED:       { label: "Approved ✓",     icon: CheckCircle2,  class: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  REJECTED:       { label: "Rejected ✕",     icon: null,          class: "bg-rose-50 text-rose-600 border-rose-200" },
} as const;

function RoleBanner({ role }: { role: UserRole }) {
  const t = useT();
  if (isPrivileged(role)) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <p className="text-sm text-emerald-700">
          <span className="font-semibold">{role}</span>{" — "}{t("kpi.rolePrivilegedDesc")}
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
      <p className="text-sm text-sky-700">{t("kpi.roleUserDesc")}</p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      <div className="divide-y divide-slate-100">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-4 py-3.5 animate-pulse flex gap-4 items-center">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 rounded w-36" />
            <Skeleton className="h-4 rounded w-24" />
            <Skeleton className="h-4 rounded w-24" />
            <Skeleton className="h-4 rounded w-24" />
            <Skeleton className="h-5 rounded w-24 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PersonCell({ name, icon: Icon }: { name: string | null | undefined; icon: React.ElementType }) {
  if (!name) return <span className="text-xs text-slate-300">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
      <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      {name}
    </span>
  );
}

export default function KpiObjectivesClient({ role, userDepartmentId }: Props) {
  const t = useT();
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const privileged = isPrivileged(role);

  // Per-row: privileged can create for any dept; USER only for their own dept
  // userDepartmentId is an Auth Center code; KpiDeptItem has authDeptCode field
  function canCreateKpiForDept(dept: Department): boolean {
    if (privileged) return true;
    if (!userDepartmentId) return false;
    const item = dept as { authDeptCode?: string };
    return item.authDeptCode === userDepartmentId || dept.id === userDepartmentId;
  }

  const { data: deptData, isLoading: deptLoading } = useKpiDepts();

  // Full dept list for management panel (same source, privileged only)
  const { data: allDeptsResp } = useQuery<{ data: Department[] }>({
    queryKey: ["kpi-depts-all"],
    queryFn: async () => {
      const res = await fetch("/api/kpi-dept");
      if (!res.ok) throw new Error("Failed to load departments");
      return res.json();
    },
    enabled: privileged,
  });

  const refreshDepts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["kpi-depts"] });
    queryClient.invalidateQueries({ queryKey: ["kpi-depts-all"] });
  }, [queryClient]);

  const { data: kpiResp, isLoading: kpiLoading } = useKpiList({ yearly: year, limit: 100 });

  const allDepts: Department[] = (deptData ?? []) as Department[];
  const allKpis = (kpiResp?.data ?? []) as KpiWithObjectives[];

  const createMutation = useCreateKpi();

  const visibleDepts = !privileged && userDepartmentId
    ? allDepts.filter(d => {
        const item = d as { authDeptCode?: string };
        return item.authDeptCode === userDepartmentId || d.id === userDepartmentId;
      })
    : allDepts;

  const kpiByDept = new Map<string, KpiWithObjectives>();
  for (const kpi of allKpis) {
    kpiByDept.set(kpi.department.toLowerCase(), kpi);
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const isLoading = deptLoading || kpiLoading;

  async function handleCreateKpi(deptName: string) {
    try {
      const created = await createMutation.mutateAsync({
        yearly: year,
        department: deptName,
        prepare: "",
        reviewer: "",
        approver: "",
      });
      router.push(`/qms/kpi/${created.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
    }
  }

  function handleRowClick(dept: Department) {
    const kpi = kpiByDept.get(dept.name.toLowerCase());
    if (kpi) {
      router.push(`/qms/kpi/${kpi.id}`);
    } else if (canCreateKpiForDept(dept)) {
      handleCreateKpi(dept.name);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("kpi.reference.title")}
        subtitle={String(year)}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="h-9 text-sm rounded-xl gap-1.5 bg-white border-slate-200"
              onClick={() => window.open(`/print/qms/kpi/fm-mr-01?year=${year}`, "_blank")}
            >
              <Printer className="w-4 h-4" />
              Print / PDF
            </Button>
            <Button
              variant="outline"
              className="h-9 text-sm rounded-xl gap-1.5 bg-white border-slate-200"
              onClick={() => window.open(`/api/kpi/export/fm-mr-01?year=${year}`, "_blank")}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Excel
            </Button>
            {privileged && (
              <Button
                className="h-9 text-sm rounded-xl gap-1.5 bg-[#0F1059] hover:bg-[#161875] text-white font-medium"
                onClick={() => router.push(`/print/qms/kpi/fm-mr-01?year=${year}&mode=review`)}
              >
                <FileText className="w-4 h-4" />
                Review
              </Button>
            )}
            <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
              <SelectTrigger className="w-28 rounded-xl text-sm h-9 bg-white border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <RoleBanner role={role} />

      {privileged && (
        <DepartmentPanel
          depts={allDeptsResp?.data ?? []}
          year={year}
          onRefresh={refreshDepts}
          onNavigateKpi={id => router.push(`/qms/kpi/${id}`)}
        />
      )}

      {isLoading ? (
        <TableSkeleton />
      ) : visibleDepts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-6">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-slate-400">
            <LayoutList className="w-6 h-6" />
          </div>
          <p className="text-slate-800 font-semibold text-base mb-1">{t("common.noData")}</p>
          <p className="text-slate-400 text-sm">{t("kpi.reference.table.empty")}</p>
        </div>
      ) : (
        <>
          {/* Desktop Table — shows all fields */}
          <div className="hidden lg:block bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("kpi.form.department")}</TableHead>
                  <TableHead className="text-center">{t("kpi.objective.table.objective")}</TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />{t("kpi.form.prepare")}
                    </span>
                  </TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5" />{t("kpi.form.reviewer")}
                    </span>
                  </TableHead>
                  <TableHead>
                    <span className="inline-flex items-center gap-1.5">
                      <UserCog className="w-3.5 h-3.5" />{t("kpi.form.approver")}
                    </span>
                  </TableHead>
                  <TableHead className="text-center">{t("kpi.form.year")}</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleDepts.map(dept => {
                  const kpi = kpiByDept.get(dept.name.toLowerCase());
                  const status = kpi?.status as keyof typeof STATUS_CONFIG | undefined;
                  const cfg = status ? STATUS_CONFIG[status] : null;
                  const objCount = kpi?.objectives?.length ?? 0;
                  const canCreate = canCreateKpiForDept(dept);
                  const isClickable = !!(kpi || canCreate);

                  return (
                    <TableRow
                      key={dept.id}
                      className={cn(
                        "transition-colors",
                        isClickable ? "hover:bg-slate-50 cursor-pointer" : "opacity-60 cursor-default",
                      )}
                      onClick={() => isClickable && handleRowClick(dept)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-sm font-semibold text-slate-800">{dept.name}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-center">
                        {kpi ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">
                            <FileText className="w-3 h-3" />{objCount}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <PersonCell name={kpi?.prepare} icon={User} />
                      </TableCell>

                      <TableCell>
                        <PersonCell name={kpi?.reviewer} icon={UserCheck} />
                      </TableCell>

                      <TableCell>
                        <PersonCell name={kpi?.approver} icon={UserCog} />
                      </TableCell>

                      <TableCell className="text-center">
                        {cfg ? (
                          <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border", cfg.class)}>
                            {cfg.icon && <cfg.icon className="w-3 h-3" />}
                            {cfg.label}
                          </span>
                        ) : canCreate ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs rounded-lg border-dashed border-slate-300 text-slate-400 hover:text-primary hover:border-primary"
                            onClick={e => { e.stopPropagation(); handleCreateKpi(dept.name); }}
                            disabled={createMutation.isPending}
                          >
                            <Plus className="w-3 h-3 mr-1" />{t("kpi.reference.add")}
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right">
                        {isClickable && <ChevronRight className="w-4 h-4 text-slate-300 inline-block" />}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards — shows all fields */}
          <div className="lg:hidden space-y-3">
            {visibleDepts.map(dept => {
              const kpi = kpiByDept.get(dept.name.toLowerCase());
              const status = kpi?.status as keyof typeof STATUS_CONFIG | undefined;
              const cfg = status ? STATUS_CONFIG[status] : null;
              const canCreate = canCreateKpiForDept(dept);
              const isClickable = !!(kpi || canCreate);

              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => handleRowClick(dept)}
                  disabled={!isClickable}
                  className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-4 hover:border-primary/30 transition-all group disabled:opacity-60"
                >
                  {/* Header row: dept name + status */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                      <p className="text-sm font-semibold text-slate-800 truncate">{dept.name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {cfg ? (
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border", cfg.class)}>
                          {cfg.icon && <cfg.icon className="w-3 h-3" />}
                          {cfg.label}
                        </span>
                      ) : canCreate ? (
                        <span className="text-xs text-slate-400">{t("kpi.reference.add")}</span>
                      ) : null}
                      {isClickable && (
                        <ChevronRight className="w-4 h-4 text-slate-300 transition-colors group-hover:text-primary" />
                      )}
                    </div>
                  </div>

                  {/* People fields */}
                  {kpi && (
                    <div className="grid grid-cols-1 gap-1.5 text-xs text-slate-500 border-t border-slate-50 pt-3">
                      <span className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-500 w-20 shrink-0">{t("kpi.form.prepare")}:</span>
                        <span className="text-slate-700">{kpi.prepare || "—"}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-500 w-20 shrink-0">{t("kpi.form.reviewer")}:</span>
                        <span className="text-slate-700">{kpi.reviewer || "—"}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <UserCog className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-500 w-20 shrink-0">{t("kpi.form.approver")}:</span>
                        <span className="text-slate-700">{kpi.approver || "—"}</span>
                      </span>
                      {(kpi.objectives?.length ?? 0) > 0 && (
                        <span className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-500 w-20 shrink-0">{t("kpi.objective.table.objective")}:</span>
                          <span className="text-slate-700">{kpi.objectives?.length}</span>
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Error state */}
      {!isLoading && !deptData && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-6">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-4 text-rose-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <p className="text-slate-800 font-semibold text-base mb-1">{t("error.title")}</p>
          <p className="text-slate-400 text-sm">{t("common.errorRetry")}</p>
        </div>
      )}
    </div>
  );
}
