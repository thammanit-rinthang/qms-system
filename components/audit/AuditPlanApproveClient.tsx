"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, ClipboardCheck, FileText, Users, ChevronRight, Paperclip, Building2, Crown, User, Eye, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ApproveSuccessScreen from "@/components/shared/ApproveSuccessScreen";
import AuditPlanPrintHeaderCard from "./AuditPlanPrintHeaderCard";
import { Textarea } from "@/components/ui/textarea";
import KpiSignatureDialog from "@/components/kpi/KpiSignatureDialog";
import { FilePreviewModal, type FilePreviewTarget } from "@/components/common/FilePreviewModal";
import type { SignatureType } from "@/types/dar";
import { fmtDate } from "@/lib/format";

type Signoff = {
  signedRole: string;
  signerNameSnapshot: string | null;
  signedAt: string;
  signaturePath: string | null;
};

type Auditor = {
  assigneeNameSnapshot: string | null;
  assigneeEmailSnapshot: string | null;
  role: string;
};

type Department = {
  departmentName: string | null;
  departmentCode: string | null;
};

type Attachment = {
  id: string;
  fileName: string;
  mimeType: string | null;
  sharePointItemId: string | null;
  spDownloadUrl: string | null;
  fileUrl: string | null;
};

type ScheduleSession = {
  id: string;
  startAt: string;
  endAt: string;
  departmentName: string | null;
  sessionTitle: string;
  remark: string | null;
  team: { role: string; name: string | null }[];
};

export type AuditPlanForApprove = {
  id: string;
  auditNo: string;
  title: string;
  auditType: string;
  status: string;
  scope: string | null;
  objective: string | null;
  summary: string | null;
  standards?: string[] | null;
  standard?: string | null;
  ownerNameSnapshot: string | null;
  reviewerNameSnapshot: string | null;
  approverNameSnapshot: string | null;
  startDate: string | null;
  endDate: string | null;
  signoffs: Signoff[];
  auditors: Auditor[];
  departments: Department[];
  schedules?: ScheduleSession[];
  attachments: Attachment[];
};

type Props = {
  plan: AuditPlanForApprove;
  mode: "reviewer" | "approver";
};

const ROLE_LABELS: Record<string, { th: string; en: string }> = {
  PREPARER: { th: "ผู้จัดทำ", en: "Preparer" },
  REVIEWER: { th: "ผู้ตรวจสอบ", en: "Reviewer" },
  APPROVER: { th: "ผู้อนุมัติ", en: "Approver" },
};

