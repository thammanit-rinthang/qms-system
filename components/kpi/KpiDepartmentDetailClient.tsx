"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import { KPI_UNITS } from "@/lib/kpi-units";
import { fetchApprovalConfigDefaultUser } from "@/lib/approval-config-client";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Send, Undo2, CheckCircle2, Clock, ShieldCheck, Info, ShieldAlert, User, UserCheck, UserCog, CalendarClock, ChevronRight, ThumbsUp, ThumbsDown, Eye, XCircle, Megaphone, Edit3, RefreshCw, Printer, FileSpreadsheet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ConfirmModal from "@/components/common/ConfirmModal";
import { ActionIconButton } from "@/components/common/ActionButtons";
import KpiObjectiveFormModal from "@/components/kpi/KpiObjectiveFormModal";
import KpiSignatureDialog from "@/components/kpi/KpiSignatureDialog";
import KpiObjectiveAssignDialog, { type ReviewerCandidate } from "@/components/kpi/KpiObjectiveAssignDialog";
import {
  useKpiById,
  useAddObjective,
  useUpdateObjective,
  useDeleteObjective,
  useSubmitKpiObjectives,
  useRecallKpiObjectives,
  useReviewKpiObjectives,
  useApproveKpiObjectives,
  useRejectKpiObjectives,
  useAnnounceKpi,
  useReviseKpi,
  useUpdateKpi,
  useDeleteKpi,
  type KpiDetailResponse,
  type KpiObjectiveWithRevision,
} from "@/hooks/api/use-kpi";
import KpiApprovalTimeline from "@/components/kpi/KpiApprovalTimeline";
import type { KPIObjective } from "@/generated/prisma/client";
import KpiReviseExportPreviewDialog, { type RevisePreviewData } from "@/components/kpi/KpiReviseExportPreviewDialog";

type UserRole = "USER" | "IT" | "QMS" | "MR";

const PRIVILEGED_ROLES: UserRole[] = ["IT", "QMS", "MR"];
function isPrivileged(role: UserRole): boolean {
  return PRIVILEGED_ROLES.includes(role);
}

interface Props {
  kpiId: string;
  role: UserRole;
  userId: string | null;
  authUserId: string | null;
  userDepartmentName: string | null;
}

function formatObjectiveTarget(
  objective: { target: number; unit: string | null | undefined },
  t: ReturnType<typeof useT>,
) {
  const unitLabelKey = KPI_UNITS.find((unit) => unit.value === objective.unit)?.labelKey;
  return {
    value: objective.target,
    unitLabel: unitLabelKey ? t(unitLabelKey as Parameters<typeof t>[0]) : null,
  };
}

function formatResponsiblePerson(objective: {
  responsibleNameSnapshot?: string | null;
  responsibleEmployeeId?: string | null;
  responsibleEmailSnapshot?: string | null;
}) {
  const primary = objective.responsibleNameSnapshot?.trim()
    || objective.responsibleEmailSnapshot?.trim()
    || "-";
  const suffix = objective.responsibleEmployeeId?.trim()
    ? ` (#${objective.responsibleEmployeeId.trim()})`
    : "";
  return `${primary}${suffix}`;
}

function ObjectiveField({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "original";
}) {
  return (
    <div className={cn("rounded-xl border px-3 py-2", tone === "original" ? "border-amber-200 bg-amber-50/70" : "border-slate-200 bg-slate-50/80")}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{value}</p>
    </div>
  );
}

function formatRevisionTimestamp(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const STATUS_CONFIG = {
  DRAFT:          { label: "Draft",           icon: null,          class: "bg-slate-50 text-slate-500 border-slate-200" },
  PENDING_REVIEW: { label: "Pending Review",  icon: Clock,         class: "bg-amber-50 text-amber-600 border-amber-200" },
  PENDING_APPROVAL: { label: "Pending Approval", icon: Clock,      class: "bg-amber-50 text-amber-600 border-amber-200" },
  APPROVED:       { label: "Approved ✓",      icon: CheckCircle2,  class: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  QMS_CHECK:      { label: "QMS Check",       icon: ShieldCheck,   class: "bg-sky-50 text-sky-600 border-sky-200" },
  ANNOUNCED:      { label: "Announced",       icon: Megaphone,     class: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  REJECTED:       { label: "Rejected ✕",      icon: null,          class: "bg-rose-50 text-rose-600 border-rose-200" },
} as const;

function RoleBanner({ role, kpiStatus, deptMatch }: { role: UserRole; kpiStatus: string; deptMatch: boolean }) {
  const t = useT();
  const privileged = isPrivileged(role);
  const isApproved = kpiStatus === "APPROVED";

  if (privileged) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <p className="text-sm text-emerald-700">
          <span className="font-semibold">{role}</span>
          {" — "}
          {t("kpi.rolePrivilegedDesc")}
        </p>
      </div>
    );
  }

  if (!deptMatch) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
        <p className="text-sm text-rose-700">{t("kpi.roleUserWrongDeptDesc")}</p>
      </div>
    );
  }

  if (isApproved) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-700">{t("kpi.roleUserApprovedDesc")}</p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
      <p className="text-sm text-sky-700">{t("kpi.roleUserDesc")}</p>
    </div>
  );
}

