"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { FileUp, Loader2, X, ChevronRight, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import ApproveSuccessScreen from "@/components/shared/ApproveSuccessScreen";
import KpiSignatureDialog from "@/components/kpi/KpiSignatureDialog";
import FmMr01PrintTemplate from "@/components/kpi/FmMr01PrintTemplate";
import KpiApprovalTimeline, { type KpiApprovalSignature } from "@/components/kpi/KpiApprovalTimeline";
import { useLocale } from "@/lib/locale-context";
import type { FooterConfig } from "@/services/qmsConfigService";
import type { SignatureType } from "@/types/dar";

type AttachmentItem = {
  fileName: string;
  spItemId: string;
  spWebUrl: string;
};

type Objective = {
  id: string;
  target: number;
  unit: string | null;
  objective: string;
  frequency: string;
  calculationFormula: string;
  actionPlanGuidelines: string;
  referenceDocuments: string | null;
  responsibleNameSnapshot?: string | null;
  responsibleEmployeeId?: string | null;
  responsibleEmailSnapshot?: string | null;
  revisionChangeType?: string | null;
};

type RemovedObjective = {
  id: string;
  revisionChangeType: "REMOVED";
  originalObjective: {
    objective: string;
    target: number;
    unit: string | null;
    frequency: string;
    calculationFormula: string;
    actionPlanGuidelines: string;
    referenceDocuments: string | null;
    responsibleNameSnapshot?: string | null;
    responsibleEmployeeId?: string | null;
    responsibleEmailSnapshot?: string | null;
  };
};

type KpiRow = {
  id: string;
  yearly: number;
  department: string;
  status: string;
  objectives?: Objective[];
  removedObjectives?: RemovedObjective[];
  prepare: string;
  reviewer: string;
  approver: string;
};

type Props = {
  approvalDocumentId: string;
  mode: "reviewer" | "approver";
  year: number;
  kpis: KpiRow[];
  masterKpi: KpiRow;
  signatures: KpiApprovalSignature[];
  footerConfig?: FooterConfig | null;
};

