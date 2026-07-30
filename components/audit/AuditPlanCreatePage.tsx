"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Plus, X, Search, Check,
  ChevronDown, ChevronUp, Calendar, Users, FileText,
  MapPin, Mail, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchApprovalConfigDefaultUser } from "@/lib/approval-config-client";
import { cn } from "@/lib/utils";
import SignaturePad from "@/components/shared/SignaturePad";
import { useReviewerCandidates, type ReviewerCandidate } from "@/hooks/api/use-reviewer-candidates";
import { useDepartments } from "@/hooks/api/use-departments";
import { useEmailGroups } from "@/hooks/api/use-email-groups";
import { INPUT_CLASS } from "@/lib/styles";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type ApptMember = { authUserId: string; name: string; role: string };

type Appointment = {
  id: string;
  appointmentNo: string;
  year: number;
  title: string;
  standards: string[];
  members: ApptMember[];
};

type DbStandard = { id: string; name: string };

type TeamMemberEntry = {
  authUserId: string;
  name: string;
  email: string | null;
  role: "LEAD_AUDITOR" | "AUDITOR" | "OBSERVER" | "AUDITEE";
};

type DeptScheduleEntry = {
  departmentId: string;
  departmentName: string;
  enabled: boolean;
  startAt: string;
  endAt: string;
  location: string;
  contactEmail: string;
  auditeeNotifyDept: boolean;
  team: TeamMemberEntry[];
};

type FormData = {
  auditType: "INTERNAL" | "EXTERNAL";
  selectedYear: number | null;
  appointmentId: string;
  appointmentMembers: ApptMember[];
  selectedDeptIds: string[];
  selectedStandards: string[];
  file: File | null;
  deptSchedules: DeptScheduleEntry[];
  emailGroupTo: string[];
  emailGroupCc: string[];
  reviewerAuthUserId: string;
  reviewerEmail: string;
  reviewerName: string;
  approverAuthUserId: string;
  approverEmail: string;
  approverName: string;
  signaturePath: string;
};

