"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import { KPI_UNITS } from "@/lib/kpi-units";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Send, Undo2, CheckCircle2, Clock, ShieldCheck, Info, ShieldAlert, User, UserCheck, UserCog, CalendarClock, ChevronRight, ThumbsUp, ThumbsDown, Eye, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/hooks/api/use-kpi";
import KpiApprovalTimeline from "@/components/kpi/KpiApprovalTimeline";
import type { KPIObjective } from "@/generated/prisma/client";

type UserRole = "USER" | "IT" | "QMS" | "MR";

const PRIVILEGED_ROLES: UserRole[] = ["IT", "QMS", "MR"];
function isPrivileged(role: UserRole): boolean {
  return PRIVILEGED_ROLES.includes(role);
}

interface Props {
  kpiId: string;
  role: UserRole;
  userId: string | null;
  userDepartmentName: string | null;
}

const STATUS_CONFIG = {
  DRAFT:          { label: "Draft",           icon: null,          class: "bg-slate-50 text-slate-500 border-slate-200" },
  PENDING_REVIEW: { label: "Pending Review",  icon: Clock,         class: "bg-amber-50 text-amber-600 border-amber-200" },
  APPROVED:       { label: "Approved ✓",      icon: CheckCircle2,  class: "bg-emerald-50 text-emerald-600 border-emerald-200" },
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

export default function KpiDepartmentDetailClient({ kpiId, role, userId, userDepartmentName }: Props) {
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

  const addMutation = useAddObjective();
  const updateMutation = useUpdateObjective();
  const deleteMutation = useDeleteObjective();
  const submitMutation = useSubmitKpiObjectives();
  const recallMutation = useRecallKpiObjectives();
  const reviewMutation = useReviewKpiObjectives();
  const approveMutation = useApproveKpiObjectives();
  const rejectMutation = useRejectKpiObjectives();

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

  const objectives: KPIObjective[] = kpi.objectives ?? [];
  const kpiStatus = kpi.status as keyof typeof STATUS_CONFIG;
  const statusCfg = STATUS_CONFIG[kpiStatus] ?? STATUS_CONFIG.DRAFT;
  const StatusIcon = statusCfg.icon;

  const isDraft = kpiStatus === "DRAFT" || kpiStatus === "REJECTED";

  const preparerSig = (kpi as typeof kpi & { approvalSignatures?: Array<{ step: string; signerUserId: string | null }> }).approvalSignatures?.find((s: { step: string; signerUserId: string | null }) => s.step === 'PREPARER');
  const isPreparer = userId != null && preparerSig?.signerUserId === userId;
  const canRecall = isPreparer && kpiStatus === "PENDING_REVIEW";

  const kpiWithIds = kpi as typeof kpi & { reviewerUserId?: string | null; approverUserId?: string | null };
  const reviewerSig = (kpi as typeof kpi & { approvalSignatures?: Array<{ step: string; signerUserId: string | null; action?: string }> }).approvalSignatures?.find((s: { step: string; signerUserId: string | null; action?: string }) => s.step === 'REVIEWER');
  const isReviewer = userId != null && kpiWithIds.reviewerUserId === userId;
  const isApprover = userId != null && kpiWithIds.approverUserId === userId;
  const reviewerAlreadySigned = reviewerSig?.action === 'APPROVED';
  const canReview = isReviewer && kpiStatus === "PENDING_REVIEW" && !reviewerAlreadySigned;
  const canApprove = isApprover && kpiStatus === "PENDING_REVIEW" && reviewerAlreadySigned;
  const canReject = (isReviewer || isApprover) && kpiStatus === "PENDING_REVIEW";

  // USER must belong to the same department as this KPI
  const deptMatch = privileged
    ? true
    : userDepartmentName != null &&
      kpi.department.toLowerCase() === userDepartmentName.toLowerCase();

  // Effective edit permission:
  // - privileged (IT/QMS/MR): always
  // - USER: only when isDraft AND department matches
  const canEdit = canAlwaysEdit || (isDraft && deptMatch);

  const canShowSubmit = canEdit && objectives.length > 0;

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
          {objectives.map(obj => (
            <div key={obj.id} className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 leading-snug">{obj.objective}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                    <span>
                      {t("kpi.objective.table.target")}:{" "}
                      <strong className="text-primary">{obj.target}{obj.unit ? <span className="ml-0.5 text-slate-400 font-normal">{t(KPI_UNITS.find(u => u.value === obj.unit)?.labelKey as Parameters<typeof t>[0] ?? '')}</span> : ''}</strong>
                    </span>
                    <span>
                      {t("kpi.objective.table.frequency")}:{" "}
                      <strong className="text-slate-700">{obj.frequency}</strong>
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
          ))}
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
        initialReviewerId={kpi.reviewerUserId ?? undefined}
        initialApproverId={kpi.approverUserId ?? undefined}
        onConfirm={handleAssignConfirm}
      />
    </div>
  );
}