export default function FmMr01ApprovalPageClient({
  approvalDocumentId,
  mode,
  year,
  kpis,
  masterKpi,
  signatures,
  footerConfig,
}: Props) {
  const router = useRouter();
  const locale = useLocale();
  const [sigOpen, setSigOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionAttachments, setActionAttachments] = useState<AttachmentItem[]>([]);
  const [rejectAttachments, setRejectAttachments] = useState<AttachmentItem[]>([]);
  const [uploadingTarget, setUploadingTarget] = useState<"approve" | "reject" | null>(null);

  const actionRoute =
    mode === "reviewer"
      ? `/api/kpi/${approvalDocumentId}/review`
      : `/api/kpi/${approvalDocumentId}/approve`;

  async function uploadFiles(files: FileList, target: "approve" | "reject") {
    if (!files.length) return;
    setUploadingTarget(target);
    try {
      const uploaded: AttachmentItem[] = [];
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folderPath", "KPI/approvals");

        const res = await fetch("/api/sharepoint/upload-file", {
          method: "POST",
          body: formData,
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.data) {
          throw new Error(json?.error?.message ?? json?.message ?? "Upload failed");
        }

        uploaded.push({
          fileName: json.data.name || file.name,
          spItemId: json.data.id,
          spWebUrl: json.data.webUrl,
        });
      }

      if (target === "approve") {
        setActionAttachments((prev) => [...prev, ...uploaded]);
      } else {
        setRejectAttachments((prev) => [...prev, ...uploaded]);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed", { duration: Infinity });
    } finally {
      setUploadingTarget(null);
    }
  }

  async function submitApprove(payload: {
    signatureDataUrl: string;
    signatureType: SignatureType;
    saveSignature: boolean;
  }) {
    try {
      setSubmitting(true);
      const res = await fetch(actionRoute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          ...(actionAttachments.length > 0 ? { attachments: actionAttachments } : {}),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message ?? json?.message ?? "Action failed");
      }
      setSuccessOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed", { duration: Infinity });
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReject() {
    try {
      setSubmitting(true);
      const res = await fetch(`/api/kpi/${approvalDocumentId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: rejectReason.trim(),
          ...(rejectAttachments.length > 0 ? { attachments: rejectAttachments } : {}),
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message ?? json?.message ?? "Reject failed");
      }
      setRejectOpen(false);
      setSuccessOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reject failed", { duration: Infinity });
    } finally {
      setSubmitting(false);
    }
  }

  const copy = locale === "en" ? {
    bannerLabel: mode === "reviewer"
      ? "This annual quality objective is pending your review."
      : "This annual quality objective is pending your approval.",
    bannerSub: mode === "reviewer" ? "Pending Review" : "Pending Approval",
    timelineTitle: "Sign-off History",
    actionLabel: mode === "reviewer" ? "Review and Send Next" : "Approve",
    actionLabelEn: mode === "reviewer" ? "Review & Sign" : "Approve & Sign",
    rejectLabel: "Reject / Return",
    attachmentsLabel: "Action Attachments",
    uploadLabel: "Upload files",
    uploadingLabel: "Uploading",
    backLabel: "Back to Approve List",
    sigDialogTitle: mode === "reviewer" ? "Review FM-MR-01" : "Approve FM-MR-01",
    rejectDialogTitle: "Reject FM-MR-01",
    rejectPlaceholder: "Reason for rejection",
    rejectAttachmentsLabel: "Rejection attachments",
    cancelLabel: "Cancel",
    confirmRejectLabel: "Reject",
    successTitle: "Action Completed",
    successSubtitle: mode === "reviewer" ? "FM-MR-01 has been reviewed and forwarded." : "FM-MR-01 has been approved.",
    successBack: "Back to main menu",
  } : {
    bannerLabel: mode === "reviewer"
      ? "วัตถุประสงค์คุณภาพประจำปีนี้รอการตรวจสอบจากคุณ"
      : "วัตถุประสงค์คุณภาพประจำปีนี้รอการอนุมัติจากคุณ",
    bannerSub: mode === "reviewer" ? "รอตรวจสอบ" : "รออนุมัติ",
    timelineTitle: "ประวัติการลงนาม / Sign-off History",
    actionLabel: mode === "reviewer" ? "ตรวจสอบและส่งต่อ" : "อนุมัติ",
    actionLabelEn: mode === "reviewer" ? "ตรวจสอบและส่งต่อ / Review & Sign" : "อนุมัติ / Approve & Sign",
    rejectLabel: "ส่งกลับแก้ไข / ปฏิเสธ (Reject / Return)",
    attachmentsLabel: "เอกสารแนบประกอบการลงชื่อ / Action Attachments",
    uploadLabel: "อัปโหลดไฟล์ / Upload files",
    uploadingLabel: "กำลังอัปโหลด / Uploading",
    backLabel: "กลับหน้าหลักการอนุมัติ / Back to Approve List",
    sigDialogTitle: mode === "reviewer" ? "ลงนามตรวจสอบ FM-MR-01 / Review FM-MR-01" : "ลงนามอนุมัติ FM-MR-01 / Approve FM-MR-01",
    rejectDialogTitle: "ปฏิเสธ/ส่งกลับแก้ไข FM-MR-01 / Reject FM-MR-01",
    rejectPlaceholder: "ระบุเหตุผลการส่งกลับแก้ไข... / Reason for rejection",
    rejectAttachmentsLabel: "เอกสารแนบประกอบการส่งกลับแก้ไข / Rejection attachments",
    cancelLabel: "ยกเลิก / Cancel",
    confirmRejectLabel: "ยืนยันปฏิเสธ / Reject",
    successTitle: "ดำเนินการเรียบร้อย",
    successSubtitle: mode === "reviewer" ? "ส่งต่อ FM-MR-01 ให้ approver แล้ว" : "อนุมัติ FM-MR-01 เรียบร้อยแล้ว",
    successBack: "กลับหน้าหลัก",
  };

  if (successOpen) {
    return (
      <ApproveSuccessScreen
        title={copy.successTitle}
        subtitle={copy.successSubtitle}
        backHref="/notifications"
        backLabel={copy.successBack}
      />
    );
  }

  const ActionPanel = (
    <div className="rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-slate-200">
      {/* Signoff Timeline */}
      <div className="p-5 border-b border-slate-100">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
          {copy.timelineTitle}
        </p>
        <KpiApprovalTimeline
          signatures={signatures}
          preparerName={masterKpi.prepare}
          reviewerName={masterKpi.reviewer}
          approverName={masterKpi.approver}
          layout="vertical"
        />
      </div>

      {/* Action */}
      <div className="p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {copy.bannerSub}
        </p>
        
        <Button
          type="button"
          className="w-full rounded-xl bg-primary hover:bg-[#161875] h-11 font-semibold text-sm"
          disabled={submitting || uploadingTarget !== null}
          onClick={() => setSigOpen(true)}
        >
          {copy.actionLabel}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full rounded-xl h-10 text-sm border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700"
          disabled={submitting}
          onClick={() => setRejectOpen(true)}
        >
          {copy.rejectLabel}
        </Button>



        <Button
          type="button"
          variant="ghost"
          className="w-full rounded-xl text-slate-500 hover:text-slate-700 h-9 text-xs"
          onClick={() => router.push("/approve")}
        >
          {copy.backLabel}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 no-print">
        <div className="mt-0.5 w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
          <ClipboardCheck className="w-5 h-5 text-sky-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-sky-900">
            {copy.bannerLabel}
          </p>
          <p className="text-xs text-sky-700 mt-0.5">
            FM-MR-01 / Annual Quality Objectives ({year})
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-400 no-print">
        <Link href="/approve" className="hover:text-slate-600 transition-colors">Approve</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="text-slate-400">KPI</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="text-slate-600 font-medium">FM-MR-01 ({year})</span>
      </nav>

      {/* Desktop: two-column layout */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 lg:items-start">
        <div className="min-w-0">
          <FmMr01PrintTemplate
            kpis={kpis}
            year={year}
            mode="review"
            masterKpi={masterKpi}
            signatures={signatures}
            footerConfig={footerConfig}
            showReviewToolbar={false}
            showWorkflow={false}
            isEmbedded={true}
          />
        </div>
        <div className="sticky top-6 no-print">
          {ActionPanel}
        </div>
      </div>

      {/* Mobile: stacked layout */}
      <div className="lg:hidden pb-24 space-y-4">
        <FmMr01PrintTemplate
          kpis={kpis}
          year={year}
          mode="review"
          masterKpi={masterKpi}
          signatures={signatures}
          footerConfig={footerConfig}
          showReviewToolbar={false}
          showWorkflow={false}
          isEmbedded={true}
        />
      </div>

      {/* Mobile floating bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 no-print">
        {sheetOpen && (
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSheetOpen(false)} />
        )}
        <div className={`relative z-50 bg-white border-t border-slate-200 shadow-[0_-8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 ${sheetOpen ? "rounded-t-2xl" : ""}`}>
          {sheetOpen ? (
            <div className="max-h-[80vh] overflow-y-auto overscroll-contain">
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-slate-200" />
              </div>
              <div className="px-4 pb-8 pt-2">
                {ActionPanel}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 font-medium">
                  {copy.bannerSub}
                </p>
                <p className="text-sm font-semibold text-slate-800 truncate">
                  FM-MR-01 ({year})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="shrink-0 h-10 px-5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/95 active:scale-95 transition-all"
              >
                {copy.actionLabelEn}
              </button>
            </div>
          )}
        </div>
      </div>

      <KpiSignatureDialog
        open={sigOpen}
        title={copy.sigDialogTitle}
        onOpenChange={setSigOpen}
        onConfirm={submitApprove}
      >
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 block">
            {copy.attachmentsLabel}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">
              <FileUp className="h-4 w-4" />
              <span>{copy.uploadLabel}</span>
              <input
                type="file"
                multiple
                className="hidden"
                disabled={uploadingTarget !== null}
                onChange={(event) => {
                  const files = event.target.files;
                  if (files) {
                    void uploadFiles(files, "approve");
                  }
                  event.currentTarget.value = "";
                }}
              />
            </label>
            {uploadingTarget === "approve" && (
              <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {copy.uploadingLabel}
              </span>
            )}
          </div>
          {actionAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {actionAttachments.map((file, index) => (
                <div key={`${file.spItemId}-${index}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                  <span className="max-w-[240px] truncate">{file.fileName}</span>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-rose-600"
                    onClick={() => setActionAttachments((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </KpiSignatureDialog>

      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => {
          if (!submitting) {
            setRejectOpen(open);
            if (!open) {
              setRejectReason("");
              setRejectAttachments([]);
            }
          }
        }}
      >
        <DialogContent className="max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900">{copy.rejectDialogTitle}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder={copy.rejectPlaceholder}
              className="min-h-28 rounded-lg"
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{copy.rejectAttachmentsLabel}</label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <FileUp className="h-4 w-4" />
                <span>{copy.uploadLabel}</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  disabled={uploadingTarget !== null}
                  onChange={(event) => {
                    const files = event.target.files;
                    if (files) {
                      void uploadFiles(files, "reject");
                    }
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              {uploadingTarget === "reject" && (
                <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {copy.uploadingLabel}
                </span>
              )}
              {rejectAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {rejectAttachments.map((file, index) => (
                    <div key={`${file.spItemId}-${index}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                      <span className="max-w-[240px] truncate">{file.fileName}</span>
                      <button
                        type="button"
                        className="text-slate-400 hover:text-rose-600"
                        onClick={() => setRejectAttachments((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" disabled={submitting} onClick={() => setRejectOpen(false)}>
              {copy.cancelLabel}
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={submitting || uploadingTarget !== null || !rejectReason.trim()}
              onClick={() => void submitReject()}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
