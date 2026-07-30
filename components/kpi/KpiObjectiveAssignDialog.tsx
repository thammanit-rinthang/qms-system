"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, X, Loader2, User } from "lucide-react";

export interface ReviewerCandidate {
  id: string;
  name: string;
  email: string | null;
  employeeId: string | null;
  department: string | null;
  jobTitle: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialReviewerId?: string;
  initialApproverId?: string;
  hideApprover?: boolean;
  onConfirm: (reviewer: ReviewerCandidate, approver: ReviewerCandidate | null) => Promise<void>;
}

function useUserSearch(query: string) {
  const [results, setResults] = useState<ReviewerCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/ms-graph/users/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setResults(json.data ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  return { results, loading };
}

function getCandidateMeta(user: ReviewerCandidate) {
  const suffix = user.jobTitle ?? user.email ?? "Local only";
  return user.employeeId ? `${user.employeeId} · ${suffix}` : suffix;
}

interface UserPickerProps {
  label: string;
  value: ReviewerCandidate | null;
  onChange: (user: ReviewerCandidate | null) => void;
}

function UserPicker({ label, value, onChange }: UserPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { results, loading } = useUserSearch(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        !inputRef.current?.contains(e.target as Node) &&
        !dropdownRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function select(user: ReviewerCandidate) {
    onChange(user);
    setQuery("");
    setOpen(false);
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
    setQuery("");
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-slate-700">{label}</p>

      {value ? (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0F1059]">
            <User className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{value.name}</p>
            <p className="truncate text-xs text-slate-400">{getCandidateMeta(value)}</p>
          </div>
          <button onClick={clear} className="shrink-0 text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder="ชื่อ หรือ รหัสพนักงาน..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-4 text-sm transition-colors focus:border-[#0F1059] focus:bg-white focus:outline-none"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
            )}
          </div>

          {open && (
            <div
              ref={dropdownRef}
              className="absolute top-full z-[9999] mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
            >
              {results.length === 0 ? (
                <p className="px-4 py-3 text-center text-sm text-slate-400">
                  {loading ? "กำลังค้นหา..." : "ไม่พบผู้ใช้"}
                </p>
              ) : (
                <ul className="max-h-48 divide-y divide-slate-50 overflow-y-auto">
                  {results.map((u) => (
                    <li
                      key={u.id}
                      className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-slate-50"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        select(u);
                      }}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200">
                        <User className="h-3.5 w-3.5 text-slate-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{u.name}</p>
                        <p className="truncate text-xs text-slate-400">{getCandidateMeta(u)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function KpiObjectiveAssignDialog({
  open,
  onOpenChange,
  initialReviewerId,
  initialApproverId,
  hideApprover = false,
  onConfirm,
}: Props) {
  const t = useT();
  const [reviewer, setReviewer] = useState<ReviewerCandidate | null>(null);
  const [approver, setApprover] = useState<ReviewerCandidate | null>(null);
  const [saving, setSaving] = useState(false);
  const prefilled = useRef(false);

  useEffect(() => {
    if (!open) {
      prefilled.current = false;
      return;
    }
    if (prefilled.current || (!initialReviewerId && !initialApproverId)) return;
    prefilled.current = true;

    async function prefillUsers() {
      try {
        const res = await fetch("/api/ms-graph/users/search?q=");
        const json: { data: ReviewerCandidate[] } = await res.json();
        const users = json.data ?? [];
        if (initialReviewerId) setReviewer(users.find((u) => u.id === initialReviewerId) ?? null);
        if (initialApproverId) setApprover(users.find((u) => u.id === initialApproverId) ?? null);
      } catch {
        // ignore prefill failures
      }
    }

    void prefillUsers();
  }, [open, initialReviewerId, initialApproverId]);

  const handleClose = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setReviewer(null);
      setApprover(null);
    }
    onOpenChange(nextOpen);
  }, [onOpenChange]);

  async function submit() {
    if (!reviewer || (!hideApprover && !approver)) return;
    setSaving(true);
    try {
      await onConfirm(reviewer, approver);
      handleClose(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md overflow-visible rounded-2xl">
        <DialogHeader>
          <DialogTitle>{t("kpi.submit.assignTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <UserPicker label={t("kpi.form.reviewer")} value={reviewer} onChange={setReviewer} />
          {!hideApprover && (
            <UserPicker label={t("kpi.form.approver")} value={approver} onChange={setApprover} />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => handleClose(false)} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button
            className="rounded-xl bg-[#0F1059] hover:bg-[#161875]"
            onClick={submit}
            disabled={saving || !reviewer || (!hideApprover && !approver)}
          >
            {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
