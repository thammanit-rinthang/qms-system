"use client";

import { useState, useMemo, useEffect } from "react";
import { useT } from "@/lib/i18n";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AnnouncementRow } from "@/services/announcementService";
import AnnouncementsTable from "@/components/announcements/AnnouncementsTable";
import AnnouncementViewModal from "@/components/announcements/AnnouncementViewModal";
import AnnouncementEditModal from "@/components/announcements/AnnouncementEditModal";
import AnnouncementDeleteModal from "@/components/announcements/AnnouncementDeleteModal";
import AnnouncementCreateModal from "@/components/announcements/AnnouncementCreateModal";
import AnnouncementCard from "@/components/announcements/AnnouncementCard";
import PageHeader from "@/components/common/PageHeader";
import FilterBar from "@/components/common/FilterBar";
import { CheckCircle2, Megaphone, Plus, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/use-debounce";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { getErrorMessage } from "@/lib/error-message";

const PAGE_SIZE = 10;

type FilterStatus = "all" | "active" | "inactive" | "scrolling";

function getIsActive(a: AnnouncementRow): boolean {
  return a.status === "ACTIVE";
}

export default function AnnouncementsTableClient({ rows: initialRows }: { rows: AnnouncementRow[] }) {
  const t = useT();
  const queryClient = useQueryClient();

  const { data: rows = [] } = useQuery<AnnouncementRow[]>({
    queryKey: ["announcements"],
    queryFn: async () => {
      const res = await fetch("/api/announcements");
      const json = await res.json();
      return json.data ?? [];
    },
    initialData: initialRows,
  });

  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState<AnnouncementRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<AnnouncementRow | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<AnnouncementRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // ── URL-bound filters ──────────────────────────────────────────────────────
  const { params, rawValues, setParam } = useUrlFilters({
    keys: ["search", "status", "sort", "page"] as const,
    searchKey: "search",
    debounceMs: 300,
  });

  const filter = (params.status || "all") as FilterStatus;
  const sort   = params.sort || "newest";
  const debouncedSearch = useDebounce(rawValues.search, 300);
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));

  // Reset page to 1 whenever filter, sort or search changes
  useEffect(() => {
    setParam("page", "1");
  }, [filter, sort, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalCount = rows.length;
  const activeCount = useMemo(() => rows.filter(getIsActive).length, [rows]);
  const scrollingCount = useMemo(() => rows.filter((r: AnnouncementRow) => r.displayType === "SCROLLING").length, [rows]);

  // ── Filtered + sorted rows ────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    let result = rows;
    if (filter === "active") result = result.filter(getIsActive);
    else if (filter === "inactive") result = result.filter((r: AnnouncementRow) => !getIsActive(r));
    else if (filter === "scrolling") result = result.filter((r: AnnouncementRow) => r.displayType === "SCROLLING");
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (r: AnnouncementRow) =>
          r.title.toLowerCase().includes(q) ||
          r.sourceSystem.toLowerCase().includes(q) ||
          (r.createdByName ?? "").toLowerCase().includes(q),
      );
    }
    // Sort
    result = [...result].sort((a, b) => {
      if (sort === "oldest")     return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === "title_asc")  return a.title.localeCompare(b.title, "th");
      if (sort === "title_desc") return b.title.localeCompare(a.title, "th");
      if (sort === "status")     return (b.status === "ACTIVE" ? 1 : 0) - (a.status === "ACTIVE" ? 1 : 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // newest (default)
    });
    return result;
  }, [rows, filter, sort, debouncedSearch]);

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(
    () => filteredRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredRows, safePage],
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  function handleView(row: AnnouncementRow) { setViewItem(row); setViewOpen(true); }
  function handleEdit(row: AnnouncementRow) { setEditItem(row); setEditOpen(true); }
  function handleDelete(row: AnnouncementRow) { setDeleteItem(row); setDeleteModalOpen(true); }

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const res = await fetch(`/api/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(getErrorMessage(json.error, "Toggle failed"));
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast.success(t("announcement.updateSuccess"));
    },
    onError: (err: Error) => {
      toast.error(err.message ?? t("announcement.updateFail"));
    }
  });

  async function handleToggle(row: AnnouncementRow, active: boolean) {
    toggleMutation.mutate({ id: row.id, active });
  }

  function handleSaved(success: boolean, errorMessage?: string) {
    if (!success) { toast.error(getErrorMessage(errorMessage, t("announcement.updateFail"))); return; }
    setEditOpen(false);
    toast.success(t("announcement.updateSuccess"));
    queryClient.invalidateQueries({ queryKey: ["announcements"] });
  }

  function handleCreated(success: boolean, errorMessage?: string) {
    if (!success) { toast.error(getErrorMessage(errorMessage, t("announcement.createFail"))); return; }
    setCreateOpen(false);
    toast.success(t("announcement.createSuccess"));
    queryClient.invalidateQueries({ queryKey: ["announcements"] });
  }

  function handleDeleted(success: boolean, errorMessage?: string) {
    if (!success) { toast.error(getErrorMessage(errorMessage, t("announcement.deleteFail"))); return; }
    setDeleteModalOpen(false);
    toast.success(t("announcement.deleteSuccess"));
    queryClient.invalidateQueries({ queryKey: ["announcements"] });
  }

  // ── Filter tabs ────────────────────────────────────────────────────────────
  type TabDef = { key: FilterStatus; label: string; count: number };
  const filterTabs: TabDef[] = [
    { key: "all",       label: t("announcement.all"),            count: totalCount },
    { key: "active",    label: t("announcement.statusActive"),   count: activeCount },
    { key: "inactive",  label: t("announcement.statusInactive"), count: totalCount - activeCount },
    { key: "scrolling", label: "Scrolling",                      count: scrollingCount },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title={t("announcement.title")}
        subtitle="จัดการประกาศและข่าวสารของระบบ"
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="w-4 h-4" />
            {t("announcement.new")}
          </Button>
        }
      />

      {/* Stats row — 3 cols always, compact on mobile */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Total */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-3 sm:p-5 flex items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <Megaphone className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-bold text-slate-800 leading-none">{totalCount}</p>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-1 truncate">ประกาศทั้งหมด</p>
          </div>
        </div>

        {/* Active */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-3 sm:p-5 flex items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-bold text-emerald-600 leading-none">{activeCount}</p>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-1 truncate">{t("announcement.statusActive")}</p>
          </div>
        </div>

        {/* Scrolling */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-3 sm:p-5 flex items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-bold text-sky-600 leading-none">{scrollingCount}</p>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-1 truncate">Scrolling</p>
          </div>
        </div>
      </div>

      {/* FilterBar — search + sort */}
      <FilterBar
        searchValue={rawValues.search}
        onSearchChange={(v) => setParam("search", v)}
        searchPlaceholder="ค้นหาชื่อ, ระบบ, ผู้สร้าง..."
        hasActiveFilters={!!rawValues.search}
        onClearAll={() => setParam("search", "")}
        resultCount={filteredRows.length}
        totalCount={totalCount}
        countLabel="รายการ"
      >
        {/* Filter tabs */}
        <div className="flex-1 overflow-x-auto scrollbar-none self-end">
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-max">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setParam("status", tab.key === "all" ? "" : tab.key)}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  filter === tab.key
                    ? "bg-white shadow-sm text-primary"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
                <span className={`inline-flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full text-[10px] font-bold ${
                  filter === tab.key ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-500"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Sort select */}
        <select
          value={sort}
          onChange={(e) => setParam("sort", e.target.value)}
          className="h-8 shrink-0 self-end rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        >
          <option value="newest">ใหม่สุด</option>
          <option value="oldest">เก่าสุด</option>
          <option value="title_asc">ชื่อ A→Z</option>
          <option value="title_desc">ชื่อ Z→A</option>
          <option value="status">สถานะ</option>
        </select>
      </FilterBar>

      {/* Desktop: Table */}
      <div className="hidden lg:block bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <AnnouncementsTable
            rows={paginatedRows}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggle={handleToggle}
          />
        </div>
      </div>

      {/* Mobile: Cards */}
      <div className="lg:hidden space-y-3">
        {paginatedRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Megaphone className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-800 font-semibold text-base mb-1">{t("announcement.empty")}</p>
            <p className="text-slate-400 text-sm">{t("announcement.emptyDesc")}</p>
          </div>
        ) : (
          paginatedRows.map((row: AnnouncementRow) => (
            <AnnouncementCard
              key={row.id}
              row={row}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))
        )}
      </div>

      {/* Pagination — shared below both views */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <p className="text-sm text-slate-500">
            {safePage} / {totalPages}
            <span className="text-slate-400 ml-2">({filteredRows.length} รายการ)</span>
          </p>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 border-slate-200"
              disabled={safePage === 1}
              onClick={() => setParam("page", String(safePage - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium text-slate-700 px-2">
              {safePage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 border-slate-200"
              disabled={safePage >= totalPages}
              onClick={() => setParam("page", String(safePage + 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <AnnouncementViewModal item={viewItem} open={viewOpen} onClose={() => setViewOpen(false)} onEdit={(item) => { setViewOpen(false); handleEdit(item); }} />
      <AnnouncementEditModal item={editItem} open={editOpen} onClose={() => setEditOpen(false)} onSaved={handleSaved} />
      <AnnouncementDeleteModal item={deleteItem} open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} onDeleted={handleDeleted} />
      <AnnouncementCreateModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={handleCreated} />


    </div>
  );
}