type Props = {
  appointments: Appointment[];
  dbStandards: DbStandard[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<TeamMemberEntry["role"], string> = {
  LEAD_AUDITOR: "หัวผู้ตรวจสอบ",
  AUDITOR: "ผู้ตรวจสอบ",
  OBSERVER: "ผู้สังเกตการณ์",
  AUDITEE: "ผู้รับการตรวจ",
};

const ROLE_COLORS: Record<TeamMemberEntry["role"], string> = {
  LEAD_AUDITOR: "bg-indigo-100 text-indigo-700 border-indigo-200",
  AUDITOR: "bg-blue-100 text-blue-700 border-blue-200",
  OBSERVER: "bg-amber-100 text-amber-700 border-amber-200",
  AUDITEE: "bg-teal-100 text-teal-700 border-teal-200",
};

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const TH_DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

// ─── MiniCalendar ─────────────────────────────────────────────────────────────

function MiniCalendar({
  value,
  onChange,
  label,
}: {
  value: string; // ISO datetime-local string
  onChange: (v: string) => void;
  label: string;
}) {
  const parsed = value ? new Date(value) : null;
  const today = new Date();
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? today.getMonth());
  const [timeStr, setTimeStr] = useState(
    parsed ? `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}` : "09:00"
  );

  function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
  function firstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay(); }

  function selectDay(day: number) {
    const [h, mi] = timeStr.split(":").map(Number);
    const d = new Date(viewYear, viewMonth, day, h || 9, mi || 0);
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${timeStr}`);
  }

  function handleTimeChange(t: string) {
    setTimeStr(t);
    if (parsed) {
      const [h, mi] = t.split(":").map(Number);
      const d = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), h, mi);
      onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${t}`);
    }
  }

  const totalDays = daysInMonth(viewYear, viewMonth);
  const startDay = firstDayOfMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [...Array(startDay).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];
  // pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  const selDay = parsed && parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth ? parsed.getDate() : null;
  const todayDay = today.getFullYear() === viewYear && today.getMonth() === viewMonth ? today.getDate() : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-100 px-3 py-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        {parsed && (
          <p className="text-sm font-semibold text-primary mt-0.5">
            {parsed.getDate()} {TH_MONTHS[parsed.getMonth()]} {parsed.getFullYear() + 543} เวลา {timeStr} น.
          </p>
        )}
      </div>
      {/* Month nav */}
      <div className="flex items-center justify-between px-3 py-2">
        <button type="button" onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }} className="p-1 rounded hover:bg-slate-100">
          <ChevronLeft className="h-4 w-4 text-slate-500" />
        </button>
        <span className="text-sm font-semibold text-slate-700">{TH_MONTHS[viewMonth]} {viewYear + 543}</span>
        <button type="button" onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }} className="p-1 rounded hover:bg-slate-100">
          <ChevronRight className="h-4 w-4 text-slate-500" />
        </button>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7 px-2">
        {TH_DAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">{d}</div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7 px-2 pb-2 gap-y-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const isSelected = day === selDay;
          const isToday = day === todayDay;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => selectDay(day)}
              className={cn(
                "mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors",
                isSelected ? "bg-primary text-white" : isToday ? "border border-primary text-primary" : "text-slate-700 hover:bg-slate-100"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
      {/* Time picker */}
      <div className="border-t border-slate-100 px-3 py-2 flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <label className="text-xs text-slate-500 shrink-0">เวลา</label>
        <select
          value={timeStr.split(":")[0]}
          onChange={(e) => handleTimeChange(`${e.target.value}:${timeStr.split(":")[1] ?? "00"}`)}
          className="text-xs border border-slate-200 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary/40 bg-white"
        >
          {Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0")).map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
        <span className="text-xs text-slate-400">:</span>
        <select
          value={timeStr.split(":")[1] ?? "00"}
          onChange={(e) => handleTimeChange(`${timeStr.split(":")[0] ?? "09"}:${e.target.value}`)}
          className="text-xs border border-slate-200 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-primary/40 bg-white"
        >
          {["00", "15", "30", "45"].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <span className="text-xs text-slate-500">น.</span>
      </div>
    </div>
  );
}

// ─── PersonSearch ─────────────────────────────────────────────────────────────

function PersonSearch({
  placeholder,
  onSelect,
  exclude,
}: {
  placeholder: string;
  onSelect: (c: ReviewerCandidate) => void;
  exclude?: string[];
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const { data: candidates = [], isLoading } = useReviewerCandidates(q, q.length >= 1);
  const filtered = candidates.filter((c) => !exclude?.includes(c.id));

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className={cn(INPUT_CLASS, "pl-8")}
        />
      </div>
      {open && q.length >= 1 && (
        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {isLoading ? (
            <div className="px-3 py-2 text-xs text-slate-400">กำลังค้นหา...</div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-400">ไม่พบผู้ใช้</div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={() => { onSelect(c); setQ(""); setOpen(false); }}
                className="flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-medium text-slate-800">{c.name}</span>
                <span className="text-xs text-slate-400">{c.email ?? ""}{c.department ? ` • ${c.department}` : ""}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── StandardCustomInput ──────────────────────────────────────────────────────

function StandardCustomInput({ selected, onAdd }: { selected: string[]; onAdd: (s: string) => void }) {
  const [val, setVal] = useState("");
  function add() {
    const t = val.trim();
    if (t && !selected.includes(t)) { onAdd(t); setVal(""); }
  }
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        placeholder="พิมพ์ชื่อมาตรฐาน แล้วกด Enter หรือ +"
        className={INPUT_CLASS}
      />
      <button type="button" onClick={add} className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

const STEPS = [
  { title: "ข้อมูลพื้นฐาน", subtitle: "ปี ประเภท และผังการแต่งตั้ง" },
  { title: "ขอบเขตและมาตรฐาน", subtitle: "แผนก มาตรฐาน และไฟล์แนบ" },
  { title: "ตารางและทีม", subtitle: "กำหนดวันและทีมตรวจสอบ" },
  { title: "ผู้รับผิดชอบ", subtitle: "ผู้รับอีเมล ผู้ตรวจทาน และผู้อนุมัติ" },
] as const;

function Stepper({ current, max, onGoto }: { current: number; max: number; onGoto: (i: number) => void }) {
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const reachable = i <= max;
        return (
          <div key={i} className="flex flex-1 items-center last:flex-none">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => reachable && onGoto(i)}
              className={cn("flex items-center gap-2.5 text-left", reachable ? "cursor-pointer" : "cursor-not-allowed")}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                  active && "border-primary bg-primary text-white",
                  done && "border-primary bg-primary/10 text-primary",
                  !active && !done && "border-slate-200 bg-white text-slate-400"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className="hidden sm:block">
                <span className={cn("block text-sm font-semibold leading-tight", active ? "text-slate-900" : "text-slate-500")}>{s.title}</span>
                <span className="block text-xs text-slate-400 leading-tight">{s.subtitle}</span>
              </span>
            </button>
            {i < STEPS.length - 1 && <div className={cn("mx-3 h-px flex-1 transition-colors", i < current ? "bg-primary/40" : "bg-slate-200")} />}
          </div>
        );
      })}
    </div>
  );
}

// ─── SignatureModal ────────────────────────────────────────────────────────────

function SignatureModal({ onConfirm, onCancel }: { onConfirm: (dataUrl: string) => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 rounded-2xl border border-slate-100 bg-white shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-800">ลงลายมือชื่อผู้จัดทำ</h2>
          <p className="text-sm text-slate-400 mt-0.5">กรุณาลงลายมือชื่อเพื่อยืนยันการสร้างแผนการตรวจสอบ</p>
        </div>
        <SignaturePad onConfirm={onConfirm} onCancel={onCancel} />
      </div>
    </div>
  );
}

// ─── ScheduleCalendarView ─────────────────────────────────────────────────────

function ScheduleCalendarView({
  schedules,
  isInternal,
  onBack,
  onNext,
}: {
  schedules: DeptScheduleEntry[];
  isInternal: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const active = schedules.filter((s) => s.enabled && s.startAt);

  // Derive month range to display
  const dates = active.map((s) => new Date(s.startAt));
  const minDate = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : new Date();
  const [viewYear, setViewYear] = useState(minDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(minDate.getMonth());

  // Group sessions by date string "YYYY-MM-DD"
  const byDate: Record<string, DeptScheduleEntry[]> = {};
  for (const s of active) {
    const d = new Date(s.startAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    (byDate[key] ??= []).push(s);
  }

  function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
  function firstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay(); }

  const totalDays = daysInMonth(viewYear, viewMonth);
  const startDay = firstDayOfMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [...Array(startDay).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const DEPT_COLORS = [
    "bg-indigo-500", "bg-violet-500", "bg-blue-500", "bg-teal-500",
    "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-fuchsia-500",
  ];
  // stable color per dept
  const deptIds = [...new Set(active.map((s) => s.departmentId))];
  const colorMap = Object.fromEntries(deptIds.map((id, i) => [id, DEPT_COLORS[i % DEPT_COLORS.length]]));

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-bold text-slate-800">ตารางการตรวจสอบ</p>
        <p className="text-xs text-slate-400 mt-0.5">ภาพรวมแต่ละแผนกตรวจวันไหนบ้าง</p>
      </div>

      {active.length === 0 ? (
        <div className="py-10 text-center rounded-xl border border-dashed border-slate-200">
          <p className="text-sm text-slate-400">ยังไม่ได้กำหนดวันตรวจ — กลับไปกรอกวันก่อน</p>
        </div>
      ) : (
        <>
          {/* Month nav */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
              <button type="button" onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }} className="p-1 rounded hover:bg-slate-200">
                <ChevronLeft className="h-4 w-4 text-slate-500" />
              </button>
              <span className="text-sm font-bold text-slate-700">{TH_MONTHS[viewMonth]} {viewYear + 543}</span>
              <button type="button" onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }} className="p-1 rounded hover:bg-slate-200">
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {TH_DAYS.map((d) => (
                <div key={d} className="text-center text-[11px] font-semibold text-slate-400 py-2">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
              {cells.map((day, idx) => {
                if (!day) return <div key={idx} className="min-h-18 bg-slate-50/50" />;
                const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const sessions = byDate[key] ?? [];
                const isToday = new Date().getFullYear() === viewYear && new Date().getMonth() === viewMonth && new Date().getDate() === day;
                return (
                  <div key={idx} className="min-h-18 p-1.5 flex flex-col gap-1">
                    <span className={cn(
                      "text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full self-start leading-none",
                      isToday ? "bg-primary text-white" : "text-slate-500"
                    )}>{day}</span>
                    {sessions.map((s) => (
                      <div key={s.departmentId} className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium text-white leading-tight truncate", colorMap[s.departmentId])}>
                        {s.departmentName}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend + list */}
          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">รายละเอียดแต่ละแผนก</p>
            </div>
            {active.map((s) => {
              const start = new Date(s.startAt);
              const end = s.endAt ? new Date(s.endAt) : null;
              const lead = s.team.find((m) => m.role === "LEAD_AUDITOR");
              const auditors = s.team.filter((m) => m.role === "AUDITOR");
              const observers = s.team.filter((m) => m.role === "OBSERVER");
              return (
                <div key={s.departmentId} className="flex items-start gap-3 px-4 py-3">
                  <div className={cn("mt-0.5 h-3 w-3 rounded-sm shrink-0", colorMap[s.departmentId])} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{s.departmentName}</p>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1 flex-wrap">
                      <Calendar className="h-3 w-3 shrink-0" />
                      {start.getDate()} {TH_MONTHS[start.getMonth()]} {start.getFullYear() + 543}
                      <span className="text-slate-300">·</span>
                      <Clock className="h-3 w-3 shrink-0" />
                      {`${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}`}
                      {end && ` – ${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`}
                      {s.location && <><span className="text-slate-300">·</span><MapPin className="h-3 w-3 shrink-0" />{s.location}</>}
                    </p>
                    {isInternal && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {lead && <span className={cn("text-[10px] rounded-full px-2 py-0.5 border font-medium", ROLE_COLORS.LEAD_AUDITOR)}>Lead: {lead.name}</span>}
                        {auditors.map((a) => <span key={a.authUserId} className={cn("text-[10px] rounded-full px-2 py-0.5 border font-medium", ROLE_COLORS.AUDITOR)}>{a.name}</span>)}
                        {observers.map((o) => <span key={o.authUserId} className={cn("text-[10px] rounded-full px-2 py-0.5 border font-medium", ROLE_COLORS.OBSERVER)}>{o.name}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-1 h-4 w-4" /> แก้ไขตาราง
        </Button>
        <Button type="button" onClick={onNext}>
          ยืนยันและดำเนินการต่อ <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AuditPlanCreatePage({ appointments, dbStandards }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [emailAccordionOpen, setEmailAccordionOpen] = useState(true);
  const [scheduleSubView, setScheduleSubView] = useState<"form" | "calendar">("form");
  const { data: departments = [], isLoading: deptsLoading } = useDepartments();
  const { data: emailGroupsRaw = [] } = useEmailGroups();
  const emailGroups = emailGroupsRaw.filter((g) => !!g.mail) as { id: string; displayName: string; mail: string }[];

  const availableYears = [...new Set(appointments.map((a) => a.year))].sort((a, b) => b - a);
  const currentBuddhistYear = new Date().getFullYear() + 543;
  const defaultYear = availableYears.includes(currentBuddhistYear)
    ? currentBuddhistYear
    : (availableYears[0] ?? currentBuddhistYear);

  const [form, setForm] = useState<FormData>({
    auditType: "INTERNAL",
    selectedYear: defaultYear,
    appointmentId: "",
    appointmentMembers: [],
    selectedDeptIds: [],
    selectedStandards: [],
    file: null,
    deptSchedules: [],
    emailGroupTo: [],
    emailGroupCc: [],
    reviewerAuthUserId: "",
    reviewerEmail: "",
    reviewerName: "",
    approverAuthUserId: "",
    approverEmail: "",
    approverName: "",
    signaturePath: "",
  });

  function patch(updates: Partial<FormData>) {
    setForm((prev) => ({ ...prev, ...updates }));
  }

  useEffect(() => {
    if (form.reviewerAuthUserId && form.approverAuthUserId) {
      return;
    }

    let cancelled = false;

    async function loadDefaults() {
      const [reviewerDefault, approverDefault] = await Promise.all([
        form.reviewerAuthUserId ? Promise.resolve(null) : fetchApprovalConfigDefaultUser("AUDIT", "QMS"),
        form.approverAuthUserId ? Promise.resolve(null) : fetchApprovalConfigDefaultUser("AUDIT", "MR"),
      ]);

      if (cancelled) {
        return;
      }

      setForm((prev) => ({
        ...prev,
        reviewerAuthUserId: prev.reviewerAuthUserId || reviewerDefault?.id || "",
        reviewerEmail: prev.reviewerEmail || reviewerDefault?.email || "",
        reviewerName: prev.reviewerName || reviewerDefault?.name || "",
        approverAuthUserId: prev.approverAuthUserId || approverDefault?.id || "",
        approverEmail: prev.approverEmail || approverDefault?.email || "",
        approverName: prev.approverName || approverDefault?.name || "",
      }));
    }

    void loadDefaults();

    return () => {
      cancelled = true;
    };
  }, [form.approverAuthUserId, form.reviewerAuthUserId]);

  const filteredAppointments = appointments.filter((a) => a.year === form.selectedYear);

  const deptContactEmails = [...new Set(
    form.deptSchedules.filter((d) => d.enabled && d.contactEmail).map((d) => d.contactEmail)
  )];

  function computeTitle() {
    return departments
      .filter((d) => form.selectedDeptIds.includes(d.id))
      .map((d) => d.name)
      .join(", ");
  }

  function handleDeptToggle(deptId: string, checked: boolean) {
    const deptName = departments.find((d) => d.id === deptId)?.name ?? deptId;
    const newIds = checked
      ? [...form.selectedDeptIds, deptId]
      : form.selectedDeptIds.filter((id) => id !== deptId);

    const existingIds = new Set(form.deptSchedules.map((d) => d.departmentId));
    const newSchedules = checked && !existingIds.has(deptId)
      ? [...form.deptSchedules, {
          departmentId: deptId,
          departmentName: deptName,
          enabled: false,
          startAt: "",
          endAt: "",
          location: "",
          contactEmail: "",
          auditeeNotifyDept: true,
          team: [],
        }]
      : form.deptSchedules.filter((d) => d.departmentId !== deptId || newIds.includes(deptId));

    patch({ selectedDeptIds: newIds, deptSchedules: newSchedules });
  }

  function patchDs(i: number, updates: Partial<DeptScheduleEntry>) {
    patch({ deptSchedules: form.deptSchedules.map((x, j) => j === i ? { ...x, ...updates } : x) });
  }

  function addTeamMember(i: number, member: Omit<TeamMemberEntry, "role">, role: TeamMemberEntry["role"]) {
    const ds = form.deptSchedules[i];
    if (ds.team.some((m) => m.authUserId === member.authUserId && m.role === role)) return;
    patchDs(i, { team: [...ds.team, { ...member, role }] });
  }

  function removeTeamMember(i: number, authUserId: string, role: TeamMemberEntry["role"]) {
    patchDs(i, { team: form.deptSchedules[i].team.filter((m) => !(m.authUserId === authUserId && m.role === role)) });
  }

  function validateStep(s: number): string | null {
    if (s === 1 && form.selectedDeptIds.length === 0) return "กรุณาเลือกอย่างน้อย 1 แผนก";
    if (s === 3) {
      if (!form.reviewerAuthUserId) return "กรุณาเลือก Reviewer";
      if (!form.approverAuthUserId) return "กรุณาเลือก Approver";
    }
    return null;
  }

  function goTo(target: number) {
    if (target > step) {
      const err = validateStep(step);
      if (err) { toast.error(err); return; }
    }
    setStep(target);
    setMaxStep((m) => Math.max(m, target));
  }

  async function handleSubmit(signatureOverride?: string) {
    if (form.selectedDeptIds.length === 0) { toast.error("กรุณาเลือกอย่างน้อย 1 แผนก"); return; }
    if (!form.reviewerAuthUserId) { toast.error("กรุณาเลือก Reviewer"); return; }
    if (!form.approverAuthUserId) { toast.error("กรุณาเลือก Approver"); return; }
    const signaturePath = signatureOverride ?? form.signaturePath;
    if (!signaturePath) { setShowSignature(true); return; }

    setIsSubmitting(true);
    try {
      const planRes = await fetch("/api/audit/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: computeTitle(),
          auditType: form.auditType,
          mode: "FILE_UPLOAD",
          standards: form.selectedStandards,
          appointmentId: form.appointmentId || undefined,
        }),
      });
      const planJson = await planRes.json() as { data?: { id: string; auditNo: string }; message?: string };
      if (!planRes.ok) throw new Error(planJson.message ?? "สร้างแผนไม่สำเร็จ");
      const plan = planJson.data!;

      const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]));
      await fetch(`/api/audit/plans/${plan.id}/departments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departments: form.selectedDeptIds.map((id) => ({ departmentId: id, departmentName: deptMap[id] ?? "" })),
        }),
      }).then(async (r) => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? "ตั้งค่าแผนกไม่สำเร็จ"); });

      if (form.file) {
        const fd = new FormData();
        // Use URL-encoded filename to bypass Next.js/Undici multipart non-ASCII body parsing bugs
        const safeName = encodeURIComponent(form.file.name);
        fd.append("file", form.file, safeName);
        fd.append("filename", form.file.name);
        fd.append("planId", plan.id);
        fd.append("resourceType", "PLAN");
        fd.append("resourceId", plan.id);
        await fetch("/api/audit/attachments/upload", { method: "POST", body: fd })
          .then(async (r) => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? "อัปโหลดไฟล์ไม่สำเร็จ"); });
      }

      for (const ds of form.deptSchedules) {
        if (!ds.enabled || !ds.startAt || !ds.endAt) continue;
        const lead = ds.team.find((m) => m.role === "LEAD_AUDITOR");
        await fetch(`/api/audit/plans/${plan.id}/schedules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionTitle: ds.departmentName,
            startAt: ds.startAt,
            endAt: ds.endAt,
            departmentId: ds.departmentId,
            departmentName: ds.departmentName,
            contactEmail: ds.contactEmail || undefined,
            location: ds.location || undefined,
            leadAuditorAuthUserId: lead?.authUserId,
            leadAuditorNameSnapshot: lead?.name,
            auditeeNotifyDept: ds.auditeeNotifyDept,
            team: ds.team.map((m) => ({ authUserId: m.authUserId, nameSnapshot: m.name, emailSnapshot: m.email ?? undefined, role: m.role })),
          }),
        }).then(async (r) => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? `สร้างตาราง ${ds.departmentName} ไม่สำเร็จ`); });
      }

      await fetch(`/api/audit/plans/${plan.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signedRole: "PREPARER",
          signaturePath: signaturePath || undefined,
          reviewerAuthUserId: form.reviewerAuthUserId,
          reviewerEmail: form.reviewerEmail,
          reviewerNameSnapshot: form.reviewerName || undefined,
          approverAuthUserId: form.approverAuthUserId,
          approverEmail: form.approverEmail,
          approverNameSnapshot: form.approverName || undefined,
          emailGroupMails: [...new Set([...deptContactEmails, ...form.emailGroupCc])],
        }),
      }).then(async (r) => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message ?? "ส่งแผนไม่สำเร็จ"); });

      toast.success(`สร้างแผน ${plan.auditNo} และส่งเพื่ออนุมัติแล้ว`);
      router.push(`/audit/plans/${plan.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด", { duration: Infinity });
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {showSignature && (
        <SignatureModal
          onConfirm={(dataUrl) => {
            patch({ signaturePath: dataUrl });
            setShowSignature(false);
            handleSubmit(dataUrl);
          }}
          onCancel={() => setShowSignature(false)}
        />
      )}

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/audit/plans" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
            <ChevronLeft className="h-4 w-4" /> แผนการตรวจสอบ
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">สร้างแผนการตรวจสอบใหม่</h1>
          <p className="text-sm text-slate-500 mt-0.5">Create New Audit Plan</p>
        </div>

        {/* Stepper */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-[0_2px_12px_rgb(0,0,0,0.04)] px-6 py-5">
          <Stepper current={step} max={maxStep} onGoto={goTo} />
        </div>

        {/* Step body */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-[0_2px_12px_rgb(0,0,0,0.04)] p-6">

          {/* ── Step 1: Year + Type → Appointment ── */}
          {step === 0 && (
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Year */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">ปีการตรวจสอบ</label>
                  <div className="flex flex-wrap gap-2">
                    {availableYears.length === 0 ? (
                      <p className="text-sm text-slate-400">ไม่มีข้อมูลปีจาก Appointment</p>
                    ) : (
                      availableYears.map((y) => (
                        <button
                          key={y}
                          type="button"
                          onClick={() => patch({ selectedYear: y, appointmentId: "", appointmentMembers: [] })}
                          className={cn(
                            "rounded-xl border px-4 py-1.5 text-sm font-semibold transition-colors",
                            form.selectedYear === y
                              ? "border-primary bg-primary text-white"
                              : "border-slate-200 text-slate-600 hover:border-primary/60 hover:text-primary"
                          )}
                        >
                          ปี {y} ({y - 543})
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Audit type */}
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">ประเภทการตรวจสอบ</label>
                  <div className="flex gap-3">
                    {(["INTERNAL", "EXTERNAL"] as const).map((type) => {
                      const isActive = form.auditType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => patch({ auditType: type, appointmentId: "", appointmentMembers: [] })}
                          className={cn(
                            "flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors text-center",
                            isActive
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-slate-200 text-slate-600 hover:border-slate-300"
                          )}
                        >
                          {type === "INTERNAL" ? "ตรวจสอบภายใน" : "ตรวจสอบภายนอก"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Appointment picker — internal only */}
              {form.auditType === "INTERNAL" && (
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">ผังการแต่งตั้งผู้ตรวจสอบ</label>
                    <span className="text-xs text-slate-400 bg-slate-100 rounded-full px-2 py-0.5 normal-case">เลือกได้ — ทีมจะถูกดึงมาอัตโนมัติ</span>
                  </div>
                  {filteredAppointments.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center">
                      <p className="text-sm text-slate-400">ไม่มี Appointment ที่ PUBLISHED สำหรับปี {form.selectedYear}</p>
                      <p className="text-xs text-slate-300 mt-1">สามารถข้ามและเลือกทีมด้วยตนเองในขั้นตอนที่ 3</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredAppointments.map((a) => {
                        const selected = form.appointmentId === a.id;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() =>
                              patch({
                                appointmentId: selected ? "" : a.id,
                                appointmentMembers: selected ? [] : a.members,
                                selectedStandards: selected ? form.selectedStandards : a.standards,
                              })
                            }
                            className={cn(
                              "w-full text-left rounded-xl border px-4 py-3.5 transition-all",
                              selected
                                ? "border-primary/40 bg-primary/5 shadow-sm"
                                : "border-slate-200 hover:border-slate-300 bg-white"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                                selected ? "border-primary bg-primary" : "border-slate-300"
                              )}>
                                {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs text-slate-400 bg-slate-100 rounded px-1.5 py-0.5">{a.appointmentNo}</span>
                                  <span className="text-xs text-slate-500">ปี {a.year}</span>
                                </div>
                                <p className="text-sm font-semibold text-slate-800 mt-1">{a.title}</p>
                                <div className="flex items-center gap-3 mt-1.5">
                                  <span className="flex items-center gap-1 text-xs text-slate-400">
                                    <Users className="h-3 w-3" />{a.members.length} สมาชิก
                                  </span>
                                  {a.standards.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {a.standards.map((s) => (
                                        <span key={s} className="text-[11px] bg-blue-50 border border-blue-100 text-blue-600 rounded px-1.5 py-0.5">{s}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {form.auditType === "EXTERNAL" && (
                <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                  <p className="text-sm text-amber-700 font-medium">ตรวจสอบภายนอก</p>
                  <p className="text-xs text-amber-600 mt-0.5">ไม่ต้องเลือกผังการแต่งตั้ง — สามารถกำหนดวันและสถานที่ได้ในขั้นตอนที่ 3</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Departments + Standards + File ── */}
          {step === 1 && (
            <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] items-start">
              {/* Departments */}
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-bold text-slate-800">แผนกที่ตรวจ <span className="text-rose-500">*</span></p>
                  <p className="text-xs text-slate-400 mt-0.5">เลือกแผนกที่จะเข้ารับการตรวจสอบในแผนนี้</p>
                </div>
                <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-50">
                  {deptsLoading ? (
                    <div className="px-3 py-4 text-sm text-slate-400">กำลังโหลด...</div>
                  ) : (
                    departments.map((dept) => {
                      const checked = form.selectedDeptIds.includes(dept.id);
                      return (
                        <label key={dept.id} className={cn("flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors", checked ? "bg-primary/5" : "hover:bg-slate-50")}>
                          <div className={cn(
                            "h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                            checked ? "border-primary bg-primary" : "border-slate-300"
                          )}>
                            {checked && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={(e) => handleDeptToggle(dept.id, e.target.checked)}
                          />
                          <span className={cn("text-sm", checked ? "font-medium text-slate-800" : "text-slate-600")}>{dept.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
                {form.selectedDeptIds.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">ชื่อแผน (auto)</p>
                    <p className="text-sm font-medium text-slate-700">{computeTitle()}</p>
                  </div>
                )}
              </div>

              {/* Standards + File */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">มาตรฐาน ISO</p>
                    <p className="text-xs text-slate-400 mt-0.5">เลือกมาตรฐานที่ใช้ในการตรวจสอบ (กดเพื่อเลือก/ยกเลิก)</p>
                  </div>
                  {dbStandards.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {dbStandards.map((s) => {
                        const sel = form.selectedStandards.includes(s.name);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() =>
                              patch({
                                selectedStandards: sel
                                  ? form.selectedStandards.filter((x) => x !== s.name)
                                  : [...form.selectedStandards, s.name],
                              })
                            }
                            className={cn(
                              "rounded-xl border px-3 py-1.5 text-xs font-medium transition-all",
                              sel
                                ? "bg-primary text-white border-primary shadow-sm"
                                : "border-slate-200 text-slate-600 hover:border-primary/50 hover:text-primary"
                            )}
                          >
                            {sel && <Check className="inline h-3 w-3 mr-1 -mt-0.5" />}
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-slate-400 mb-1.5">เพิ่มมาตรฐานอื่นที่ไม่อยู่ในรายการ</p>
                    <StandardCustomInput
                      selected={form.selectedStandards}
                      onAdd={(s) => {
                        if (!form.selectedStandards.includes(s)) patch({ selectedStandards: [...form.selectedStandards, s] });
                      }}
                    />
                  </div>
                  {form.selectedStandards.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">มาตรฐานที่เลือก</p>
                      <div className="flex flex-wrap gap-1.5">
                        {form.selectedStandards.map((s) => (
                          <span key={s} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                            {s}
                            <button type="button" onClick={() => patch({ selectedStandards: form.selectedStandards.filter((x) => x !== s) })} className="ml-0.5 text-blue-400 hover:text-blue-700">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-5 space-y-2">
                  <div>
                    <p className="text-sm font-bold text-slate-800">ไฟล์แนบแผน</p>
                    <p className="text-xs text-slate-400 mt-0.5">อัปโหลดเอกสารแผนการตรวจสอบ (ไม่บังคับ)</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => patch({ file: e.target.files?.[0] ?? null })}
                  />
                  <div className={cn("rounded-xl border-2 border-dashed px-4 py-4 transition-colors", form.file ? "border-primary/30 bg-primary/5" : "border-slate-200 hover:border-slate-300")}>
                    {form.file ? (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm text-slate-700 flex-1 truncate">{form.file.name}</span>
                        <button type="button" onClick={() => { patch({ file: null }); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="text-slate-400 hover:text-rose-500 shrink-0">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-sm text-slate-400">ยังไม่ได้เลือกไฟล์</p>
                        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="mt-2">
                          เลือกไฟล์
                        </Button>
                        <p className="mt-1.5 text-xs text-slate-300">PDF, Word, Excel, PNG, JPEG · ไม่เกิน 20 MB</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Schedule per dept (calendar) ── */}
          {step === 2 && scheduleSubView === "calendar" && (
            <ScheduleCalendarView
              schedules={form.deptSchedules}
              isInternal={form.auditType === "INTERNAL"}
              onBack={() => setScheduleSubView("form")}
              onNext={() => { setScheduleSubView("form"); goTo(3); }}
            />
          )}
          {step === 2 && scheduleSubView === "form" && (
            form.deptSchedules.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-slate-500">ยังไม่ได้เลือกแผนก — กลับไปขั้นตอนที่ 2 เพื่อเลือกแผนกก่อน</p>
                <p className="mt-1 text-xs text-slate-400">หรือข้ามขั้นตอนนี้แล้วเพิ่มตารางทีหลังใน Detail</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-bold text-slate-800">{form.auditType === "INTERNAL" ? "ตารางและทีมตรวจสอบ" : "ตารางการตรวจสอบ"}</p>
                  <p className="text-xs text-slate-400 mt-0.5">กำหนดวันและทีมสำหรับแต่ละแผนก (ข้ามได้ เพิ่มทีหลังใน Detail)</p>
                </div>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                  {form.deptSchedules.map((ds, i) => {
                    const apptCandidates = form.appointmentMembers;
                    const lead = ds.team.filter((m) => m.role === "LEAD_AUDITOR");
                    const auditors = ds.team.filter((m) => m.role === "AUDITOR");
                    const observers = ds.team.filter((m) => m.role === "OBSERVER");
                    const auditees = ds.team.filter((m) => m.role === "AUDITEE");

                    return (
                      <div key={ds.departmentId} className={cn("rounded-xl border transition-all", ds.enabled ? "border-violet-200 bg-violet-50/30" : "border-slate-100 bg-white")}>
                        {/* Header row */}
                        <label className="flex items-center gap-3 cursor-pointer px-4 py-3">
                          <div className={cn(
                            "h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                            ds.enabled ? "border-primary bg-primary" : "border-slate-300"
                          )}>
                            {ds.enabled && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <input type="checkbox" className="sr-only" checked={ds.enabled} onChange={(e) => patchDs(i, { enabled: e.target.checked })} />
                          <span className="font-semibold text-slate-800">{ds.departmentName}</span>
                          {ds.startAt && (
                            <span className="ml-auto text-xs text-violet-600 bg-violet-100 rounded-full px-2 py-0.5 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(ds.startAt).getDate()} {TH_MONTHS[new Date(ds.startAt).getMonth()]}
                            </span>
                          )}
                        </label>

                        {ds.enabled && (
                          <div className="border-t border-violet-100 px-4 pb-4 pt-3 space-y-4">
                            {/* Calendars side-by-side */}
                            <div className="grid gap-3 sm:grid-cols-2">
                              <MiniCalendar
                                label="วันเริ่มตรวจ *"
                                value={ds.startAt}
                                onChange={(v) => patchDs(i, { startAt: v })}
                              />
                              <MiniCalendar
                                label="วันสิ้นสุด *"
                                value={ds.endAt}
                                onChange={(v) => patchDs(i, { endAt: v })}
                              />
                            </div>

                            {/* Contact + Location */}
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div>
                                <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600"><Mail className="h-3 w-3" />อีเมลติดต่อแผนก</label>
                                <select value={ds.contactEmail} onChange={(e) => patchDs(i, { contactEmail: e.target.value })} className={INPUT_CLASS}>
                                  <option value="">-- เลือกกลุ่มอีเมล --</option>
                                  {emailGroups.map((g) => (
                                    <option key={g.id} value={g.mail}>{g.displayName} ({g.mail})</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-600"><MapPin className="h-3 w-3" />สถานที่</label>
                                <input type="text" value={ds.location} onChange={(e) => patchDs(i, { location: e.target.value })} className={INPUT_CLASS} placeholder="ห้อง / อาคาร / พื้นที่..." />
                              </div>
                            </div>

                            {/* Team roles — Internal only */}
                            {form.auditType === "INTERNAL" && (["LEAD_AUDITOR", "AUDITOR", "OBSERVER"] as const).map((role) => {
                              const members = role === "LEAD_AUDITOR" ? lead : role === "AUDITOR" ? auditors : observers;
                              const useApptPicker = apptCandidates.length > 0 && role !== "OBSERVER";
                              return (
                                <div key={role}>
                                  <p className="mb-1.5 text-xs font-semibold text-slate-600">{ROLE_LABELS[role]}</p>
                                  {useApptPicker ? (
                                    <select
                                      value=""
                                      onChange={(e) => {
                                        const m = apptCandidates.find((c) => c.authUserId === e.target.value);
                                        if (m) addTeamMember(i, { authUserId: m.authUserId, name: m.name, email: null }, role);
                                      }}
                                      className={INPUT_CLASS}
                                    >
                                      <option value="">-- เลือกจากผังการแต่งตั้ง --</option>
                                      {apptCandidates
                                        .filter((c) => !members.some((m) => m.authUserId === c.authUserId))
                                        .map((c) => <option key={c.authUserId} value={c.authUserId}>{c.name}</option>)}
                                    </select>
                                  ) : (
                                    <PersonSearch
                                      placeholder={`ค้นหา${ROLE_LABELS[role]}...`}
                                      onSelect={(c) => addTeamMember(i, { authUserId: c.id, name: c.name, email: c.email }, role)}
                                      exclude={members.map((m) => m.authUserId)}
                                    />
                                  )}
                                  {members.length > 0 && (
                                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                                      {members.map((m) => (
                                        <span key={m.authUserId} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", ROLE_COLORS[role])}>
                                          {m.name}
                                          <button type="button" onClick={() => removeTeamMember(i, m.authUserId, role)} className="ml-0.5 opacity-60 hover:opacity-100">
                                            <X className="h-3 w-3" />
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            {/* Auditee */}
                            {form.auditType === "INTERNAL" && (
                              <div>
                                <p className="mb-1.5 text-xs font-semibold text-slate-600">{ROLE_LABELS.AUDITEE}</p>
                                <div className="flex items-center gap-4 mb-2">
                                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                    <input type="radio" checked={ds.auditeeNotifyDept} onChange={() => patchDs(i, { auditeeNotifyDept: true, team: ds.team.filter((m) => m.role !== "AUDITEE") })} className="h-4 w-4 border-slate-300 text-primary" />
                                    ส่งทั้งแผนก
                                  </label>
                                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                    <input type="radio" checked={!ds.auditeeNotifyDept} onChange={() => patchDs(i, { auditeeNotifyDept: false })} className="h-4 w-4 border-slate-300 text-primary" />
                                    เลือกรายคน
                                  </label>
                                </div>
                                {ds.auditeeNotifyDept ? (
                                  <p className="text-xs text-teal-600 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">จะส่งถึงทุกคนในแผนก {ds.departmentName}</p>
                                ) : (
                                  <>
                                    <PersonSearch
                                      placeholder="ค้นหาผู้รับการตรวจ..."
                                      onSelect={(c) => addTeamMember(i, { authUserId: c.id, name: c.name, email: c.email }, "AUDITEE")}
                                      exclude={auditees.map((m) => m.authUserId)}
                                    />
                                    {auditees.length > 0 && (
                                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                                        {auditees.map((m) => (
                                          <span key={m.authUserId} className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", ROLE_COLORS.AUDITEE)}>
                                            {m.name}
                                            <button type="button" onClick={() => removeTeamMember(i, m.authUserId, "AUDITEE")} className="ml-0.5 opacity-60 hover:opacity-100"><X className="h-3 w-3" /></button>
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            )
          )}

          {/* ── Step 4: Email groups + Reviewer/Approver ── */}
          {step === 3 && (
            <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-1">
              {/* Email groups — accordion */}
              {emailGroups.length > 0 && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setEmailAccordionOpen((v) => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <Mail className="h-4 w-4 text-slate-500 shrink-0" />
                      <span className="text-sm font-semibold text-slate-700 shrink-0">กลุ่มผู้รับอีเมล</span>
                      {!emailAccordionOpen && deptContactEmails.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {deptContactEmails.map((mail) => {
                            const g = emailGroups.find((x) => x.mail === mail);
                            return (
                              <span key={mail} className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">
                                To: {g?.displayName ?? mail}
                              </span>
                            );
                          })}
                          {form.emailGroupCc.map((mail) => {
                            const g = emailGroups.find((x) => x.mail === mail);
                            return (
                              <span key={mail} className="text-xs bg-slate-200 text-slate-600 rounded-full px-2 py-0.5 font-medium">
                                CC: {g?.displayName ?? mail}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {!emailAccordionOpen && deptContactEmails.length === 0 && form.emailGroupCc.length === 0 && (
                        <span className="text-xs text-slate-400">ยังไม่ได้เลือกผู้รับ</span>
                      )}
                    </div>
                    {emailAccordionOpen ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
                  </button>

                  {emailAccordionOpen && (
                    <div className="p-4 space-y-4">
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                        อีเมลจะถูกส่งหลังจาก <strong>Reviewer</strong> และ <strong>Approver</strong> อนุมัติครบเท่านั้น
                      </p>
                      <div className="grid gap-4 lg:grid-cols-2">
                        {/* To */}
                        <div>
                          <p className="mb-2 text-xs font-semibold text-slate-500">To — ส่งถึง (จากอีเมลติดต่อแผนก)</p>
                          {deptContactEmails.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-400 text-center">ยังไม่ได้เลือกอีเมลติดต่อแผนกในขั้นตอนที่ 3</p>
                          ) : (
                            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                              {deptContactEmails.map((mail) => {
                                const g = emailGroups.find((x) => x.mail === mail);
                                return (
                                  <div key={mail} className="flex items-center gap-3 bg-primary/5 px-4 py-2.5">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-slate-800">{g?.displayName ?? mail}</p>
                                      <p className="text-[11px] text-slate-400">{mail}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        {/* CC */}
                        <div>
                          <p className="mb-2 text-xs font-semibold text-slate-500">CC — สำเนาถึง (ไม่บังคับ)</p>
                          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                            {emailGroups.map((g) => {
                              const checked = form.emailGroupCc.includes(g.mail);
                              return (
                                <label key={g.id} className={cn("flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors", checked ? "bg-primary/5" : "hover:bg-slate-50")}>
                                  <div className={cn(
                                    "h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                                    checked ? "border-primary bg-primary" : "border-slate-300"
                                  )}>
                                    {checked && <Check className="h-3 w-3 text-white" />}
                                  </div>
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={checked}
                                    onChange={(e) => patch({ emailGroupCc: e.target.checked ? [...form.emailGroupCc, g.mail] : form.emailGroupCc.filter((m) => m !== g.mail) })}
                                  />
                                  <div className="min-w-0">
                                    <p className={cn("text-sm", checked ? "font-semibold text-slate-800" : "font-medium text-slate-700")}>{g.displayName}</p>
                                    <p className="text-[11px] text-slate-400">{g.mail.split("@")[0]}</p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Reviewer + Approver */}
              <div className="space-y-3">
                <p className="text-sm font-bold text-slate-800">ผู้อนุมัติ</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(["reviewer", "approver"] as const).map((type) => {
                    const isReviewer = type === "reviewer";
                    const name = isReviewer ? form.reviewerName : form.approverName;
                    const email = isReviewer ? form.reviewerEmail : form.approverEmail;
                    const id = isReviewer ? form.reviewerAuthUserId : form.approverAuthUserId;
                    const color = isReviewer ? "violet" : "fuchsia";
                    return (
                      <div key={type}>
                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {isReviewer ? "Reviewer" : "Approver"} <span className="text-rose-500">*</span>
                        </label>
                        <PersonSearch
                          placeholder={`ค้นหา ${isReviewer ? "Reviewer" : "Approver"}...`}
                          onSelect={(c) =>
                            isReviewer
                              ? patch({ reviewerAuthUserId: c.id, reviewerEmail: c.email ?? "", reviewerName: c.name })
                              : patch({ approverAuthUserId: c.id, approverEmail: c.email ?? "", approverName: c.name })
                          }
                        />
                        {id && (
                          <div className={`mt-2 flex items-center gap-2 rounded-xl border border-${color}-200 bg-${color}-50 px-3 py-2`}>
                            <div className="flex-1">
                              <p className={`text-sm font-medium text-${color}-800`}>{name}</p>
                              <p className={`text-xs text-${color}-500`}>{email}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                isReviewer
                                  ? patch({ reviewerAuthUserId: "", reviewerEmail: "", reviewerName: "" })
                                  : patch({ approverAuthUserId: "", approverEmail: "", approverName: "" })
                              }
                              className={`text-${color}-400 hover:text-${color}-600`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Signature status */}
              {form.signaturePath && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-sm text-emerald-700 font-medium">ลงลายมือชื่อแล้ว</span>
                  <button type="button" onClick={() => setShowSignature(true)} className="ml-auto text-xs text-slate-400 hover:text-slate-600 underline">เปลี่ยน</button>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Navigation — hidden when calendar sub-view handles its own nav */}
        {!(step === 2 && scheduleSubView === "calendar") && (
        <div className="flex items-center justify-between">
          <div>
            {step === 0 ? (
              <Button type="button" variant="outline" asChild>
                <Link href="/audit/plans">ยกเลิก</Link>
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={() => {
                setScheduleSubView("form");
                setStep(step - 1);
              }}>
                <ChevronLeft className="mr-1 h-4 w-4" /> ย้อนกลับ
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">ขั้นตอน {step + 1} / {STEPS.length}</span>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={() => {
                if (step === 2 && form.deptSchedules.some((d) => d.enabled && d.startAt)) {
                  setScheduleSubView("calendar");
                } else {
                  goTo(step + 1);
                }
              }}>
                ถัดไป <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button type="button" onClick={() => handleSubmit()} disabled={isSubmitting}>
                {isSubmitting && <span className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
                {isSubmitting ? "กำลังบันทึก..." : "บันทึกและส่งอนุมัติ"}
              </Button>
            )}
          </div>
        </div>
        )}
      </div>
    </>
  );
}
