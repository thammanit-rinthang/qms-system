"use client";

import { useState } from "react";
import { useLocale } from "@/lib/locale-context";
import { useT } from "@/lib/i18n";
import { useAuditLogs, buildExportUrl } from "@/hooks/api/use-audit-logs";
import type { AuditLogFilter } from "@/hooks/api/use-audit-logs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Pagination from "@/components/common/Pagination";

// ── Constants ──────────────────────────────────────────────────────────────────

const ACTIONS = ["CREATE", "UPDATE", "DELETE", "APPROVE", "REJECT", "RECALL", "SUBMIT", "REVIEW", "SYNC", "EXPORT", "ROLE_CHANGE"];
const RESOURCE_TYPES = ["KPI", "KPI_OBJECTIVE", "KPI_MONTHLY_REPORT", "DAR", "USER", "DOCUMENT", "DOCUMENT_CATEGORY"];

const ACTION_BADGE: Record<string, string> = {
  CREATE:      "bg-success/15 text-success",
  UPDATE:      "bg-info/15 text-info",
  DELETE:      "bg-error/15 text-error",
  APPROVE:     "bg-success/15 text-success",
  REJECT:      "bg-error/15 text-error",
  RECALL:      "bg-warning/15 text-warning",
  SUBMIT:      "bg-info/15 text-info",
  REVIEW:      "bg-info/15 text-info",
  SYNC:        "bg-slate-100 text-slate-500",
  EXPORT:      "bg-slate-100 text-slate-500",
  ROLE_CHANGE: "bg-warning/15 text-warning",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_BADGE[action] ?? "bg-slate-100 text-slate-500";
  return (
    <span className={`inline-block px-2 py-0.5 text-[11px] rounded-full font-bold ${cls}`}>
      {action}
    </span>
  );
}