export default function KpiDepartmentDetailClient({ kpiId, role, userId, authUserId, userDepartmentName }: Props) {
  const t = useT();
  const privileged = isPrivileged(role);
  const canAlwaysEdit = privileged;

  const { data: resp, isLoading } = useKpiById(kpiId);
  const kpi = resp?.data;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<KPIObjective | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [recallConfirmOpen, setRecallConfirmOpen] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signatureMode, setSignatureMode] = useState<"submit" | "review" | "approve">("submit");
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const router = useRouter();

  const addMutation = useAddObjective();
  const updateMutation = useUpdateObjective();
  const deleteMutation = useDeleteObjective();
  const submitMutation = useSubmitKpiObjectives();
  const recallMutation = useRecallKpiObjectives();
  const reviewMutation = useReviewKpiObjectives();
  const approveMutation = useApproveKpiObjectives();
  const rejectMutation = useRejectKpiObjectives();
  const announceMutation = useAnnounceKpi();
  const reviseMutation = useReviseKpi();
  const updateKpiMutation = useUpdateKpi();
  const deleteKpiMutation = useDeleteKpi();

  const [docNameEditOpen, setDocNameEditOpen] = useState(false);
  const [docNameValue, setDocNameValue] = useState("");
  const [reviseDialogOpen, setReviseDialogOpen] = useState(false);
  const [reviseReason, setReviseReason] = useState("");
  const [reviseExportPreviewOpen, setReviseExportPreviewOpen] = useState(false);
  const [reviseExportData, setReviseExportData] = useState<RevisePreviewData | null>(null);
  const [reviseExportLoading, setReviseExportLoading] = useState(false);
  const [reviseExporting, setReviseExporting] = useState(false);
  const [defaultReviewerId, setDefaultReviewerId] = useState<string>("");
  const [defaultApproverId, setDefaultApproverId] = useState<string>("");

  async function handleSignatureConfirm(payload: { signatureDataUrl: string }) {
    setPendingSignature(payload.signatureDataUrl);
    setSignatureOpen(false);
    if (signatureMode === "submit") {
      setAssignOpen(true);
    } else if (signatureMode === "review") {
      try {
        await reviewMutation.mutateAsync({ kpiId, data: { signatureDataUrl: payload.signatureDataUrl } });
        toast.success(t("kpi.review.success"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
      } finally {
        setPendingSignature(null);
      }
    } else if (signatureMode === "approve") {
      try {
        await approveMutation.mutateAsync({ kpiId, data: { signatureDataUrl: payload.signatureDataUrl } });
        toast.success(t("kpi.approve.success"));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
      } finally {
        setPendingSignature(null);
      }
    }
  }

  async function handleAssignConfirm(reviewer: ReviewerCandidate, approver: ReviewerCandidate | null) {
    if (!pendingSignature) return;
    try {
      await submitMutation.mutateAsync({
        kpiId,
        data: {
          prepareSignature: pendingSignature,
          reviewerUserId: reviewer.id,
          reviewerAuthUserId: reviewer.id,
          reviewerName: reviewer.name,
          reviewerEmail: reviewer.email,
          approverUserId: approver?.id ?? "",
          approverAuthUserId: approver?.id ?? null,
          approverName: approver?.name ?? null,
          approverEmail: approver?.email ?? null,
        },
      });
      toast.success(t("kpi.submit.success"));
      setPendingSignature(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
      throw err;
    }
  }

  async function handleRevisePreviewOpen() {
    setReviseExportLoading(true);
    setReviseExportPreviewOpen(true);
    try {
      const res = await fetch(`/api/kpi/${kpiId}/revise/export/preview`);
      const json = await res.json();
      setReviseExportData(json.data as RevisePreviewData);
    } catch {
      setReviseExportData(null);
    } finally {
      setReviseExportLoading(false);
    }
  }

  function handleReviseExport() {
    setReviseExporting(true);
    window.open(`/api/kpi/${kpiId}/revise/export`, "_blank");
    setTimeout(() => setReviseExporting(false), 2000);
  }

  useEffect(() => {
    if (!assignOpen || kpi?.reviewerUserId || kpi?.approverUserId) {
      return;
    }

    let cancelled = false;

    async function loadDefaults() {
      const [reviewer, approver] = await Promise.all([
        fetchApprovalConfigDefaultUser("KPI", "QMS"),
        fetchApprovalConfigDefaultUser("KPI", "MR"),
      ]);

      if (cancelled) {
        return;
      }

      setDefaultReviewerId(reviewer?.id ?? "");
      setDefaultApproverId(approver?.id ?? "");
    }

    void loadDefaults();

    return () => {
      cancelled = true;
    };
  }, [assignOpen, kpi?.reviewerUserId, kpi?.approverUserId]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-100 rounded w-48" />
        <div className="h-12 bg-slate-100 rounded-xl" />
        <div className="h-40 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  if (!kpi) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-slate-600 font-semibold text-base mb-1">ไม่พบข้อมูล KPI</p>
      <p className="text-slate-400 text-sm">KPI สำหรับแผนกนี้ยังไม่มีในระบบ</p>
    </div>
  );

  const detail = kpi as KpiDetailResponse;
  const objectives = detail.objectives ?? [];
  const removedObjectives = detail.removedObjectives ?? [];
  const revisionHistory = detail.revisionHistory ?? [];
  const kpiStatus = kpi.status as keyof typeof STATUS_CONFIG;
  const statusCfg = STATUS_CONFIG[kpiStatus] ?? STATUS_CONFIG.DRAFT;
  const StatusIcon = statusCfg.icon;

  const isDraft = kpiStatus === "DRAFT" || kpiStatus === "REJECTED";

  const preparerSig = (kpi as typeof kpi & { approvalSignatures?: Array<{ step: string; signerUserId: string | null }> }).approvalSignatures?.find((s: { step: string; signerUserId: string | null }) => s.step === 'PREPARER');
  const isPreparer = userId != null && preparerSig?.signerUserId === userId;
  const canRecall = isPreparer && kpiStatus === "PENDING_REVIEW";

  const kpiWithIds = kpi as typeof kpi & { reviewerUserId?: string | null; approverUserId?: string | null };
  const reviewerSig = (kpi as typeof kpi & { approvalSignatures?: Array<{ step: string; signerUserId: string | null; action?: string }> }).approvalSignatures?.find((s: { step: string; signerUserId: string | null; action?: string }) => s.step === 'REVIEWER');
  const isReviewer = (
    (userId != null && kpiWithIds.reviewerUserId === userId)
    || (authUserId != null && kpiWithIds.reviewerAuthUserId === authUserId)
  );
  const isApprover = (
    (userId != null && kpiWithIds.approverUserId === userId)
    || (authUserId != null && kpiWithIds.approverAuthUserId === authUserId)
  );
  const reviewerAlreadySigned = reviewerSig?.action === 'APPROVED';
  const canReview = isReviewer && kpiStatus === "PENDING_REVIEW" && !reviewerAlreadySigned;
  const canApprove = isApprover && kpiStatus === "PENDING_APPROVAL";
  const canReject =
    (isReviewer && kpiStatus === "PENDING_REVIEW")
    || (isApprover && kpiStatus === "PENDING_APPROVAL");
  const canAnnounce = privileged && kpiStatus === "QMS_CHECK";
  const canRevise = privileged && (kpiStatus === "APPROVED" || kpiStatus === "ANNOUNCED");

  // USER must belong to the same department as this KPI
  const deptMatch = privileged
    ? true
    : userDepartmentName != null &&
      kpi.department.toLowerCase() === userDepartmentName.toLowerCase();

  // Effective edit permission:
  // - privileged (IT/QMS/MR): always
  // - USER: only when isDraft AND department matches
  const canEdit = canAlwaysEdit || (isDraft && deptMatch);

  // Submit must disappear once the KPI leaves Draft/Rejected, even for privileged roles.
  const canShowSubmit = isDraft && deptMatch && objectives.length > 0;

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link href="/qms/kpi" className="hover:text-slate-600 transition-colors">{t("kpi.reference.title")}</Link>
        <ChevronRight className="w-3.5 h-3.5 shrink-0" />
        <span className="text-slate-600 font-medium truncate">{kpi.department}</span>
      </nav>

      <PageHeader
        title={kpi.department}
        subtitle={String(kpi.yearly)}
        actions={
          <div className="flex items-center gap-2">
            <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border", statusCfg.class)}>
              {StatusIcon && <StatusIcon className="w-3.5 h-3.5" />}
              {statusCfg.label}
            </span>
            {privileged && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                <ShieldCheck className="w-3 h-3" />
                {t("approve.fullAccess")}
              </span>
            )}
            {canEdit && (
              <Button
                onClick={() => { setEditing(null); setModalOpen(true); }}
                variant="outline"
                className="rounded-xl border-slate-200"
              >
                <Plus className="w-4 h-4 mr-2" />{t("kpi.objective.createTitle")}
              </Button>
            )}
            {canRecall && (
              <Button
                onClick={() => setRecallConfirmOpen(true)}
                variant="outline"
                className="rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50"
                disabled={recallMutation.isPending}
              >
                <Undo2 className="w-4 h-4 mr-2" />{t("kpi.recall.button")}
              </Button>
            )}
            {canReject && (
              <Button
                onClick={() => { setRejectReason(""); setRejectConfirmOpen(true); }}
                variant="outline"
                className="rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50"
                disabled={rejectMutation.isPending}
              >
                <ThumbsDown className="w-4 h-4 mr-2" />{t("kpi.reject.button")}
              </Button>
            )}
            {canReview && (
              <Button
                onClick={() => { setSignatureMode("review"); setSignatureOpen(true); }}
                className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
                disabled={reviewMutation.isPending}
              >
                <Eye className="w-4 h-4 mr-2" />{t("kpi.review.button")}
              </Button>
            )}
            {canApprove && (
              <Button
                onClick={() => { setSignatureMode("approve"); setSignatureOpen(true); }}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={approveMutation.isPending}
              >
                <ThumbsUp className="w-4 h-4 mr-2" />{t("kpi.approve.button")}
              </Button>
            )}
            {canShowSubmit && (
              <Button
                onClick={() => { setSignatureMode("submit"); setSignatureOpen(true); }}
                className="rounded-xl bg-primary hover:bg-primary/90"
                disabled={submitMutation.isPending}
              >
                <Send className="w-4 h-4 mr-2" />{t("kpi.submit.button")}
              </Button>
            )}
            {canAnnounce && (
              <Button
                onClick={async () => {
                  try {
                    await announceMutation.mutateAsync({ kpiId, data: { documentName: (kpi as Record<string, unknown>).documentName as string } });
                    toast.success("KPI announced successfully");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Announcement failed", { duration: Infinity });
                  }
                }}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={announceMutation.isPending}
              >
                <Megaphone className="w-4 h-4 mr-2" />Announce
              </Button>
            )}
            {canRevise && (
              <Button
                onClick={() => { setReviseReason(""); setReviseDialogOpen(true); }}
                variant="outline"
                className="rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50"
                disabled={reviseMutation.isPending}
              >
                <RefreshCw className="w-4 h-4 mr-2" />Revise
              </Button>
            )}
            <Button asChild variant="outline" className="rounded-xl border-slate-200">
              <Link href={`/print/qms/kpi/${kpiId}`} target="_blank" rel="noreferrer">
                <Printer className="w-4 h-4 mr-2" />Export PDF
              </Link>
            </Button>
            {privileged && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setDocNameValue(((kpi as Record<string, unknown>).documentName as string) ?? ""); setDocNameEditOpen(true); }}
                className="rounded-xl"
              >
                <Edit3 className="w-4 h-4 text-slate-400" />
              </Button>
            )}
            {privileged && (
              <Button
                variant="destructive"
                className="rounded-xl"
                onClick={() => setResetConfirmOpen(true)}
              >
                Reset KPI
              </Button>
            )}
          </div>
        }
      />

      <RoleBanner role={role} kpiStatus={kpiStatus} deptMatch={deptMatch} />

      {/* KPI Metadata Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">{t("kpi.metaCard.title")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-slate-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 mb-0.5">{t("kpi.form.prepare")}</p>
              <p className="text-sm font-semibold text-slate-800 truncate">{kpi.prepare || "—"}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4 text-amber-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 mb-0.5">{t("kpi.form.reviewer")}</p>
              <p className="text-sm font-semibold text-slate-800 truncate">
                {/* Prefer resolved full name from user record; fall back to free-text field */}
                {(kpi as typeof kpi & { reviewerUser?: { name: string | null; email: string } | null }).reviewerUser?.name
                  || (kpi as typeof kpi & { reviewerUser?: { name: string | null; email: string } | null }).reviewerUser?.email
                  || kpi.reviewer
                  || "—"}
              </p>
              {kpi.reviewerUserId && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5 mt-1">
                  <UserCheck className="w-3 h-3" />{t("kpi.metaCard.assigned")}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center shrink-0">
              <UserCog className="w-4 h-4 text-sky-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 mb-0.5">{t("kpi.form.approver")}</p>
              <p className="text-sm font-semibold text-slate-800 truncate">
                {/* Prefer resolved full name from user record; fall back to free-text field */}
                {(kpi as typeof kpi & { approverUser?: { name: string | null; email: string } | null }).approverUser?.name
                  || (kpi as typeof kpi & { approverUser?: { name: string | null; email: string } | null }).approverUser?.email
                  || kpi.approver
                  || "—"}
              </p>
              {kpi.approverUserId && (
                <span className="inline-flex items-center gap-1 text-xs text-sky-600 bg-sky-50 border border-sky-200 rounded-full px-1.5 py-0.5 mt-1">
                  <UserCog className="w-3 h-3" />{t("kpi.metaCard.assigned")}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <CalendarClock className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 mb-0.5">{t("kpi.metaCard.submittedAt")}</p>
              <p className="text-sm font-semibold text-slate-800">
                {kpi.submittedAt
                  ? new Date(kpi.submittedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" })
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Workflow Timeline */}
      {Array.isArray((kpi as typeof kpi & { approvalSignatures?: unknown[] }).approvalSignatures) &&
        (kpi as typeof kpi & { approvalSignatures?: unknown[] }).approvalSignatures!.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            {t("dar.approval.title")}
          </p>
          <KpiApprovalTimeline
            signatures={(kpi as typeof kpi & { approvalSignatures?: Parameters<typeof KpiApprovalTimeline>[0]["signatures"] }).approvalSignatures ?? []}
            preparerName={kpi.prepare || null}
            reviewerName={(kpi as typeof kpi & { reviewerUser?: { name?: string | null; email?: string } | null }).reviewerUser?.name || kpi.reviewer || null}
            approverName={(kpi as typeof kpi & { approverUser?: { name?: string | null; email?: string } | null }).approverUser?.name || kpi.approver || null}
            layout="horizontal"
          />
        </div>
      )}

      {objectives.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-6">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-slate-400">
            <span className="text-xl">○</span>
          </div>
          <p className="text-slate-800 font-semibold text-base mb-1">{t("kpi.objective.table.empty")}</p>
          {canEdit && (
            <p className="text-slate-400 text-sm">{t("kpi.objective.emptyHint")}</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {objectives.map((obj: KpiObjectiveWithRevision) => {
            const currentTarget = formatObjectiveTarget(obj, t);
            const currentResponsible = formatResponsiblePerson(obj);
            const changeBadge = obj.revisionChangeType === "UPDATED"
              ? { label: "Revised", className: "border-amber-200 bg-amber-50 text-amber-700" }
              : obj.revisionChangeType === "ADDED"
                ? { label: "Added", className: "border-emerald-200 bg-emerald-50 text-emerald-700" }
                : null;

            return (
              <div key={obj.id} className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{obj.objective}</p>
                    {changeBadge && (
                      <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", changeBadge.className)}>
                        {changeBadge.label}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                    <span>
                      {t("kpi.objective.table.target")}:{" "}
                      <strong className="text-primary">
                        {currentTarget.value}
                        {currentTarget.unitLabel ? <span className="ml-0.5 text-slate-400 font-normal">{currentTarget.unitLabel}</span> : ""}
                      </strong>
                    </span>
                    <span>
                      {t("kpi.objective.table.frequency")}:{" "}
                      <strong className="text-slate-700">{obj.frequency}</strong>
                    </span>
                    <span>
                      {t("kpi.form.responsiblePerson")}:{" "}
                      <strong className="text-slate-700">{currentResponsible}</strong>
                    </span>
                  </div>
                  {obj.calculationFormula && (
                    <p className="mt-2 text-xs text-slate-400 line-clamp-1">{obj.calculationFormula}</p>
                  )}

                </div>

                {/* Edit/Delete: shown for privileged always, for USER only when isDraft */}
                {canEdit && (
                  <div className="flex gap-1.5 shrink-0">
                    <ActionIconButton
                      tone="edit"
                      label={t("common.edit")}
                      onClick={() => { setEditing(obj); setModalOpen(true); }}
                    />
                    <ActionIconButton
                      tone="delete"
                      label={t("common.delete")}
                      onClick={() => { setDeleteTargetId(obj.id); setDeleteConfirmOpen(true); }}
                    />
                  </div>
                )}
              </div>
              </div>
            );
          })}
        </div>
      )}

      {objectives.filter((o: KpiObjectiveWithRevision) => o.originalObjective).length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">Original before revise</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-amber-200">
                  <th className="text-left py-1.5 px-2 font-semibold text-amber-900">Objective</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-amber-900">Target</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-amber-900">Frequency</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-amber-900">Responsible</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-amber-900">Formula</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-amber-900">Guidelines</th>
                  <th className="text-left py-1.5 px-2 font-semibold text-amber-900">Reference</th>
                </tr>
              </thead>
              <tbody>
                {objectives.filter((o: KpiObjectiveWithRevision) => o.originalObjective).map((obj: KpiObjectiveWithRevision) => {
                  const ot = formatObjectiveTarget(obj.originalObjective!, t);
                  return (
                    <tr key={obj.id} className="border-b border-amber-100 last:border-b-0">
                      <td className="py-1.5 px-2 text-slate-700">{obj.originalObjective!.objective}</td>
                      <td className="py-1.5 px-2 text-slate-700">{ot.value}{ot.unitLabel ? ` ${ot.unitLabel}` : ""}</td>
                      <td className="py-1.5 px-2 text-slate-700">{obj.originalObjective!.frequency}</td>
                      <td className="py-1.5 px-2 text-slate-700">{formatResponsiblePerson(obj.originalObjective!)}</td>
                      <td className="py-1.5 px-2 text-slate-500 max-w-[160px] truncate" title={obj.originalObjective!.calculationFormula}>{obj.originalObjective!.calculationFormula}</td>
                      <td className="py-1.5 px-2 text-slate-500 max-w-[160px] truncate" title={obj.originalObjective!.actionPlanGuidelines}>{obj.originalObjective!.actionPlanGuidelines}</td>
                      <td className="py-1.5 px-2 text-slate-500">{obj.originalObjective!.referenceDocuments || "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {removedObjectives.length > 0 && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3">
            <p className="text-sm font-semibold text-rose-700">Removed from original KPI</p>
            <p className="text-xs text-rose-600">These objectives existed before revise but were deleted in the current revision.</p>
          </div>
          {removedObjectives.map((removed) => {
            const removedTarget = formatObjectiveTarget(removed.originalObjective, t);
            return (
              <div key={removed.id} className="rounded-2xl border border-rose-200 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">{removed.originalObjective.objective}</p>
                  <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                    Removed
                  </span>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <ObjectiveField
                    label="Target"
                    value={`${removedTarget.value}${removedTarget.unitLabel ? ` ${removedTarget.unitLabel}` : ""}`}
                    tone="original"
                  />
                  <ObjectiveField label="Frequency" value={removed.originalObjective.frequency} tone="original" />
                  <ObjectiveField
                    label="Responsible"
                    value={formatResponsiblePerson(removed.originalObjective)}
                    tone="original"
                  />
                  <ObjectiveField label="Formula" value={removed.originalObjective.calculationFormula} tone="original" />
                  <ObjectiveField
                    label="Guidelines"
                    value={removed.originalObjective.actionPlanGuidelines}
                    tone="original"
                  />
                  <ObjectiveField
                    label="Reference"
                    value={removed.originalObjective.referenceDocuments || "-"}
                    tone="original"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {false && revisionHistory.length > 0 && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-800">Revision history</p>
              <p className="text-xs text-emerald-700">Every revise keeps the previous annual objectives as a historical snapshot.</p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 border-emerald-200 text-emerald-700 hover:bg-emerald-100" onClick={handleRevisePreviewOpen}>
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
              Export Excel
            </Button>
          </div>

          {revisionHistory.map((entry, index) => (
            <div key={entry.auditLogId} className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Revision {revisionHistory.length - index}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatRevisionTimestamp(entry.revisedAt)} · {entry.revisedByRole}
                  </p>
                </div>
                {entry.reason && (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                    {entry.reason}
                  </span>
                )}
              </div>

              <div className="mt-4 space-y-3">
                {entry.objectiveSnapshots.map((snapshot) => {
                  const snapshotTarget = formatObjectiveTarget(snapshot, t);
                  return (
                    <div key={`${entry.auditLogId}-${snapshot.objectiveId}`} className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{snapshot.objective}</p>
                        {entry.revisedObjectiveIds.includes(snapshot.objectiveId) && (
                          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            Revised in this round
                          </span>
                        )}
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <ObjectiveField
                          label="Target"
                          value={`${snapshotTarget.value}${snapshotTarget.unitLabel ? ` ${snapshotTarget.unitLabel}` : ""}`}
                          tone="original"
                        />
                        <ObjectiveField label="Frequency" value={snapshot.frequency} tone="original" />
                        <ObjectiveField label="Responsible" value={formatResponsiblePerson(snapshot)} tone="original" />
                        <ObjectiveField label="Formula" value={snapshot.calculationFormula} tone="original" />
                        <ObjectiveField label="Guidelines" value={snapshot.actionPlanGuidelines} tone="original" />
                        <ObjectiveField label="Reference" value={snapshot.referenceDocuments || "-"} tone="original" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {revisionHistory.length > 0 && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-800">Revision history</p>
              <p className="text-xs text-emerald-700">Every revise keeps the previous annual objectives as a historical snapshot.</p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 border-emerald-200 text-emerald-700 hover:bg-emerald-100" onClick={handleRevisePreviewOpen}>
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
              Export Excel
            </Button>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-xs">
                <thead className="bg-emerald-50/80">
                  <tr className="border-b border-emerald-200">
                    <th className="px-3 py-2 text-left font-semibold text-emerald-900">Revision</th>
                    <th className="px-3 py-2 text-left font-semibold text-emerald-900">Date</th>
                    <th className="px-3 py-2 text-left font-semibold text-emerald-900">Reason</th>
                    <th className="px-3 py-2 text-left font-semibold text-emerald-900">Objective</th>
                    <th className="px-3 py-2 text-left font-semibold text-emerald-900">Target</th>
                    <th className="px-3 py-2 text-left font-semibold text-emerald-900">Frequency</th>
                    <th className="px-3 py-2 text-left font-semibold text-emerald-900">Responsible</th>
                    <th className="px-3 py-2 text-left font-semibold text-emerald-900">Formula</th>
                    <th className="px-3 py-2 text-left font-semibold text-emerald-900">Guidelines</th>
                    <th className="px-3 py-2 text-left font-semibold text-emerald-900">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {revisionHistory.map((entry, index) => (
                    entry.objectiveSnapshots.map((snapshot, snapshotIndex) => {
                      const snapshotTarget = formatObjectiveTarget(snapshot, t);
                      const wasRevisedInRound = entry.revisedObjectiveIds.includes(snapshot.objectiveId);
                      return (
                        <tr
                          key={`${entry.auditLogId}-${snapshot.objectiveId}`}
                          className={cn(
                            "border-b border-emerald-100 align-top last:border-b-0",
                            wasRevisedInRound ? "bg-emerald-50/40" : "bg-white",
                          )}
                        >
                          {snapshotIndex === 0 && (
                            <>
                              <td rowSpan={entry.objectiveSnapshots.length} className="px-3 py-2 font-semibold text-slate-900">
                                Revision {revisionHistory.length - index}
                              </td>
                              <td rowSpan={entry.objectiveSnapshots.length} className="px-3 py-2 text-slate-600">
                                <div>{formatRevisionTimestamp(entry.revisedAt)}</div>
                                <div className="mt-1 text-[11px] text-slate-400">{entry.revisedByRole}</div>
                              </td>
                              <td rowSpan={entry.objectiveSnapshots.length} className="px-3 py-2 text-slate-600">
                                {entry.reason || "-"}
                              </td>
                            </>
                          )}
                          <td className="px-3 py-2 text-slate-800">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={cn("font-medium", wasRevisedInRound && "font-semibold text-emerald-800")}>
                                {snapshot.objective}
                              </span>
                              {wasRevisedInRound && (
                                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                  Revised in this round
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {snapshotTarget.value}{snapshotTarget.unitLabel ? ` ${snapshotTarget.unitLabel}` : ""}
                          </td>
                          <td className="px-3 py-2 text-slate-700">{snapshot.frequency}</td>
                          <td className="px-3 py-2 text-slate-700">{formatResponsiblePerson(snapshot)}</td>
                          <td className="px-3 py-2 text-slate-600 whitespace-pre-wrap">{snapshot.calculationFormula}</td>
                          <td className="px-3 py-2 text-slate-600 whitespace-pre-wrap">{snapshot.actionPlanGuidelines}</td>
                          <td className="px-3 py-2 text-slate-600">{snapshot.referenceDocuments || "-"}</td>
                        </tr>
                      );
                    })
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Objective Form Modal */}
      <KpiObjectiveFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        objective={editing}
        onSubmit={async (values) => {
          try {
            if (editing) {
              await updateMutation.mutateAsync({ kpiId, objectiveId: editing.id, data: values });
              toast.success(t("kpi.messages.updateSuccess"));
            } else {
              await addMutation.mutateAsync({ kpiId, data: values });
              toast.success(t("kpi.messages.createSuccess"));
            }
          } catch (err) {
            toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
            throw err;
          }
        }}
      />

      {/* Delete Confirm */}
      {deleteConfirmOpen && deleteTargetId && (
        <ConfirmModal
          title={t("kpi.reference.confirmDeleteTitle")}
          message={t("kpi.reference.confirmDeleteMessage")}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          danger
          loading={deleteMutation.isPending}
          onConfirm={async () => {
            try {
              await deleteMutation.mutateAsync({ kpiId, objectiveId: deleteTargetId });
              toast.success(t("kpi.messages.deleteSuccess"));
            } catch (err) {
              toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
            } finally {
              setDeleteConfirmOpen(false);
              setDeleteTargetId(null);
            }
          }}
          onCancel={() => { setDeleteConfirmOpen(false); setDeleteTargetId(null); }}
        />
      )}

      {resetConfirmOpen && (
        <ConfirmModal
          title="Reset KPI ของแผนกนี้"
          message={`การดำเนินการนี้จะลบ KPI รายปี วัตถุประสงค์รายปี และ KPI Monthly ทั้งหมดของ ${kpi?.department ?? "แผนกนี้"} ปี ${kpi?.yearly ?? "ที่เลือก"} รวมถึงข้อมูล workflow ที่เกี่ยวข้อง และไม่สามารถกู้คืนได้`}
          confirmLabel="ยืนยัน Reset KPI"
          cancelLabel={t("common.cancel")}
          danger
          loading={deleteKpiMutation.isPending}
          onConfirm={async () => {
            try {
              await deleteKpiMutation.mutateAsync(kpiId);
              toast.success("Reset KPI สำเร็จ");
              router.push("/qms/kpi");
              router.refresh();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
            } finally {
              setResetConfirmOpen(false);
            }
          }}
          onCancel={() => setResetConfirmOpen(false)}
        />
      )}

      {/* Recall Confirm */}
      {recallConfirmOpen && (
        <ConfirmModal
          title={t("kpi.recall.confirmTitle")}
          message={t("kpi.recall.confirmMessage")}
          confirmLabel={t("kpi.recall.button")}
          cancelLabel={t("common.cancel")}
          danger
          loading={recallMutation.isPending}
          onConfirm={async () => {
            try {
              await recallMutation.mutateAsync(kpiId);
              toast.success(t("kpi.recall.success"));
            } catch (err) {
              toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
            } finally {
              setRecallConfirmOpen(false);
            }
          }}
          onCancel={() => setRecallConfirmOpen(false)}
        />
      )}

      {/* Reject Dialog with reason */}
      <Dialog open={rejectConfirmOpen} onOpenChange={(o) => { if (!rejectMutation.isPending) { setRejectConfirmOpen(o); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              {t("kpi.reject.confirmTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-500">กรุณาระบุเหตุผลการปฏิเสธ / Please provide a reason for rejection</p>
            <Textarea
              placeholder="เหตุผล / Reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectConfirmOpen(false)} disabled={rejectMutation.isPending}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={rejectMutation.isPending || !rejectReason.trim()}
              onClick={async () => {
                try {
                  await rejectMutation.mutateAsync({ kpiId, reason: rejectReason.trim() });
                  toast.success(t("kpi.reject.success"));
                  setRejectConfirmOpen(false);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : t("error.title"), { duration: Infinity });
                }
              }}
            >
              {rejectMutation.isPending ? "..." : t("kpi.reject.button")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 1: Signature */}
      <KpiSignatureDialog
        open={signatureOpen}
        title={signatureMode === "review" ? t("kpi.review.signatureTitle") : signatureMode === "approve" ? t("kpi.approve.signatureTitle") : t("kpi.submit.signatureTitle")}
        onOpenChange={setSignatureOpen}
        onConfirm={handleSignatureConfirm}
      />

      {/* Step 2: Assign Reviewer + Approver */}
      <KpiObjectiveAssignDialog
        open={assignOpen}
        onOpenChange={(open) => {
          setAssignOpen(open);
          if (!open) setPendingSignature(null);
        }}
        initialReviewerId={(kpi.reviewerUserId ?? defaultReviewerId) || undefined}
        initialApproverId={(kpi.approverUserId ?? defaultApproverId) || undefined}
        onConfirm={handleAssignConfirm}
      />

      {/* Document Name Edit Dialog */}
      <Dialog open={docNameEditOpen} onOpenChange={setDocNameEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Document Name / แก้ไขชื่อเอกสาร</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="docName">Document Name (ใช้ใน Footer และ PDF export)</Label>
            <Input
              id="docName"
              value={docNameValue}
              onChange={(e) => setDocNameValue(e.target.value)}
              placeholder="e.g. KPI 2026 - Department Name"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDocNameEditOpen(false)} disabled={updateKpiMutation.isPending}>
              Cancel
            </Button>
            <Button
              disabled={updateKpiMutation.isPending}
              onClick={async () => {
                try {
                  await updateKpiMutation.mutateAsync({ id: kpiId, data: { documentName: docNameValue || null } });
                  toast.success("Document name updated");
                  setDocNameEditOpen(false);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Update failed", { duration: Infinity });
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revise KPI Dialog */}
      <Dialog open={reviseDialogOpen} onOpenChange={(o) => { if (!reviseMutation.isPending) setReviseDialogOpen(o); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-600 flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Revise KPI / แก้ไข KPI
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-500">Provide a reason for revision. The KPI will be reset to Draft and remaining monthly reports will be regenerated.</p>
            <Textarea
              placeholder="Revision reason / เหตุผลการแก้ไข..."
              value={reviseReason}
              onChange={(e) => setReviseReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviseDialogOpen(false)} disabled={reviseMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-amber-600 hover:bg-amber-700"
              disabled={reviseMutation.isPending || !reviseReason.trim()}
              onClick={async () => {
                try {
                  await reviseMutation.mutateAsync({ kpiId, data: { reason: reviseReason.trim() } });
                  toast.success("KPI revised successfully. Remaining months regenerated.");
                  setReviseDialogOpen(false);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Revision failed", { duration: Infinity });
                }
              }}
            >
              {reviseMutation.isPending ? "..." : "Revise"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <KpiReviseExportPreviewDialog
        open={reviseExportPreviewOpen}
        onClose={() => { setReviseExportPreviewOpen(false); }}
        onExport={handleReviseExport}
        data={reviseExportData}
        loading={reviseExportLoading}
        exporting={reviseExporting}
      />
    </div>
  );
}