export default function AuditPlanApproveClient({ plan, mode }: Props) {
  const router = useRouter();
  const [sigOpen, setSigOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<FilePreviewTarget | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const typeLabel = plan.auditType === "INTERNAL" ? "Internal Audit" : "External Audit";
  const isReviewer = mode === "reviewer";
  const endpoint = `/api/audit/plans/${plan.id}/${isReviewer ? "review" : "approve"}`;

  const copy = {
    bannerLabel: isReviewer
      ? "แผนการตรวจสอบนี้รอการตรวจสอบจากคุณ"
      : "แผนการตรวจสอบนี้รอการอนุมัติจากคุณ",
    bannerSub: isReviewer ? "Pending Review" : "Pending Approval",
    actionLabel: isReviewer ? "ตรวจสอบและลงนาม" : "อนุมัติและลงนาม",
    actionLabelEn: isReviewer ? "Review & Sign" : "Approve & Sign",
    sigDialogTitle: isReviewer ? "ลงนามตรวจสอบ / Review Sign" : "ลงนามอนุมัติ / Approve Sign",
  };

  async function handleConfirm(payload: {
    signatureDataUrl: string;
    signatureType: SignatureType;
    saveSignature: boolean;
  }) {
    setSubmitting(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signaturePath: payload.signatureDataUrl }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error?.message ?? json.message ?? "Action failed");
      setSigOpen(false);
      setSheetOpen(false);
      setSuccessOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด", { duration: Infinity });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    setRejecting(true);
    try {
      const res = await fetch(`/api/audit/plans/${plan.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim(), signedRole: isReviewer ? "REVIEWER" : "APPROVER" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "เกิดข้อผิดพลาด");
      toast.success(`ส่งกลับแก้ไขเรียบร้อย`);
      setRejectOpen(false);
      router.push("/approve");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setRejecting(false);
    }
  }

  if (successOpen) {
    return (
      <ApproveSuccessScreen
        title="ดำเนินการเรียบร้อย"
        subtitle={isReviewer ? `ตรวจสอบแผน ${plan.auditNo} เรียบร้อยแล้ว` : `อนุมัติแผน ${plan.auditNo} เรียบร้อยแล้ว`}
        backHref="/notifications"
        backLabel="กลับหน้าหลัก"
      />
    );
  }

  // ── Action Panel ─────────────────────────────────────────────────────────────
  const ActionPanel = (
    <div className="rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      {/* Signoff Timeline */}
      {plan.signoffs.length > 0 && (
        <div className="p-5 border-b border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
            ประวัติการลงนาม
          </p>
          <div className="space-y-3">
            {plan.signoffs.map((s, i) => {
              const roleLabel = ROLE_LABELS[s.signedRole] ?? { th: s.signedRole, en: s.signedRole };
              return (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {s.signerNameSnapshot ?? "-"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {roleLabel.th} / {roleLabel.en}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{fmtDate(s.signedAt)}</p>
                  </div>
                  {s.signaturePath && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.signaturePath}
                      alt="signature"
                      className="h-8 w-16 object-contain border border-slate-100 rounded bg-white shrink-0"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action */}
      <div className="p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {copy.bannerSub}
        </p>
        <Button
          className="w-full rounded-xl bg-primary hover:bg-[#161875] h-11 font-semibold"
          disabled={submitting}
          onClick={() => setSigOpen(true)}
        >
          <ClipboardCheck className="w-4 h-4 mr-2" />
          {copy.actionLabel}
        </Button>
        <Button
          variant="outline"
          className="w-full rounded-xl h-10 text-sm border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
          onClick={() => setRejectOpen(true)}
        >
          <RotateCcw className="w-3.5 h-3.5 mr-2" />
          ส่งกลับแก้ไข / Return
        </Button>
        <Button
          variant="ghost"
          className="w-full rounded-xl text-slate-500 hover:text-slate-700 h-9 text-sm"
          onClick={() => router.push("/approve")}
        >
          กลับ / Back
        </Button>
      </div>
    </div>
  );

  // ── Detail Card ───────────────────────────────────────────────────────────────
  const DetailContent = (
    <div className="space-y-4">
      {/* Main Info — print-style document card */}
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
          {typeLabel}
        </span>
        <span className="shrink-0 inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
          {copy.bannerSub}
        </span>
      </div>
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
        sessions={plan.schedules}
      />

      {/* Scope / Objective */}
      {(plan.scope || plan.objective) && (
        <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">ขอบเขตและวัตถุประสงค์</h3>
          </div>
          {plan.scope && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">ขอบเขต / Scope</p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{plan.scope}</p>
            </div>
          )}
          {plan.objective && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">วัตถุประสงค์ / Objective</p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{plan.objective}</p>
            </div>
          )}
          {plan.summary && (
            <div className="space-y-1 border-t border-slate-100 pt-3">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">สรุป / Summary</p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{plan.summary}</p>
            </div>
          )}
        </div>
      )}

      {/* Departments */}
      {plan.departments.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">
              แผนกที่รับการตรวจสอบ
              <span className="ml-2 text-xs font-normal text-slate-400">({plan.departments.length})</span>
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {plan.departments.map((d, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5"
              >
                {d.departmentCode && (
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-600">
                    {d.departmentCode}
                  </span>
                )}
                <span className="text-sm text-slate-700">{d.departmentName ?? "-"}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auditors */}
      {plan.auditors.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">
              ทีมผู้ตรวจสอบ
              <span className="ml-2 text-xs font-normal text-slate-400">({plan.auditors.length})</span>
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {plan.auditors.map((a, i) => {
              const isLead = a.role === "LEAD";
              const roleLabel = a.role === "LEAD" ? "หัวหน้า" : a.role === "OBSERVER" ? "ผู้สังเกตการณ์" : "สมาชิก";
              return (
                <div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${isLead ? "bg-amber-100" : "bg-slate-100"}`}>
                    {isLead
                      ? <Crown className="w-3.5 h-3.5 text-amber-600" />
                      : <User className="w-3.5 h-3.5 text-slate-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{a.assigneeNameSnapshot ?? "-"}</p>
                    {a.assigneeEmailSnapshot && (
                      <p className="text-xs text-slate-400 truncate">{a.assigneeEmailSnapshot}</p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    isLead
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : a.role === "OBSERVER"
                        ? "border-slate-200 bg-slate-50 text-slate-600"
                        : "border-violet-200 bg-violet-50 text-violet-700"
                  }`}>
                    {roleLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Attachments */}
      {plan.attachments.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">
              เอกสารแนบ
              <span className="ml-2 text-xs font-normal text-slate-400">({plan.attachments.length})</span>
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {plan.attachments.map((att) => {
              const ext = att.fileName.split(".").pop()?.toUpperCase() ?? "FILE";
              const canPreview = !!(att.sharePointItemId || att.spDownloadUrl || att.fileUrl);
              return (
                <div key={att.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 shrink-0">
                    <span className="text-xs font-bold text-slate-500">{ext.slice(0, 4)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    {canPreview ? (
                      <button
                        type="button"
                        onClick={() => setPreviewTarget({ fileName: att.fileName, mimeType: att.mimeType, sharePointItemId: att.sharePointItemId, spDownloadUrl: att.spDownloadUrl, fileUrl: att.fileUrl })}
                        className="text-sm font-medium text-primary hover:underline truncate block text-left w-full"
                      >
                        {att.fileName}
                      </button>
                    ) : (
                      <p className="text-sm font-medium text-slate-700 truncate">{att.fileName}</p>
                    )}
                    {att.mimeType && (
                      <p className="text-xs text-slate-400">{att.mimeType}</p>
                    )}
                  </div>
                  {canPreview && (
                    <button
                      type="button"
                      onClick={() => setPreviewTarget({ fileName: att.fileName, mimeType: att.mimeType, sharePointItemId: att.sharePointItemId, spDownloadUrl: att.spDownloadUrl, fileUrl: att.fileUrl })}
                      className="shrink-0 flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      ดูไฟล์
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-5 py-4">
        <div className="mt-0.5 w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
          <ClipboardCheck className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-violet-900">{copy.bannerLabel}</p>
          <p className="text-xs text-violet-700 mt-0.5">{plan.auditNo} — {plan.title}</p>
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link href="/approve" className="hover:text-slate-600 transition-colors">Approve</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="text-slate-400">Audit</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="text-slate-600 font-medium">{plan.auditNo}</span>
      </nav>

      {/* Desktop: two-column */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_300px] lg:gap-6 lg:items-start">
        <div>{DetailContent}</div>
        <div className="sticky top-6">{ActionPanel}</div>
      </div>

      {/* Mobile: stacked detail */}
      <div className="lg:hidden pb-24">{DetailContent}</div>

      {/* Mobile floating bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40">
        {sheetOpen && (
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSheetOpen(false)} />
        )}
        <div className={`relative z-50 bg-white border-t border-slate-200 shadow-[0_-8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 ${sheetOpen ? "rounded-t-2xl" : ""}`}>
          {sheetOpen ? (
            <div className="max-h-[50vh] overflow-y-auto overscroll-contain">
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-slate-200" />
              </div>
              <div className="px-4 pb-8 pt-2 space-y-3">
                <p className="text-sm font-semibold text-slate-800">{plan.title}</p>
                <Button
                  className="w-full rounded-xl bg-primary hover:bg-[#161875] h-11 font-semibold"
                  disabled={submitting}
                  onClick={() => setSigOpen(true)}
                >
                  <ClipboardCheck className="w-4 h-4 mr-2" />
                  {copy.actionLabel}
                </Button>
                <Button
                  variant="outline"
                  className="w-full rounded-xl h-10 text-sm border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                  onClick={() => { setSheetOpen(false); setRejectOpen(true); }}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-2" />
                  ส่งกลับแก้ไข
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 font-medium">{copy.bannerSub}</p>
                <p className="text-sm font-semibold text-slate-800 truncate">{plan.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="shrink-0 h-10 px-5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-[#161875] active:scale-95 transition-all"
              >
                {copy.actionLabelEn}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Signature Dialog */}
      <KpiSignatureDialog
        open={sigOpen}
        title={copy.sigDialogTitle}
        onOpenChange={setSigOpen}
        onConfirm={handleConfirm}
      />

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={(o) => { setRejectOpen(o); if (!o) setRejectReason(""); }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-red-500" />
              ส่งกลับแก้ไข
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              แผนจะถูกส่งกลับสถานะ Draft ให้เจ้าของแก้ไขและส่งใหม่
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">เหตุผล <span className="text-red-500">*</span></label>
            <Textarea
              placeholder="ระบุเหตุผลที่ส่งกลับแก้ไข..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="resize-none rounded-xl"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => setRejectOpen(false)} disabled={rejecting}>
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={!rejectReason.trim() || rejecting}
              onClick={handleReject}
            >
              {rejecting ? "กำลังส่งกลับ..." : "ยืนยันส่งกลับ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Preview Modal */}
      {previewTarget && (
        <FilePreviewModal target={previewTarget} onClose={() => setPreviewTarget(null)} />
      )}
    </div>
  );
}
