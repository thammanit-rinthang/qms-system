"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, XCircle, ShieldCheck } from "lucide-react";
import type { CarDetail } from "@/types/car";
import type { SignatureType } from "@/types/dar";
import ApproveSignatureSection, { type SigMode } from "@/components/shared/ApproveSignatureSection";

import { Button } from "@/components/ui/button";

interface Props {
  carId: string;
  car: CarDetail;
  token?: string;
  defaultAction?: "APPROVED" | "REJECTED";
  savedSignatureUrl?: string | null;
  savedSignatureType?: SignatureType | null;
  onSuccess?: () => void;
}

async function submitReview(
  carId: string,
  token: string | undefined,
  action: "APPROVED" | "REJECTED",
  comment: string,
  signaturePath: string | null,
  signatureType: SignatureType,
  saveToProfile: boolean,
  qmsAuthUserId?: string,
): Promise<void> {
  const res = await fetch(`/api/car/${carId}/review-response`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(token ? { token } : {}),
      action,
      ...(comment ? { comment } : {}),
      ...(signaturePath ? { signaturePath, signatureType, saveToProfile } : {}),
      ...(qmsAuthUserId ? { qmsAuthUserId } : {}),
    }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? "ไม่สามารถบันทึกการตรวจสอบได้");
  }
}

// ── Approval timeline ─────────────────────────────────────────────────────────

