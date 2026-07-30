"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, Plus, Trash2, Save, Table2, BarChart3, Users, ChevronDown, ChevronUp, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Types ────────────────────────────────────────────────────────────────────

type AppointmentMember = {
  id: string;
  authUserId: string;
  name: string;
  department: string | null;
  role: string; // LEAD_AUDITOR | AUDITOR | COMMITTEE | SECRETARY | ADVISOR
};

type TeamMember = {
  id?: string;
  role: string; // LEAD_AUDITOR | AUDITOR | OBSERVER | AUDITEE
  name: string;
  authUserId?: string | null;
};

type SessionRow = {
  id?: string;
  orderIndex: number;
  auditDate: string;
  startTime: string;
  endTime: string;
  department: string;
  remark: string | null;
  teamMembers: TeamMember[];
};

type GanttRow = {
  id?: string;
  orderIndex: number;
  department: string;
  processes: string[];
  planWeeks: string[];
  actualWeeks: string[];
};

type Appointment = {
  id: string;
  appointmentNo: string;
  year: number;
  title: string;
  standards: string[];
  status: string;
  members: AppointmentMember[];
  sessionPlan: {
    id: string;
    reviseNo: number;
    reviseDate: string | null;
    sessions: SessionRow[];
    ganttRows: GanttRow[];
  } | null;
};

// ─── User type for Observer picker ───────────────────────────────────────────

