"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ClipboardCheck,
  ChevronRight,
  RotateCcw,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import KpiSignatureDialog from "@/components/kpi/KpiSignatureDialog";
import ApproveSuccessScreen from "@/components/shared/ApproveSuccessScreen";
import type { AuditAppointmentRow } from "@/types/audit";

const MEMBER_ROLE_LABELS: Record<string, string> = {
  LEAD_AUDITOR: "หัวหน้าทีมผู้ตรวจ (Lead Auditor)",
  AUDITOR: "ผู้ตรวจติดตาม (Internal Auditor)",
  COMMITTEE: "คณะทำงาน (Working Committee)",
  SECRETARY: "เลขานุการ (Secretary)",
  ADVISOR: "ที่ปรึกษา (Advisor)",
};

type Props = {
  appt: AuditAppointmentRow;
  mode: "reviewer" | "approver";
};

export function AuditAppointmentApproveClient({ appt, mode }: Props) {
  const router = useRouter();
  const [sigOpen, setSigOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const isReviewer = mode === "reviewer";
  const endpoint = `/api/audit/appointments/${appt.id}/${isReviewer ? "review" : "approve"}`;

  const copy = {
    bannerLabel: isReviewer
      ? "ประกาศแต่งตั้งนี้รอการตรวจสอบจากคุณ"
      : "ประกาศแต่งตั้งนี้รอการอนุมัติจากคุณ",
    bannerSub: isReviewer ? "Pending Review" : "Pending Approval",
    actionLabel: isReviewer ? "ตรวจสอบและลงนาม" : "อนุมัติและลงนาม",
    actionLabelEn: isReviewer ? "Review & Sign" : "Approve & Sign",
    sigDialogTitle: isReviewer ? "ลงนามตรวจสอบ" : "ลงนามอนุมัติ",
  };

  async function handleSign(payload: { signatureDataUrl: string; signatureType: string; saveSignature: boolean }) {
    setSubmitting(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: { message?: string } }).error?.message ?? "Action failed");
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
      const res = await fetch(`/api/audit/appointments/${appt.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim(), signedRole: isReviewer ? "REVIEWER" : "APPROVER" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: { message?: string } }).error?.message ?? "เกิดข้อผิดพลาด");
      toast.success("ส่งกลับแก้ไขเรียบร้อย");
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
        subtitle={isReviewer ? `ตรวจสอบประกาศ ${appt.appointmentNo} เรียบร้อยแล้ว` : `อนุมัติและเผยแพร่ประกาศ ${appt.appointmentNo} เรียบร้อยแล้ว`}
        backHref="/notifications"
        backLabel="กลับหน้าหลัก"
      />
    );
  }

  const expectedStatus = isReviewer ? "PENDING_REVIEW" : "PENDING_APPROVAL";
  const alreadyActioned = appt.status !== expectedStatus;

  // Timeline steps — always 3 slots: owner (preparer), reviewer, approver
  const TIMELINE_STEPS = [
    {
      key: "OWNER",
      label: "ผู้จัดทำ",
      name: appt.ownerNameSnapshot,
      signedRole: "OWNER",
      signaturePath: appt.ownerSignaturePath,
      signedAt: null as string | null,
      done: true, // owner always signed (submitted)
    },
    {
      key: "REVIEWER",
      label: "ผู้ตรวจสอบ",
      name: appt.reviewerNameSnapshot,
      ...(() => {
        const s = appt.signoffs.find((x) => x.signedRole === "REVIEWER");
        return { signaturePath: s?.signaturePath ?? null, signedAt: s?.signedAt ?? null, done: !!s };
      })(),
    },
    {
      key: "APPROVER",
      label: "ผู้อนุมัติ",
      name: appt.approverNameSnapshot,
      ...(() => {
        const s = appt.signoffs.find((x) => x.signedRole === "APPROVER");
        return { signaturePath: s?.signaturePath ?? null, signedAt: s?.signedAt ?? null, done: !!s };
      })(),
    },
  ];

  const ActionPanel = (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h2 className="text-sm font-bold text-slate-800">ขั้นตอนการอนุมัติ</h2>
      </div>

      {/* Timeline */}
      <div className="p-6 flex flex-col">
        {TIMELINE_STEPS.map((step, idx) => {
          const isLast = idx === TIMELINE_STEPS.length - 1;
          return (
            <div key={step.key} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 shadow-sm ${
                  step.done
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "bg-white border-slate-200 text-slate-400"
                }`}>
                  {step.done ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
                  ) : (
                    <span className="text-sm font-bold">{idx + 1}</span>
                  )}
                </div>
                {!isLast && (
                  <div className={`w-0.5 flex-1 my-1.5 ${step.done ? "bg-emerald-200" : "bg-slate-100"}`} style={{ minHeight: 32 }} />
                )}
              </div>
              <div className="pb-6 flex-1 min-w-0 mt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-slate-800">{step.label}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${
                    step.done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {step.done ? "อนุมัติแล้ว" : "รออนุมัติ"}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                    {step.name?.charAt(0) ?? "?"}
                  </div>
                  <p className="text-sm text-slate-600 font-medium">{step.name ?? "—"}</p>
                </div>
                {step.signedAt && (
                  <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {new Date(step.signedAt).toLocaleString("th-TH", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
                {step.signaturePath && step.done && (
                  <div className="mt-3 border border-slate-200 rounded-xl bg-white inline-block p-2 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={step.signaturePath} alt="ลายมือชื่อ" className="h-12 object-contain" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action bar */}
      {!alreadyActioned && (
        <div className="border-t border-slate-200 overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-700">
              ขั้นตอนของคุณ: <span className="text-primary">{isReviewer ? "ผู้ตรวจสอบ" : "ผู้อนุมัติ"}</span>
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSigOpen(true)}
                disabled={submitting}
                className="h-8 px-4 text-xs font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
                {submitting ? "กำลังดำเนินการ..." : copy.actionLabel}
              </button>
              <button
                type="button"
                onClick={() => setRejectOpen(true)}
                className="h-8 px-4 text-xs font-medium rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                ส่งคืน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const DetailContent = (
    <div className="space-y-4">
      {/* Main info */}
      <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-semibold text-slate-400">{appt.appointmentNo}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">{appt.title}</h2>
            <p className="text-sm text-slate-500 mt-1">ประจำปี พ.ศ. {appt.year}</p>
          </div>
          <span className="shrink-0 inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
            {copy.bannerSub}
          </span>
        </div>

        {appt.standards.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">มาตรฐาน</p>
            <div className="flex flex-wrap gap-2">
              {appt.standards.map((s) => (
                <span key={s} className="inline-flex items-center rounded-md bg-blue-50 border border-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-slate-400 mb-0.5">ผู้จัดทำ / Preparer</p>
            <p className="text-sm font-medium text-slate-800">{appt.ownerNameSnapshot ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">ผู้ตรวจสอบ / Reviewer</p>
            <p className="text-sm font-medium text-slate-800">{appt.reviewerNameSnapshot ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-0.5">ผู้อนุมัติ / Approver</p>
            <p className="text-sm font-medium text-slate-800">{appt.approverNameSnapshot ?? "-"}</p>
          </div>
        </div>
      </div>

      {/* Members */}
      {appt.members.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">
              รายชื่อคณะทำงาน
              <span className="ml-2 text-xs font-normal text-slate-400">({appt.members.length} คน)</span>
            </h3>
          </div>
          <div className="divide-y divide-slate-50">
            {appt.members.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 shrink-0 text-xs font-bold text-slate-500">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{m.name}</p>
                  {m.department && <p className="text-xs text-slate-400">{m.department}</p>}
                </div>
                <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {MEMBER_ROLE_LABELS[m.role] ?? m.role}
                </span>
              </div>
            ))}
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
          <p className="text-xs text-violet-700 mt-0.5">{appt.appointmentNo} — {appt.title}</p>
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-slate-400">
        <Link href="/approve" className="hover:text-slate-600 transition-colors">Approve</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="text-slate-400">Appointment</span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="text-slate-600 font-medium">{appt.appointmentNo}</span>
      </nav>

      {/* Desktop: two-column */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_300px] lg:gap-6 lg:items-start">
        <div>{DetailContent}</div>
        <div className="sticky top-6">{ActionPanel}</div>
      </div>

      {/* Mobile: stacked */}
      <div className="lg:hidden pb-24">{DetailContent}</div>

      {/* Mobile floating bar */}
      {!alreadyActioned && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 shadow-[0_-8px_30px_rgb(0,0,0,0.08)]">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 font-medium">{copy.bannerSub}</p>
              <p className="text-sm font-semibold text-slate-800 truncate">{appt.title}</p>
            </div>
            <button
              type="button"
              onClick={() => setSigOpen(true)}
              disabled={submitting}
              className="shrink-0 h-10 px-5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-[#161875] active:scale-95 transition-all disabled:opacity-50"
            >
              {copy.actionLabelEn}
            </button>
          </div>
        </div>
      )}

      {/* Signature Dialog — same as KPI */}
      <KpiSignatureDialog
        open={sigOpen}
        title={copy.sigDialogTitle}
        onOpenChange={setSigOpen}
        onConfirm={async (payload) => {
          await handleSign(payload);
        }}
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
              ประกาศจะถูกส่งกลับสถานะ Draft ให้เจ้าของแก้ไขและส่งใหม่
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
    </div>
  );
}
