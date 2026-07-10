"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { DarSummary } from "@/types/dar";
import { OBJECTIVE_LABELS, DOC_TYPE_LABELS, DAR_STATUS_LABELS } from "@/types/dar";
import type { DarStatus, DarObjective } from "@/types/dar";
import DarTable from "@/components/dar/DarTable";
import DarCardList from "@/components/dar/DarCardList";
import FilterBar from "@/components/common/FilterBar";
import PageHeader from "@/components/common/PageHeader";
import Pagination from "@/components/common/Pagination";
import EmptyState from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";
import { useUrlFilters } from "@/hooks/use-url-filters";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const OBJECTIVE_LABELS_EN: Record<DarObjective, string> = {
  PREPARE_NEW: "Prepare New Doc",
  REQUEST_COPY_CONTROLLED: "Copy (Controlled)",
  REQUEST_COPY_UNCONTROLLED: "Copy (Uncontrolled)",
  REVISE: "Revise",
  CANCEL: "Cancel Doc",
};

type StatusMeta = { label: string; labelKey: string; dot: string; count: string; active: string };

const STATUS_META: Record<DarStatus, StatusMeta> = {
  PENDING_REVIEW:  { label: "Pending Review",  labelKey: "dar.list.statusPendingReview",  dot: "bg-sky-400",     count: "text-sky-600",     active: "border-sky-300 bg-sky-50/50" },
  PENDING_APPROVE: { label: "Pending Approve", labelKey: "dar.list.statusPendingApprove", dot: "bg-violet-400",  count: "text-violet-600",  active: "border-violet-300 bg-violet-50/50" },
  QMS_PROCESSING:  { label: "QMS Processing",  labelKey: "dar.list.statusQmsProcessing",  dot: "bg-amber-400",   count: "text-amber-600",   active: "border-amber-300 bg-amber-50/50" },
  COMPLETED:       { label: "Completed",        labelKey: "dar.list.statusCompleted",      dot: "bg-emerald-400", count: "text-emerald-600", active: "border-emerald-300 bg-emerald-50/50" },
  CANCELLED:       { label: "Cancelled",        labelKey: "dar.list.statusCancelled",      dot: "bg-rose-300",    count: "text-rose-400",    active: "border-rose-200 bg-rose-50/40" },
  DRAFT:           { label: "Draft",            labelKey: "dar.list.statusDraft",          dot: "bg-slate-300",   count: "text-slate-500",   active: "border-slate-300 bg-slate-50" },
};

const ORDERED_STATUSES: DarStatus[] = [
  "PENDING_REVIEW", "PENDING_APPROVE", "QMS_PROCESSING", "COMPLETED", "CANCELLED", "DRAFT",
];

type SortKey = "requestDate" | "darNo" | "status";
type SortDir = "asc" | "desc";