function DetailModal({ row, onClose }: {
  row: { before: unknown; after: unknown; metadata: unknown; resourceId: string };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[80vh] overflow-auto p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#0F1059] text-base">Resource: {row.resourceId}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="space-y-4 text-[13px]">
          {row.before != null && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Before</p>
              <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-auto max-h-40 text-gray-700">
                {JSON.stringify(row.before, null, 2)}
              </pre>
            </div>
          )}
          {row.after != null && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">After</p>
              <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-auto max-h-40 text-gray-700">
                {JSON.stringify(row.after, null, 2)}
              </pre>
            </div>
          )}
          {row.metadata != null && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Metadata</p>
              <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-auto max-h-40 text-gray-700">
                {JSON.stringify(row.metadata, null, 2)}
              </pre>
            </div>
          )}
          {row.before == null && row.after == null && row.metadata == null && (
            <p className="text-gray-400 text-center py-4">No detail data recorded</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

const LIMIT = 50;

export default function AuditLogTable() {
  const t = useT();
  const locale = useLocale();

  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [detailRow, setDetailRow] = useState<null | {
    before: unknown; after: unknown; metadata: unknown; resourceId: string;
  }>(null);
  const [exporting, setExporting] = useState(false);

  const filter: AuditLogFilter = {
    page,
    limit: LIMIT,
    action:       action       || undefined,
    resourceType: resourceType || undefined,
    search:       search       || undefined,
    from:         from         || undefined,
    to:           to           || undefined,
  };

  const { data, isLoading, isError } = useAuditLogs(filter);

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / LIMIT) : 1;

  function resetFilters() {
    setAction("");
    setResourceType("");
    setSearch("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  function handleFilterChange() {
    setPage(1);
  }

  async function handleExport() {
    setExporting(true);
    try {
      const url = buildExportUrl({ action: action || undefined, resourceType: resourceType || undefined, search: search || undefined, from: from || undefined, to: to || undefined });
      const a = document.createElement("a");
      a.href = url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setTimeout(() => setExporting(false), 2000);
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgb(0,0,0,0.06)] p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Action filter */}
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); handleFilterChange(); }}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0F1059]/20"
          >
            <option value="">{t("it.auditLog.allActions")}</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>

          {/* Resource type filter */}
          <select
            value={resourceType}
            onChange={(e) => { setResourceType(e.target.value); handleFilterChange(); }}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0F1059]/20"
          >
            <option value="">{t("it.auditLog.allResources")}</option>
            {RESOURCE_TYPES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          {/* Search */}
          <Input
            placeholder="Search actor / resource ID"
            value={search}
            onChange={(e) => { setSearch(e.target.value); handleFilterChange(); }}
            className="h-9 text-[13px]"
          />

          {/* Date from */}
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); handleFilterChange(); }}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0F1059]/20"
          />

          {/* Date to */}
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); handleFilterChange(); }}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[13px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0F1059]/20"
          />

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetFilters} className="h-9 text-[13px] flex-1">
              Reset
            </Button>
            <Button
              size="sm"
              onClick={handleExport}
              disabled={exporting}
              className="h-9 text-[13px] flex-1 bg-[#0F1059] hover:bg-[#0F1059]/90 text-white"
            >
              {exporting ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  {t("it.auditLog.exporting")}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {t("it.auditLog.exportExcel")}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgb(0,0,0,0.06)] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
            <span className="w-5 h-5 mr-2 rounded-full border-2 border-gray-200 border-t-[#0F1059] animate-spin" />
            {t("common.loading")}
          </div>
        ) : isError ? (
          <div className="py-20 text-center text-error text-sm">{t("common.error")}</div>
        ) : rows.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-gray-500 font-medium">{t("it.auditLog.empty")}</p>
            <p className="text-gray-400 text-sm mt-1">{t("it.auditLog.emptyDesc")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 border-b border-gray-100">
                  <TableHead className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap w-44">
                    {t("it.auditLog.colDateTime")}
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    {t("it.auditLog.colActor")}
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-28">
                    {t("it.auditLog.colRole")}
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-32">
                    {t("it.auditLog.colAction")}
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-36">
                    {t("it.auditLog.colResourceType")}
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    {t("it.auditLog.colResourceId")}
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide w-20 text-center">
                    {t("it.auditLog.colDetails")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-gray-50/60 transition-colors border-b border-gray-50">
                    <TableCell className="text-[13px] text-gray-500 whitespace-nowrap py-3">
                      {new Date(row.createdAt).toLocaleString("th-TH", {
                        timeZone: "Asia/Bangkok",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="text-[13px] font-medium text-gray-900">{row.actorName ?? "—"}</div>
                      <div className="text-[11px] text-gray-400">{row.actorEmail}</div>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="inline-block px-2 py-0.5 text-[11px] rounded-full font-bold bg-slate-100 text-slate-500">
                        {row.actorRole}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <ActionBadge action={row.action} />
                    </TableCell>
                    <TableCell className="text-[13px] text-gray-600 py-3">
                      {row.resourceType}
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[12px] font-mono text-gray-500 break-all">
                        {row.resourceId.length > 20
                          ? `${row.resourceId.slice(0, 8)}…${row.resourceId.slice(-6)}`
                          : row.resourceId}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-center">
                      {(row.before != null || row.after != null || row.metadata != null) ? (
                        <button
                          onClick={() => setDetailRow({
                            before: row.before,
                            after: row.after,
                            metadata: row.metadata,
                            resourceId: row.resourceId,
                          })}
                          className="text-[#0F1059] hover:text-[#0F1059]/70 underline text-[12px]"
                        >
                          View
                        </button>
                      ) : (
                        <span className="text-gray-300 text-[12px]">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {meta && totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={meta.total}
          countLabel={locale === "th" ? "รายการ" : "records"}
          onPageChange={setPage}
        />
      )}

      {/* ── Detail Modal ── */}
      {detailRow && (
        <DetailModal row={detailRow} onClose={() => setDetailRow(null)} />
      )}
    </div>
  );
}
