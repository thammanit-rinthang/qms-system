"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle, CheckCircle2, ExternalLink, FileText,
  ShieldCheck, Upload, X, XCircle,
} from "lucide-react";
import {
  useKpiMonthlyById,
  useRejectMonthlyReport,
  useSubmitMonthlyReport,
  useUpdateMonthlyDetail,
  useUpdateMonthlyReport,
  useUploadMonthlyAttachment,
  useApproveMonthlyReport,
} from "@/hooks/api/use-kpi-monthly";
import { useAddCorrectiveAction, useDeleteCorrectiveAction } from "@/hooks/api/use-kpi-corrective";
import type { AchievedStatus, MonthlyStatus } from "@/generated/prisma/client";
import KpiSignatureDialog from "@/components/kpi/KpiSignatureDialog";
import KpiObjectiveAssignDialog, { type ReviewerCandidate } from "@/components/kpi/KpiObjectiveAssignDialog";
import type { SignatureType } from "@/generated/prisma/client";

type UserRole = "USER" | "IT" | "QMS" | "MR";
const PRIVILEGED_ROLES: UserRole[] = ["IT", "QMS", "MR"];
function isPrivileged(role: UserRole) { return PRIVILEGED_ROLES.includes(role); }

interface Props {
  kpiId: string | null;
  reportId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRole: UserRole;
  userId?: string;
}

