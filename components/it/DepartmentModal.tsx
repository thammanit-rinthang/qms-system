"use client";

import { useState, useEffect, useRef } from "react";
import type { DepartmentRow } from "@/types/department";
import type { GraphGroup } from "@/services/ms-graph";
import { useLocale } from "@/lib/locale-context";
import ResponsiveFormOverlay from "@/components/common/ResponsiveFormOverlay";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  department?: DepartmentRow | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function DepartmentModal({ mode, department, onClose, onSuccess }: Props) {
  const locale = useLocale();

  const [name, setName] = useState("");
  const [emailGroup, setEmailGroup] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // M365 group combobox
  const [groups, setGroups] = useState<GraphGroup[]>([]);
  const [groupsFetched, setGroupsFetched] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);

  const t = {
    titleCreate: locale === "th" ? "เพิ่มแผนกใหม่" : "Add Department",
    titleEdit: locale === "th" ? "แก้ไขแผนก" : "Edit Department",
    labelName: locale === "th" ? "ชื่อแผนก" : "Department Name",
    placeholderName: locale === "th" ? "เช่น IT, QMS, HR" : "e.g. IT, QMS, HR",
    labelEmail: locale === "th" ? "อีเมลกลุ่มแผนก" : "Group Email",
    labelEmailOpt: locale === "th" ? "ไม่บังคับ" : "Optional",
    placeholderEmail: locale === "th" ? "เช่น it@ndcindustrial.co.th" : "e.g. it@company.com",
    labelActive: locale === "th" ? "แผนกใช้งานอยู่" : "Department is active",
    loadingGroups: locale === "th" ? "กำลังโหลดกลุ่ม M365..." : "Loading M365 groups...",
    noGroups: locale === "th" ? "ไม่พบกลุ่ม" : "No groups found",
    cancel: locale === "th" ? "ยกเลิก" : "Cancel",
    save: locale === "th" ? "บันทึก" : "Save",
    add: locale === "th" ? "เพิ่มแผนก" : "Add Department",
    errorDefault: locale === "th" ? "เกิดข้อผิดพลาด" : "An error occurred",
    errorRetry: locale === "th" ? "เกิดข้อผิดพลาด กรุณาลองใหม่" : "An error occurred, please try again",
  };

  useEffect(() => {
    if (mode === "edit" && department) {
      setName(department.name);
      setEmailGroup(department.emailGroup ?? "");
      setIsActive(department.isActive);
    } else {
      setName("");
      setEmailGroup("");
      setIsActive(true);
    }
    setError(null);
    setSearch("");
    setOpen(false);
  }, [mode, department]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  async function fetchGroupsOnce() {
    if (groupsFetched) return;
    setGroupsLoading(true);
    try {
      const res = await fetch("/api/it/ms365-groups");
      const json = await res.json() as { data: GraphGroup[] | null; error: string | null };
      if (json.data) {
        setGroups(json.data);
        setGroupsFetched(true);
      }
    } finally {
      setGroupsLoading(false);
    }
  }

  function handleInputFocus() {
    setSearch(emailGroup);
    setOpen(true);
    fetchGroupsOnce();
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmailGroup(e.target.value);
    setSearch(e.target.value);
    setOpen(true);
  }

  function selectGroup(g: GraphGroup) {
    if (g.mail) setEmailGroup(g.mail);
    if (!name.trim()) setName(g.displayName);
    setOpen(false);
    setSearch("");
  }

  const filtered = groups.filter((g) => {
    const q = search.toLowerCase();
    return (
      g.displayName.toLowerCase().includes(q) ||
      (g.mail ?? "").toLowerCase().includes(q)
    );
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body = { name: name.trim(), emailGroup: emailGroup.trim() || null, isActive };
      const url = mode === "create" ? "/api/it/departments" : `/api/it/departments/${department!.id}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || json.error) { setError(json.error ?? t.errorDefault); return; }
      onSuccess();
    } catch {
      setError(t.errorRetry);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ResponsiveFormOverlay
      open={true}
      onOpenChange={(value) => { if (!value) onClose(); }}
      title={mode === "create" ? t.titleCreate : t.titleEdit}
      desktopContentClassName="w-[min(96vw,48rem)] max-w-xl"
      bodyClassName="px-4 py-5 md:px-6 md:py-5"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {t.cancel}
          </Button>
          <Button type="submit" form="it-department-form" disabled={loading}>
            {loading && <span className="mr-1.5 h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />}
            {mode === "create" ? t.add : t.save}
          </Button>
        </>
      }
    >
        <form id="it-department-form" onSubmit={handleSubmit} className="mt-1 flex flex-col gap-3">
          {/* Department name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[14px] font-medium text-slate-700">
              {t.labelName} <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              placeholder={t.placeholderName}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </div>

          {/* Email group combobox */}
          <div className="flex flex-col gap-1.5" ref={comboRef}>
            <label className="text-[14px] font-medium text-slate-700 flex justify-between">
              <span>{t.labelEmail}</span>
              <span className="text-slate-500 text-[12px]">{t.labelEmailOpt}</span>
            </label>

            <div className="relative">
              <Input
                type="text"
                placeholder={t.placeholderEmail}
                value={emailGroup}
                onFocus={handleInputFocus}
                onChange={handleInputChange}
                autoComplete="off"
                maxLength={100}
                className="pr-8"
              />
              {/* chevron / spinner indicator */}
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                {groupsLoading ? (
                  <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin block" />
                ) : (
                  <ChevronIcon />
                )}
              </span>

              {/* Dropdown */}
              {open && (
                <ul className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-md max-h-52 overflow-y-auto">
                  {groupsLoading && (
                    <li className="px-3 py-2 text-[13px] text-slate-500 flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> {t.loadingGroups}
                    </li>
                  )}
                  {!groupsLoading && filtered.length === 0 && (
                    <li className="px-3 py-2 text-[13px] text-slate-500">{t.noGroups}</li>
                  )}
                  {!groupsLoading && filtered.map((g) => (
                    <li key={g.id}>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-slate-100 transition-colors"
                        onMouseDown={(e) => { e.preventDefault(); selectGroup(g); }}
                      >
                        <p className="text-[13px] font-medium text-slate-800 leading-tight">{g.displayName}</p>
                        {g.mail && <p className="text-[12px] text-slate-500">{g.mail}</p>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Active toggle (edit only) */}
          {mode === "edit" && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="activeToggle"
                className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <label htmlFor="activeToggle" className="text-[14px] cursor-pointer text-slate-700">
                {t.labelActive}
              </label>
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 py-2 px-3 rounded-md mt-2">
              <span className="text-[13px]">{error}</span>
            </div>
          )}
        </form>
    </ResponsiveFormOverlay>
  );
}

function ChevronIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