export default function QmsDarListClient({ dars: initialDars }: { dars: DarSummary[] }) {
  const t = useT();
  const queryClient = useQueryClient();

  const queryResult = useQuery<DarSummary[]>({
    queryKey: ["dars", "all"],
    queryFn: async () => {
      const res = await fetch("/api/dar?all=true");
      const json = await res.json();
      return (json.data ?? []) as DarSummary[];
    },
    initialData: initialDars,
  });
  const dars = useMemo(() => (queryResult.data ?? []) as DarSummary[], [queryResult.data]);

  const [sortKey, setSortKey] = useState<SortKey>("requestDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [pendingDelete, setPendingDelete] = useState<{ id: string; darNo: string | null } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/dar/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Delete failed");
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dars"] });
      setPendingDelete(null);
      toast.success(t("dar.list.deleteSuccess"));
    },
    onError: (err: Error) => {
      setDeleteError(err.message ?? t("common.error"));
    },
    onSettled: () => setDeleting(false),
  });

  function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    deleteMutation.mutate(pendingDelete.id);
  }

  const { params, rawValues, setParam, clearAll, hasFilters } = useUrlFilters({
    keys: ["search", "status", "objective", "page"] as const,
    searchKey: "search",
    debounceMs: 300,
  });

  function objectiveLabel(key: DarObjective) {
    return OBJECTIVE_LABELS[key] ?? OBJECTIVE_LABELS_EN[key];
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const counts = useMemo(
    () => dars.reduce<Record<string, number>>((acc, d) => {
      acc[d.status] = (acc[d.status] ?? 0) + 1;
      return acc;
    }, {}),
    [dars],
  );

  const filtered = useMemo(() => {
    const q = params.search.trim().toLowerCase();
    return dars
      .filter((d) => {
        if (params.status && d.status !== (params.status as DarStatus)) return false;
        if (params.objective && d.objective !== (params.objective as DarObjective)) return false;
        if (q) {
          const haystack = [
            d.darNo ?? "",
            objectiveLabel(d.objective),
            (DOC_TYPE_LABELS as Record<string, string>)[d.docType] ?? d.docType,
            (DAR_STATUS_LABELS as Record<string, string>)[d.status] ?? d.status,
          ].join(" ").toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === "requestDate") cmp = new Date(a.requestDate).getTime() - new Date(b.requestDate).getTime();
        else if (sortKey === "darNo") cmp = (a.darNo ?? "").localeCompare(b.darNo ?? "");
        else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [dars, params.search, params.status, params.objective, sortKey, sortDir]);

  const isFilteredEmpty = dars.length > 0 && filtered.length === 0;

  const PAGE_SIZE = 20;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const statusOptions = ORDERED_STATUSES.map((s) => ({
    value: s,
    label: t(STATUS_META[s].labelKey),
  }));

  const objectiveOptions = (Object.keys(OBJECTIVE_LABELS) as DarObjective[]).map((k) => ({
    value: k,
    label: objectiveLabel(k),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dar.list.title")}
        subtitle={t("dar.list.subtitle")}
      />

      {/* Status count cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-6">
        {ORDERED_STATUSES.map((s) => {
          const meta = STATUS_META[s];
          const active = params.status === s;
          const count = counts[s] ?? 0;
          return (
            <button
              key={s}
              onClick={() => setParam("status", active ? "" : s)}
              className={[
                "rounded-xl px-3 py-3 text-left border transition-all duration-150",
                active ? meta.active : "bg-white border-slate-100 hover:border-slate-200",
              ].join(" ")}
            >
              <div className={`w-1.5 h-1.5 rounded-full mb-2.5 ${meta.dot}`} />
              <p className={`text-2xl font-semibold leading-none mb-1 ${active ? meta.count : "text-slate-700"}`}>
                {count}
              </p>
              <p className="text-[11px] text-slate-400 leading-snug">{t(meta.labelKey)}</p>
            </button>
          );
        })}
      </div>

      {dars.length > 0 && (
        <FilterBar
          searchValue={rawValues.search}
          onSearchChange={(v) => setParam("search", v)}
          searchPlaceholder={t("dar.list.search")}
          filters={[
            {
              key: "status",
              label: t("dar.list.filterStatus"),
              options: statusOptions,
              allLabel: t("dar.list.allStatuses"),
            },
            {
              key: "objective",
              label: t("dar.list.filterObjective"),
              options: objectiveOptions,
              allLabel: t("dar.list.allObjectives"),
              minWidth: "12rem",
            },
          ]}
          filterValues={{ status: params.status, objective: params.objective }}
          onFilterChange={setParam}
          hasActiveFilters={hasFilters}
          onClearAll={clearAll}
          clearLabel={t("dar.list.clearFilters")}
          resultCount={filtered.length}
          totalCount={dars.length}
          countLabel={t("dar.list.countLabel")}
        >
          <div className="flex items-center gap-1.5 self-end">
            <Select value={sortKey} onValueChange={(val) => setSortKey(val as SortKey)}>
              <SelectTrigger className="h-8 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="requestDate">{t("dar.list.sortDateLabel")}</SelectItem>
                <SelectItem value="darNo">{t("dar.list.sortDarNo")}</SelectItem>
                <SelectItem value="status">{t("dar.list.sortStatus")}</SelectItem>
              </SelectContent>
            </Select>
            <button
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-primary transition-colors"
              title={sortDir === "asc" ? t("dar.list.sortAsc") : t("dar.list.sortDesc")}
            >
              {sortDir === "asc" ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                </svg>
              )}
            </button>
          </div>
        </FilterBar>
      )}

      {dars.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <EmptyState
            title={t("dar.list.emptyTitle")}
            description={t("dar.list.emptyDesc")}
          />
        </div>
      ) : isFilteredEmpty ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] pb-8">
          <EmptyState
            title={t("dar.list.filteredEmptyTitle")}
            description={t("dar.list.filteredEmptyDesc")}
          />
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={clearAll}>
              {t("dar.list.filteredEmptyClear")}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <DarTable
            dars={paginated}
            onSort={toggleSort}
            sortKey={sortKey}
            sortDir={sortDir}
            onDelete={(id, darNo) => { setPendingDelete({ id, darNo }); setDeleteError(null); }}
          />
          <DarCardList dars={paginated} />
          <Pagination
            page={safePage}
            totalPages={totalPages}
            total={filtered.length}
            countLabel={t("dar.list.countLabel")}
            onPageChange={(p) => setParam("page", String(p))}
          />
        </>
      )}

      {/* Delete confirm dialog */}
      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open && !deleting) { setPendingDelete(null); setDeleteError(null); } }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <DialogTitle className="text-base">
                {t("dar.list.deleteConfirmTitle").replace("{darNo}", pendingDelete?.darNo ?? "")}
              </DialogTitle>
            </div>
          </DialogHeader>
          <p className="text-sm text-slate-600">{t("dar.list.deleteConfirmMsg")}</p>
          {deleteError && (
            <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{deleteError}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleting}
              onClick={() => { setPendingDelete(null); setDeleteError(null); }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              disabled={deleting}
              onClick={confirmDelete}
              className="bg-rose-600 text-white hover:bg-rose-700 gap-2"
            >
              {deleting && <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
              {t("dar.list.deleteConfirmYes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