function Avatar({ name, color = "slate" }: { name: string; color?: "slate" | "emerald" | "amber" }) {
  const initials = name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  const cls = color === "emerald" ? "bg-emerald-100 text-emerald-700"
    : color === "amber" ? "bg-amber-100 text-amber-700"
    : "bg-slate-200 text-slate-600";
  return (
    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${cls}`}>
      {initials}
    </div>
  );
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("th-TH", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function ApprovalTimeline({ car }: { car: CarDetail }) {
  type StepStatus = "done" | "pending" | "waiting";
  const steps: { label: string; badge?: string; badgeColor?: string; name?: string; dept?: string; time?: string; signatureUrl?: string | null; status: StepStatus; num: number }[] = [
    {
      num: 1, label: "ผู้จัดทำ", status: "done", badge: "อนุมัติแล้ว", badgeColor: "emerald",
      name: car.issuer?.name ?? "-",
      dept: car.targetDepartment?.name ?? undefined,
      time: car.issuedAt ? fmtDateTime(car.issuedAt) : undefined,
      signatureUrl: car.issuerSignaturePath ?? null,
    },
    {
      num: 2, label: "ผู้ตรวจสอบ", status: "done", badge: "อนุมัติแล้ว", badgeColor: "emerald",
      name: car.response?.responder?.name ?? "-",
      dept: car.response?.responderPosition ?? undefined,
      time: car.response?.respondedAt ? fmtDateTime(car.response.respondedAt) : undefined,
      signatureUrl: car.response?.responderSignaturePath ?? null,
    },
    {
      num: 3, label: "ผู้แทนฝ่ายบริหาร", status: "pending", badge: "รออนุมัติ", badgeColor: "amber",
      name: "NDC Industrial Co.,Ltd",
    },
    {
      num: 4, label: "QMS", status: "waiting",
    },
  ];

  return (
    <div className="flex flex-col">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        const isDone = step.status === "done";
        const isPending = step.status === "pending";
        return (
          <div key={idx} className="flex gap-3">
            {/* Left: icon + line */}
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold border-2 ${
                isDone ? "bg-emerald-500 border-emerald-500 text-white text-base"
                : isPending ? "bg-amber-400 border-amber-400 text-white text-base"
                : "bg-white border-slate-200 text-slate-300 text-sm"
              }`}>
                {isDone
                  ? <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
                  : step.num}
              </div>
              {!isLast && (
                <div className={`w-0.5 my-1 flex-1 ${isDone ? "bg-emerald-300" : "bg-slate-100"}`} style={{ minHeight: 36 }} />
              )}
            </div>

            {/* Right: content */}
            <div className="pb-4 flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm font-semibold text-slate-700">{step.label}</span>
                {step.badge && (
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                    step.badgeColor === "emerald" ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-amber-50 border-amber-200 text-amber-700"
                  }`}>{step.badge}</span>
                )}
              </div>

              {step.name && (
                <div className="flex items-start gap-2 mt-1">
                  <Avatar name={step.name} color={isDone ? "slate" : isPending ? "amber" : "slate"} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 leading-snug">
                      {step.name}
                      {step.dept && <span className="font-normal text-slate-500"> · {step.dept}</span>}
                    </p>
                    {step.time && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 6v6l4 2"/></svg>
                        {step.time}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {step.signatureUrl && (
                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 w-36 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={step.signatureUrl} alt="ลายมือชื่อ" className="h-10 w-full object-contain" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Detail renderers ──────────────────────────────────────────────────────────

function Field({ label, value, multiline, highlight }: { label: string; value: string; multiline?: boolean; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-medium ${highlight ? "text-blue-700" : "text-slate-800"} ${multiline ? "whitespace-pre-wrap" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}

function ResponseDetail({ response }: { response: NonNullable<CarDetail["response"]> }) {
  const fmt = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "long", year: "numeric" });

  const rootCauses = [
    response.rootCausePerson && "Person",
    response.rootCauseMaterial && "Material",
    response.rootCauseMachine && "Machine",
    response.rootCauseMethod && "Method",
    response.rootCauseOther && `Other: ${response.rootCauseOtherDetail ?? ""}`,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="ผู้ตอบกลับ / Responder" value={`${response.responder.name ?? "-"} (${response.responderPosition})`} />
        <Field label="วันที่แผนกำหนดเสร็จ / Planned Completion" value={fmt(response.plannedCompletionDate)} highlight />
      </div>
      <hr className="border-slate-100" />
      {response.responseType === "FIVE_WHY" && response.fiveWhys && response.fiveWhys.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">5 Whys Analysis</p>
          <div className="space-y-2">
            {response.fiveWhys.map((w, i) => (
              <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                <p className="text-xs font-medium text-slate-500">Why {i + 1}: {w.question}</p>
                <p className="mt-0.5 text-slate-800">{w.answer || "—"}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Field label="Why-Why Analysis" value={response.whyAnalysis} multiline />
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Root Cause (5M)" value={rootCauses.join(", ") || "-"} />
        <Field label="Root Cause Summary" value={response.rootCauseSummary} multiline />
      </div>
      <hr className="border-slate-100" />
      <div className="grid grid-cols-2 gap-4">
        <Field label="Immediate Action" value={response.immediateAction} multiline />
        <Field label="Preventive Action" value={response.preventiveAction} multiline />
      </div>
      {response.additionalToolDetail && <Field label="Additional Tool" value={response.additionalToolDetail} multiline />}
    </div>
  );
}

// ── Modal shell (same as DAR) ─────────────────────────────────────────────────

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="fixed inset-0 z-122 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="relative z-123 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ── Action modal ──────────────────────────────────────────────────────────────

interface ActionModalProps {
  carId: string;
  car: CarDetail;
  token?: string;
  action: "APPROVED" | "REJECTED";
  savedSignatureUrl?: string | null;
  savedSignatureType?: SignatureType | null;
  onClose: () => void;
  onDone: (action: "APPROVED" | "REJECTED") => void;
}

function ActionModal({ carId, token, action, savedSignatureUrl, savedSignatureType, onClose, onDone }: ActionModalProps) {
  const isApprove = action === "APPROVED";
  const [comment, setComment] = useState("");
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);
  const [sigType, setSigType] = useState<SigMode>("DRAW");
  const [saveToProfile, setSaveToProfile] = useState(false);
  const [qmsAuthUserId, setQmsAuthUserId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: qmsUsers = [], isLoading: qmsLoading } = useQuery<{ authUserId: string; name: string; email: string | null }[]>({
    queryKey: ["car-qms-users"],
    queryFn: async () => {
      const res = await fetch("/api/dar/role-users?role=QMS");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: isApprove,
    staleTime: 60_000,
  });

  const handleSigChange = useCallback((url: string | null, type: SigMode) => {
    setSigDataUrl(url);
    setSigType(type);
  }, []);

  const mutation = useMutation({
    mutationFn: () => {
      if (isApprove && !qmsAuthUserId) throw new Error("กรุณาเลือกผู้ประมวลผล QMS");
      if (isApprove && !sigDataUrl) throw new Error("กรุณาเซ็นลายมือชื่อก่อน");
      if (!isApprove && !comment.trim()) throw new Error("กรุณาระบุเหตุผลในการส่งคืน");
      return submitReview(carId, token, action, comment, sigDataUrl, sigType as SignatureType, saveToProfile, qmsAuthUserId || undefined);
    },
    onSuccess: () => onDone(action),
    onError: (err: Error) => setError(err.message),
  });

  const canSubmit = !mutation.isPending && (isApprove ? (!!qmsAuthUserId && !!sigDataUrl) : !!comment.trim());

  return (
    <Modal onClose={onClose}>
      {/* Header — identical to DAR */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isApprove ? "bg-emerald-100" : "bg-rose-100"}`}>
            {isApprove
              ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
              : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{isApprove ? "อนุมัติ" : "ส่งคืน"}</p>
            <p className="text-xs text-slate-400">ผู้แทนฝ่ายบริหาร</p>
          </div>
        </div>
        <button type="button" onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="px-6 py-5 flex flex-col gap-5 max-h-[70vh] overflow-y-auto">

        {/* Reject: reason required */}
        {!isApprove && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600">
              เหตุผลในการส่งคืน <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <textarea
                rows={5}
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 1000))}
                placeholder="ระบุเหตุผล..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition-colors"
              />
              <span className="absolute bottom-2 right-3 text-xs text-slate-300">{comment.length}/1000</span>
            </div>
          </div>
        )}

        {/* Approve: QMS picker + comment + signature */}
        {isApprove && (
          <>
            {/* QMS picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">
                เลือกผู้ประมวลผล QMS <span className="text-rose-500">*</span>
              </label>
              {qmsLoading ? (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-3 h-3 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
                  กำลังโหลด...
                </div>
              ) : (
                <select
                  className="w-full h-9 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  value={qmsAuthUserId}
                  onChange={(e) => setQmsAuthUserId(e.target.value)}
                >
                  <option value="">-- เลือก --</option>
                  {qmsUsers.map((u) => (
                    <option key={u.authUserId} value={u.authUserId}>
                      {u.name}{u.email ? ` (${u.email})` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Comment optional */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-600">
                ความคิดเห็น <span className="text-slate-400 font-normal">(ไม่บังคับ)</span>
              </label>
              <textarea
                rows={3}
                placeholder="เพิ่มความคิดเห็นหรือข้อสังเกต..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={1000}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition-colors"
              />
            </div>

            {/* Signature */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-slate-600">
                ลายมือชื่ออนุมัติ <span className="text-rose-500">*</span>
              </label>
              <ApproveSignatureSection
                savedSignatureUrl={savedSignatureUrl}
                savedSignatureType={savedSignatureType}
                onSignatureChange={handleSigChange}
                onSaveChange={setSaveToProfile}
              />
            </div>
          </>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}
      </div>

      {/* Footer — identical to DAR */}
      <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
        <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={mutation.isPending}>ยกเลิก</Button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => { setError(null); mutation.mutate(); }}
          className={`h-8 px-5 text-xs font-semibold rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5 ${isApprove ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}
        >
          {mutation.isPending
            ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : isApprove
              ? <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
              : <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>}
          {mutation.isPending ? "กำลังบันทึก..." : isApprove ? "ยืนยันอนุมัติ" : "ยืนยันส่งคืน"}
        </button>
      </div>
      <div className="px-6 pb-4">
        <p className="text-xs text-slate-500">
          {isApprove ? (sigDataUrl ? "ลายเซ็น: พร้อม" : "ลายเซ็น: ยังไม่ครบ") : ""}
        </p>
      </div>
    </Modal>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CarMrResponseReviewPanel({
  carId, car, token, defaultAction, savedSignatureUrl, savedSignatureType, onSuccess,
}: Props) {
  const [modal, setModal] = useState<"APPROVED" | "REJECTED" | null>(
    defaultAction ?? null
  );
  const [done, setDone] = useState(false);
  const [doneAction, setDoneAction] = useState<"APPROVED" | "REJECTED">("APPROVED");

  function handleDone(action: "APPROVED" | "REJECTED") {
    setModal(null);
    setDoneAction(action);
    setDone(true);
    onSuccess?.();
  }

  if (done) {
    const approved = doneAction === "APPROVED";
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-5">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${approved ? "bg-emerald-100" : "bg-rose-100"}`}>
              {approved
                ? <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
                : <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>}
            </div>
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">
            {approved ? "อนุมัติแผนแก้ไขแล้ว" : "ส่งคืนแผนแก้ไขแล้ว"}
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            {approved
              ? `CAR ${car.carNo} พร้อมสำหรับการตรวจติดตามแล้ว`
              : `CAR ${car.carNo} ส่งคืนให้ ${car.targetDepartment.name} แก้ไขแผนใหม่`}
          </p>
          <Link href="/notifications"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            กลับหน้าหลัก
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Banner */}
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <ShieldCheck className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900">คุณได้รับมอบหมายให้ตรวจสอบคำขอนี้</p>
            <p className="mt-0.5 text-xs text-amber-700">กรุณาตรวจสอบรายละเอียดทั้งหมดด้านล่าง จากนั้นกดอนุมัติหรือส่งคืนผู้จัดทำ</p>
          </div>
        </div>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/car" className="hover:text-slate-600 transition-colors">CAR</Link>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          <Link href={`/car/${carId}`} className="font-mono hover:text-slate-600 transition-colors">{car.carNo}</Link>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          <span className="text-slate-600 font-medium">ตรวจสอบแผนแก้ไข</span>
        </nav>

        {/* 2-column body */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Left — CAR info + response detail */}
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">เลขที่ CAR</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-slate-900">{car.carNo}</p>
                </div>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {car.targetDepartment.name}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="ประเด็น / Issue" value={car.defectDetail ?? "-"} multiline />
                <Field label="อ้างอิง / Reference" value={car.nonConformanceRef ?? "-"} />
              </div>
            </div>

            {car.response ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-700">แผนการดำเนินการแก้ไข / Corrective Action Plan</h3>
                </div>
                <ResponseDetail response={car.response} />
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-700">
                ยังไม่มีการตอบกลับจากหน่วยงาน
              </div>
            )}
          </div>

          {/* Right — timeline + action buttons in one card */}
          <div>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col">
              <div className="p-5 flex-1">
                <h3 className="mb-4 text-sm font-bold text-slate-700 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-slate-400" />
                  ขั้นตอนการอนุมัติ
                </h3>
                <ApprovalTimeline car={car} />
              </div>

              {/* Sticky action footer */}
              <div className="border-t border-slate-100 px-4 py-3">
                <p className="text-xs text-slate-500 mb-2">ขั้นตอนของคุณ: ผู้แทนฝ่ายบริหาร</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModal("APPROVED")}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-sm font-bold text-white transition-colors"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    อนุมัติ
                  </button>
                  <button
                    type="button"
                    onClick={() => setModal("REJECTED")}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 py-2.5 text-sm font-bold text-rose-600 transition-colors"
                  >
                    <XCircle className="h-4 w-4" />
                    ส่งคืน
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action modal */}
      {modal && (
        <ActionModal
          carId={carId}
          car={car}
          token={token}
          action={modal}
          savedSignatureUrl={savedSignatureUrl}
          savedSignatureType={savedSignatureType}
          onClose={() => setModal(null)}
          onDone={handleDone}
        />
      )}
    </>
  );
}
