"use client";

import { useState, useMemo, useRef } from "react";
import type { UserWithDept } from "@/types/user";
import type { UserRole } from "@/generated/prisma/client";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/lib/locale-context";
import Toast from "@/components/common/Toast";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FilterBar from "@/components/common/FilterBar";
import Pagination from "@/components/common/Pagination";
import { useUrlFilters } from "@/hooks/use-url-filters";

export type AuthCenterUserRow = {
  authUserId: string;
  localUserId: string | null;
  name: string | null;
  email: string;
  employeeId: string | null;
  position?: string | null;
  role: string;
  roleConflict: boolean;
  grantId: string | null;
  department: { id: string | null; name: string } | null;
  localDepartmentId: string | null;
  jobTitle: string | null;
  m365Linked?: boolean;
  source: "auth_center";
  // legacy compat shims so shared filtering works
  msUserId?: null;
  id?: string;
  createdAt?: string;
};

const ROLE_LABELS_TH: Record<UserRole, string> = {
  USER: "ผู้ใช้งาน",
  QMS:  "เจ้าหน้าที่ QMS",
  MR:   "ผู้แทนฝ่ายบริหาร",
  IT:   "เจ้าหน้าที่ IT",
};
const ROLE_LABELS_EN: Record<UserRole, string> = {
  USER: "User",
  QMS:  "QMS Officer",
  MR:   "Management Rep.",
  IT:   "IT Officer",
};
const ROLE_BADGE: Record<UserRole, string> = {
  USER: "inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-slate-100 text-slate-500",
  QMS:  "inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-info/15 text-info",
  MR:   "inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-warning/15 text-warning",
  IT:   "inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-success/15 text-success",
};

type SortKey = "name" | "email" | "employeeId" | "role" | "department" | "createdAt";
type SortDir = "asc" | "desc";
type Department = { id: string; name: string };
type AnyUser = UserWithDept | AuthCenterUserRow;
type Props = { users: AnyUser[]; departments: Department[]; authCenterMode?: boolean };

