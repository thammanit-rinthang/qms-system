"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { DarSummary } from "@/types/dar";
import { OBJECTIVE_LABELS, DOC_TYPE_LABELS, DAR_STATUS_LABELS } from "@/types/dar";
import type { DarStatus, DarObjective, DarDocType } from "@/types/dar";
import DarListHeader from "@/components/dar/DarListHeader";
import DarExportPreviewModal from "../DarExportPreviewModal";
import DarTable from "@/components/dar/DarTable";
import DarCardList from "@/components/dar/DarCardList";
import DarModal from "@/components/dar/DarModal";
import DarEditModal from "@/components/dar/DarEditModal";
import FilterBar from "@/components/common/FilterBar";
import Pagination from "@/components/common/Pagination";
import EmptyState from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { useUrlFilters } from "@/hooks/use-url-filters";

type RequesterInfo = {
  name: string | null;
  employeeId: string | null;
  department: string | null;
  requestDate: string;
};

type Props = {
  dars: DarSummary[];
  requesterInfo: RequesterInfo;
};

type SortKey = "requestDate" | "darNo" | "status";
type SortDir = "asc" | "desc";

const OBJECTIVE_LABELS_EN: Record<DarObjective, string> = {
  PREPARE_NEW: "Prepare New Doc",
  REQUEST_COPY_CONTROLLED: "Copy (Controlled)",
  REQUEST_COPY_UNCONTROLLED: "Copy (Uncontrolled)",
  REVISE: "Revise",
  CANCEL: "Cancel Doc",
};

const DOC_TYPE_LABELS_EN: Record<DarDocType, string> = {
  MANUAL: "Manual (M)",
  FORMAT: "Format (FM)",
  DRAWING: "Drawing",
  PROCEDURE: "Procedure (P)",
  SOP: "SOP",
  SIP: "SIP",
  IPQC: "IPQC",
  OTHER: "Other",
};

