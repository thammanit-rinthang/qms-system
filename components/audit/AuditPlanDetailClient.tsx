"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, FileText, Paperclip, Plus, Trash2, CheckCircle2, XCircle, PenLine, Send, Megaphone, Clock, AlertTriangle, Mail, Printer, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/formatters";
import { INPUT_CLASS } from "@/lib/styles";
import AuditPlanStatusBadge from "./AuditPlanStatusBadge";
import AuditPlanPrintHeaderCard from "./AuditPlanPrintHeaderCard";
import AuditPlanFormModal from "./AuditPlanFormModal";
import AuditPlanAssignDialog from "./AuditPlanAssignDialog";
import { useAuditPlanDetail, useAnnouncePlan, useSignPlanInApp, useGenerateReport, useClosePlan, useIssueSignRequest, useSubmitPlan, useCompleteAudit } from "@/hooks/api/use-audit-plan-detail";
import { useAuditSchedules, useCreateSchedule, useDeleteSchedule, useConfirmSchedule, useAcceptSuggestedDate, useSubmitChecklist } from "@/hooks/api/use-audit-schedules";
import { AuditPersonSearch } from "./AuditPersonSearch";
import { useAuditAttachments, useDeleteAuditAttachment, useUploadAuditAttachment } from "@/hooks/api/use-audit-attachments";
import { useDeleteAuditPlan } from "@/hooks/api/use-audit-plans";
import { canDeleteAuditPlan } from "@/lib/audit/permissions";
import {
  AUDIT_TYPE_LABELS,
  AUDIT_MODE_LABELS,
  AUDIT_TEAM_ROLE_LABELS,
  type AuditPlanDetail,
  type AuditTeamRole,
} from "@/types/audit";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  auditScheduleCreateSchema,
  auditReportSchema,
  auditAnnounceSchema,
  type AuditScheduleCreateInput,
  type AuditReportInput,
  type AuditAnnounceInput,
} from "@/lib/validations/audit";