function IconSort({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 9l4-4 4 4M16 15l-4 4-4-4" />
    </svg>
  );
  return dir === "asc" ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  );
}
function IconUpload({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function IconCheck({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function IconPencil({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function resolveUserId(user: AnyUser): string {
  if ("localUserId" in user) return user.authUserId;
  return user.id;
}

function buildPatchBody(
  user: AnyUser,
  patch: { role?: UserRole; departmentId?: string | null; departmentName?: string | null; employeeId?: string | null },
) {
  if ("localUserId" in user) {
    return {
      ...patch,
      authUserId: user.authUserId,
      localUserId: user.localUserId ?? undefined,
    };
  }
  return patch;
}

function getPosition(user: AnyUser): string | null {
  if ("jobTitle" in user) return user.jobTitle ?? user.position ?? null;
  return user.position ?? null;
}

function isM365Linked(user: AnyUser): boolean {
  if ("localUserId" in user) return user.m365Linked === true;
  return Boolean(user.msUserId);
}

export default function ItUserTable({ users, departments, authCenterMode = false }: Props) {
  const locale = useLocale();
  const { toast, showToast, hideToast } = useToast();
  const router = useRouter();

  const ROLE_LABELS = locale === "th" ? ROLE_LABELS_TH : ROLE_LABELS_EN;

  const t = {
    searchLabel:        locale === "th" ? "ค้นหา"                                 : "Search",
    searchPlaceholder:  locale === "th" ? "ชื่อ, อีเมล, รหัสพนักงาน..."           : "Name, email, employee ID...",
    roleLabel:          locale === "th" ? "Role"                                   : "Role",
    allRoles:           locale === "th" ? "ทุก Role"                               : "All Roles",
    deptLabel:          locale === "th" ? "แผนก"                                   : "Department",
    allDepts:           locale === "th" ? "ทุกแผนก"                               : "All Departments",
    m365Label:          "M365",
    allM365:            locale === "th" ? "ทั้งหมด"                               : "All",
    m365Yes:            locale === "th" ? "เชื่อมแล้ว"                            : "Linked",
    m365No:             locale === "th" ? "ยังไม่เชื่อม"                          : "Not Linked",
    clearFilter:        locale === "th" ? "ล้างตัวกรอง"                           : "Clear Filters",
    countSuffix:        (n: number, total: number) =>
      locale === "th" ? `${n} / ${total} คน` : `${n} / ${total} users`,
    selectedCount:      (n: number) =>
      locale === "th" ? `เลือกแล้ว ${n} คน` : `${n} selected`,
    bulkUpdate:         (n: number) =>
      locale === "th" ? `อัปเดต M365 ทั้งหมดที่เลือก (${n} คน)` : `Update M365 for selected (${n})`,
    bulkUpdating:       locale === "th" ? "กำลังอัปเดต M365..."    : "Updating M365...",
    cancelSelect:       locale === "th" ? "ยกเลิก"                 : "Cancel",
    colName:            locale === "th" ? "ชื่อ"                   : "Name",
    colEmail:           locale === "th" ? "อีเมล"                  : "Email",
    colEmpId:           locale === "th" ? "รหัสพนักงาน"            : "Employee ID",
    colPosition:        locale === "th" ? "ตำแหน่ง"               : "Position",
    colM365:            "M365",
    colRole:            "Role",
    colChangeRole:      locale === "th" ? "เปลี่ยน Role"           : "Change Role",
    colDept:            locale === "th" ? "แผนก"                   : "Department",
    colUpdateM365:      locale === "th" ? "อัปเดต M365"            : "Update M365",
    noUsers:            locale === "th" ? "ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข" : "No users match the filter",
    noM365:             locale === "th" ? "ไม่มี M365"             : "No M365",
    unlinked:           "—",
    linked:             locale === "th" ? "เชื่อม"                 : "Linked",
    empIdNone:          locale === "th" ? "ไม่ระบุ"               : "None",
    empIdEdit:          locale === "th" ? "คลิกเพื่อแก้ไข"         : "Click to edit",
    noDept:             locale === "th" ? "— ไม่ระบุ —"            : "— None —",
    noDeptMobile:       locale === "th" ? "— ไม่ระบุแผนก —"        : "— No Department —",
    updateOk:           locale === "th" ? "อัปเดตข้อมูลสำเร็จ"     : "Updated successfully",
    updateFail:         locale === "th" ? "เกิดข้อผิดพลาด"          : "An error occurred",
    updateFailRetry:    locale === "th" ? "เกิดข้อผิดพลาด กรุณาลองใหม่" : "An error occurred, please try again",
    m365UpdateOk:       locale === "th" ? "อัปเดตไปยัง Microsoft 365 สำเร็จ" : "Synced to Microsoft 365",
    m365UpdateFail:     locale === "th" ? "อัปเดต M365 ไม่สำเร็จ"  : "M365 update failed",
    m365ConnectFail:    locale === "th" ? "ไม่สามารถเชื่อมต่อได้"   : "Connection failed",
    noM365Selected:     locale === "th" ? "ไม่มีผู้ใช้ที่เชื่อม M365 ในรายการที่เลือก" : "No M365-linked users in selection",
    bulkOk:             (ok: number) =>
      locale === "th" ? `อัปเดต ${ok} คน ไปยัง M365 สำเร็จ` : `Synced ${ok} user(s) to M365`,
    bulkPartial:        (ok: number, fail: number) =>
      locale === "th" ? `สำเร็จ ${ok} คน, ล้มเหลว ${fail} คน` : `${ok} succeeded, ${fail} failed`,
    sending:            locale === "th" ? "กำลังส่ง..."    : "Sending...",
    updateBtn:          locale === "th" ? "อัปเดต"         : "Update",
    successBtn:         locale === "th" ? "สำเร็จ"         : "Success",
    sendingMobile:      locale === "th" ? "กำลังส่ง M365..."       : "Sending to M365...",
    successMobile:      locale === "th" ? "M365 สำเร็จ"            : "M365 Success",
    updateMobile:       locale === "th" ? "อัปเดตไปยัง M365"       : "Update to M365",
    m365StatusYes:      locale === "th" ? "เชื่อมแล้ว"   : "Linked",
    m365StatusNo:       locale === "th" ? "ยังไม่เชื่อม"  : "Not linked",
    deptMobile:         locale === "th" ? "แผนก"           : "Dept.",
    checkboxTitle:      locale === "th" ? "เลือกทั้งหมดที่เชื่อม M365" : "Select all M365-linked",
  };

  const [patchingId, setPatchingId] = useState<string | null>(null);
  const [pushingId, setPushingId]   = useState<string | null>(null);
  const [pushedIds, setPushedIds]   = useState<Set<string>>(new Set());

  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [empIdDraft, setEmpIdDraft]     = useState("");
  const empIdRef = useRef<HTMLInputElement>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkPushing, setBulkPushing] = useState(false);

  // ── URL-bound filters (search debounced, others immediate) ─────────────────
  const { params, rawValues, setParam, clearAll, hasFilters } = useUrlFilters({
    keys: ["search", "role", "dept", "ms365", "page"] as const,
    searchKey: "search",
    debounceMs: 300,
  });
  const search      = params.search;
  const filterRole  = params.role as UserRole | "";
  const filterDept  = params.dept;
  const filterMs365 = params.ms365 as "" | "yes" | "no";

  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter((u) => {
      if (q && ![u.name, u.email, u.employeeId, getPosition(u)].join(" ").toLowerCase().includes(q)) return false;
      if (filterRole && u.role !== filterRole) return false;
      if (filterDept && u.department?.id !== filterDept) return false;
      if (filterMs365 === "yes" && !isM365Linked(u)) return false;
      if (filterMs365 === "no" && isM365Linked(u)) return false;
      return true;
    });
  }, [users, search, filterRole, filterDept, filterMs365]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va: string, vb: string;
      switch (sortKey) {
        case "name":       va = a.name ?? "";             vb = b.name ?? "";             break;
        case "email":      va = a.email ?? "";             vb = b.email ?? "";            break;
        case "employeeId": va = a.employeeId ?? "";       vb = b.employeeId ?? "";       break;
        case "role":       va = a.role;                   vb = b.role;                   break;
        case "department": va = a.department?.name ?? ""; vb = b.department?.name ?? ""; break;
        case "createdAt":  va = ("createdAt" in a ? a.createdAt : "") ?? ""; vb = ("createdAt" in b ? b.createdAt : "") ?? ""; break;
      }
      return sortDir === "asc" ? va.localeCompare(vb, "th") : vb.localeCompare(va, "th");
    });
  }, [filtered, sortKey, sortDir]);

  const m365Ids = useMemo(
    () => new Set(sorted.filter((u) => !authCenterMode && isM365Linked(u)).map((u) => resolveUserId(u))),
    [authCenterMode, sorted],
  );
  const allChecked = m365Ids.size > 0 && [...m365Ids].every((id) => selected.has(id));

  // ── Client-side pagination ────────────────────────────────────────────────
  const PAGE_SIZE = 25;
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedSorted = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function toggleAll() {
    setSelected((prev) => {
      const s = new Set(prev);
      if (allChecked) { m365Ids.forEach((id) => s.delete(id)); }
      else { m365Ids.forEach((id) => s.add(id)); }
      return s;
    });
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) { s.delete(id); } else { s.add(id); }
      return s;
    });
  }

  async function patchUser(user: AnyUser, patch: { role?: UserRole; departmentId?: string | null; departmentName?: string | null; employeeId?: string | null }) {
    const uid = resolveUserId(user);
    setPatchingId(uid);
    try {
      const res = await fetch(`/api/it/users/${uid}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPatchBody(user, patch)),
      });
      const json = await res.json();
      if (!res.ok || json.error) { showToast("error", json.error ?? t.updateFail); return; }
      showToast("success", t.updateOk);
      router.refresh();
    } catch {
      showToast("error", t.updateFailRetry);
    } finally {
      setPatchingId(null);
    }
  }

  function startEditEmpId(user: AnyUser, current: string | null) {
    setEditingEmpId(resolveUserId(user));
    setEmpIdDraft(current ?? "");
    setTimeout(() => empIdRef.current?.focus(), 30);
  }
  async function commitEmpId(user: AnyUser) {
    const uid = resolveUserId(user);
    const val = empIdDraft.trim();
    setEditingEmpId(null);
    const orig = users.find((u) => resolveUserId(u) === uid)?.employeeId ?? "";
    if (val === orig) return;
    await patchUser(user, { employeeId: val || null });
  }

  async function pushToM365(user: AnyUser) {
    const uid = resolveUserId(user);
    setPushingId(uid);
    try {
      const res = await fetch(`/api/it/users/${uid}/push-to-m365`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || json.error) { showToast("error", json.error ?? t.m365UpdateFail); return; }
      showToast("success", t.m365UpdateOk);
      setPushedIds((p) => new Set(p).add(uid));
      setTimeout(() => setPushedIds((p) => { const s = new Set(p); s.delete(uid); return s; }), 2500);
    } catch {
      showToast("error", t.m365ConnectFail);
    } finally {
      setPushingId(null);
    }
  }

  async function bulkPush() {
    const ids = [...selected].filter((id) => m365Ids.has(id));
    if (!ids.length) { showToast("error", t.noM365Selected); return; }
    setBulkPushing(true);
    let ok = 0, fail = 0;
    await Promise.all(ids.map(async (id) => {
      try {
        const res = await fetch(`/api/it/users/${id}/push-to-m365`, { method: "POST" });
        const json = await res.json();
        if (res.ok && !json.error) { ok++; setPushedIds((p) => new Set(p).add(id)); }
        else fail++;
      } catch { fail++; }
    }));
    setBulkPushing(false);
    setSelected(new Set());
    showToast(
      fail === 0 ? "success" : "error",
      fail === 0 ? t.bulkOk(ok) : t.bulkPartial(ok, fail),
    );
    setTimeout(() => setPushedIds(new Set()), 3000);
  }

  const isBusy = (id: string) => patchingId === id || pushingId === id;

  function thSort(label: string, colKey: SortKey) {
    return (
      <TableHead className="cursor-pointer" onClick={() => toggleSort(colKey)}>
        <span className="flex items-center gap-1">{label}<IconSort active={sortKey === colKey} dir={sortDir} /></span>
      </TableHead>
    );
  }

  return (
    <>
      {/* Filter bar */}
      <FilterBar
        searchValue={rawValues.search}
        onSearchChange={(v) => setParam("search", v)}
        searchPlaceholder={t.searchPlaceholder}
        searchLabel={t.searchLabel}
        filters={[
          {
            key: "role",
            label: t.roleLabel,
            options: (Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([k, v]) => ({ value: k, label: v })),
            allLabel: t.allRoles,
            minWidth: "10rem",
          },
          {
            key: "dept",
            label: t.deptLabel,
            options: departments.map((d) => ({ value: d.id, label: d.name })),
            allLabel: t.allDepts,
            minWidth: "11rem",
          },
          {
            key: "ms365",
            label: t.m365Label,
            options: [
              { value: "yes", label: t.m365Yes },
              { value: "no",  label: t.m365No  },
            ],
            allLabel: t.allM365,
            minWidth: "9rem",
          },
        ]}
        filterValues={{ role: params.role, dept: params.dept, ms365: params.ms365 }}
        onFilterChange={setParam}
        hasActiveFilters={hasFilters}
        onClearAll={clearAll}
        clearLabel={t.clearFilter}
        resultCount={sorted.length}
        totalCount={users.length}
        countLabel={locale === "th" ? "คน" : "users"}
      />

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-4 mb-6 flex items-center gap-3 flex-wrap">
          <span className="text-[13px] text-primary font-medium">{t.selectedCount(selected.size)}</span>
          <Button size="sm" className="gap-2 ml-auto" onClick={bulkPush} disabled={bulkPushing}>
            {bulkPushing
              ? <><span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5 inline-block" />{t.bulkUpdating}</>
              : <><IconUpload className="w-4 h-4" />{t.bulkUpdate([...selected].filter((id) => m365Ids.has(id)).length)}</>
            }
          </Button>
          <Button variant="ghost" size="sm" className="text-[13px]" onClick={() => setSelected(new Set())}>{t.cancelSelect}</Button>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block card-premium overflow-x-auto border border-slate-100 rounded-xl shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-100">
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500"
                  checked={allChecked}
                  disabled={m365Ids.size === 0}
                  onChange={toggleAll}
                  title={t.checkboxTitle}
                />
              </TableHead>
              {thSort(t.colName, "name")}
              {thSort(t.colEmail, "email")}
              {thSort(t.colEmpId, "employeeId")}
              <TableHead>{t.colPosition}</TableHead>
              <TableHead>{t.colM365}</TableHead>
              {thSort(t.colRole, "role")}
              <TableHead>{t.colChangeRole}</TableHead>
              {thSort(t.colDept, "department")}
              <TableHead className="text-center">{t.colUpdateM365}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="py-12 text-center text-xs md:text-sm text-gray-500">{t.noUsers}</TableCell></TableRow>
            ) : paginatedSorted.map((user) => {
              const uid = resolveUserId(user);
              const m365Linked = isM365Linked(user);
              const roleSafe = (user.role in ROLE_BADGE ? user.role : "USER") as UserRole;
              return (
              <TableRow key={uid} className={`transition-colors duration-100 ${selected.has(uid) ? "bg-primary/5" : "hover:bg-slate-100"}`}>
                <TableCell>
                  {!authCenterMode && m365Linked
                    ? <input type="checkbox" className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500" checked={selected.has(uid)} onChange={() => toggleOne(uid)} />
                    : <span className="w-4 h-4 block" />}
                </TableCell>

                <TableCell className="text-xs md:text-sm font-semibold">{user.name ?? "—"}</TableCell>
                <TableCell className="text-[11px] md:text-xs text-gray-500">{user.email}</TableCell>

                {/* Inline employeeId */}
                <TableCell>
                  {editingEmpId === uid ? (
                    <Input
                      ref={empIdRef}
                      type="text"
                      className="h-7 px-2 w-24 text-[13px]"
                      value={empIdDraft}
                      maxLength={16}
                      onChange={(e) => setEmpIdDraft(e.target.value)}
                      onBlur={() => commitEmpId(user)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEmpId(user);
                        if (e.key === "Escape") setEditingEmpId(null);
                      }}
                    />
                  ) : (
                    <button
                      className="flex items-center gap-1 group text-neutral hover:text-base-content"
                      onClick={() => startEditEmpId(user, user.employeeId)}
                      disabled={isBusy(uid)}
                      title={t.empIdEdit}
                    >
                      <span className="text-[13px]">
                        {user.employeeId ?? <span className="italic opacity-40">{t.empIdNone}</span>}
                      </span>
                      <IconPencil className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </button>
                  )}
                </TableCell>

                <TableCell className="text-[11px] md:text-xs text-gray-500">
                  {getPosition(user) ?? "—"}
                </TableCell>

                {/* M365 status */}
                <TableCell>
                  {m365Linked
                    ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-success/15 text-success"><IconCheck className="w-3 h-3" />{t.linked}</span>
                    : <span className="inline-block px-2.5 py-0.5 text-[11px] rounded-full font-bold bg-slate-100 text-slate-500">{t.unlinked}</span>}
                </TableCell>

                {/* Role badge */}
                <TableCell>
                  <span className={ROLE_BADGE[roleSafe]}>{ROLE_LABELS[roleSafe]}</span>
                </TableCell>

                {/* Change role */}
                <TableCell>
                  <select
                    className="h-7 px-2 py-0.5 text-[13px] rounded-md border border-slate-300 bg-white"
                    value={roleSafe}
                    disabled={isBusy(uid)}
                    onChange={(e) => patchUser(user, { role: e.target.value as UserRole })}
                  >
                    {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </TableCell>

                {/* Change dept */}
                <TableCell>
                  <select
                    className="h-7 px-2 py-0.5 text-[13px] min-w-32 rounded-md border border-slate-300 bg-white"
                    value={user.department?.id ?? ""}
                    disabled={isBusy(uid)}
                    onChange={(e) => {
                      const val = e.target.value || null;
                      const deptName = val ? departments.find((d) => d.id === val)?.name ?? null : null;
                      patchUser(user, authCenterMode
                        ? { departmentName: deptName }
                        : { departmentId: val });
                    }}
                  >
                    <option value="">{t.noDept}</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </TableCell>

                {/* Push to M365 */}
                <TableCell className="text-center">
                  {!authCenterMode && m365Linked ? (
                    <Button
                      size="sm"
                      variant={pushedIds.has(uid) ? "default" : "outline"}
                      className={`h-7 px-2 text-xs ${pushedIds.has(uid) ? "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent" : ""}`}
                      disabled={isBusy(uid) || bulkPushing}
                      onClick={() => pushToM365(user)}
                      title={t.m365UpdateOk}
                    >
                      {pushingId === uid ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5 inline-block" />
                        : pushedIds.has(uid) ? <IconCheck className="w-3.5 h-3.5" />
                        : <IconUpload className="w-3.5 h-3.5" />}
                      {pushingId === uid ? t.sending
                        : pushedIds.has(uid) ? t.successBtn
                        : t.updateBtn}
                    </Button>
                  ) : (
                    <span className="text-[12px] text-neutral opacity-40">
                      {authCenterMode ? "Manage in Auth Center" : t.noM365}
                    </span>
                  )}
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {sorted.length === 0 ? (
          <div className="text-center py-10 text-xs md:text-sm text-gray-500">{t.noUsers}</div>
        ) : paginatedSorted.map((user) => {
          const uid = resolveUserId(user);
          const m365Linked = isM365Linked(user);
          const roleSafe = (user.role in ROLE_BADGE ? user.role : "USER") as UserRole;
          return (
          <div key={uid} className={`card-premium p-4 border rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${selected.has(uid) ? "border-primary" : "border-slate-100"}`}>
            <div className="flex items-start gap-2 mb-1">
              {!authCenterMode && m365Linked && (
                <input
                  type="checkbox"
                  className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500 mt-0.5 shrink-0"
                  checked={selected.has(uid)}
                  onChange={() => toggleOne(uid)}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs md:text-sm font-semibold text-neutral truncate">{user.name ?? "—"}</p>
                  <span className={`shrink-0 ${ROLE_BADGE[roleSafe]}`}>{ROLE_LABELS[roleSafe]}</span>
                </div>
                <p className="text-[11px] md:text-xs text-gray-500 truncate">{user.email}</p>
                <p className="text-[11px] md:text-xs text-gray-400 truncate mt-0.5">{getPosition(user) ?? "—"}</p>
              </div>
            </div>

            {/* Employee ID inline */}
            <div className="flex items-center gap-2 my-2">
              <span className="text-[12px] text-neutral w-24 shrink-0">{t.colEmpId}:</span>
              {editingEmpId === uid ? (
                <Input
                  ref={empIdRef}
                  type="text"
                  className="h-7 px-2 flex-1 text-[13px]"
                  value={empIdDraft}
                  maxLength={16}
                  onChange={(e) => setEmpIdDraft(e.target.value)}
                  onBlur={() => commitEmpId(user)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEmpId(user);
                    if (e.key === "Escape") setEditingEmpId(null);
                  }}
                />
              ) : (
                <button className="flex items-center gap-1" onClick={() => startEditEmpId(user, user.employeeId)}>
                  <span className="text-[13px]">
                    {user.employeeId ?? <span className="italic text-neutral opacity-50">{t.empIdNone}</span>}
                  </span>
                  <IconPencil className="w-3 h-3 text-neutral opacity-50" />
                </button>
              )}
            </div>

            <p className="text-[12px] text-neutral mb-3">
              {t.m365Label}: {m365Linked
                ? <span className="text-success">{t.m365StatusYes}</span>
                : t.m365StatusNo}
              {user.department && <> · {t.deptMobile}: {user.department.name}</>}
            </p>

            <div className="flex flex-col gap-2">
              <select
                className="w-full h-8 px-2 py-1 text-[13px] rounded-md border border-slate-300 bg-white"
                value={roleSafe}
                disabled={isBusy(uid)}
                onChange={(e) => patchUser(user, { role: e.target.value as UserRole })}
              >
                {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select
                className="w-full h-8 px-2 py-1 text-[13px] rounded-md border border-slate-300 bg-white"
                value={user.department?.id ?? ""}
                disabled={isBusy(uid)}
                onChange={(e) => {
                  const val = e.target.value || null;
                  const deptName = val ? departments.find((d) => d.id === val)?.name ?? null : null;
                  patchUser(user, authCenterMode
                    ? { departmentName: deptName }
                    : { departmentId: val });
                }}
              >
                <option value="">{t.noDeptMobile}</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {!authCenterMode && m365Linked && (
                <Button
                  size="sm"
                  variant={pushedIds.has(uid) ? "default" : "outline"}
                  className={`w-full gap-2 ${pushedIds.has(uid) ? "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent" : ""}`}
                  disabled={isBusy(uid) || bulkPushing}
                  onClick={() => pushToM365(user)}
                >
                  {pushingId === uid
                    ? <><span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5 inline-block" />{t.sendingMobile}</>
                    : pushedIds.has(uid)
                    ? <><IconCheck className="w-4 h-4" />{t.successMobile}</>
                    : <><IconUpload className="w-4 h-4" />{t.updateMobile}</>}
                </Button>
              )}
            </div>
          </div>
          );
        })}
      </div>

      {toast && <Toast type={toast.type} message={toast.message} onClose={hideToast} />}

      <Pagination
        page={safePage}
        totalPages={totalPages}
        total={sorted.length}
        countLabel={locale === "th" ? "คน" : "users"}
        onPageChange={(p) => setParam("page", String(p))}
      />
    </>
  );
}
