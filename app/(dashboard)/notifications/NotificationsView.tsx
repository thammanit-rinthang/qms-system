"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, CheckCheck, ExternalLink, Filter, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import { getModuleMeta } from "@/lib/module-colors";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  htmlBody?: string | null;
  module: string;
  resourceId: string;
  resourceType: string;
  isRead: boolean;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getActionPath(item: NotificationItem): string | null {
  if (item.module === "CAR") {
    if (item.title.includes("MR Review Required") || item.title.includes("รออนุมัติแผนแก้ไข"))
      return `/approve/car/${item.resourceId}/mr-response`;
    if (item.title.includes("Verification Passed") || item.title.includes("ผ่านการตรวจติดตาม"))
      return `/approve/car/${item.resourceId}/mr`;
    return `/car/${item.resourceId}`;
  }
  if (item.module === "DAR") {
    if (item.resourceType === "DAR_REVIEWER") return `/approve/dar/${item.resourceId}/reviewer`;
    if (item.resourceType === "DAR_APPROVER") return `/approve/dar/${item.resourceId}/approver`;
    return `/dar/${item.resourceId}`;
  }
  if (item.module === "KPI") {
    if (item.resourceType === "KPI_REVIEWER") return `/approve/kpi/${item.resourceId}/reviewer`;
    if (item.resourceType === "KPI_APPROVER") return `/approve/kpi/${item.resourceId}/approver`;
    if (item.resourceType === "KPI_MONTHLY_REVIEWER") return `/approve/kpi/${item.resourceId}/reviewer?type=kpi-monthly`;
    if (item.resourceType === "KPI_MONTHLY_APPROVER") return `/approve/kpi/${item.resourceId}/approver?type=kpi-monthly`;
    if (item.resourceType === "KPI_MONTHLY") return `/qms/kpi/monthly`;
    return `/qms/kpi/${item.resourceId}`;
  }
  if (item.module === "AUDIT") {
    if (item.resourceType === "AUDIT_APPOINTMENT") {
      if (item.title.startsWith("Signature Required"))  return `/approve/audit/appointments/${item.resourceId}/reviewer`;
      if (item.title.startsWith("Approval Required"))   return `/approve/audit/appointments/${item.resourceId}/approver`;
      return `/audit/appointments/${item.resourceId}`;
    }
    if (item.resourceType === "AUDIT_PLAN") {
      if (item.title.includes("Signature Required")) return `/approve/audit/${item.resourceId}/reviewer`;
      if (item.title.includes("Approval Required"))  return `/approve/audit/${item.resourceId}/approver`;
      return `/audit/plans/${item.resourceId}`;
    }
  }
  return null;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "เมื่อกี้";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d} วันที่แล้ว`;
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(dateStr));
}

function fullDate(dateStr: string): string {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "full", timeStyle: "short" }).format(new Date(dateStr));
}

// Body format:
//   line 0 — Thai intro
//   line 1 — English intro (no ":" = not a metadata row)
//   line 2+ — "Label: value" rows
function parseBody(body: string) {
  const lines = body.split("\n").filter(Boolean);
  const thLine   = lines[0] ?? "";
  const hasEnLine = lines.length > 1 && !lines[1].includes(":");
  const enLine   = hasEnLine ? lines[1] : "";
  const metaStart = hasEnLine ? 2 : 1;
  const rows = lines.slice(metaStart).map((line) => {
    const idx = line.indexOf(":");
    if (idx === -1) return { label: "", value: line };
    return { label: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
  });
  return { thLine, enLine, rows };
}

// ─── Detail card ──────────────────────────────────────────────────────────────

function HtmlFrame({ html, itemId }: { html: string; itemId: string }) {
  const [height, setHeight] = useState(600);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data?.notifFrameId === itemId) setHeight(e.data.height + 16);
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [itemId]);

  const srcDoc = [
    "<!DOCTYPE html><html><head><meta charset=\"utf-8\">",
    "<style>body{margin:0;padding:0;}</style></head><body>",
    html,
    "<script>",
    "function rh(){parent.postMessage({notifFrameId:" + JSON.stringify(itemId) + ",height:document.body.scrollHeight},\"*\");}",
    "window.addEventListener(\"load\",rh);",
    "new MutationObserver(rh).observe(document.body,{childList:true,subtree:true});",
    "<\/script></body></html>",
  ].join("");

  return (
    <iframe
      key={itemId}
      title="notification-html"
      srcDoc={srcDoc}
      sandbox="allow-same-origin allow-popups allow-scripts"
      className="w-full border-0 block"
      style={{ height, minHeight: 200 }}
    />
  );
}

function NotificationDetail({ item }: { item: NotificationItem }) {
  const mod = getModuleMeta(item.module);
  const actionPath = getActionPath(item);
  const { thLine, enLine, rows } = parseBody(item.body);

  const hasHtml = Boolean(item.htmlBody);

  return (
    <div className="flex flex-col gap-0">
      {/* Action bar */}
      <div className={cn("flex items-center justify-between gap-2 mb-3", hasHtml && "px-4 pt-4 sm:px-6 sm:pt-5")}>
        <p className="text-xs text-slate-400">{fullDate(item.createdAt)}</p>
        {actionPath && (
          <Link
            href={actionPath}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: mod.brand }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            เปิดรายการ
          </Link>
        )}
      </div>

      {/* HTML email template — fills full width, no extra border/wrapper */}
      {item.htmlBody ? (
        <HtmlFrame html={item.htmlBody} itemId={item.id} />
      ) : (
        /* Plain-text fallback for older notifications */
        <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-md">
          <div className="px-5 py-5 sm:px-7 sm:py-6" style={{ background: mod.brand }}>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/50">
              NDC Quality Management System
            </p>
            <div className="flex items-start justify-between gap-3">
              <h2 className="flex-1 text-base font-extrabold leading-snug text-white sm:text-lg">{item.title}</h2>
              <span className="shrink-0 rounded-full bg-white/20 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">{mod.label}</span>
            </div>
          </div>
          <div className="bg-white px-5 py-5 sm:px-7 sm:py-6">
            {thLine && (
              <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-sm font-medium leading-relaxed text-slate-800">{thLine}</p>
                {enLine && <p className="mt-1 text-xs italic leading-relaxed text-slate-500">{enLine}</p>}
              </div>
            )}
            {rows.length > 0 && (
              <div className="mb-5 overflow-hidden rounded-xl border border-slate-100">
                {rows.map((row, i) => (
                  <div key={i} className={cn("flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:items-baseline sm:gap-3", i < rows.length - 1 && "border-b border-slate-50")}>
                    {row.label && <span className="w-full shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:w-36">{row.label}</span>}
                    <span className="text-sm font-medium text-slate-800">{row.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-center text-[11px] text-slate-400">
            NDC Industrial Co., Ltd. — Quality Management System
          </div>
        </div>
      )}
    </div>
  );
}

// ─── List row ─────────────────────────────────────────────────────────────────

function NotifRow({
  n, isActive, isChecked, onSelect, onCheck, onDelete,
}: {
  n: NotificationItem;
  isActive: boolean;
  isChecked: boolean;
  onSelect: () => void;
  onCheck: (e: React.MouseEvent) => void;
  onDelete: () => void;
}) {
  const mod = getModuleMeta(n.module);
  const { thLine } = parseBody(n.body);

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer select-none items-start gap-2.5 rounded-xl p-3 transition-all",
        isActive
          ? "bg-[#0f1059] shadow-sm"
          : n.isRead
            ? "bg-white hover:bg-slate-50"
            : "border-l-2 border-[#0f1059] bg-white hover:bg-blue-50/40"
      )}
      onClick={onSelect}
    >
      <input
        type="checkbox"
        checked={isChecked}
        onClick={onCheck}
        onChange={() => {}}
        className="mt-1 h-3.5 w-3.5 shrink-0 cursor-pointer rounded accent-[#0f1059]"
      />
      <span className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", isActive ? "bg-white/50" : mod.dot)} />
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-1.5">
          <span className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
            isActive ? "bg-white/20 text-white" : cn(mod.bg, mod.text)
          )}>
            {mod.label}
          </span>
          <span className={cn("text-[10px]", isActive ? "text-white/50" : "text-slate-400")}>
            {relativeTime(n.createdAt)}
          </span>
        </div>
        <p className={cn("truncate text-xs font-semibold leading-snug", isActive ? "text-white" : "text-slate-900")}>
          {n.title}
        </p>
        <p className={cn("mt-0.5 line-clamp-2 text-[11px] leading-relaxed", isActive ? "text-white/65" : "text-slate-500")}>
          {thLine}
        </p>
      </div>
      {!n.isRead && !isActive && (
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0f1059]" />
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className={cn(
          "absolute right-2 top-2 rounded-lg p-1 opacity-0 transition-opacity group-hover:opacity-100",
          isActive
            ? "text-white/50 hover:bg-white/10 hover:text-white"
            : "text-slate-300 hover:bg-red-50 hover:text-red-500"
        )}
        title="ลบ"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsView() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();

  const [selected, setSelected]         = useState<NotificationItem | null>(null);
  const [showDetail, setShowDetail]     = useState(false);
  const [unreadOnly, setUnreadOnly]     = useState(false);
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [checkedIds, setCheckedIds]     = useState<Set<string>>(new Set());

  const { data: raw, isLoading } = useQuery<{ data: { notifications: NotificationItem[]; unreadCount: number } }>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    refetchInterval: 30000,
  });
  const all         = raw?.data?.notifications ?? [];
  const unreadCount = raw?.data?.unreadCount   ?? 0;

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch("/api/notifications/read-all", { method: "PATCH" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const deleteOne = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    },
    onSuccess: (_d, id) => {
      if (selected?.id === id) { setSelected(null); setShowDetail(false); }
      setCheckedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
  const deleteBulk = useMutation({
    mutationFn: async (ids: string[]) => {
      await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    },
    onSuccess: (_d, ids) => {
      if (selected && ids.includes(selected.id)) { setSelected(null); setShowDetail(false); }
      setCheckedIds(new Set());
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const filtered = all.filter((n) => {
    if (unreadOnly && n.isRead) return false;
    if (moduleFilter !== "ALL" && n.module !== moduleFilter) return false;
    return true;
  });

  function handleSelect(item: NotificationItem) {
    setSelected(item);
    setShowDetail(true);
    if (!item.isRead) markRead.mutate(item.id);
  }

  useEffect(() => {
    const id = searchParams.get("select");
    if (!id || !all.length || selected) return;
    const match = all.find((n) => n.id === id);
    if (match) handleSelect(match);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, searchParams]);

  function toggleCheck(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setCheckedIds((prev) => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  }

  const allFilteredChecked = filtered.length > 0 && filtered.every((n) => checkedIds.has(n.id));
  function toggleCheckAll() {
    if (allFilteredChecked) {
      setCheckedIds((prev) => { const s = new Set(prev); filtered.forEach((n) => s.delete(n.id)); return s; });
    } else {
      setCheckedIds((prev) => { const s = new Set(prev); filtered.forEach((n) => s.add(n.id)); return s; });
    }
  }

  const modules      = [...new Set(all.map((n) => n.module))];
  const checkedCount = [...checkedIds].filter((id) => filtered.some((n) => n.id === id)).length;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">

      <PageHeader title="การแจ้งเตือน" subtitle="Notifications" className="shrink-0 mb-3 mx-4 mt-4" />

      {/* ── Top bar ── */}
      <div className="shrink-0 border-b border-slate-100 bg-white">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2">
            {/* Back button on mobile when detail is open */}
            {showDetail && (
              <button
                onClick={() => setShowDetail(false)}
                className="flex items-center rounded-lg p-1 text-slate-500 hover:bg-slate-100 md:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <Bell className="h-4 w-4 text-[#0f1059]" />
            {unreadCount > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {unreadCount}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {checkedCount > 0 && (
              <button
                onClick={() => deleteBulk.mutate([...checkedIds].filter((id) => filtered.some((n) => n.id === id)))}
                disabled={deleteBulk.isPending}
                className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">ลบที่เลือก</span>
                <span>({checkedCount})</span>
              </button>
            )}

            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
              <Filter className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-700 focus:outline-none"
              >
                <option value="ALL">ทุกระบบ</option>
                {modules.map((m) => (
                  <option key={m} value={m}>{getModuleMeta(m).label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setUnreadOnly((v) => !v)}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                unreadOnly
                  ? "border-[#0f1059] bg-[#0f1059] text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              ยังไม่อ่าน
            </button>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">อ่านทั้งหมด</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* List pane: full-width on mobile, 320px on md+ */}
        <div className={cn(
          "shrink-0 overflow-y-auto border-r border-slate-100 bg-slate-50/60",
          "w-full md:w-80",
          showDetail ? "hidden md:block" : "block"
        )}>
          {isLoading && (
            <div className="flex flex-col gap-2 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-2 rounded-xl bg-white p-3">
                  <div className="h-3 w-16 rounded bg-slate-200" />
                  <div className="h-3.5 w-full rounded bg-slate-200" />
                  <div className="h-3 w-2/3 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-20 text-slate-400">
              <Bell className="h-10 w-10 opacity-20" />
              <p className="text-sm">ไม่มีการแจ้งเตือน</p>
            </div>
          )}

          {!isLoading && filtered.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-3 pb-1 pt-2.5">
                <input
                  type="checkbox"
                  checked={allFilteredChecked}
                  onChange={toggleCheckAll}
                  className="h-3.5 w-3.5 cursor-pointer rounded accent-[#0f1059]"
                />
                <span className="text-[11px] text-slate-400">เลือกทั้งหมด ({filtered.length})</span>
              </div>
              <div className="flex flex-col gap-0.5 p-2 pt-0.5">
                {filtered.map((n) => (
                  <NotifRow
                    key={n.id}
                    n={n}
                    isActive={selected?.id === n.id}
                    isChecked={checkedIds.has(n.id)}
                    onSelect={() => handleSelect(n)}
                    onCheck={(e) => toggleCheck(n.id, e)}
                    onDelete={() => deleteOne.mutate(n.id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Detail pane */}
        <div className={cn(
          "flex-1 overflow-y-auto bg-slate-100/80",
          showDetail ? "block" : "hidden md:block"
        )}>
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-300">
              <Bell className="h-16 w-16 opacity-15" />
              <p className="text-sm">เลือกการแจ้งเตือนเพื่อดูรายละเอียด</p>
            </div>
          ) : (
            <div className={cn(selected.htmlBody ? "p-0" : "mx-auto max-w-2xl p-4 sm:p-6")}>
              <NotificationDetail item={selected} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