interface Props {
  plan: AuditPlanDetail;
  userId: string;
  userRole: string;
  isPrivileged: boolean;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const CONFIRM_STATUS_CONFIG = {
  PENDING:     { label: "รอยืนยัน",   icon: Clock,         className: "border-amber-200  bg-amber-50  text-amber-700"  },
  CONFIRMED:   { label: "ยืนยันแล้ว", icon: CheckCircle2,  className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  UNAVAILABLE: { label: "ไม่ว่าง",    icon: AlertTriangle, className: "border-red-200    bg-red-50    text-red-700"    },
  SUGGESTED:   { label: "เสนอวันใหม่", icon: CalendarDays, className: "border-blue-200 bg-blue-50 text-blue-700" },
} as const;

type TeamEntry = { authUserId: string; nameSnapshot: string | null; emailSnapshot: string | null; role: AuditTeamRole };

const SCHEDULE_TEAM_ROLES: { role: AuditTeamRole; label: string }[] = [
  { role: "LEAD_AUDITOR", label: "หัวหน้าผู้ตรวจสอบ" },
  { role: "AUDITOR", label: "ผู้ตรวจสอบ" },
  { role: "OBSERVER", label: "ผู้สังเกตการณ์" },
];

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const TH_DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

const getLocalDateString = (dateStr: string | null | undefined) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const formatDateThai = (dateStr: string) => {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  return `${d} ${TH_MONTHS[m]} ${y + 543}`;
};

function ScheduleTab({ plan, canManage }: { plan: AuditPlanDetail; canManage: boolean }) {
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [unavailableTarget, setUnavailableTarget] = useState<string | null>(null);
  const [unavailableReason, setUnavailableReason] = useState("");
  const [checklistTarget, setChecklistTarget] = useState<string | null>(null);
  const [checklistFile, setChecklistFile] = useState<File | null>(null);
  const [addTeam, setAddTeam] = useState<TeamEntry[]>([]);
  const [proposedStart, setProposedStart] = useState("");
  const [proposedEnd, setProposedEnd] = useState("");
  const [scheduleViewMode, setScheduleViewMode] = useState<"list" | "calendar">("list");
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  const { data: schedules = plan.schedules, isLoading } = useAuditSchedules(plan.id);
  const createMutation = useCreateSchedule(plan.id);
  const deleteMutation = useDeleteSchedule(plan.id);
  const confirmMutation = useConfirmSchedule(plan.id);
  const acceptSuggestedMutation = useAcceptSuggestedDate(plan.id);
  const checklistMutation = useSubmitChecklist(plan.id);

  // ponytail: resolver cast suppresses coerce.date() input/output type mismatch — pre-existing pattern
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AuditScheduleCreateInput>({
    resolver: zodResolver(auditScheduleCreateSchema) as never,
  });

  function onSubmit(data: AuditScheduleCreateInput) {
    const lead = addTeam.find((m) => m.role === "LEAD_AUDITOR");
    createMutation.mutate({
      ...data,
      team: addTeam.map((m) => ({ authUserId: m.authUserId, nameSnapshot: m.nameSnapshot ?? undefined, emailSnapshot: m.emailSnapshot ?? undefined, role: m.role })),
      leadAuditorAuthUserId: lead?.authUserId,
      leadAuditorNameSnapshot: lead?.nameSnapshot ?? undefined,
    }, {
      onSuccess: () => { toast.success("เพิ่มตารางเวลาสำเร็จ"); setShowAdd(false); reset(); setAddTeam([]); },
      onError: (err) => toast.error(err.message),
    });
  }

  function handleConfirm(id: string) {
    confirmMutation.mutate({ id, input: { status: "CONFIRMED" } }, {
      onSuccess: () => toast.success("ยืนยันตารางสำเร็จ"),
      onError: (err) => toast.error(err.message),
    });
  }

  function handleUnavailable() {
    if (!unavailableTarget || !unavailableReason.trim()) return;
    const hasSuggestedDate = Boolean(proposedStart && proposedEnd);
    confirmMutation.mutate({ id: unavailableTarget, input: {
      status: hasSuggestedDate ? "SUGGESTED" : "UNAVAILABLE",
      reason: unavailableReason.trim(),
      ...(hasSuggestedDate ? { suggestedStartAt: new Date(proposedStart), suggestedEndAt: new Date(proposedEnd) } : {}),
    } }, {
      onSuccess: () => {
        toast.success("บันทึกเรียบร้อย");
        setUnavailableTarget(null);
        setUnavailableReason("");
        setProposedStart("");
        setProposedEnd("");
      },
      onError: (err) => toast.error(err.message),
    });
  }

  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

  const totalDays = daysInMonth(viewYear, viewMonth);
  const startDay = firstDayOfMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [...Array(startDay).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const DEPT_COLORS = [
    "bg-indigo-500", "bg-violet-500", "bg-blue-500", "bg-teal-500",
    "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-fuchsia-500",
  ];
  const deptIds = [...new Set(schedules.map((s) => s.departmentId).filter(Boolean))];
  const colorMap = Object.fromEntries(deptIds.map((id, i) => [id, DEPT_COLORS[i % DEPT_COLORS.length]]));

  const byDate: Record<string, typeof schedules> = {};
  schedules.forEach((s) => {
    const key = getLocalDateString(s.startAt);
    if (key) {
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(s);
    }
  });

  const monthlySchedules = schedules.filter((s) => {
    if (!s.startAt) return false;
    const d = new Date(s.startAt);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  });

  const displayedSchedules = selectedDateStr
    ? schedules.filter((s) => getLocalDateString(s.startAt) === selectedDateStr)
    : monthlySchedules;

  if (isLoading) return <Skeleton className="h-24 w-full rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Toggle View Mode */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => { setScheduleViewMode("list"); setSelectedDateStr(null); }}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
              scheduleViewMode === "list"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            รายการตาราง
          </button>
          <button
            type="button"
            onClick={() => setScheduleViewMode("calendar")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
              scheduleViewMode === "calendar"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            ปฏิทิน
          </button>
        </div>

        {canManage && (
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4 mr-1.5" />เพิ่มตารางเวลา
          </Button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border border-violet-100 bg-violet-50/40 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">รายการตารางเวลาใหม่</p>

          {/* Department picker */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">แผนก</label>
              <select {...register("departmentId")} className={INPUT_CLASS}
                onChange={(e) => {
                  const opt = e.target.options[e.target.selectedIndex];
                  const nameInput = e.target.closest("form")?.querySelector<HTMLInputElement>("[name=departmentName]");
                  if (nameInput) nameInput.value = opt.text === "-- ไม่ระบุ --" ? "" : opt.text;
                }}>
                <option value="">-- ไม่ระบุ --</option>
                {plan.departments.map((d) => (
                  <option key={d.departmentId} value={d.departmentId}>{d.departmentName ?? d.departmentId}</option>
                ))}
              </select>
              <input type="hidden" {...register("departmentName")} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />อีเมลผู้ติดต่อแผนก</span>
              </label>
              <input {...register("contactEmail")} type="email" placeholder="dept@company.com" className={INPUT_CLASS} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">ชื่อช่วงตรวจสอบ *</label>
            <input {...register("sessionTitle")} type="text" className={INPUT_CLASS} />
            {errors.sessionTitle && <p className="mt-1 text-xs text-rose-500">{errors.sessionTitle.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">สถานที่</label>
            <input {...register("location")} type="text" className={INPUT_CLASS} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">เริ่มต้น *</label>
              <input {...register("startAt")} type="datetime-local" className={INPUT_CLASS} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">สิ้นสุด *</label>
              <input {...register("endAt")} type="datetime-local" className={INPUT_CLASS} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">วาระการประชุม</label>
            <textarea {...register("agenda")} rows={2} className={cn(INPUT_CLASS, "resize-none")} />
          </div>

          {/* Team picker */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">ทีมตรวจสอบ</p>
            {SCHEDULE_TEAM_ROLES.map(({ role, label }) => {
              const members = addTeam.filter((m) => m.role === role);
              return (
                <div key={role}>
                  <p className="mb-1 text-[11px] text-slate-500">{label}</p>
                  <AuditPersonSearch
                    placeholder={`ค้นหา${label}...`}
                    exclude={members.map((m) => m.authUserId)}
                    onSelect={(c) => {
                      if (addTeam.some((m) => m.authUserId === c.id && m.role === role)) return;
                      setAddTeam((prev) => [...prev, { authUserId: c.id, nameSnapshot: c.name, emailSnapshot: c.email ?? null, role }]);
                    }}
                  />
                  {members.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {members.map((m) => (
                        <span key={m.authUserId} className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-medium px-2 py-0.5">
                          {m.nameSnapshot}
                          <button type="button" onClick={() => setAddTeam((prev) => prev.filter((x) => !(x.authUserId === m.authUserId && x.role === role)))} className="opacity-60 hover:opacity-100">
                            <XCircle className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => { setShowAdd(false); reset(); setAddTeam([]); }}>ยกเลิก</Button>
            <Button type="submit" size="sm" disabled={createMutation.isPending}>
              {createMutation.isPending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </div>
        </form>
      )}

      {/* Schedule list / Calendar View */}
      {scheduleViewMode === "list" ? (
        schedules.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">ยังไม่มีตารางเวลา</p>
        ) : (
          <div className="space-y-3">
            {schedules.map((s) => {
              const cfg = CONFIRM_STATUS_CONFIG[s.confirmStatus ?? "PENDING"];
              const StatusIcon = cfg.icon;
              return (
                <div key={s.id} className={cn(
                  "rounded-xl border bg-white p-4 space-y-3",
                  s.confirmStatus === "UNAVAILABLE" ? "border-red-200" : "border-slate-100"
                )}>
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {s.departmentName && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                            <Building2 className="h-3 w-3" />{s.departmentName}
                          </span>
                        )}
                        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold", cfg.className)}>
                          <StatusIcon className="h-3 w-3" />{cfg.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{s.sessionTitle}</p>
                      {s.location && <p className="text-xs text-slate-500 mt-0.5">{s.location}</p>}
                      <p className="text-xs text-slate-400 mt-1 font-mono">{formatDateTime(s.startAt)} — {formatDateTime(s.endAt)}</p>
                      {s.agenda && <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{s.agenda}</p>}
                      {s.confirmStatus === "UNAVAILABLE" && s.unavailableReason && (
                        <div className="mt-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                          <p className="text-xs font-medium text-red-700">เหตุผล: {s.unavailableReason}</p>
                        </div>
                      )}
                      {s.confirmStatus === "SUGGESTED" && (
                        <div className="mt-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 space-y-1">
                          <p className="text-xs font-medium text-blue-700">เหตุผล: {s.suggestedReason ?? s.unavailableReason ?? "-"}</p>
                          <p className="text-xs text-blue-700">วันเวลาใหม่: {formatDateTime(s.suggestedStartAt)} — {formatDateTime(s.suggestedEndAt)}</p>
                          {s.suggestedByName && <p className="text-[11px] text-blue-600">เสนอโดย: {s.suggestedByName}</p>}
                        </div>
                      )}
                      {s.team && s.team.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {(["LEAD_AUDITOR", "AUDITOR", "OBSERVER", "AUDITEE"] as AuditTeamRole[])
                            .map((role) => {
                              const members = s.team.filter((m) => m.role === role);
                              if (members.length === 0) return null;
                              return (
                                <div key={role} className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[11px] text-slate-400 shrink-0 w-24">{AUDIT_TEAM_ROLE_LABELS[role]}:</span>
                                  {members.map((m) => (
                                    <span key={m.id} className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                      {m.nameSnapshot ?? m.authUserId}
                                    </span>
                                  ))}
                                </div>
                              );
                            })}
                        </div>
                      )}
                      {(!s.team || s.team.length === 0) && s.leadAuditorNameSnapshot && (
                        <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-1">
                          <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 rounded-md px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                            {s.leadAuditorNameSnapshot}
                          </span>
                          <span className="text-slate-400">หัวผู้ตรวจสอบ</span>
                        </p>
                      )}
                      {s.confirmStatus !== "PENDING" && s.confirmedByName && (
                        <p className="text-xs text-slate-400 mt-1">
                          {s.confirmStatus === "CONFIRMED" ? "ยืนยันโดย" : "แจ้งโดย"}: {s.confirmedByName}
                          {s.confirmedAt ? ` · ${formatDateTime(s.confirmedAt)}` : ""}
                        </p>
                      )}
                      {/* Checklist status */}
                      {s.checklistSubmittedAt ? (
                        <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          ส่ง Checklist แล้ว — {s.checklistSubmittedByName}
                          {s.checklistDueAt && ` (กำหนด ${formatDateTime(s.checklistDueAt)})`}
                        </p>
                      ) : s.checklistDueAt ? (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          กำหนดส่ง Checklist: {formatDateTime(s.checklistDueAt)}
                        </p>
                      ) : null}พิ
                    </div>
                    {canManage && (
                      <button type="button" aria-label="ลบ" onClick={() => setDeleteTarget(s.id)}
                        className="shrink-0 h-7 w-7 rounded-lg border border-rose-200 bg-white text-rose-500 hover:bg-rose-50 flex items-center justify-center">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Action row — confirm / unavailable buttons */}
                  {s.confirmStatus === "PENDING" && (
                    <div className="flex gap-2 pt-1 border-t border-slate-100">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs"
                        disabled={confirmMutation.isPending}
                        onClick={() => handleConfirm(s.id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />ยืนยันว่าง
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-red-200 text-red-600 hover:bg-red-50 text-xs"
                        onClick={() => { setUnavailableTarget(s.id); setUnavailableReason(""); }}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />ไม่ว่าง
                      </Button>
                    </div>
                  )}
                  {s.confirmStatus === "UNAVAILABLE" && canManage && (
                    <div className="flex gap-2 pt-1 border-t border-slate-100">
                      <p className="text-xs text-slate-400 self-center flex-1">QMS/IT แก้ไขวันใหม่เพื่อรีเซ็ตสถานะ</p>
                    </div>
                  )}
                  {s.confirmStatus === "SUGGESTED" && canManage && (
                    <div className="flex gap-2 pt-1 border-t border-slate-100">
                      <Button
                        size="sm"
                        className="h-8 bg-blue-600 hover:bg-blue-700 text-xs"
                        disabled={acceptSuggestedMutation.isPending}
                        onClick={() => acceptSuggestedMutation.mutate(s.id, {
                          onSuccess: () => toast.success("รับวันใหม่แล้ว ระบบส่งคำเชิญใหม่แล้ว"),
                          onError: (err) => toast.error(err.message),
                        })}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />รับวันใหม่และส่งคำเชิญ
                      </Button>
                    </div>
                  )}
                  {/* Checklist submit button — shown when confirmed + no checklist yet */}
                  {s.confirmStatus === "CONFIRMED" && !s.checklistSubmittedAt && (
                    <div className="flex gap-2 pt-1 border-t border-slate-100">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-violet-200 text-violet-700 hover:bg-violet-50 text-xs"
                        onClick={() => { setChecklistTarget(s.id); setChecklistFile(null); }}
                      >
                        <Paperclip className="h-3.5 w-3.5 mr-1" />ส่ง Checklist
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            {/* Month/Year Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  if (viewMonth === 0) {
                    setViewMonth(11);
                    setViewYear((y) => y - 1);
                  } else {
                    setViewMonth((m) => m - 1);
                  }
                  setSelectedDateStr(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-slate-500" />
              </button>
              <span className="text-sm font-bold text-slate-700">
                {TH_MONTHS[viewMonth]} {viewYear + 543}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (viewMonth === 11) {
                    setViewMonth(0);
                    setViewYear((y) => y + 1);
                  } else {
                    setViewMonth((m) => m + 1);
                  }
                  setSelectedDateStr(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-slate-100 text-center bg-slate-50/50">
              {TH_DAYS.map((d) => (
                <div key={d} className="text-xs font-semibold text-slate-400 py-2">{d}</div>
              ))}
            </div>

            {/* Day Cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
              {cells.map((day, idx) => {
                if (!day) return <div key={idx} className="min-h-[90px] bg-slate-50/30" />;
                const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const daySessions = byDate[key] ?? [];
                const isToday =
                  new Date().getFullYear() === viewYear &&
                  new Date().getMonth() === viewMonth &&
                  new Date().getDate() === day;
                const isSelected = selectedDateStr === key;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedDateStr(null);
                      } else {
                        setSelectedDateStr(key);
                      }
                    }}
                    className={cn(
                      "min-h-[90px] p-2 flex flex-col gap-1.5 cursor-pointer hover:bg-slate-50/80 transition-colors select-none",
                      isSelected && "bg-blue-50/50"
                    )}
                  >
                    <span
                      className={cn(
                        "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full self-start leading-none",
                        isToday && "bg-primary text-white",
                        isSelected && !isToday && "bg-blue-100 text-blue-700"
                      )}
                    >
                      {day}
                    </span>
                    <div className="flex flex-col gap-1 overflow-y-auto max-h-[60px]">
                      {daySessions.map((s) => {
                        const bgCol = s.departmentId ? colorMap[s.departmentId] : "bg-slate-500";
                        return (
                          <div
                            key={s.id}
                            title={`${s.departmentName ?? "ไม่ระบุแผนก"}: ${s.sessionTitle}`}
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[10px] font-medium text-white leading-tight truncate",
                              bgCol
                            )}
                          >
                            {s.departmentName ?? s.sessionTitle}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Calendar List View */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">
                {selectedDateStr ? (
                  <>
                    รายการตารางของวันที่ {formatDateThai(selectedDateStr)}{" "}
                    <span className="text-slate-500 font-normal">({displayedSchedules.length} รายการ)</span>
                  </>
                ) : (
                  <>
                    รายการตารางในเดือน {TH_MONTHS[viewMonth]} {viewYear + 543}{" "}
                    <span className="text-slate-500 font-normal">({displayedSchedules.length} รายการ)</span>
                  </>
                )}
              </h3>
              {selectedDateStr && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-primary hover:bg-slate-100 font-semibold"
                  onClick={() => setSelectedDateStr(null)}
                >
                  แสดงทั้งหมดในเดือนนี้
                </Button>
              )}
            </div>

            {displayedSchedules.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center border rounded-xl border-dashed border-slate-200 bg-white">
                ไม่มีตารางเวลาสำหรับช่วงที่เลือก
              </p>
            ) : (
              <div className="space-y-3">
                {displayedSchedules.map((s) => {
                  const cfg = CONFIRM_STATUS_CONFIG[s.confirmStatus ?? "PENDING"];
                  const StatusIcon = cfg.icon;
                  return (
                    <div key={s.id} className={cn(
                      "rounded-xl border bg-white p-4 space-y-3 shadow-sm",
                      s.confirmStatus === "UNAVAILABLE" ? "border-red-200" : "border-slate-100"
                    )}>
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {s.departmentName && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                <Building2 className="h-3 w-3" />{s.departmentName}
                              </span>
                            )}
                            <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold", cfg.className)}>
                              <StatusIcon className="h-3 w-3" />{cfg.label}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-semibold text-slate-800">{s.sessionTitle}</p>
                          {s.location && <p className="text-xs text-slate-500 mt-0.5">{s.location}</p>}
                          <p className="text-xs text-slate-400 mt-1 font-mono">{formatDateTime(s.startAt)} — {formatDateTime(s.endAt)}</p>
                          {s.agenda && <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{s.agenda}</p>}
                          {s.confirmStatus === "UNAVAILABLE" && s.unavailableReason && (
                            <div className="mt-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                              <p className="text-xs font-medium text-red-700">เหตุผล: {s.unavailableReason}</p>
                            </div>
                          )}
                          {s.team && s.team.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {(["LEAD_AUDITOR", "AUDITOR", "OBSERVER", "AUDITEE"] as AuditTeamRole[])
                                .map((role) => {
                                  const members = s.team.filter((m) => m.role === role);
                                  if (members.length === 0) return null;
                                  return (
                                    <div key={role} className="flex flex-wrap items-center gap-1.5">
                                      <span className="text-[11px] text-slate-400 shrink-0 w-24">{AUDIT_TEAM_ROLE_LABELS[role]}:</span>
                                      {members.map((m) => (
                                        <span key={m.id} className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                                          {m.nameSnapshot ?? m.authUserId}
                                        </span>
                                      ))}
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                          {(!s.team || s.team.length === 0) && s.leadAuditorNameSnapshot && (
                            <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-1">
                              <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 rounded-md px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                                {s.leadAuditorNameSnapshot}
                              </span>
                              <span className="text-slate-400">หัวผู้ตรวจสอบ</span>
                            </p>
                          )}
                          {s.confirmStatus !== "PENDING" && s.confirmedByName && (
                            <p className="text-xs text-slate-400 mt-1">
                              {s.confirmStatus === "CONFIRMED" ? "ยืนยันโดย" : "แจ้งโดย"}: {s.confirmedByName}
                              {s.confirmedAt ? ` · ${formatDateTime(s.confirmedAt)}` : ""}
                            </p>
                          )}
                          {/* Checklist status */}
                          {s.checklistSubmittedAt ? (
                            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              ส่ง Checklist แล้ว — {s.checklistSubmittedByName}
                              {s.checklistDueAt && ` (กำหนด ${formatDateTime(s.checklistDueAt)})`}
                            </p>
                          ) : s.checklistDueAt ? (
                            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              กำหนดส่ง Checklist: {formatDateTime(s.checklistDueAt)}
                            </p>
                          ) : null}
                        </div>
                        {canManage && (
                          <button type="button" aria-label="ลบ" onClick={() => setDeleteTarget(s.id)}
                            className="shrink-0 h-7 w-7 rounded-lg border border-rose-200 bg-white text-rose-500 hover:bg-rose-50 flex items-center justify-center">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Action row — confirm / unavailable buttons */}
                      {s.confirmStatus === "PENDING" && (
                        <div className="flex gap-2 pt-1 border-t border-slate-100">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs"
                            disabled={confirmMutation.isPending}
                            onClick={() => handleConfirm(s.id)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />ยืนยันว่าง
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-red-200 text-red-600 hover:bg-red-50 text-xs"
                            onClick={() => { setUnavailableTarget(s.id); setUnavailableReason(""); }}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />ไม่ว่าง
                          </Button>
                        </div>
                      )}
                      {s.confirmStatus === "UNAVAILABLE" && canManage && (
                        <div className="flex gap-2 pt-1 border-t border-slate-100">
                          <p className="text-xs text-slate-400 self-center flex-1">QMS/IT แก้ไขวันใหม่เพื่อรีเซ็ตสถานะ</p>
                        </div>
                      )}
                      {/* Checklist submit button — shown when confirmed + no checklist yet */}
                      {s.confirmStatus === "CONFIRMED" && !s.checklistSubmittedAt && (
                        <div className="flex gap-2 pt-1 border-t border-slate-100">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 border-violet-200 text-violet-700 hover:bg-violet-50 text-xs"
                            onClick={() => { setChecklistTarget(s.id); setChecklistFile(null); }}
                          >
                            <Paperclip className="h-3.5 w-3.5 mr-1" />ส่ง Checklist
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checklist upload dialog */}
      <Dialog open={!!checklistTarget} onOpenChange={(v) => { if (!v) { setChecklistTarget(null); setChecklistFile(null); } }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-violet-500" />ส่ง Checklist
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">แนบเอกสาร Checklist เพื่อยืนยันการตรวจสอบเสร็จสิ้น</p>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/40 p-4 hover:bg-violet-50 transition-colors">
              <Paperclip className="h-6 w-6 text-violet-400" />
              <span className="text-sm font-medium text-violet-700">
                {checklistFile ? checklistFile.name : "คลิกเพื่อเลือกไฟล์"}
              </span>
              <span className="text-xs text-slate-400">PDF, Word, Excel, PNG, JPEG — ไม่เกิน 20 MB</span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
                onChange={(e) => setChecklistFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => setChecklistTarget(null)}>ยกเลิก</Button>
            <Button
              className="rounded-xl"
              disabled={!checklistFile || checklistMutation.isPending}
              onClick={() => {
                if (!checklistTarget || !checklistFile) return;
                checklistMutation.mutate({ id: checklistTarget, file: checklistFile }, {
                  onSuccess: () => { toast.success("ส่ง Checklist สำเร็จ"); setChecklistTarget(null); setChecklistFile(null); },
                  onError: (err) => toast.error(err.message),
                });
              }}
            >
              {checklistMutation.isPending ? "กำลังส่ง..." : "ส่ง Checklist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unavailable reason dialog */}
      <Dialog open={!!unavailableTarget} onOpenChange={(v) => { if (!v) { setUnavailableTarget(null); setUnavailableReason(""); setProposedStart(""); setProposedEnd(""); } }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />แจ้งไม่ว่าง
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">เหตุผล <span className="text-red-500">*</span></label>
              <textarea
                rows={3}
                value={unavailableReason}
                onChange={(e) => setUnavailableReason(e.target.value)}
                placeholder="ระบุเหตุผลที่ไม่ว่าง..."
                className={cn(INPUT_CLASS, "resize-none")}
              />
            </div>
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <span className="text-xs font-semibold text-slate-700 block">เสนอวันเวลาที่สะดวกใหม่ (ถ้ามี)</span>
              <div className="grid gap-2 grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">เริ่มต้น</label>
                  <input
                    type="datetime-local"
                    value={proposedStart}
                    onChange={(e) => setProposedStart(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">สิ้นสุด</label>
                  <input
                    type="datetime-local"
                    value={proposedEnd}
                    onChange={(e) => setProposedEnd(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => { setUnavailableTarget(null); setUnavailableReason(""); setProposedStart(""); setProposedEnd(""); }}>ยกเลิก</Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={!unavailableReason.trim() || confirmMutation.isPending}
              onClick={handleUnavailable}
            >
              {confirmMutation.isPending ? "กำลังบันทึก..." : "ยืนยันไม่ว่าง"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>ยืนยันการลบตารางเวลา</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">คุณต้องการลบรายการตารางเวลานี้ใช่หรือไม่?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>ยกเลิก</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => {
              if (deleteTarget) deleteMutation.mutate(deleteTarget, {
                onSuccess: () => { toast.success("ลบตารางเวลาสำเร็จ"); setDeleteTarget(null); },
                onError: (err) => toast.error(err.message),
              });
            }}>
              {deleteMutation.isPending ? "กำลังลบ..." : "ลบ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FindingsTab({ plan, canUpload }: { plan: AuditPlanDetail; canUpload: boolean }) {
  const { data: attachments = [], isLoading } = useAuditAttachments("FINDING", plan.id);
  const uploadMutation = useUploadAuditAttachment(plan.id);
  const deleteMutation = useDeleteAuditAttachment("FINDING", plan.id);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) return <Skeleton className="h-24 w-full rounded-xl" />;

  function handleUpload() {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile, {
      onSuccess: () => {
        toast.success("อัปโหลดไฟล์สำเร็จ");
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-4">
      {canUpload && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">อัปโหลดไฟล์ข้อค้นพบ</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary hover:file:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {selectedFile && <p className="text-xs text-slate-500">{selectedFile.name}</p>}
          <p className="text-xs text-slate-400">รองรับ .pdf, .docx, .xlsx, .png, .jpg — ขนาดสูงสุด 20 MB</p>
          <div className="flex justify-end">
            <Button size="sm" disabled={!selectedFile || uploadMutation.isPending} onClick={handleUpload}>
              {uploadMutation.isPending ? "กำลังอัปโหลด..." : "อัปโหลด"}
            </Button>
          </div>
        </div>
      )}
      {attachments.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">ยังไม่มีไฟล์ข้อค้นพบ</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-100 bg-white p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{a.fileName}</p>
                {(a.spDownloadUrl ?? a.fileUrl) && (
                  <a href={a.spDownloadUrl ?? a.fileUrl ?? undefined} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block">{a.fileName}</a>
                )}
                <p className="text-xs text-slate-400 mt-0.5">
                  {a.sizeBytes ? formatBytes(a.sizeBytes) + " · " : ""}{formatDateTime(a.createdAt)}
                </p>
              </div>
              {canUpload && (
                <button type="button" aria-label="ลบ" onClick={() => setDeleteTarget(a.id)}
                  className="shrink-0 h-7 w-7 rounded-lg border border-rose-200 bg-white text-rose-500 hover:bg-rose-50 flex items-center justify-center">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>ยืนยันการลบไฟล์</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">คุณต้องการลบไฟล์นี้ใช่หรือไม่?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>ยกเลิก</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => {
              if (deleteTarget) deleteMutation.mutate(deleteTarget, {
                onSuccess: () => { toast.success("ลบไฟล์สำเร็จ"); setDeleteTarget(null); },
                onError: (err) => toast.error(err.message),
              });
            }}>
              {deleteMutation.isPending ? "กำลังลบ..." : "ลบ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AttachmentsTab({ plan, canUpload }: { plan: AuditPlanDetail; canUpload: boolean }) {
  const { data: attachments = [], isLoading } = useAuditAttachments("PLAN", plan.id);
  const uploadMutation = useUploadAuditAttachment(plan.id);
  const deleteMutation = useDeleteAuditAttachment("PLAN", plan.id);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (isLoading) return <Skeleton className="h-24 w-full rounded-xl" />;

  function handleUpload() {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile, {
      onSuccess: () => {
        toast.success("อัปโหลดไฟล์สำเร็จ");
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-4">
      {canUpload && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">อัปโหลดไฟล์แนบ</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary hover:file:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {selectedFile && (
            <p className="text-xs text-slate-500">{selectedFile.name}</p>
          )}
          <p className="text-xs text-slate-400">รองรับ .pdf, .docx, .xlsx, .png, .jpg — ขนาดสูงสุด 20 MB</p>
          <div className="flex justify-end">
            <Button size="sm" disabled={!selectedFile || uploadMutation.isPending} onClick={handleUpload}>
              {uploadMutation.isPending ? "กำลังอัปโหลด..." : "อัปโหลด"}
            </Button>
          </div>
        </div>
      )}
      {attachments.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">ยังไม่มีไฟล์แนบ</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((a) => (
            <div key={a.id} className="rounded-xl border border-slate-100 bg-white p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{a.fileName}</p>
                {(a.spDownloadUrl ?? a.fileUrl) && (
                  <a href={a.spDownloadUrl ?? a.fileUrl ?? undefined} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block">{a.fileName}</a>
                )}
                <p className="text-xs text-slate-400 mt-0.5">
                  {a.sizeBytes ? formatBytes(a.sizeBytes) + " · " : ""}{formatDateTime(a.createdAt)}
                </p>
              </div>
              {canUpload && (
                <button type="button" aria-label="ลบ" onClick={() => setDeleteTarget(a.id)}
                  className="shrink-0 h-7 w-7 rounded-lg border border-rose-200 bg-white text-rose-500 hover:bg-rose-50 flex items-center justify-center">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>ยืนยันการลบไฟล์แนบ</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">คุณต้องการลบไฟล์แนบนี้ใช่หรือไม่?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>ยกเลิก</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => {
              if (deleteTarget) deleteMutation.mutate(deleteTarget, {
                onSuccess: () => { toast.success("ลบไฟล์แนบสำเร็จ"); setDeleteTarget(null); },
                onError: (err) => toast.error(err.message),
              });
            }}>
              {deleteMutation.isPending ? "กำลังลบ..." : "ลบ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AuditPlanDetailClient({ plan: initialPlan, userId, userRole, isPrivileged }: Props) {
  const [showEdit, setShowEdit] = useState(false);
  const [showClosePlanConfirm, setShowClosePlanConfirm] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showSignInAppConfirm, setShowSignInAppConfirm] = useState(false);
  const [showSignRequestDialog, setShowSignRequestDialog] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showAnnounceDialog, setShowAnnounceDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();

  const { data: plan = initialPlan } = useAuditPlanDetail(initialPlan.id, initialPlan);

  const submitMutation = useSubmitPlan(plan.id);
  const signMutation = useSignPlanInApp(plan.id);
  const generateMutation = useGenerateReport(plan.id);
  const closePlanMutation = useClosePlan(plan.id);
  const completeMutation = useCompleteAudit(plan.id);
  const issueSignRequestMutation = useIssueSignRequest(plan.id);
  const announceMutation = useAnnouncePlan(plan.id);
  const deletePlanMutation = useDeleteAuditPlan();

  const canSubmit = isPrivileged && plan.status === "DRAFT";
  const canEdit = isPrivileged && (plan.status === "DRAFT" || plan.status === "PLANNED");
  const canManageSchedule = isPrivileged || plan.auditors.some((a) => a.assigneeAuthUserId === userId && a.role === "LEAD");
  const canComplete = isPrivileged && (plan.status === "PLANNED" || plan.status === "ANNOUNCED" || plan.status === "IN_PROGRESS" || plan.status === "WAITING_CORRECTIVE");
  const canGenerateReport = isPrivileged && (
    plan.status === "IN_PROGRESS" || plan.status === "WAITING_CORRECTIVE" || plan.status === "READY_TO_CLOSE"
  );
  const canClosePlan = isPrivileged && plan.status === "READY_TO_CLOSE";
  const hasAlreadySigned = plan.signoffs.some((s) => s.signerAuthUserId === userId);
  const canSignInApp = plan.status === "READY_TO_CLOSE" && !hasAlreadySigned && (
    isPrivileged || plan.auditors.some((a) => a.assigneeAuthUserId === userId) || plan.ownerAuthUserId === userId
  );
  const canIssueSignRequest = isPrivileged && plan.status === "READY_TO_CLOSE";
  const canDelete = canDeleteAuditPlan(userRole);

  const reportForm = useForm<AuditReportInput>({
    resolver: zodResolver(auditReportSchema),
    defaultValues: { summary: plan.report?.summary ?? "", conclusion: plan.report?.conclusion ?? "" },
  });

  const signRequestForm = useForm<{ targetAuthUserId: string; targetEmail: string; targetName: string; signedRole: string }>({
    defaultValues: { targetAuthUserId: "", targetEmail: "", targetName: "", signedRole: "" },
  });

  const announceForm = useForm<AuditAnnounceInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(auditAnnounceSchema) as any,
    defaultValues: { title: "", message: "", deliveryMode: "LINK", recipientEmails: [] },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 font-mono">{plan.auditNo}</h1>
            <AuditPlanStatusBadge status={plan.status} />
          </div>
          <p className="mt-1 text-slate-600 text-sm">{plan.title}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/print/audit/plan/${plan.id}`} target="_blank" rel="noreferrer">
              <Printer className="mr-1.5 h-4 w-4" />
              Print
            </Link>
          </Button>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>แก้ไข</Button>
          )}
          {canDelete && (
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
              ลบแผน
            </Button>
          )}
          {canComplete && (
            <Button size="sm" variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => setShowCompleteConfirm(true)}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />Audit เสร็จสิ้น
            </Button>
          )}
          {canSubmit && (
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white" onClick={() => setShowAssignDialog(true)}>
              มอบหมายและส่งอนุมัติ
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>ยืนยันการลบ Audit Plan</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">
            คุณต้องการลบแผน <span className="font-mono font-semibold text-slate-800">{plan.auditNo}</span> ถาวรใช่หรือไม่?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>ยกเลิก</Button>
            <Button
              variant="destructive"
              disabled={deletePlanMutation.isPending}
              onClick={() => deletePlanMutation.mutate(
                { id: plan.id },
                {
                  onSuccess: () => {
                    toast.success("ลบ Audit Plan สำเร็จ");
                    router.push("/audit/plans");
                    router.refresh();
                  },
                  onError: (err) => toast.error(err.message),
                }
              )}
            >
              {deletePlanMutation.isPending ? "กำลังลบ..." : "ยืนยันลบ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tab content - Overview (consolidated from all tabs) */}
      <div className="space-y-6">
        {/* Overview Header — print-style document card */}
        <AuditPlanPrintHeaderCard
          auditNo={plan.auditNo}
          title={plan.title}
          standards={plan.standards}
          standard={plan.standard}
          startDate={plan.startDate}
          endDate={plan.endDate}
          ownerNameSnapshot={plan.ownerNameSnapshot}
          reviewerNameSnapshot={plan.reviewerNameSnapshot}
          approverNameSnapshot={plan.approverNameSnapshot}
          signoffs={plan.signoffs}
          sessions={plan.schedules.map((s) => ({
            id: s.id,
            startAt: s.startAt,
            endAt: s.endAt,
            departmentName: s.departmentName,
            sessionTitle: s.sessionTitle,
            remark: s.unavailableReason,
            team: s.team.map((tm) => ({ role: tm.role, name: tm.nameSnapshot })),
          }))}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-5">
          <div>
            <p className="text-xs text-slate-500">ประเภทการตรวจสอบ</p>
            <p className="text-sm font-medium text-slate-900">{AUDIT_TYPE_LABELS[plan.auditType]}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">โหมด</p>
            <p className="text-sm font-medium text-slate-900">{AUDIT_MODE_LABELS[plan.mode]}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">สถานะ</p>
            <AuditPlanStatusBadge status={plan.status} />
          </div>
          {plan.sourceOrganization && (
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500">หน่วยงานตรวจสอบภายนอก</p>
              <p className="text-sm text-slate-800">{plan.sourceOrganization}</p>
            </div>
          )}
          {plan.scope && (
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500">ขอบข่าย</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{plan.scope}</p>
            </div>
          )}
          {plan.objective && (
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500">วัตถุประสงค์</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{plan.objective}</p>
            </div>
          )}
          {plan.report && (
            <div className="sm:col-span-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-xs font-semibold text-emerald-700">รายงาน: {plan.report.reportNo}</p>
              {plan.report.summary && <p className="text-xs text-emerald-600 mt-1">{plan.report.summary}</p>}
              <p className="text-xs text-emerald-500 mt-0.5">สร้างเมื่อ: {formatDateTime(plan.report.generatedAt)}</p>
            </div>
          )}
        </div>

        {/* Departments */}
        {plan.departments.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">ยังไม่มีแผนกที่กำหนด</p>
        ) : (
          plan.departments.map((d) => (
            <div key={d.id} className="rounded-xl border border-slate-100 bg-white p-3 flex items-center gap-3">
              <Building2 className="h-5 w-5 text-slate-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-800">{d.departmentName ?? d.departmentId}</p>
                {d.departmentCode && <p className="text-xs text-slate-400">{d.departmentCode}</p>}
              </div>
            </div>
          ))
        )}

        {/* Schedule */}
        <ScheduleTab plan={plan} canManage={canManageSchedule} />

        {/* Findings */}
        <FindingsTab plan={plan} canUpload={isPrivileged} />

        {/* Attachments */}
        <AttachmentsTab plan={plan} canUpload={isPrivileged} />

        {/* Report & Sign */}
        <div className="space-y-6">
          {canGenerateReport && (
            <div className="rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-800">รายงานการตรวจสอบ</h3>
                {plan.report && !showReportForm && (
                  <Button size="sm" variant="outline" onClick={() => {
                    reportForm.reset({ summary: plan.report?.summary ?? "", conclusion: plan.report?.conclusion ?? "" });
                    setShowReportForm(true);
                  }}>สร้างรายงานใหม่</Button>
                )}
              </div>
              {plan.report && !showReportForm && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-2">
                  <p className="text-xs font-semibold text-emerald-700">รายงานเลขที่: {plan.report.reportNo}</p>
                  <p className="text-xs text-emerald-500">สร้างเมื่อ: {formatDateTime(plan.report.generatedAt)}</p>
                  {plan.report.summary && <p className="text-sm text-slate-700 whitespace-pre-wrap mt-2">{plan.report.summary}</p>}
                  {plan.report.conclusion && <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">{plan.report.conclusion}</p>}
                  {plan.report.pdfFileUrl && (
                    <a href={plan.report.pdfFileUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline mt-1">
                      <FileText className="h-3.5 w-3.5" />ดาวน์โหลด PDF
                    </a>
                  )}
                </div>
              )}
              {(!plan.report || showReportForm) && (
                <form id="report-form" onSubmit={reportForm.handleSubmit((data: AuditReportInput) => {
                  generateMutation.mutate(data, {
                    onSuccess: () => { toast.success("สร้างรายงานสำเร็จ"); setShowReportForm(false); },
                    onError: (err) => toast.error(err.message),
                  });
                })} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">สรุปการตรวจสอบ</label>
                    <textarea {...reportForm.register("summary")} rows={4} placeholder="กรอกสรุปการตรวจสอบ..." className={cn(INPUT_CLASS, "resize-none")} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">ข้อสรุป</label>
                    <textarea {...reportForm.register("conclusion")} rows={4} placeholder="กรอกข้อสรุป..." className={cn(INPUT_CLASS, "resize-none")} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    {plan.report && (
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowReportForm(false)}>ยกเลิก</Button>
                    )}
                    <Button type="submit" size="sm" disabled={generateMutation.isPending}>
                      {generateMutation.isPending ? "กำลังสร้างรายงาน..." : "สร้างรายงาน"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
          {!canGenerateReport && plan.report && (
            <div className="rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 space-y-3">
              <h3 className="text-sm font-semibold text-slate-800">รายงานการตรวจสอบ</h3>
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-2">
                <p className="text-xs font-semibold text-emerald-700">รายงานเลขที่: {plan.report.reportNo}</p>
                <p className="text-xs text-emerald-500">สร้างเมื่อ: {formatDateTime(plan.report.generatedAt)}</p>
                {plan.report.summary && <p className="text-sm text-slate-700 whitespace-pre-wrap mt-2">{plan.report.summary}</p>}
                {plan.report.conclusion && <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">{plan.report.conclusion}</p>}
              </div>
            </div>
          )}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-sm font-semibold text-slate-800">ลายเซ็น</h3>
              <div className="flex gap-2 flex-wrap">
                {canSignInApp && (
                  <Button size="sm" variant="outline" onClick={() => setShowSignInAppConfirm(true)}>
                    <PenLine className="h-4 w-4 mr-1.5" />ลงนามในระบบ
                  </Button>
                )}
                {canIssueSignRequest && (
                  <Button size="sm" variant="outline" onClick={() => setShowSignRequestDialog(true)}>
                    <Send className="h-4 w-4 mr-1.5" />ส่งลิงก์ลงนาม
                  </Button>
                )}
              </div>
            </div>
            {plan.signoffs.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">ยังไม่มีการลงนาม</p>
            ) : (
              <div className="space-y-2">
                {plan.signoffs.map((s) => (
                  <div key={s.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <PenLine className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">{s.signerNameSnapshot ?? s.signerAuthUserId}</p>
                      <p className="text-xs text-slate-500">{s.signedRole}</p>
                    </div>
                    <p className="text-xs text-slate-400 font-mono shrink-0">{formatDateTime(s.signedAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          {canClosePlan && (
            <div className="rounded-2xl border border-rose-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">ปิดแผนการตรวจสอบ</h3>
                  <p className="text-xs text-slate-500 mt-0.5">การดำเนินการนี้ไม่สามารถยกเลิกได้</p>
                </div>
                <Button size="sm" variant="destructive" disabled={closePlanMutation.isPending} onClick={() => setShowClosePlanConfirm(true)}>
                  ปิดแผน
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      <AuditPlanFormModal open={showEdit} onClose={() => setShowEdit(false)} onSuccess={() => setShowEdit(false)} />

      {/* Assign reviewer/approver + submit */}
      <AuditPlanAssignDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        initialReviewerAuthUserId={plan.reviewerAuthUserId ?? undefined}
        initialApproverAuthUserId={plan.approverAuthUserId ?? undefined}
        onConfirm={async (reviewer, approver) => {
          try {
            await submitMutation.mutateAsync({
              signedRole: "PREPARER",
              reviewerAuthUserId: reviewer.id,
              reviewerEmail: reviewer.email,
              reviewerNameSnapshot: reviewer.name,
              approverAuthUserId: approver.id,
              approverEmail: approver.email,
              approverNameSnapshot: approver.name,
              emailGroupMails: [],
            });
            toast.success("ส่งแผนเพื่ออนุมัติสำเร็จ");
          } catch (err) {
            toast.error((err as Error).message ?? "เกิดข้อผิดพลาด");
          }
        }}
      />

      {/* Announce dialog */}
      <Dialog open={showAnnounceDialog} onOpenChange={(v) => { if (!v) { setShowAnnounceDialog(false); announceForm.reset(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>ประกาศแผนตรวจสอบ {plan.auditNo}</DialogTitle>
          </DialogHeader>
          <form id="announce-form" onSubmit={announceForm.handleSubmit((data: AuditAnnounceInput) => {
            announceMutation.mutate(data, {
              onSuccess: () => { toast.success("ประกาศแผนสำเร็จ"); setShowAnnounceDialog(false); announceForm.reset(); },
              onError: (err) => toast.error(err.message),
            });
          })} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                หัวข้อ <span className="text-rose-500">*</span>
              </label>
              <input {...announceForm.register("title")} type="text" placeholder="หัวข้อการประกาศ..." className={INPUT_CLASS} />
              {announceForm.formState.errors.title && <p className="mt-1 text-xs text-rose-500">{announceForm.formState.errors.title.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                ข้อความ <span className="text-rose-500">*</span>
              </label>
              <textarea {...announceForm.register("message")} rows={4} placeholder="รายละเอียดการประกาศ..." className={cn(INPUT_CLASS, "resize-none")} />
              {announceForm.formState.errors.message && <p className="mt-1 text-xs text-rose-500">{announceForm.formState.errors.message.message}</p>}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">รูปแบบการส่ง</p>
              <div className="flex gap-4">
                {(["LINK", "ATTACHMENT", "BOTH"] as const).map((mode) => (
                  <label key={mode} className="flex cursor-pointer items-center gap-2">
                    <input type="radio" {...announceForm.register("deliveryMode")} value={mode} className="h-4 w-4 border-slate-300 text-primary" />
                    <span className="text-sm text-slate-700">
                      {mode === "LINK" ? "ลิงก์" : mode === "ATTACHMENT" ? "ไฟล์แนบ" : "ลิงก์ + ไฟล์แนบ"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAnnounceDialog(false); announceForm.reset(); }}>ยกเลิก</Button>
            <Button type="submit" form="announce-form" disabled={announceMutation.isPending}>
              <Megaphone className="h-4 w-4 mr-1.5" />
              {announceMutation.isPending ? "กำลังประกาศ..." : "ประกาศ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign In-App confirm */}
      <Dialog open={showSignInAppConfirm} onOpenChange={(v) => !v && setShowSignInAppConfirm(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>ยืนยันการลงนามในระบบ</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">
            คุณต้องการลงนามในแผนตรวจสอบ{" "}
            <span className="font-mono font-semibold text-slate-800">{plan.auditNo}</span>{" "}
            ในฐานะ <span className="font-semibold">{userRole}</span> ใช่หรือไม่?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignInAppConfirm(false)}>ยกเลิก</Button>
            <Button disabled={signMutation.isPending} onClick={() => {
              signMutation.mutate(userRole, {
                onSuccess: () => { toast.success("ลงนามสำเร็จ"); setShowSignInAppConfirm(false); },
                onError: (err) => toast.error(err.message),
              });
            }}>
              {signMutation.isPending ? "กำลังลงนาม..." : "ยืนยันลงนาม"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Sign Request */}
      <Dialog open={showSignRequestDialog} onOpenChange={(v) => { if (!v) { setShowSignRequestDialog(false); signRequestForm.reset(); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>ส่งลิงก์ลงนาม</DialogTitle></DialogHeader>
          <form id="sign-request-form" onSubmit={signRequestForm.handleSubmit((data) => {
            issueSignRequestMutation.mutate(
              { targetAuthUserId: data.targetAuthUserId, targetEmail: data.targetEmail, targetName: data.targetName || undefined, signedRole: data.signedRole },
              {
                onSuccess: () => { toast.success("ส่งลิงก์ลงนามสำเร็จ"); setShowSignRequestDialog(false); signRequestForm.reset(); },
                onError: (err) => toast.error(err.message),
              }
            );
          })} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Auth User ID ผู้รับ *</label>
              <input {...signRequestForm.register("targetAuthUserId", { required: "กรุณากรอก Auth User ID" })} type="text" placeholder="auth-user-id..." className={INPUT_CLASS} />
              {signRequestForm.formState.errors.targetAuthUserId && <p className="mt-1 text-xs text-rose-500">{signRequestForm.formState.errors.targetAuthUserId.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">อีเมลผู้รับ *</label>
              <input {...signRequestForm.register("targetEmail", { required: "กรุณากรอกอีเมล" })} type="email" placeholder="email@example.com" className={INPUT_CLASS} />
              {signRequestForm.formState.errors.targetEmail && <p className="mt-1 text-xs text-rose-500">{signRequestForm.formState.errors.targetEmail.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">ชื่อผู้รับ</label>
              <input {...signRequestForm.register("targetName")} type="text" placeholder="ชื่อ-นามสกุล" className={INPUT_CLASS} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">บทบาทการลงนาม *</label>
              <input {...signRequestForm.register("signedRole", { required: "กรุณากรอกบทบาท" })} type="text" placeholder="เช่น QMS, LEAD_AUDITOR, MR..." className={INPUT_CLASS} />
              {signRequestForm.formState.errors.signedRole && <p className="mt-1 text-xs text-rose-500">{signRequestForm.formState.errors.signedRole.message}</p>}
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowSignRequestDialog(false); signRequestForm.reset(); }}>ยกเลิก</Button>
            <Button type="submit" form="sign-request-form" disabled={issueSignRequestMutation.isPending}>
              <Send className="h-4 w-4 mr-1.5" />
              {issueSignRequestMutation.isPending ? "กำลังส่ง..." : "ส่งลิงก์"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Audit confirm */}
      <Dialog open={showCompleteConfirm} onOpenChange={(v) => !v && setShowCompleteConfirm(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>ยืนยัน Audit เสร็จสิ้น</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">
            ยืนยันว่าการตรวจสอบ{" "}
            <span className="font-mono font-semibold text-slate-800">{plan.auditNo}</span>{" "}
            เสร็จสิ้นแล้ว? สถานะจะเปลี่ยนเป็น &quot;พร้อมปิด&quot;
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteConfirm(false)}>ยกเลิก</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={completeMutation.isPending} onClick={() => {
              completeMutation.mutate(undefined, {
                onSuccess: () => { toast.success("บันทึก Audit เสร็จสิ้นแล้ว"); setShowCompleteConfirm(false); },
                onError: (err) => toast.error(err.message),
              });
            }}>
              {completeMutation.isPending ? "กำลังบันทึก..." : "ยืนยัน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Plan confirm */}
      <Dialog open={showClosePlanConfirm} onOpenChange={(v) => !v && setShowClosePlanConfirm(false)}>
        <DialogContent>
          <DialogHeader><DialogTitle>ยืนยันการปิดแผน</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">
            คุณต้องการปิดแผนตรวจสอบ{" "}
            <span className="font-mono font-semibold text-slate-800">{plan.auditNo}</span>{" "}
            ใช่หรือไม่?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClosePlanConfirm(false)}>ยกเลิก</Button>
            <Button disabled={closePlanMutation.isPending} onClick={() => {
              closePlanMutation.mutate(undefined, {
                onSuccess: () => { toast.success("ปิดแผนตรวจสอบสำเร็จ"); setShowClosePlanConfirm(false); },
                onError: (err) => toast.error(err.message),
              });
            }}>
              {closePlanMutation.isPending ? "กำลังปิด..." : "ยืนยันปิด"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