export default function DarListClient({ dars: initialDars, requesterInfo }: Props) {
  const queryResult = useQuery<DarSummary[]>({
    queryKey: ["dars", "user"],
    queryFn: async () => {
      const res = await fetch("/api/dar");
      if (!res.ok) throw new Error(`Failed to fetch DARs: ${res.status}`);
      const json = await res.json();
      return (json.data ?? []) as DarSummary[];
    },
    initialData: initialDars,
  });
  const dars = (queryResult.data ?? []) as DarSummary[];

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [modalOpen, setModalOpen] = useState(() => searchParams.get("newRequest") === "1");
  const [editDarId, setEditDarId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("newRequest") === "1") {
      setModalOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("newRequest");
      const qs = params.toString();
      router.replace(pathname + (qs ? `?${qs}` : ""), { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [sortKey, setSortKey] = useState<SortKey>("requestDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false);

  const t = useT();
  const locale = useLocale();
  const isTh = locale === "th";

  // ── URL-bound filters (search debounced, others immediate) ─────────────────
  const { params, rawValues, setParam, clearAll, hasFilters } = useUrlFilters({
    keys: ["search", "status", "objective", "page", "year", "month", "from", "to"] as const,
    searchKey: "search",
    debounceMs: 300,
  });

  function objectiveLabel(key: DarObjective) {
    return isTh ? OBJECTIVE_LABELS[key] : OBJECTIVE_LABELS_EN[key];
  }

  function docTypeLabel(key: DarDocType) {
    return isTh ? DOC_TYPE_LABELS[key] : DOC_TYPE_LABELS_EN[key];
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const filtered = useMemo(() => {
    const q = params.search.trim().toLowerCase();
    return dars
      .filter((d: DarSummary) => {
        if (params.status && d.status !== (params.status as DarStatus)) return false;
        if (params.objective && d.objective !== (params.objective as DarObjective)) return false;

        // Year filter
        if (params.year) {
          const dYear = new Date(d.requestDate).getFullYear();
          if (dYear !== parseInt(params.year, 10)) return false;
        }

        // Month filter
        if (params.month) {
          const dMonth = new Date(d.requestDate).getMonth() + 1;
          if (dMonth !== parseInt(params.month, 10)) return false;
        }

        // Start Date filter
        if (params.from) {
          const fromDate = new Date(params.from);
          fromDate.setHours(0, 0, 0, 0);
          if (new Date(d.requestDate) < fromDate) return false;
        }

        // End Date filter
        if (params.to) {
          const toDate = new Date(params.to);
          toDate.setHours(23, 59, 59, 999);
          if (new Date(d.requestDate) > toDate) return false;
        }

        if (q) {
          const haystack = [
            d.darNo ?? "",
            objectiveLabel(d.objective),
            docTypeLabel(d.docType),
            DAR_STATUS_LABELS[d.status],
          ].join(" ").toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a: DarSummary, b: DarSummary) => {
        let cmp = 0;
        if (sortKey === "requestDate") cmp = new Date(a.requestDate).getTime() - new Date(b.requestDate).getTime();
        else if (sortKey === "darNo") cmp = (a.darNo ?? "").localeCompare(b.darNo ?? "");
        else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
        return sortDir === "asc" ? cmp : -cmp;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dars, params.search, params.status, params.objective, params.year, params.month, params.from, params.to, sortKey, sortDir, isTh]);

  const isAllEmpty = dars.length === 0;
  const isFilteredEmpty = !isAllEmpty && filtered.length === 0;

  // ── Client-side pagination ────────────────────────────────────────────────
  const PAGE_SIZE = 20;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const statusOptions = [
    { value: "DRAFT",           label: isTh ? "ฉบับร่าง"     : "Draft" },
    { value: "PENDING_REVIEW",  label: isTh ? "รอตรวจสอบ"    : "Pending Review" },
    { value: "PENDING_APPROVE", label: isTh ? "รออนุมัติ"     : "Pending Approve" },
    { value: "QMS_PROCESSING",  label: isTh ? "QMS ดำเนินการ" : "QMS Processing" },
    { value: "COMPLETED",       label: isTh ? "เสร็จสิ้น"     : "Completed" },
    { value: "CANCELLED",       label: isTh ? "ยกเลิก"        : "Cancelled" },
  ];

  const objectiveOptions = (Object.keys(OBJECTIVE_LABELS) as DarObjective[]).map((k) => ({
    value: k,
    label: objectiveLabel(k),
  }));

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = currentYear - i;
    return { value: String(y), label: isTh ? String(y + 543) : String(y) };
  });

  const monthOptions = [
    { value: "1", label: isTh ? "มกราคม" : "January" },
    { value: "2", label: isTh ? "กุมภาพันธ์" : "February" },
    { value: "3", label: isTh ? "มีนาคม" : "March" },
    { value: "4", label: isTh ? "เมษายน" : "April" },
    { value: "5", label: isTh ? "พฤษภาคม" : "May" },
    { value: "6", label: isTh ? "มิถุนายน" : "June" },
    { value: "7", label: isTh ? "กรกฎาคม" : "July" },
    { value: "8", label: isTh ? "สิงหาคม" : "August" },
    { value: "9", label: isTh ? "กันยายน" : "September" },
    { value: "10", label: isTh ? "ตุลาคม" : "October" },
    { value: "11", label: isTh ? "พฤศจิกายน" : "November" },
    { value: "12", label: isTh ? "ธันวาคม" : "December" },
  ];

  function handleExport() {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.objective) q.set("objective", params.objective);
    if (params.search) q.set("search", params.search);

    const currentParams = new URLSearchParams(window.location.search);
    for (const key of ["department", "user", "userId", "year", "month", "from", "to"]) {
      const val = currentParams.get(key);
      if (val) q.set(key, val);
    }

    window.location.href = `/api/dar/export?${q.toString()}`;
    setExportPreviewOpen(false);
  }

  return (
    <>
      <DarListHeader 
        onNewRequest={() => setModalOpen(true)} 
        onExport={() => setExportPreviewOpen(true)} 
      />

      {!isAllEmpty && (
        <FilterBar
          searchValue={rawValues.search}
          onSearchChange={(v) => setParam("search", v)}
          searchPlaceholder={isTh ? "ค้นหา DAR No., ประเภท..." : "Search DAR No., type..."}
          filters={[
            {
              key: "status",
              label: isTh ? "สถานะ" : "Status",
              options: statusOptions,
              allLabel: isTh ? "ทุกสถานะ" : "All Statuses",
            },
            {
              key: "objective",
              label: isTh ? "วัตถุประสงค์" : "Objective",
              options: objectiveOptions,
              allLabel: isTh ? "ทุกวัตถุประสงค์" : "All Objectives",
              minWidth: "12rem",
            },
            {
              key: "year",
              label: isTh ? "ปี" : "Year",
              options: yearOptions,
              allLabel: isTh ? "ทุกปี" : "All Years",
              minWidth: "6rem",
            },
            {
              key: "month",
              label: isTh ? "เดือน" : "Month",
              options: monthOptions,
              allLabel: isTh ? "ทุกเดือน" : "All Months",
              minWidth: "8rem",
            },
          ]}
          filterValues={{
            status: params.status,
            objective: params.objective,
            year: params.year,
            month: params.month,
          }}
          onFilterChange={setParam}
          hasActiveFilters={hasFilters}
          onClearAll={clearAll}
          clearLabel={isTh ? "ล้างตัวกรอง" : "Clear"}
          resultCount={filtered.length}
          totalCount={dars.length}
          countLabel={isTh ? "รายการ" : "items"}
        >
          <div className="flex items-center gap-2 flex-wrap self-end">
            <div className="flex flex-col">
              <span className="text-[11px] text-[#0F1059] font-bold mb-1">{isTh ? "วันที่เริ่มต้น" : "Start Date"}</span>
              <input
                type="date"
                className="h-8 px-2 border border-slate-200 rounded-lg text-[13px] outline-none bg-white text-slate-700 shadow-sm focus:border-[#0F1059] transition-all"
                value={params.from || ""}
                onChange={(e) => setParam("from", e.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-[#0F1059] font-bold mb-1">{isTh ? "วันที่สิ้นสุด" : "End Date"}</span>
              <input
                type="date"
                className="h-8 px-2 border border-slate-200 rounded-lg text-[13px] outline-none bg-white text-slate-700 shadow-sm focus:border-[#0F1059] transition-all"
                value={params.to || ""}
                onChange={(e) => setParam("to", e.target.value)}
              />
            </div>
          </div>
        </FilterBar>
      )}

      {isAllEmpty ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] pb-4">
          <EmptyState
            title={t("emptyDarUser")}
            description={t("emptyDarUserDesc")}
          />
        </div>
      ) : isFilteredEmpty ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] pb-8">
          <EmptyState
            title={isTh ? "ไม่พบผลลัพธ์" : "No results found"}
            description={isTh ? "ลองปรับตัวกรองหรือคำค้นหา" : "Try adjusting your filters or search term"}
          />
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={clearAll}>
              {isTh ? "ล้างตัวกรอง" : "Clear Filters"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <DarTable dars={paginated} onSort={toggleSort} sortKey={sortKey} sortDir={sortDir} onEdit={setEditDarId} />
          <DarCardList dars={paginated} onEdit={setEditDarId} />
          <Pagination
            page={safePage}
            totalPages={totalPages}
            total={filtered.length}
            countLabel={isTh ? "รายการ" : "items"}
            onPageChange={(p) => setParam("page", String(p))}
          />
        </>
      )}

      <DarModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        requesterInfo={requesterInfo}
      />

      <DarEditModal
        darId={editDarId}
        onClose={() => setEditDarId(null)}
      />

      <DarExportPreviewModal
        isOpen={exportPreviewOpen}
        onClose={() => setExportPreviewOpen(false)}
        items={filtered}
        onDownload={handleExport}
        isTh={isTh}
      />
    </>
  );
}