type OrgUser = {
  id: string;
  name: string;
  email: string | null;
  department: string | null;
  jobTitle: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

type SessionRole = "LEAD_AUDITOR" | "AUDITOR" | "OBSERVER" | "AUDITEE";

const ROLE_LABELS: Record<SessionRole, string> = {
  LEAD_AUDITOR: "Lead Auditor",
  AUDITOR: "Auditor",
  OBSERVER: "Observer",
  AUDITEE: "ผู้รับการตรวจ",
};

const ROLE_COLORS: Record<SessionRole, string> = {
  LEAD_AUDITOR: "bg-blue-600 text-white border-blue-600",
  AUDITOR: "bg-indigo-500 text-white border-indigo-500",
  OBSERVER: "bg-amber-500 text-white border-amber-500",
  AUDITEE: "bg-emerald-600 text-white border-emerald-600",
};

const ROLE_IDLE: Record<SessionRole, string> = {
  LEAD_AUDITOR: "bg-white text-slate-600 border-slate-200 hover:border-blue-300",
  AUDITOR: "bg-white text-slate-600 border-slate-200 hover:border-indigo-300",
  OBSERVER: "bg-white text-slate-600 border-slate-200 hover:border-amber-300",
  AUDITEE: "bg-white text-slate-600 border-slate-200 hover:border-emerald-300",
};

// Appointment member roles that can be Lead/Auditor in session
const AUDITOR_ELIGIBLE = new Set(["LEAD_AUDITOR", "AUDITOR", "COMMITTEE", "SECRETARY", "ADVISOR"]);

// ─── Week utilities ───────────────────────────────────────────────────────────

function buildWeekColumns(year: number) {
  const yearEn = year - 543;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return monthNames.flatMap((month, mi) =>
    [1, 2, 3, 4].map((w) => ({
      key: `${yearEn}-${mi + 1}-W${w}`,
      label: `W${w}`,
      month,
    }))
  );
}

// ─── Gantt Cell ───────────────────────────────────────────────────────────────

function GanttCell({
  isPlan, isActual, onToggle, disabled,
}: {
  isPlan: boolean; isActual: boolean;
  onToggle: (type: "plan" | "actual") => void; disabled: boolean;
}) {
  return (
    <td className="border border-slate-200 p-0 text-center align-middle" style={{ width: 36 }}>
      <div className="flex flex-col items-center gap-0.5 py-1">
        <button type="button" disabled={disabled} onClick={() => onToggle("plan")}
          className={`w-5 h-2.5 rounded-sm transition-colors ${isPlan ? "bg-blue-500" : "bg-slate-100 hover:bg-blue-200"} disabled:cursor-default`} />
        <button type="button" disabled={disabled} onClick={() => onToggle("actual")}
          className={`w-5 h-2.5 rounded-sm transition-colors ${isActual ? "bg-emerald-500" : "bg-slate-100 hover:bg-emerald-200"} disabled:cursor-default`} />
      </div>
    </td>
  );
}

// ─── Team Panel for one session ───────────────────────────────────────────────

function SessionTeamPanel({
  sessionIdx: _sessionIdx,
  teamMembers,
  appointmentMembers,
  orgUsers,
  canEdit,
  onChange,
}: {
  sessionIdx: number;
  teamMembers: TeamMember[];
  appointmentMembers: AppointmentMember[];
  orgUsers: OrgUser[];
  canEdit: boolean;
  onChange: (members: TeamMember[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [observerSearch, setObserverSearch] = useState("");

  const byRole = (role: SessionRole) => teamMembers.filter((m) => m.role === role);

  function toggle(role: SessionRole, name: string, authUserId?: string | null) {
    const exists = teamMembers.find((m) => m.role === role && m.name === name);
    if (exists) {
      onChange(teamMembers.filter((m) => !(m.role === role && m.name === name)));
    } else {
      onChange([...teamMembers, { role, name, authUserId }]);
    }
  }

  // Lead/Auditor candidates: from appointment members
  const auditorCandidates = appointmentMembers.filter((m) => AUDITOR_ELIGIBLE.has(m.role));

  // Observer candidates: from org users (free)
  const filteredObservers = orgUsers.filter(
    (u) =>
      !observerSearch.trim() ||
      u.name.toLowerCase().includes(observerSearch.toLowerCase()) ||
      (u.department ?? "").toLowerCase().includes(observerSearch.toLowerCase())
  );

  const totalCount = teamMembers.length;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">ทีมตรวจ / Team Assignment</span>
          {totalCount > 0 && (
            <span className="text-xs text-slate-400">({totalCount} คน)</span>
          )}
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>

      {open && (
        <div className="px-4 py-3 space-y-4 bg-white">
          {/* Lead Auditor + Auditor — from appointment members */}
          {(["LEAD_AUDITOR", "AUDITOR"] as SessionRole[]).map((role) => (
            <div key={role}>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">{ROLE_LABELS[role]}</p>
              {canEdit ? (
                <div className="flex flex-wrap gap-1.5">
                  {auditorCandidates.map((m) => {
                    const active = byRole(role).some((tm) => tm.name === m.name);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggle(role, m.name, m.authUserId)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${active ? ROLE_COLORS[role] : ROLE_IDLE[role]}`}
                      >
                        {m.name}
                        {m.department && <span className="opacity-60 ml-1">({m.department})</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {byRole(role).length === 0 ? (
                    <span className="text-xs text-slate-400">—</span>
                  ) : (
                    byRole(role).map((m, i) => (
                      <span key={i} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${ROLE_COLORS[role]}`}>{m.name}</span>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Observer — free pick from org users */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1.5">{ROLE_LABELS.OBSERVER}</p>
            {canEdit && (
              <Input
                value={observerSearch}
                onChange={(e) => setObserverSearch(e.target.value)}
                placeholder="ค้นหา Observer..."
                className="h-7 text-xs rounded-lg border-slate-200 mb-2"
              />
            )}
            {canEdit ? (
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {filteredObservers.map((u) => {
                  const active = byRole("OBSERVER").some((tm) => tm.authUserId === u.id || tm.name === u.name);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggle("OBSERVER", u.name, u.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${active ? ROLE_COLORS.OBSERVER : ROLE_IDLE.OBSERVER}`}
                    >
                      {u.name}
                      {u.department && <span className="opacity-60 ml-1">({u.department})</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {byRole("OBSERVER").length === 0 ? (
                  <span className="text-xs text-slate-400">—</span>
                ) : (
                  byRole("OBSERVER").map((m, i) => (
                    <span key={i} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${ROLE_COLORS.OBSERVER}`}>{m.name}</span>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Auditee — from appointment members */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-1.5">{ROLE_LABELS.AUDITEE}</p>
            {canEdit ? (
              <div className="flex flex-wrap gap-1.5">
                {auditorCandidates.map((m) => {
                  const active = byRole("AUDITEE").some((tm) => tm.name === m.name);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggle("AUDITEE", m.name, m.authUserId)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${active ? ROLE_COLORS.AUDITEE : ROLE_IDLE.AUDITEE}`}
                    >
                      {m.name}
                      {m.department && <span className="opacity-60 ml-1">({m.department})</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {byRole("AUDITEE").length === 0 ? (
                  <span className="text-xs text-slate-400">—</span>
                ) : (
                  byRole("AUDITEE").map((m, i) => (
                    <span key={i} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${ROLE_COLORS.AUDITEE}`}>{m.name}</span>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function AuditSessionPlanClient({
  appointment,
  canEdit,
}: {
  appointment: Appointment;
  canEdit: boolean;
}) {
  const router = useRouter();
  const yearEn = appointment.year - 543;
  const weekCols = buildWeekColumns(appointment.year);
  const monthGroups = ["Apr", "May", "Jun", "Jul"].map((m) => ({ label: m, count: 4 }));

  const [tab, setTab] = useState<"session" | "gantt">("session");
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[]>(
    appointment.sessionPlan?.sessions ?? []
  );
  const [ganttRows, setGanttRows] = useState<GanttRow[]>(
    appointment.sessionPlan?.ganttRows ?? []
  );
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);

  useEffect(() => {
    fetch("/api/audit/appointments/users")
      .then((r) => r.json())
      .then((j) => setOrgUsers((j as { data?: OrgUser[] }).data ?? []))
      .catch(() => {});
  }, []);

  // ── Session helpers ──────────────────────────────────────────────────────

  function addSession() {
    setSessions((prev) => [
      ...prev,
      {
        orderIndex: prev.length,
        auditDate: new Date().toISOString().slice(0, 10),
        startTime: "09:00",
        endTime: "12:00",
        department: "",
        remark: null,
        teamMembers: [],
      },
    ]);
  }

  function removeSession(idx: number) {
    setSessions((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, orderIndex: i })));
  }

  function updateSession<K extends keyof SessionRow>(idx: number, key: K, value: SessionRow[K]) {
    setSessions((prev) => prev.map((s, i) => (i === idx ? { ...s, [key]: value } : s)));
  }

  // ── Gantt helpers ────────────────────────────────────────────────────────

  function addGanttRow() {
    setGanttRows((prev) => [
      ...prev,
      { orderIndex: prev.length, department: "", processes: [""], planWeeks: [], actualWeeks: [] },
    ]);
  }

  function removeGanttRow(idx: number) {
    setGanttRows((prev) => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, orderIndex: i })));
  }

  function updateGanttField<K extends keyof GanttRow>(idx: number, key: K, value: GanttRow[K]) {
    setGanttRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  }

  function toggleWeek(rowIdx: number, weekKey: string, type: "plan" | "actual") {
    const field = type === "plan" ? "planWeeks" : "actualWeeks";
    setGanttRows((prev) =>
      prev.map((r, i) => {
        if (i !== rowIdx) return r;
        const arr = r[field];
        return { ...r, [field]: arr.includes(weekKey) ? arr.filter((w) => w !== weekKey) : [...arr, weekKey] };
      })
    );
  }

  function addProcess(rowIdx: number) {
    setGanttRows((prev) =>
      prev.map((r, i) => (i === rowIdx ? { ...r, processes: [...r.processes, ""] } : r))
    );
  }

  function updateProcess(rowIdx: number, pIdx: number, value: string) {
    setGanttRows((prev) =>
      prev.map((r, i) =>
        i === rowIdx ? { ...r, processes: r.processes.map((p, j) => (j === pIdx ? value : p)) } : r
      )
    );
  }

  function removeProcess(rowIdx: number, pIdx: number) {
    setGanttRows((prev) =>
      prev.map((r, i) =>
        i === rowIdx ? { ...r, processes: r.processes.filter((_, j) => j !== pIdx) } : r
      )
    );
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!appointment.sessionPlan) {
      toast.error("ยังไม่มีแผนการตรวจ กรุณาสร้างแผนก่อน");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/audit/session-plans/${appointment.sessionPlan.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviseNo: appointment.sessionPlan?.reviseNo ?? 0,
          sessions,
          ganttRows,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: { message?: string } }).error?.message ?? "บันทึกไม่สำเร็จ");
      }
      toast.success("บันทึกแผนการตรวจเรียบร้อย");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link href="/audit/appointments" className="hover:text-slate-600 transition-colors flex items-center gap-1">
          <ChevronLeft className="h-3.5 w-3.5" /> ประกาศแต่งตั้ง
        </Link>
        <span>/</span>
        <Link href={`/audit/appointments/${appointment.id}`} className="hover:text-slate-600 transition-colors">
          {appointment.appointmentNo}
        </Link>
        <span>/</span>
        <span className="text-slate-600 font-medium">แผนการตรวจติดตาม</span>
      </nav>

      {/* Header */}
      <div className="rounded-2xl bg-white border border-slate-100 px-6 py-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400 font-mono mb-1">{appointment.appointmentNo}</p>
          <h1 className="text-base font-bold text-slate-900">แผนการตรวจ ปี {appointment.year} ({yearEn})</h1>
          <p className="text-sm text-slate-500 mt-0.5">{appointment.title}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {appointment.standards.map((s) => (
              <span key={s} className="inline-flex rounded-md bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{s}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {appointment.sessionPlan && (
            <>
              {/* Print buttons */}
              <Button asChild variant="outline" className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50">
                <a href={`/print/audit/session-plan/${appointment.sessionPlan.id}?type=gantt`} target="_blank" rel="noreferrer">
                  <Printer className="w-4 h-4 mr-1.5" />
                  พิมพ์ Gantt (FM-MR-06)
                </a>
              </Button>
              <Button asChild variant="outline" className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50">
                <a href={`/print/audit/session-plan/${appointment.sessionPlan.id}?type=session`} target="_blank" rel="noreferrer">
                  <Printer className="w-4 h-4 mr-1.5" />
                  พิมพ์ประกาศตรวจ (FM-MR-07)
                </a>
              </Button>

              {/* Excel download buttons */}
              <Button asChild variant="outline" className="rounded-xl border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800">
                <a href={`/api/audit/session-plans/${appointment.sessionPlan.id}/export?type=gantt`} download>
                  <Download className="w-4 h-4 mr-1.5" />
                  Excel Gantt
                </a>
              </Button>
              <Button asChild variant="outline" className="rounded-xl border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800">
                <a href={`/api/audit/session-plans/${appointment.sessionPlan.id}/export?type=session`} download>
                  <Download className="w-4 h-4 mr-1.5" />
                  Excel ประกาศตรวจ
                </a>
              </Button>
            </>
          )}
          {canEdit && (
            <Button onClick={handleSave} disabled={saving} className="rounded-xl bg-primary hover:bg-[#161875] shrink-0">
              <Save className="w-4 h-4 mr-1.5" />
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        {(["session", "gantt"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            {t === "session" ? <><Table2 className="w-4 h-4" /> ประกาศการตรวจ (Session)</> : <><BarChart3 className="w-4 h-4" /> แผน Gantt</>}
          </button>
        ))}
      </div>

      {/* ── Session tab ─────────────────────────────────────────────────── */}
      {tab === "session" && (
        <div className="space-y-4">
          {sessions.map((s, idx) => (
            <div key={idx} className="rounded-2xl bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
              {/* Row header */}
              <div className="flex items-center gap-3 px-5 py-3 bg-slate-50 border-b border-slate-100">
                <span className="w-6 h-6 rounded-full bg-[#0f1059] text-white text-xs font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                {canEdit ? (
                  <Input
                    value={s.department}
                    onChange={(e) => updateSession(idx, "department", e.target.value)}
                    placeholder="ชื่อหน่วยงานที่ถูกตรวจ..."
                    className="h-8 text-sm font-semibold rounded-lg border-slate-200 flex-1"
                  />
                ) : (
                  <span className="text-sm font-semibold text-slate-800 flex-1">{s.department || "—"}</span>
                )}
                {canEdit && (
                  <button type="button" onClick={() => removeSession(idx)} className="text-slate-300 hover:text-red-500 transition-colors ml-auto shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Date/time row */}
              <div className="px-5 py-3 flex flex-wrap items-center gap-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 shrink-0">วันที่</span>
                  {canEdit ? (
                    <Input
                      type="date"
                      value={s.auditDate.slice(0, 10)}
                      onChange={(e) => updateSession(idx, "auditDate", e.target.value)}
                      className="h-8 text-xs rounded-lg border-slate-200 w-36"
                    />
                  ) : (
                    <span className="text-sm font-medium text-slate-800">
                      {new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(s.auditDate))}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 shrink-0">เวลา</span>
                  {canEdit ? (
                    <div className="flex items-center gap-1">
                      <Input type="time" value={s.startTime} onChange={(e) => updateSession(idx, "startTime", e.target.value)} className="h-8 text-xs rounded-lg border-slate-200 w-24" />
                      <span className="text-slate-300">–</span>
                      <Input type="time" value={s.endTime} onChange={(e) => updateSession(idx, "endTime", e.target.value)} className="h-8 text-xs rounded-lg border-slate-200 w-24" />
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-slate-800">{s.startTime} – {s.endTime}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 shrink-0">หมายเหตุ</span>
                  {canEdit ? (
                    <Input value={s.remark ?? ""} onChange={(e) => updateSession(idx, "remark", e.target.value)} placeholder="—" className="h-8 text-xs rounded-lg border-slate-200 w-40" />
                  ) : (
                    <span className="text-sm text-slate-600">{s.remark || "—"}</span>
                  )}
                </div>
              </div>

              {/* Team panel */}
              <div className="px-5 py-3">
                <SessionTeamPanel
                  sessionIdx={idx}
                  teamMembers={s.teamMembers}
                  appointmentMembers={appointment.members}
                  orgUsers={orgUsers}
                  canEdit={canEdit}
                  onChange={(members) => updateSession(idx, "teamMembers", members)}
                />
              </div>
            </div>
          ))}

          {canEdit && (
            <button type="button" onClick={addSession}
              className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors py-2"
            >
              <Plus className="w-4 h-4" /> เพิ่ม Session
            </button>
          )}
        </div>
      )}

      {/* ── Gantt tab ───────────────────────────────────────────────────── */}
      {tab === "gantt" && (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-1.5"><span className="w-4 h-2.5 rounded-sm bg-blue-500 inline-block" /> Plan</div>
            <div className="flex items-center gap-1.5"><span className="w-4 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Actual</div>
            {canEdit && <span className="text-slate-400">คลิกที่ช่องเพื่อ toggle</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="border-collapse text-xs" style={{ minWidth: 900 }}>
              <thead>
                <tr className="bg-[#0f1059] text-white">
                  <th className="border border-slate-700 px-3 py-2 text-left w-8">No.</th>
                  <th className="border border-slate-700 px-3 py-2 text-left" style={{ minWidth: 140 }}>หน่วยงาน</th>
                  <th className="border border-slate-700 px-3 py-2 text-left" style={{ minWidth: 200 }}>กระบวนการตรวจ</th>
                  <th className="border border-slate-700 px-2 py-2 text-center w-16">P/A</th>
                  {monthGroups.map((mg) => (
                    <th key={mg.label} colSpan={mg.count} className="border border-slate-700 px-2 py-2 text-center">{mg.label}</th>
                  ))}
                  {canEdit && <th className="border border-slate-700 w-8" />}
                </tr>
                <tr className="bg-[#1a2070] text-white/80">
                  <th colSpan={4} />
                  {weekCols.map((w) => (
                    <th key={w.key} className="border border-slate-700 px-1 py-1 text-center font-normal" style={{ width: 36 }}>{w.label}</th>
                  ))}
                  {canEdit && <th />}
                </tr>
              </thead>
              <tbody>
                {ganttRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className={rowIdx % 2 === 0 ? "bg-slate-50/50" : "bg-white"}>
                    <td className="border border-slate-200 px-3 py-2 text-slate-400 text-center align-top">{rowIdx + 1}</td>
                    <td className="border border-slate-200 px-2 py-2 align-top">
                      {canEdit ? (
                        <Input value={row.department} onChange={(e) => updateGanttField(rowIdx, "department", e.target.value)} placeholder="หน่วยงาน" className="h-7 text-xs rounded-lg border-slate-200" />
                      ) : (
                        <span className="font-medium text-slate-800">{row.department}</span>
                      )}
                    </td>
                    <td className="border border-slate-200 px-2 py-2 align-top">
                      <div className="space-y-1">
                        {row.processes.map((p, pIdx) => (
                          <div key={pIdx} className="flex items-center gap-1">
                            <span className="text-slate-300 shrink-0">•</span>
                            {canEdit ? (
                              <Input value={p} onChange={(e) => updateProcess(rowIdx, pIdx, e.target.value)} placeholder="กระบวนการ..." className="h-6 text-xs rounded border-slate-200 flex-1" />
                            ) : (
                              <span className="text-slate-700">{p}</span>
                            )}
                            {canEdit && row.processes.length > 1 && (
                              <button type="button" onClick={() => removeProcess(rowIdx, pIdx)} className="text-slate-300 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                            )}
                          </div>
                        ))}
                        {canEdit && (
                          <button type="button" onClick={() => addProcess(rowIdx)} className="text-indigo-500 hover:text-indigo-700 text-xs flex items-center gap-0.5">
                            <Plus className="w-3 h-3" /> เพิ่ม
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="border border-slate-200 px-1 py-0 align-middle">
                      <div className="flex flex-col items-center gap-0.5 py-1">
                        <span className="text-blue-500 font-semibold" style={{ fontSize: 9 }}>Plan</span>
                        <span className="text-emerald-600 font-semibold" style={{ fontSize: 9 }}>Actual</span>
                      </div>
                    </td>
                    {weekCols.map((w) => (
                      <GanttCell key={w.key}
                        isPlan={row.planWeeks.includes(w.key)} isActual={row.actualWeeks.includes(w.key)}
                        onToggle={(type) => toggleWeek(rowIdx, w.key, type)} disabled={!canEdit} />
                    ))}
                    {canEdit && (
                      <td className="border border-slate-200 px-2 py-2 align-top">
                        <button type="button" onClick={() => removeGanttRow(rowIdx)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {canEdit && (
            <div className="border-t border-slate-100 px-4 py-3">
              <button type="button" onClick={addGanttRow} className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
                <Plus className="w-3.5 h-3.5" /> เพิ่มแถว Gantt
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