const STATUS_CONFIG: Record<MonthlyStatus, { style: string; label?: string }> = {
  DRAFT:            { style: "bg-slate-50 text-slate-500 border-slate-200"       },
  PENDING_REVIEW:   { style: "bg-amber-50 text-amber-600 border-amber-200"       },
  PENDING_APPROVAL: { style: "bg-sky-50 text-sky-600 border-sky-200"             },
  APPROVED:         { style: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  REJECTED:         { style: "bg-rose-50 text-rose-600 border-rose-200"          },
};

const ACHIEVED_CONFIG: Record<AchievedStatus, { style: string; dot: string }> = {
  OK:      { style: "bg-emerald-50 text-emerald-600 border-emerald-200", dot: "bg-emerald-500" },
  NOT_OK:  { style: "bg-rose-50 text-rose-600 border-rose-200",          dot: "bg-rose-500"   },
  PENDING: { style: "bg-amber-50 text-amber-600 border-amber-200",       dot: "bg-amber-400"  },
};

type CorrectiveActionRow = {
  id: string;
  times: number;
  rootCause: string;
  guidelines: string;
  responsiblePerson: string;
  dueDate: string | Date;
};

type DetailRow = {
  id: string;
  actualResult: number | null;
  achievedStatus: AchievedStatus;
  kpiObjective: { objective: string; target: number; unit?: string | null };
  correctiveActions?: CorrectiveActionRow[];
};

type CorrectiveDraft = {
  times: string;
  rootCause: string;
  guidelines: string;
  responsiblePersonId: string;
  responsiblePersonName: string;
  dueDate: string;
};

const EMPTY_DRAFT: CorrectiveDraft = {
  times: "1", rootCause: "", guidelines: "", responsiblePersonId: "", responsiblePersonName: "", dueDate: "",
};

const UNIT_DISPLAY: Record<string, string> = {
  percent: "%", "%": "%",
  times: "ครั้ง", ครั้ง: "ครั้ง",
  baht: "บาท", บาท: "บาท",
  piece: "ชิ้น", ชิ้น: "ชิ้น",
  day: "วัน", วัน: "วัน",
  hour: "ชั่วโมง", ชั่วโมง: "ชั่วโมง",
};
function fmtUnit(unit: string | null | undefined) {
  if (!unit) return "";
  return UNIT_DISPLAY[unit.toLowerCase()] ?? unit;
}

/** Derive pass/fail from input vs target — mirrors server logic */
function computeAchieved(inputVal: string, target: number): AchievedStatus {
  if (inputVal === "" || inputVal === undefined) return "PENDING";
  const n = Number(inputVal);
  if (isNaN(n)) return "PENDING";
  return n >= target ? "OK" : "NOT_OK";
}

/** Minimal inline user picker reused here without importing the dialog */
interface UserCandidate { id: string; name: string; email: string | null; employeeId: string | null; jobTitle: string | null; }

function InlineUserPicker({ value, onChange, disabled }: { value: UserCandidate | null; onChange: (u: UserCandidate | null) => void; disabled?: boolean }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<UserCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const dropRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!open) return;
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/ms-graph/users/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setResults(json.data ?? []);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!inputRef.current?.contains(e.target as Node) && !dropRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (value) return (
    <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
      <span className="flex-1 font-medium text-slate-800 truncate">{value.name}</span>
      {!disabled && <button type="button" onClick={() => onChange(null)} className="text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>}
    </div>
  );

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        disabled={disabled}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="ค้นหาชื่อ หรือ รหัสพนักงาน..."
        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-sm focus:border-primary focus:bg-white focus:outline-none disabled:opacity-50"
      />
      {open && (
        <div ref={dropRef} className="absolute top-full z-9999 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-center text-sm text-slate-400">{loading ? "กำลังค้นหา..." : "ไม่พบผู้ใช้"}</p>
          ) : (
            <ul className="max-h-40 divide-y divide-slate-50 overflow-y-auto">
              {results.map((u) => (
                <li key={u.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50"
                  onMouseDown={(e) => { e.preventDefault(); onChange(u); setQuery(""); setOpen(false); }}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{u.name}</p>
                    <p className="truncate text-xs text-slate-400">{u.employeeId ? `${u.employeeId} · ` : ""}{u.jobTitle ?? u.email ?? ""}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function FieldLabel({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
      {children} {required && <span className="text-rose-500">*</span>}
    </label>
  );
}

function ReadField({ value }: { value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
      {value || <span className="text-slate-300">—</span>}
    </div>
  );
}

function ModalSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}

export default function KpiMonthlyDetailModal({ kpiId, reportId, open, onOpenChange, userRole, userId }: Props) {
  const t = useT();
  const privileged = isPrivileged(userRole);

  const { data: response, isLoading } = useKpiMonthlyById(open ? kpiId : null, open ? reportId : null);
  const report = response?.data;

  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actualInputs, setActualInputs] = useState<Record<string, string>>({});
  const [savedInputs, setSavedInputs] = useState<Record<string, string>>({});
  const [remark, setRemark] = useState("");
  const [remarkDirty, setRemarkDirty] = useState(false);
  const [correctiveDrafts, setCorrectiveDrafts] = useState<Record<string, CorrectiveDraft>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signatureMode, setSignatureMode] = useState<"submit" | "approve">("submit");
  const [assignOpen, setAssignOpen] = useState(false);

  const updateDetailMutation    = useUpdateMonthlyDetail();
  const updateReportMutation    = useUpdateMonthlyReport();
  const uploadMutation          = useUploadMonthlyAttachment();
  const addCorrectiveMutation   = useAddCorrectiveAction();
  const deleteCorrectiveMutation = useDeleteCorrectiveAction();
  const submitMutation        = useSubmitMonthlyReport();
  const approveMutation       = useApproveMonthlyReport();
  const rejectMutation        = useRejectMonthlyReport();

  const anyLoading =
    updateDetailMutation.isPending || updateReportMutation.isPending ||
    uploadMutation.isPending || addCorrectiveMutation.isPending ||
    deleteCorrectiveMutation.isPending ||
    submitMutation.isPending || approveMutation.isPending ||
    rejectMutation.isPending;

  const reportStatus = report?.status as MonthlyStatus | undefined;
  const isPreparer = !report?.prepareBy || report?.prepareBy === userId;
  const isEditable = privileged
    ? reportStatus !== "APPROVED"
    : (reportStatus === "DRAFT" || reportStatus === "REJECTED") && isPreparer;
  const details = (report?.details ?? []) as DetailRow[];
  // Live-compute achieved status from current inputs for realtime UX
  const liveAchieved = (detail: DetailRow): AchievedStatus =>
    isEditable ? computeAchieved(actualInputs[detail.id] ?? "", detail.kpiObjective.target) : detail.achievedStatus;
  const notOkDetails = details.filter((d) => liveAchieved(d) === "NOT_OK");

  useEffect(() => {
    setRemark(report?.remark ?? "");
    setRemarkDirty(false);
    if (report?.details) {
      const init: Record<string, string> = {};
      for (const d of report.details as DetailRow[]) {
        init[d.id] = d.actualResult !== null ? String(d.actualResult) : "";
      }
      setActualInputs(init);
      setSavedInputs(init);
    }
  }, [report?.id, report?.remark, report?.details]);

  const detailsDirty = details.some((d) => (actualInputs[d.id] ?? "") !== (savedInputs[d.id] ?? ""));

  async function handleSaveAllDetails() {
    if (!kpiId || !reportId) return;
    const dirtyDetails = details.filter((d) => (actualInputs[d.id] ?? "") !== (savedInputs[d.id] ?? ""));
    try {
      await Promise.all(dirtyDetails.map((d) =>
        updateDetailMutation.mutateAsync({
          kpiId, reportId, detailId: d.id,
          data: { actualResult: actualInputs[d.id] !== "" ? Number(actualInputs[d.id]) : null },
        })
      ));
      setSavedInputs({ ...actualInputs });
      toast.success(t("kpi.monthly.messages.updateSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
    }
  }

  async function handleSaveRemark() {
    if (!kpiId || !reportId) return;
    try {
      await updateReportMutation.mutateAsync({ kpiId, reportId, data: { remark } });
      toast.success(t("kpi.monthly.messages.updateSuccess"));
      setRemarkDirty(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
    }
  }

  async function handleUploadAttachment(file: File | null) {
    if (!kpiId || !reportId || !file) return;
    try {
      await uploadMutation.mutateAsync({ kpiId, reportId, file });
      toast.success(t("kpi.monthly.messages.updateSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
    }
  }

  function updateDraft(detailId: string, field: keyof CorrectiveDraft, value: string) {
    setCorrectiveDrafts((prev) => ({
      ...prev,
      [detailId]: { ...(prev[detailId] ?? EMPTY_DRAFT), [field]: value },
    }));
  }

  async function handleAddCorrective(detailId: string) {
    if (!kpiId || !reportId) return;
    const draft = correctiveDrafts[detailId] ?? EMPTY_DRAFT;
    if (!draft.rootCause.trim() || !draft.guidelines.trim() || !draft.responsiblePersonName.trim() || !draft.dueDate) return;
    try {
      await addCorrectiveMutation.mutateAsync({
        kpiId, reportId, detailId,
        data: {
          times: Number(draft.times) || 1,
          rootCause: draft.rootCause,
          guidelines: draft.guidelines,
          responsiblePerson: draft.responsiblePersonName,
          dueDate: draft.dueDate,
        },
      });
      toast.success(t("kpi.monthly.messages.updateSuccess"));
      setCorrectiveDrafts((prev) => ({ ...prev, [detailId]: EMPTY_DRAFT }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
    }
  }

  async function handleDeleteCorrective(detailId: string, actionId: string) {
    if (!kpiId || !reportId) return;
    try {
      await deleteCorrectiveMutation.mutateAsync({ kpiId, reportId, detailId, actionId });
      toast.success(t("kpi.monthly.messages.deleteCorrectiveSuccess"));
      setConfirmDeleteId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
    }
  }

  const [pendingSignaturePayload, setPendingSignaturePayload] = useState<{ signatureDataUrl: string; signatureType: SignatureType; saveSignature: boolean } | null>(null);

  // Step 1: user signs → store payload, open reviewer picker
  async function handleSignatureConfirm(payload: { signatureDataUrl: string; signatureType: SignatureType; saveSignature: boolean }) {
    if (!kpiId || !reportId) return;
    if (signatureMode === "submit") {
      setPendingSignaturePayload(payload);
      setSignatureOpen(false);
      setAssignOpen(true);
      return;
    }

    try {
      await approveMutation.mutateAsync({ kpiId, reportId, data: payload });
      toast.success(t("kpi.monthly.messages.approveSuccess" as Parameters<typeof t>[0]) || "Approved successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
    }
  }

  // Step 2: user picks reviewer → submit with both
  async function handleAssignConfirm(reviewer: ReviewerCandidate) {
    if (!kpiId || !reportId || !pendingSignaturePayload) return;
    try {
      await submitMutation.mutateAsync({
        kpiId,
        reportId,
        data: { ...pendingSignaturePayload, reviewerUserId: reviewer.id },
      });
      toast.success(t("kpi.monthly.messages.submitSuccess"));
      setAssignOpen(false);
      setPendingSignaturePayload(null);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
    }
  }

  function initiateSubmit() {
    setSignatureMode("submit");
    setSignatureOpen(true);
  }

  function initiateApprove() {
    setSignatureMode("approve");
    setSignatureOpen(true);
  }

  async function handleReject() {
    if (!kpiId || !reportId || !rejectReason.trim()) return;
    try {
      await rejectMutation.mutateAsync({ kpiId, reportId, reason: rejectReason });
      toast.success(t("kpi.monthly.messages.rejectSuccess"));
      setShowRejectForm(false);
      setRejectReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
    }
  }

  return (
    <>
    <Dialog open={open && !signatureOpen && !assignOpen} onOpenChange={(v) => { if (!signatureOpen && !assignOpen) onOpenChange(v); }}>
      <DialogContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl max-h-[90vh]">

        {/* Header */}
        <DialogHeader className="shrink-0 border-b border-slate-100 px-6 py-4">
          <div className="flex items-center justify-between gap-3 pr-8">
            <DialogTitle className="text-base font-bold text-primary">
              {t("kpi.monthly.drawer.title")}
            </DialogTitle>
            {privileged && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                <ShieldCheck className="h-3 w-3" />
                {t("approve.fullAccess")}
              </span>
            )}
          </div>
        </DialogHeader>

        {isLoading || !report ? (
          <ModalSkeleton />
        ) : (
          <>
            {/* Report meta strip */}
            <div className="shrink-0 border-b border-slate-100 bg-slate-50/60 px-6 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold text-slate-800">{report.month} {report.year}</p>
                  <span className="text-xs text-slate-400">{report.kpi?.department}</span>
                </div>
                <span className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                  STATUS_CONFIG[report.status as MonthlyStatus]?.style
                )}>
                  {t(`kpi.monthly.status.${report.status}` as Parameters<typeof t>[0])}
                </span>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-5 px-6 py-5">

                {/* ── Section 1: Objectives ── */}
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">01</span>
                    <h3 className="text-sm font-bold text-slate-800">{t("kpi.monthly.section.objectives")}</h3>
                  </div>

                  <div className="space-y-3">
                    {details.map((detail, index) => {
                      const live = liveAchieved(detail);
                      const ach = ACHIEVED_CONFIG[live];
                      const unit = fmtUnit(detail.kpiObjective.unit);
                      const target = detail.kpiObjective.target;
                      const actualVal = isEditable ? (actualInputs[detail.id] ?? "") : (detail.actualResult !== null ? String(detail.actualResult) : "");
                      const actualNum = actualVal !== "" ? Number(actualVal) : null;
                      const pct = actualNum !== null && target > 0 ? Math.round((actualNum / target) * 100) : null;
                      return (
                        <div
                          key={detail.id}
                          className={cn(
                            "rounded-2xl border p-4 transition-colors",
                            live === "NOT_OK"
                              ? "border-rose-100 bg-rose-50/30"
                              : live === "OK"
                              ? "border-emerald-100 bg-emerald-50/20"
                              : "border-slate-100 bg-white"
                          )}
                        >
                          {/* Objective header */}
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2">
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                                {index + 1}
                              </span>
                              <p className="text-sm font-semibold leading-snug text-slate-800">
                                {detail.kpiObjective.objective}
                              </p>
                            </div>
                            <span className={cn(
                              "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
                              ach.style
                            )}>
                              <span className={cn("h-1.5 w-1.5 rounded-full", ach.dot)} />
                              {t(`kpi.monthly.achieved.${live}` as Parameters<typeof t>[0])}
                              {pct !== null && <span className="ml-0.5 opacity-70">({pct}%)</span>}
                            </span>
                          </div>

                          {/* Target + Actual grid */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <FieldLabel>{t("kpi.monthly.field.target")}</FieldLabel>
                              <ReadField value={`${target}${unit ? ` ${unit}` : ""}`} />
                            </div>
                            <div>
                              <FieldLabel required={isEditable}>{t("kpi.monthly.field.actualResult")}</FieldLabel>
                              {isEditable ? (
                                <div className="relative">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={actualInputs[detail.id] ?? ""}
                                    onChange={(e) => setActualInputs((prev) => ({ ...prev, [detail.id]: e.target.value }))}
                                    className={cn("rounded-xl text-sm", unit ? "pr-10" : "")}
                                    disabled={anyLoading}
                                  />
                                  {unit && (
                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                                      {unit}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <ReadField value={actualVal !== "" ? `${actualVal}${unit ? ` ${unit}` : ""}` : "—"} />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* ── Section 2: Note & Attachment ── */}
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">02</span>
                    <h3 className="text-sm font-bold text-slate-800">{t("kpi.monthly.section.remarkAttachment")}</h3>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    {/* Remark */}
                    <div className="mb-4">
                      <FieldLabel>{t("kpi.monthly.field.remark")}</FieldLabel>
                      <Textarea
                        value={remark}
                        onChange={(e) => { setRemark(e.target.value); setRemarkDirty(true); }}
                        disabled={!isEditable || anyLoading}
                        className="resize-none rounded-xl text-sm"
                        rows={3}
                        placeholder={t("kpi.monthly.field.remarkPlaceholder")}
                      />
                      {isEditable && remarkDirty && (
                        <div className="mt-2 flex justify-end">
                          <Button
                            size="sm"
                            className="rounded-xl bg-primary hover:bg-primary/90"
                            onClick={handleSaveRemark}
                            disabled={anyLoading}
                          >
                            {t("common.save")}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Attachment */}
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <FieldLabel>{t("kpi.monthly.field.attachment")}</FieldLabel>
                        {report.attachmentWebUrl && (
                          <a
                            href={report.attachmentWebUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {t("common.view")}
                          </a>
                        )}
                      </div>

                      {report.attachmentFileName ? (
                        <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          <FileText className="h-4 w-4 shrink-0 text-emerald-500" />
                          <span className="min-w-0 flex-1 truncate text-xs">{report.attachmentFileName}</span>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">{t("kpi.monthly.field.noAttachment")}</p>
                      )}

                      {isEditable && (
                        <label className="mt-2.5 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-xs font-medium text-slate-500 transition-colors hover:border-slate-400 hover:bg-slate-50">
                          <Upload className="h-4 w-4" />
                          {t("kpi.monthly.field.uploadFile")}
                          <input
                            type="file"
                            className="sr-only"
                            disabled={anyLoading}
                            onChange={(e) => {
                              void handleUploadAttachment(e.target.files?.[0] ?? null);
                              e.currentTarget.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </section>

                {/* ── Section 3: Corrective Actions ── */}
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <span className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white",
                      notOkDetails.length > 0 ? "bg-rose-500" : "bg-primary"
                    )}>03</span>
                    <h3 className="text-sm font-bold text-slate-800">{t("kpi.monthly.section.correctiveActions")}</h3>
                    {notOkDetails.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">
                        <AlertTriangle className="h-3 w-3" />
                        {notOkDetails.length}
                      </span>
                    )}
                  </div>

                  {notOkDetails.length === 0 ? (
                    <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      <p className="text-sm text-emerald-700">{t("kpi.monthly.correctiveAction.noneRequired")}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {notOkDetails.map((detail) => {
                        const draft = correctiveDrafts[detail.id] ?? EMPTY_DRAFT;
                        const existing = detail.correctiveActions ?? [];
                        return (
                          <div key={detail.id} className="rounded-2xl border border-rose-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                            <div className="mb-3 flex items-start gap-2">
                              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                              <p className="text-sm font-semibold text-slate-800">{detail.kpiObjective.objective}</p>
                            </div>

                            {/* Prompt to fill corrective action when none exist */}
                            {isEditable && existing.length === 0 && (
                              <div className="mb-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                                <p className="text-xs font-medium text-rose-600">กรุณากรอกการดำเนินการแก้ไข / ปรับปรุง</p>
                              </div>
                            )}

                            {/* Existing corrective actions */}
                            {existing.length > 0 && (
                              <div className="mb-4 space-y-2">
                                {existing.map((action) => {
                                  const isConfirming = confirmDeleteId === action.id;
                                  return (
                                    <div
                                      key={action.id}
                                      className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600"
                                    >
                                      <div className="mb-1.5 flex items-center justify-between gap-2">
                                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-600">
                                          #{action.times}
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-slate-400">
                                            {new Date(action.dueDate).toLocaleDateString("en-GB")}
                                          </span>
                                          {/* Optional delete — only for editable state */}
                                          {isEditable && (
                                            isConfirming ? (
                                              <div className="flex items-center gap-1">
                                                <button
                                                  type="button"
                                                  className="rounded-lg bg-rose-600 px-2 py-0.5 text-[10px] font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
                                                  disabled={anyLoading}
                                                  onClick={() => handleDeleteCorrective(detail.id, action.id)}
                                                >
                                                  {t("common.confirm")}
                                                </button>
                                                <button
                                                  type="button"
                                                  className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                                                  disabled={anyLoading}
                                                  onClick={() => setConfirmDeleteId(null)}
                                                >
                                                  {t("common.cancel")}
                                                </button>
                                              </div>
                                            ) : (
                                              <button
                                                type="button"
                                                className="flex h-5 w-5 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                                                onClick={() => setConfirmDeleteId(action.id)}
                                                title={t("kpi.monthly.correctiveAction.deleteConfirm")}
                                              >
                                                <X className="h-3 w-3" />
                                              </button>
                                            )
                                          )}
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <p><span className="font-semibold text-slate-700">{t("kpi.monthly.correctiveAction.rootCause")}:</span> {action.rootCause}</p>
                                        <p><span className="font-semibold text-slate-700">{t("kpi.monthly.correctiveAction.guidelines")}:</span> {action.guidelines}</p>
                                        <p><span className="font-semibold text-slate-700">{t("kpi.monthly.correctiveAction.responsible")}:</span> {action.responsiblePerson}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Add new corrective action form */}
                            {isEditable && (
                              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-3">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  {t("kpi.monthly.correctiveAction.addNew")}
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <FieldLabel required>{t("kpi.monthly.correctiveAction.times")}</FieldLabel>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={draft.times}
                                      className="rounded-xl text-sm"
                                      onChange={(e) => updateDraft(detail.id, "times", e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <FieldLabel>{t("kpi.monthly.table.month")}</FieldLabel>
                                    <ReadField value={`${report.month} ${report.year}`} />
                                  </div>
                                  <div className="col-span-2">
                                    <FieldLabel required>{t("kpi.monthly.correctiveAction.rootCause")}</FieldLabel>
                                    <Textarea
                                      value={draft.rootCause}
                                      rows={2}
                                      className="resize-none rounded-xl text-sm"
                                      onChange={(e) => updateDraft(detail.id, "rootCause", e.target.value)}
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <FieldLabel required>{t("kpi.monthly.correctiveAction.guidelines")}</FieldLabel>
                                    <Textarea
                                      value={draft.guidelines}
                                      rows={2}
                                      className="resize-none rounded-xl text-sm"
                                      onChange={(e) => updateDraft(detail.id, "guidelines", e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <FieldLabel required>{t("kpi.monthly.correctiveAction.responsible")}</FieldLabel>
                                    <InlineUserPicker
                                      value={draft.responsiblePersonId ? { id: draft.responsiblePersonId, name: draft.responsiblePersonName, email: null, employeeId: null, jobTitle: null } : null}
                                      onChange={(u) => setCorrectiveDrafts((prev) => ({
                                        ...prev,
                                        [detail.id]: { ...(prev[detail.id] ?? EMPTY_DRAFT), responsiblePersonId: u?.id ?? "", responsiblePersonName: u?.name ?? "" },
                                      }))}
                                      disabled={anyLoading}
                                    />
                                  </div>
                                  <div>
                                    <FieldLabel required>{t("kpi.monthly.correctiveAction.dueDate")}</FieldLabel>
                                    <Input
                                      type="date"
                                      value={draft.dueDate}
                                      className="rounded-xl text-sm"
                                      onChange={(e) => updateDraft(detail.id, "dueDate", e.target.value)}
                                    />
                                  </div>
                                  <div className="col-span-2 flex justify-end">
                                    <Button
                                      size="sm"
                                      className="rounded-xl bg-primary hover:bg-primary/90"
                                      onClick={() => handleAddCorrective(detail.id)}
                                      disabled={anyLoading || !draft.rootCause.trim() || !draft.guidelines.trim() || !draft.responsiblePersonName.trim() || !draft.dueDate}
                                    >
                                      {t("common.save")}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>
            </div>

            {/* ── Footer actions ── */}
            <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-4">
              {showRejectForm ? (
                <div className="space-y-2.5">
                  <Textarea
                    placeholder={t("kpi.monthly.drawer.rejectionPlaceholder")}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="resize-none rounded-xl text-sm"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 rounded-xl bg-rose-600 text-white hover:bg-rose-700"
                      onClick={handleReject}
                      disabled={!rejectReason.trim() || anyLoading}
                    >
                      <XCircle className="mr-1.5 h-4 w-4" />
                      {t("kpi.monthly.actions.reject")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => setShowRejectForm(false)}
                      disabled={anyLoading}
                    >
                      {t("common.cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {/* User / Privileged: DRAFT / REJECTED — บันทึกผล หรือ ส่งรายงาน */}
                  {isEditable && (reportStatus === "DRAFT" || reportStatus === "REJECTED") && (
                    detailsDirty ? (
                      <Button
                        className="flex-1 rounded-xl bg-primary hover:bg-primary/90"
                        onClick={handleSaveAllDetails}
                        disabled={anyLoading}
                      >
                        {t("kpi.monthly.actions.saveResults")}
                      </Button>
                    ) : (
                      <Button
                        className="flex-1 rounded-xl bg-primary hover:bg-primary/90"
                        onClick={initiateSubmit}
                        disabled={anyLoading}
                      >
                        {t("kpi.monthly.actions.submit")}
                      </Button>
                    )
                  )}

                  {/* Privileged OR assigned approver: approve only (PENDING_APPROVAL) */}
                  {reportStatus === "PENDING_APPROVAL" &&
                    (privileged || userId === report?.kpi?.approverUserId) && (
                    <>
                      <Button
                        className="flex-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                        onClick={initiateApprove}
                        disabled={anyLoading}
                      >
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />
                        {t("kpi.monthly.actions.approve")}
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
                        onClick={() => setShowRejectForm(true)}
                        disabled={anyLoading}
                      >
                        <XCircle className="mr-1.5 h-4 w-4" />
                        {t("kpi.monthly.actions.reject")}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>

    <KpiSignatureDialog
      open={signatureOpen}
      title={
        signatureMode === "approve"
          ? t("kpi.approve.signatureTitle")
          : t("kpi.submit.signatureTitle")
      }
      onOpenChange={setSignatureOpen}
      onConfirm={async (payload) => {
        await handleSignatureConfirm(payload);
      }}
    />

    <KpiObjectiveAssignDialog
      open={assignOpen}
      onOpenChange={setAssignOpen}
      initialReviewerId={report?.kpi?.reviewerUserId || ""}
      hideApprover={true}
      onConfirm={handleAssignConfirm}
    />
    </>
  );
}
