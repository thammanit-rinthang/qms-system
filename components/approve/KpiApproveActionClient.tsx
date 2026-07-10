"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useAppQuery } from "@/hooks/use-app-query";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import KpiSignatureDialog from "@/components/kpi/KpiSignatureDialog";
import KpiApprovalTimeline, { KPI_MONTHLY_STEPS, type KpiApprovalSignature } from "@/components/kpi/KpiApprovalTimeline";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ApproveSuccessScreen from "@/components/shared/ApproveSuccessScreen";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp } from "lucide-react";

type Mode = "reviewer" | "approver";
type KpiType = "kpi" | "kpi-monthly";

type Props = {
  id: string;
  mode: Mode;
  type: KpiType;
  kpiId?: string;
};

type KpiObjective = {
  id: string;
  objective: string;
  target: number;
  unit?: string | null;
  frequency: string;
  calculationFormula: string;
  actionPlanGuidelines: string;
  referenceDocuments?: string | null;
};

type MonthlyCorrectiveAction = {
  id: string;
  times: number;
  rootCause: string;
  guidelines: string;
  responsiblePerson: string;
  dueDate: string | Date;
};

type MonthlyDetail = {
  id: string;
  kpiObjective: { objective: string };
  achievedStatus: string;
  actualResult: number | null;
  correctiveActions?: MonthlyCorrectiveAction[];
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
  SUBMITTED: "bg-amber-50 text-amber-600 border-amber-200",
  IN_REVIEW: "bg-amber-50 text-amber-600 border-amber-200",
  PENDING_REVIEW: "bg-amber-50 text-amber-600 border-amber-200",
  PENDING_APPROVAL: "bg-amber-50 text-amber-600 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-600 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-600 border-rose-200",
};

const ACHIEVED_STYLES: Record<string, string> = {
  OK: "bg-emerald-50 text-emerald-600 border-emerald-200",
  NOT_OK: "bg-rose-50 text-rose-600 border-rose-200",
  PENDING: "bg-amber-50 text-amber-600 border-amber-200",
};

