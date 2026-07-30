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
import KpiMonthlySummaryMatrixTable from "@/components/kpi/KpiMonthlySummaryMatrixTable";
import KpiApprovalTimeline from "@/components/kpi/KpiApprovalTimeline";
import type { KpiYearlyPreviewData } from "@/services/kpiExportService";
import type { KPIMonthlySummaryReview, ApprovalSignature } from "@/generated/prisma/client";

type Mode = "reviewer" | "approver";

type AttachmentItem = { fileName: string; spItemId: string; spWebUrl: string };

interface Props {
  year: number;
  mode: Mode;
  preview: KpiYearlyPreviewData;
  record: KPIMonthlySummaryReview;
  signatures: ApprovalSignature[];
  canAct: boolean;
}

export default function KpiMonthlySummaryApproveActionClient({ year, mode, preview, record, signatures, canAct }: Props) {
  const router = useRouter();
  const [sigOpen, setSigOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionAttachments, setActionAttachments] = useState<AttachmentItem[]>([]);
  const [rejectAttachments, setRejectAttachments] = useState<AttachmentItem[]>([]);
  const [uploadingTarget, setUploadingTarget] = useState<"approve" | "reject" | null>(null);

  const copy = mode === "reviewer"
    ? {
        bannerLabel: "สรุปผล KPI รายเดือนนี้รอการตรวจสอบจากคุณ / This monthly KPI summary is pending your review.",
        bannerSub: "รอตรวจสอบ / Pending Review",
        actionLabel: "ตรวจสอบและส่งต่อ / Review & Sign",
        sigDialogTitle: "ลงนามตรวจสอบสรุปผล KPI รายเดือน / Review Monthly KPI Summary",
        successSubtitle: "ส่งต่อสรุปผล KPI รายเดือนให้ผู้อนุมัติแล้ว / Forwarded to the approver.",
      }
    : {
        bannerLabel: "สรุปผล KPI รายเดือนนี้รอการอนุมัติจากคุณ / This monthly KPI summary is pending your approval.",
        bannerSub: "รออนุมัติ / Pending Approval",
        actionLabel: "อนุมัติ / Approve & Sign",
        sigDialogTitle: "ลงนามอนุมัติสรุปผล KPI รายเดือน / Approve Monthly KPI Summary",
        successSubtitle: "อนุมัติสรุปผล KPI รายเดือนเรียบร้อยแล้ว / Approved successfully.",
      };

  const timelineSignatures = signatures.map((s) => ({
    step: s.step,
    action: s.action,
    actionDate: s.actionDate,
    signaturePath: s.signaturePath,
    comment: s.comment,
    signerUser: { id: s.signerUserId, name: s.signerName, email: s.signerEmail },
  }));

  async function uploadFiles(files: FileList, target: "approve" | "reject") {
    if (!files.length) return;
    setUploadingTarget(target);
    try {
      const uploaded: AttachmentItem[] = [];
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folderPath", "KPI/monthly-summary-approvals");

        const res = await fetch("/api/sharepoint/upload-file", { method: "POST", body: formData });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.data) throw new Error(json?.error?.message ?? json?.message ?? "Upload failed");

        uploaded.push({ fileName: json.data.name || file.name, spItemId: json.data.id, spWebUrl: json.data.webUrl });
      }

      if (target === "approve") setActionAttachments((prev) => [...prev, ...uploaded]);
      else setRejectAttachments((prev) => [...prev, ...uploaded]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed", { duration: Infinity });
    } finally {
      setUploadingTarget(null);
    }
  }

  async function submitApprove(payload: { signatureDataUrl: string }) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/kpi/monthly-summary-review/${mode === "reviewer" ? "review" : "approve"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          signatureDataUrl: payload.signatureDataUrl,
          attachments: actionAttachments.length > 0 ? actionAttachments : undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message ?? json?.message ?? "Action failed");
      setSuccessOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed", { duration: Infinity });
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReject() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/kpi/monthly-summary-review/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          reason: rejectReason.trim(),
          attachments: rejectAttachments.length > 0 ? rejectAttachments : undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message ?? json?.message ?? "Reject failed");
      setRejectOpen(false);
      setSuccessOpen(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reject failed", { duration: Infinity });
    } finally {
      setSubmitting(false);
    }
  }

  if (successOpen) {
    return (
      <ApproveSuccessScreen
        title="ดำเนินการเรียบร้อย"
        subtitle={copy.successSubtitle}
        backHref="/notifications"
        backLabel="กลับหน้าหลัก"
      />
    );
  }

  if (!canAct) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          รายการนี้ไม่อยู่ในสถานะที่คุณสามารถดำเนินการได้ หรือไม่ได้รับมอบหมาย / This item is not in a status you can act on, or you are not assigned.
        </div>
        <Link href="/approve" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ChevronRight className="h-3.5 w-3.5 rotate-180" />
          กลับหน้าหลักการอนุมัติ / Back to Approve List
        </Link>
      </div>
    );
  }

  const ActionPanel = (
    <div className="rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-slate-200">
      <div className="p-5 border-b border-slate-100">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
          ประวัติการลงนาม / Sign-off History
        </p>
        <KpiApprovalTimeline
          signatures={timelineSignatures}
          preparerName={record.prepareByName}
          reviewerName={record.reviewerName}
          approverName={record.approverName}
          layout="vertical"
        />
      </div>

      <div className="p-5 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{copy.bannerSub}</p>

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
          ส่งกลับแก้ไข / ปฏิเสธ (Reject / Return)
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full rounded-xl text-slate-500 hover:text-slate-700 h-9 text-xs"
          onClick={() => router.push("/approve")}
        >
          กลับหน้าหลักการอนุมัติ / Back to Approve List
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4">
        <div className="mt-0.5 w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
          <ClipboardCheck className="w-5 h-5 text-sky-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-sky-900">{copy.bannerLabel}</p>
          <p className="text-xs text-sky-700 mt-0.5">สรุปผล KPI รายเดือน / Monthly KPI Summary ({year})</p>
        </div>
      </div>

      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link href="/approve" className="hover:text-slate-600 transition-colors">Approve</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="text-slate-400">KPI</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="text-slate-600 font-medium">Monthly Summary ({year})</span>
      </nav>

      <div className="hidden lg:grid lg:grid-cols-[1fr_320px] lg:gap-6 lg:items-start">
        <div className="min-w-0 rounded-2xl overflow-hidden">
          <KpiMonthlySummaryMatrixTable preview={preview} record={record} signatures={signatures} fullWidth />
        </div>
        <div className="sticky top-6">{ActionPanel}</div>
      </div>

      <div className="lg:hidden pb-24 space-y-4">
        <div className="rounded-2xl overflow-hidden">
          <KpiMonthlySummaryMatrixTable preview={preview} record={record} signatures={signatures} fullWidth />
        </div>
      </div>

      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40">
        {sheetOpen && <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSheetOpen(false)} />}
        <div className={`relative z-50 bg-white border-t border-slate-200 shadow-[0_-8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 ${sheetOpen ? "rounded-t-2xl" : ""}`}>
          {sheetOpen ? (
            <div className="max-h-[80vh] overflow-y-auto overscroll-contain">
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-slate-200" />
              </div>
              <div className="px-4 pb-8 pt-2">{ActionPanel}</div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 font-medium">{copy.bannerSub}</p>
                <p className="text-sm font-semibold text-slate-800 truncate">Monthly Summary ({year})</p>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="shrink-0 h-10 px-5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/95 active:scale-95 transition-all"
              >
                {copy.actionLabel}
              </button>
            </div>
          )}
        </div>
      </div>

      <KpiSignatureDialog open={sigOpen} title={copy.sigDialogTitle} onOpenChange={setSigOpen} onConfirm={submitApprove}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 block">เอกสารแนบประกอบการลงชื่อ / Action Attachments</label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">
              <FileUp className="h-4 w-4" />
              <span>อัปโหลดไฟล์ / Upload files</span>
              <input
                type="file"
                multiple
                className="hidden"
                disabled={uploadingTarget !== null}
                onChange={(event) => {
                  const files = event.target.files;
                  if (files) void uploadFiles(files, "approve");
                  event.currentTarget.value = "";
                }}
              />
            </label>
            {uploadingTarget === "approve" && (
              <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                กำลังอัปโหลด / Uploading
              </span>
            )}
          </div>
          {actionAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {actionAttachments.map((file, index) => (
                <div key={`${file.spItemId}-${index}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                  <span className="max-w-[240px] truncate">{file.fileName}</span>
                  <button type="button" className="text-slate-400 hover:text-rose-600" onClick={() => setActionAttachments((prev) => prev.filter((_, i) => i !== index))}>
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
            <DialogTitle className="text-slate-900">ปฏิเสธ/ส่งกลับแก้ไขสรุปผล KPI รายเดือน / Reject Monthly KPI Summary</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Textarea
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="ระบุเหตุผลการส่งกลับแก้ไข... / Reason for rejection"
              className="min-h-28 rounded-lg"
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">เอกสารแนบประกอบการส่งกลับแก้ไข / Rejection attachments</label>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <FileUp className="h-4 w-4" />
                <span>อัปโหลดไฟล์ / Upload files</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  disabled={uploadingTarget !== null}
                  onChange={(event) => {
                    const files = event.target.files;
                    if (files) void uploadFiles(files, "reject");
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              {uploadingTarget === "reject" && (
                <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  กำลังอัปโหลด / Uploading
                </span>
              )}
              {rejectAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {rejectAttachments.map((file, index) => (
                    <div key={`${file.spItemId}-${index}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700">
                      <span className="max-w-[240px] truncate">{file.fileName}</span>
                      <button type="button" className="text-slate-400 hover:text-rose-600" onClick={() => setRejectAttachments((prev) => prev.filter((_, i) => i !== index))}>
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
              ยกเลิก / Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={submitting || uploadingTarget !== null || !rejectReason.trim()}
              onClick={() => void submitReject()}
            >
              ยืนยันปฏิเสธ / Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
