"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import SignaturePad from "@/components/shared/SignaturePad";
import { Search, X, Loader2, User, FileText, Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useEmailGroups } from "@/hooks/api/use-email-groups";
import { cn } from "@/lib/utils";

interface ReviewerCandidate {
  id: string;
  name: string;
  email: string | null;
  employeeId: string | null;
  department: string | null;
  jobTitle: string | null;
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

function UserPicker({ label, value, onChange }: { label: string; value: ReviewerCandidate | null; onChange: (u: ReviewerCandidate | null) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { results, loading } = useUserSearch(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (!inputRef.current?.contains(e.target as Node) && !dropdownRef.current?.contains(e.target as Node)) {
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
              onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder="ค้นหาชื่อ หรือ รหัสพนักงาน... / Search name or employee ID..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-4 text-sm transition-colors focus:border-[#0F1059] focus:bg-white focus:outline-none"
            />
            {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}
          </div>
          {open && (
            <div ref={dropdownRef} className="absolute top-full z-[9999] mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              {results.length === 0 ? (
                <p className="px-4 py-3 text-center text-sm text-slate-400">
                  {loading ? "กำลังค้นหา... / Searching..." : "ไม่พบผู้ใช้ / User not found"}
                </p>
              ) : (
                <ul className="max-h-48 divide-y divide-slate-50 overflow-y-auto">
                  {results.map((u) => (
                    <li key={u.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-slate-50"
                      onMouseDown={(e) => { e.preventDefault(); select(u); }}>
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

function EmailAccordion({ label, badge, selected, groups, onToggle }: {
  label: string; badge: number; selected: string[];
  groups: { id: string; displayName: string; mail: string }[];
  onToggle: (mail: string, checked: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        <div className="flex items-center gap-2">
          {badge > 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{badge}</span>}
          <ChevronRight className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-90")} />
        </div>
      </button>
      {open && (
        <div className="divide-y divide-slate-100 border-t border-slate-100">
          {groups.map((g) => {
            const checked = selected.includes(g.mail);
            return (
              <label key={g.id} className={cn("flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors", checked ? "bg-primary/5" : "hover:bg-slate-50")}>
                <input type="checkbox" checked={checked} onChange={(e) => onToggle(g.mail, e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-primary" />
                <div className="min-w-0">
                  <p className={cn("text-sm leading-tight", checked ? "font-semibold text-slate-800" : "font-medium text-slate-700")}>{g.displayName}</p>
                  <p className="text-[11px] text-slate-400">{g.mail}</p>
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  year: number;
  onSuccess: () => void;
}

export default function KpiMonthlySummaryReviewDialog({ open, onClose, year, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [reviewer, setReviewer] = useState<ReviewerCandidate | null>(null);
  const [approver, setApprover] = useState<ReviewerCandidate | null>(null);
  const [emailGroupsTo, setEmailGroupsTo] = useState<string[]>([]);
  const [emailGroupsCc, setEmailGroupsCc] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { data: emailGroups = [] } = useEmailGroups();

  const handleClose = () => {
    setStep(1);
    setSignatureDataUrl(null);
    setReviewer(null);
    setApprover(null);
    setEmailGroupsTo([]);
    setEmailGroupsCc([]);
    onClose();
  };

  const handleConfirmSignature = async (dataUrl: string) => {
    setSignatureDataUrl(dataUrl);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!signatureDataUrl || !reviewer || !approver) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน / Please complete all fields");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/kpi/monthly-summary-review/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          signatureDataUrl,
          reviewer: { id: reviewer.id, name: reviewer.name, email: reviewer.email },
          approver: { id: approver.id, name: approver.name, email: approver.email },
          emailGroupMails: emailGroupsTo,
          emailGroupMailsCc: emailGroupsCc,
        }),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error?.message ?? json.error ?? "Failed to submit for review");
      }

      toast.success("ส่งขอรีวิวเรียบร้อยแล้ว / Review request submitted successfully");
      onSuccess();
      handleClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-visible rounded-2xl">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            ส่งขอรีวิวสรุปผล KPI รายเดือน / Submit Monthly KPI Summary Review — Year {year}
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-700">วาดลายเซ็นของคุณ (Preparer Signature) / Draw your signature</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                <SignaturePad onCancel={handleClose} onConfirm={handleConfirmSignature} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-100 gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                <Check className="h-4 w-4" /> ลงชื่อเตรียมเอกสารสำเร็จ / Signature confirmed
              </div>
              {signatureDataUrl && (
                <div className="bg-white border border-slate-200 rounded-lg p-2 max-w-[200px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={signatureDataUrl} alt="Signature Preview" className="max-h-20 object-contain mx-auto" />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <UserPicker label="เลือกผู้ตรวจสอบ (Reviewer) / Select Reviewer" value={reviewer} onChange={setReviewer} />
              <UserPicker label="เลือกผู้อนุมัติ (Approver) / Select Approver" value={approver} onChange={setApprover} />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-700">กลุ่มอีเมลที่จะได้รับแจ้งเมื่ออนุมัติแล้ว (ไม่บังคับ) / Notify on approval (optional)</p>
              {emailGroups.filter((g) => !!g.mail).length === 0 ? (
                <p className="text-sm text-slate-400">ไม่มีกลุ่มอีเมลในระบบ</p>
              ) : (
                <div className="space-y-3">
                  <EmailAccordion
                    label="To — ส่งถึง"
                    badge={emailGroupsTo.length}
                    selected={emailGroupsTo}
                    groups={emailGroups.filter((g) => !!g.mail) as { id: string; displayName: string; mail: string }[]}
                    onToggle={(mail, checked) => setEmailGroupsTo((prev) => (checked ? [...prev, mail] : prev.filter((m) => m !== mail)))}
                  />
                  <EmailAccordion
                    label="CC — สำเนาถึง"
                    badge={emailGroupsCc.length}
                    selected={emailGroupsCc}
                    groups={emailGroups.filter((g) => !!g.mail) as { id: string; displayName: string; mail: string }[]}
                    onToggle={(mail, checked) => setEmailGroupsCc((prev) => (checked ? [...prev, mail] : prev.filter((m) => m !== mail)))}
                  />
                </div>
              )}
            </div>

            <DialogFooter className="border-t border-slate-100 pt-4 shrink-0">
              <Button variant="outline" className="rounded-xl" onClick={() => setStep(1)} disabled={submitting}>
                ย้อนกลับ
              </Button>
              <Button className="rounded-xl bg-[#0F1059] hover:bg-[#161875]" onClick={handleSubmit} disabled={submitting || !reviewer || !approver}>
                {submitting && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                ส่งข้อมูลขออนุมัติ
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