export default function KpiApproveActionClient({ id, mode, type, kpiId }: Props) {
  const t = useT();
  const qc = useQueryClient();
  const [sigOpen, setSigOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const query = useAppQuery({
    queryKey: ["approve-action", type, id, kpiId],
    realtimeClass: "A",
    queryFn: async () => {
      const url =
        type === "kpi" ? `/api/kpi/${id}` : `/api/kpi/${kpiId}/monthly/${id}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? json.message ?? "Failed to load");
      return json.data;
    },
  });

  const department = useMemo(() => {
    if (!query.data) return "";
    return type === "kpi" ? query.data.department : (query.data.kpi?.department ?? "");
  }, [query.data, type]);

  async function submitAction(
    action: "approve" | "reject",
    sigPayload?: { signatureDataUrl: string; signatureType: string; saveSignature: boolean },
    reason?: string,
  ) {
    try {
      setSubmitting(true);
      let url = "";
      if (type === "kpi") {
        url =
          action === "approve"
            ? mode === "reviewer" ? `/api/kpi/${id}/review` : `/api/kpi/${id}/approve`
            : `/api/kpi/${id}/reject`;
      } else {
        url =
          action === "approve"
            ? mode === "reviewer"
              ? `/api/kpi/${kpiId}/monthly/${id}/review`
              : `/api/kpi/${kpiId}/monthly/${id}/approve`
            : `/api/kpi/${kpiId}/monthly/${id}/reject`;
      }

      const bodyPayload = {
        ...(action === "reject" && reason ? { reason } : {}),
        ...(sigPayload ?? {}),
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: Object.keys(bodyPayload).length > 0 ? JSON.stringify(bodyPayload) : undefined,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? json.message ?? "Action failed");

      const kpiRecordId = type === "kpi" ? id : kpiId;
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["kpi"] }),
        qc.invalidateQueries({ queryKey: ["kpi", kpiRecordId] }),
        qc.invalidateQueries({ queryKey: ["approve-action", type, id, kpiId] }),
      ]);

      setSheetOpen(false);
      setSuccessOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"), { duration: Infinity });
    } finally {
      setSubmitting(false);
    }
  }

  if (successOpen) {
    return (
      <ApproveSuccessScreen
        title="ดำเนินการเรียบร้อย"
        subtitle={mode === "reviewer" ? "ตรวจสอบ KPI เรียบร้อยแล้ว" : "อนุมัติ KPI เรียบร้อยแล้ว"}
        backHref="/notifications"
        backLabel="กลับหน้าหลัก"
      />
    );
  }

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!query.data) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-sm text-rose-600">
        {t("common.error")}
      </div>
    );
  }

  const kpi = query.data;
  const status: string = kpi.status ?? "";
  const statusStyle = STATUS_STYLES[status] ?? "bg-slate-100 text-slate-600 border-slate-200";
  const statusLabel = t(`kpi.monthly.status.${status}` as never) ?? status;
  const objectives: KpiObjective[] = type === "kpi" ? (kpi.objectives ?? []) : [];
  const monthlyDetails: MonthlyDetail[] = type === "kpi-monthly" ? (kpi.details ?? []) : [];
  const approvalSignatures: KpiApprovalSignature[] = kpi.approvalSignatures ?? [];

  const reviewerName = type === "kpi"
    ? (kpi.reviewerUser?.name ?? kpi.reviewer ?? "-")
    : (kpi.kpi?.reviewerUser?.name ?? kpi.kpi?.reviewer ?? "-");
  const approverName = type === "kpi"
    ? (kpi.approverUser?.name ?? kpi.approver ?? "-")
    : (kpi.kpi?.approverUser?.name ?? kpi.kpi?.approver ?? "-");
  const preparerName = type === "kpi"
    ? (kpi.prepare ?? "-")
    : (kpi.kpi?.prepare ?? "-");
  const submittedAt: string | null = kpi.submittedAt ?? null;
  const remark: string | null = type === "kpi-monthly" ? (kpi.remark ?? null) : null;
  const attachmentFileName: string | null = type === "kpi-monthly" ? (kpi.attachmentFileName ?? null) : null;
  const attachmentWebUrl: string | null = type === "kpi-monthly" ? (kpi.attachmentWebUrl ?? null) : null;

  const ActionPanel = (
    <div className="rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      {/* Timeline section */}
      {approvalSignatures.length > 0 && (
        <div className="p-5 border-b border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
            {t("dar.approval.title")}
          </p>
          <KpiApprovalTimeline
            signatures={approvalSignatures}
            preparerName={preparerName}
            reviewerName={reviewerName}
            approverName={approverName}
            steps={type === "kpi-monthly" ? KPI_MONTHLY_STEPS : undefined}
          />
        </div>
      )}

      {/* Action section */}
      <div className="p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {mode === "reviewer" ? t("approve.stepReview") : t("approve.stepApprove")}
        </p>
        <Button
          className="w-full rounded-xl bg-primary hover:bg-[#161875] h-11 font-semibold"
          disabled={submitting}
          onClick={() => { setSigOpen(true); }}
        >
          {mode === "reviewer" ? t("kpi.monthly.actions.review") : t("kpi.monthly.actions.approve")}
        </Button>
        <Button
          variant="outline"
          className="w-full rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 h-11 font-semibold"
          disabled={submitting}
          onClick={() => { setRejectReason(""); setRejectOpen(true); }}
        >
          {t("kpi.monthly.actions.reject")}
        </Button>
      </div>
    </div>
  );

  const DetailContent = (
    <div className="space-y-4">
      {/* KPI Info Card */}
      <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-primary">
              {type === "kpi" ? t("approve.typeObjective") : t("approve.typeMonthly")}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">{department}</p>
          </div>
          <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold shrink-0 ${statusStyle}`}>
            {statusLabel}
          </span>
        </div>

        <div className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
          <InfoRow label={t("approve.department")} value={department || "-"} />
          <InfoRow label={t("kpi.form.year")} value={String(kpi.yearly ?? kpi.kpi?.yearly ?? "-")} />
          {type === "kpi-monthly" && (
            <InfoRow label={t("approve.period")} value={`${kpi.month ?? ""} ${kpi.year ?? ""}`} />
          )}
          <InfoRow label={t("kpi.form.prepare")} value={preparerName} />
          <InfoRow label={t("kpi.form.reviewer")} value={reviewerName} />
          <InfoRow label={t("kpi.form.approver")} value={approverName} />
          {submittedAt && (
            <InfoRow
              label={t("kpi.metaCard.submittedAt")}
              value={new Date(submittedAt).toLocaleDateString()}
            />
          )}
        </div>

        {remark && (
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-400 mb-1">{t("kpi.monthly.field.remark")}</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{remark}</p>
          </div>
        )}

        {attachmentFileName && (
          <div className="border-t border-slate-100 pt-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            {attachmentWebUrl ? (
              <a
                href={attachmentWebUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline truncate"
              >
                {attachmentFileName}
              </a>
            ) : (
              <span className="text-sm text-slate-600 truncate">{attachmentFileName}</span>
            )}
          </div>
        )}
      </div>

      {/* Objectives */}
      {type === "kpi" && objectives.length > 0 && (
        <ObjectivesSection objectives={objectives} t={t} />
      )}

      {/* Monthly details */}
      {type === "kpi-monthly" && monthlyDetails.length > 0 && (
        <MonthlyDetailsSection details={monthlyDetails} t={t} />
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Banner */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
        <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-800">
            {mode === "reviewer" ? t("approve.pendingKpiReviewList") : t("approve.pendingKpiApproveList")}
          </p>
          <p className="text-xs text-amber-700 mt-0.5">{department}</p>
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/approve" className="hover:text-slate-600 transition-colors">{t("approve.title")}</Link>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-slate-600 font-medium">
          {type === "kpi" ? t("approve.typeObjective") : t("approve.typeMonthly")}
        </span>
      </nav>

      {/* Desktop: two-column */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_300px] lg:gap-6 lg:items-start">
        <div>{DetailContent}</div>
        <div className="sticky top-6">{ActionPanel}</div>
      </div>

      {/* Mobile: stacked */}
      <div className="lg:hidden">{DetailContent}</div>

      {/* Mobile floating bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40">
        {sheetOpen && (
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSheetOpen(false)} />
        )}
        <div className={`relative z-50 bg-white border-t border-slate-200 shadow-[0_-8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 ${sheetOpen ? "rounded-t-2xl" : ""}`}>
          {sheetOpen ? (
            <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-slate-200" />
              </div>
              <div className="px-4 pb-8 space-y-3 pt-2">
                <p className="text-sm font-semibold text-slate-800">{department}</p>
                <Button
                  className="w-full rounded-xl bg-primary hover:bg-[#161875] h-11 font-semibold"
                  disabled={submitting}
                  onClick={() => { setSigOpen(true); }}
                >
                  {mode === "reviewer" ? t("kpi.monthly.actions.review") : t("kpi.monthly.actions.approve")}
                </Button>
                <Button
                  variant="outline"
                  className="w-full rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50 h-11 font-semibold"
                  disabled={submitting}
                  onClick={() => { setRejectReason(""); setRejectOpen(true); }}
                >
                  {t("kpi.monthly.actions.reject")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 font-medium">
                  {mode === "reviewer" ? t("approve.pendingKpiReviewList") : t("approve.pendingKpiApproveList")}
                </p>
                <p className="text-sm font-semibold text-slate-800 truncate">{department}</p>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="shrink-0 h-10 px-5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-[#161875] active:scale-95 transition-all"
              >
                {mode === "reviewer" ? t("kpi.monthly.actions.review") : t("kpi.monthly.actions.approve")}
              </button>
            </div>
          )}
        </div>
      </div>

      <KpiSignatureDialog
        open={sigOpen}
        title={
          mode === "reviewer"
            ? t("kpi.monthly.actions.review")
            : t("kpi.monthly.actions.approve")
        }
        onOpenChange={setSigOpen}
        onConfirm={async (payload) => {
          await submitAction("approve", payload);
        }}
      />

      {/* Reject reason dialog */}
      <Dialog open={rejectOpen} onOpenChange={(o) => { if (!submitting) { setRejectOpen(o); } }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-rose-600">{t("kpi.monthly.actions.reject")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-slate-500">กรุณาระบุเหตุผลการปฏิเสธ / Please provide a reason for rejection</p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="ระบุเหตุผล..."
              className="rounded-xl min-h-25"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" disabled={submitting} onClick={() => setRejectOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={submitting || !rejectReason.trim()}
              onClick={async () => {
                await submitAction("reject", undefined, rejectReason.trim());
                setRejectOpen(false);
              }}
            >
              {submitting ? "..." : t("kpi.monthly.actions.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

/* ─── sub-components ─── */

type Translator = ReturnType<typeof useT>;

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-800">{value}</span>
    </div>
  );
}

function ObjectivesSection({ objectives, t }: { objectives: KpiObjective[]; t: Translator }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <h3 className="text-sm font-semibold text-slate-800 mb-4">
        {t("kpi.objective.table.objective")}
        <span className="ml-2 text-xs font-normal text-slate-400">({objectives.length})</span>
      </h3>

      <div className="space-y-2">
        {objectives.map((obj, idx) => {
          const isOpen = expanded.has(obj.id);
          return (
            <div key={obj.id} className="rounded-xl border border-slate-100 overflow-hidden">
              {/* Header row */}
              <button
                type="button"
                onClick={() => toggle(obj.id)}
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 leading-snug">{obj.objective}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-xs text-slate-500">
                      {t("kpi.objective.table.target")}: <span className="font-semibold text-slate-700">{obj.target}{obj.unit ? ` ${obj.unit}` : ""}</span>
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                    <span className="text-xs text-slate-500">{obj.frequency}</span>
                  </div>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                )}
              </button>

              {/* Expanded details */}
              {isOpen && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3 bg-slate-50/50">
                  <DetailField label={t("kpi.form.calculationFormula")} value={obj.calculationFormula} />
                  <DetailField label={t("kpi.form.actionPlanGuidelines")} value={obj.actionPlanGuidelines} />
                  {obj.referenceDocuments && (
                    <DetailField label={t("kpi.form.referenceDocuments")} value={obj.referenceDocuments} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function MonthlyDetailsSection({ details, t }: { details: MonthlyDetail[]; t: Translator }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <h3 className="text-sm font-semibold text-slate-800 mb-4">
        {t("kpi.monthly.drawer.objectives")}
        <span className="ml-2 text-xs font-normal text-slate-400">({details.length})</span>
      </h3>

      <div className="space-y-3">
        {details.map((d) => (
          <div key={d.id} className="rounded-xl border border-slate-100 overflow-hidden">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3 p-4">
              <p className="text-sm font-medium text-slate-800 leading-snug flex-1">{d.kpiObjective.objective}</p>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-slate-500">{d.actualResult ?? "-"}</span>
                <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-semibold ${ACHIEVED_STYLES[d.achievedStatus] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                  {t(`kpi.monthly.achieved.${d.achievedStatus}` as never) ?? d.achievedStatus}
                </span>
              </div>
            </div>

            {/* Corrective actions */}
            {d.correctiveActions && d.correctiveActions.length > 0 && (
              <div className="border-t border-rose-50 bg-rose-50/40 px-4 pb-4 pt-3 space-y-3">
                <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
                  {t("kpi.monthly.section.correctiveActions")}
                </p>
                {d.correctiveActions.map((ca) => (
                  <div key={ca.id} className="rounded-xl bg-white border border-rose-100 p-3 space-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("kpi.monthly.correctiveAction.times")}</span>
                      <span className="text-xs font-bold text-slate-700">#{ca.times}</span>
                    </div>
                    <CorrectiveField label={t("kpi.monthly.correctiveAction.rootCause")} value={ca.rootCause} />
                    <CorrectiveField label={t("kpi.monthly.correctiveAction.guidelines")} value={ca.guidelines} />
                    <div className="grid grid-cols-2 gap-2">
                      <CorrectiveField label={t("kpi.monthly.correctiveAction.responsible")} value={ca.responsiblePerson} />
                      <CorrectiveField
                        label={t("kpi.monthly.correctiveAction.dueDate")}
                        value={new Date(ca.dueDate).toLocaleDateString()}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CorrectiveField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="text-sm text-slate-700 leading-relaxed">{value}</p>
    </div>
  );
}
