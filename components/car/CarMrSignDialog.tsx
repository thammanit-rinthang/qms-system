"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, ShieldCheck } from "lucide-react";
import type { CarDetail } from "@/types/car";
import type { SignatureType } from "@/types/dar";
import { toast } from "sonner";
import ApproveSignatureSection, { type SigMode } from "@/components/shared/ApproveSignatureSection";

interface Props {
  carId: string;
  car: CarDetail;
  token?: string;
  savedSignatureUrl?: string | null;
  savedSignatureType?: SignatureType | null;
  onSuccess?: () => void;
}

async function submitSignoff(
  carId: string,
  token: string | undefined,
  comment: string,
  signaturePath: string,
  signatureType: SignatureType,
  saveToProfile: boolean,
): Promise<void> {
  const res = await fetch(`/api/car/${carId}/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(token ? { token } : {}),
      ...(comment ? { comment } : {}),
      signaturePath,
      signatureType,
      saveToProfile,
    }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? "ไม่สามารถลงนามปิด CAR ได้");
  }
}

function Field({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-sm font-medium text-slate-800 ${multiline ? "whitespace-pre-wrap" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}

// ── Approval timeline ─────────────────────────────────────────────────────────

function ApprovalTimeline({ car }: { car: CarDetail }) {
  const steps = [
    { label: "ผู้จัดทำ", sublabel: car.issuer?.name ?? "-", status: "done" as const, signatureUrl: car.issuerSignaturePath ?? null },
    { label: "ผู้ตอบกลับ", sublabel: car.response?.responder?.name ?? "-", status: "done" as const, signatureUrl: car.response?.responderSignaturePath ?? null },
    { label: "MR ตรวจสอบแผน", sublabel: car.mrResponseReview ? "อนุมัติแล้ว" : "-", status: "done" as const, signatureUrl: null },
    { label: "การตรวจติดตาม", sublabel: car.verifications.length > 0 ? `${car.verifications.length} รอบ` : "-", status: "done" as const, signatureUrl: car.verifications.at(-1)?.verifierSignaturePath ?? null },
    { label: "ผู้แทนฝ่ายบริหาร (MR) ลงนามปิด", sublabel: "รอการลงนาม", status: "pending" as const, signatureUrl: null },
  ];

  return (
    <div className="flex flex-col">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        return (
          <div key={idx} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 shadow-sm ${
                step.status === "done" ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white border-amber-300 text-amber-500"
              }`}>
                {step.status === "done"
                  ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
                  : <span className="text-sm font-bold">{idx + 1}</span>}
              </div>
              {!isLast && <div className={`w-0.5 flex-1 my-1 ${step.status === "done" ? "bg-emerald-200" : "bg-slate-100"}`} style={{ minHeight: 24 }} />}
            </div>
            <div className="pb-4 flex-1 min-w-0 mt-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-slate-700">{step.label}</span>
                {step.status === "done" && <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-700">เสร็จแล้ว</span>}
                {step.status === "pending" && <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-700">รออนุมัติ</span>}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{step.sublabel}</p>
              {step.signatureUrl && (
                <div className="mt-1.5 rounded-lg border border-slate-100 bg-white p-2 w-24">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={step.signatureUrl} alt="ลายมือชื่อ" className="h-8 w-full object-contain" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Sign modal ────────────────────────────────────────────────────────────────

interface SignModalProps {
  carId: string;
  car: CarDetail;
  token?: string;
  savedSignatureUrl?: string | null;
  savedSignatureType?: SignatureType | null;
  onClose: () => void;
  onDone: () => void;
}

function SignModal({ carId, car, token, savedSignatureUrl, savedSignatureType, onClose, onDone }: SignModalProps) {
  const [comment, setComment] = useState("");
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);
  const [sigType, setSigType] = useState<SigMode>("DRAW");
  const [saveToProfile, setSaveToProfile] = useState(false);

  const handleSigChange = useCallback((url: string | null, type: SigMode) => {
    setSigDataUrl(url);
    setSigType(type);
  }, []);

  const mutation = useMutation({
    mutationFn: () => {
      if (!sigDataUrl) throw new Error("กรุณาเซ็นลายมือชื่อก่อน");
      return submitSignoff(carId, token, comment, sigDataUrl, sigType as SignatureType, saveToProfile);
    },
    onSuccess: onDone,
    onError: (err: Error) => toast.error(err.message),
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-122 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="relative z-123 w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-emerald-100 bg-emerald-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <span className="font-bold text-sm text-emerald-800">ลงนามปิด CAR</span>
            <span className="font-mono text-xs text-slate-400">{car.carNo}</span>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-slate-400 hover:bg-white/60 hover:text-slate-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="rounded-xl bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
            การลงนามจะปิด CAR อย่างเป็นทางการและแจ้งเตือนผู้เกี่ยวข้องทั้งหมด
          </div>

          {/* Signature */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-slate-600">
              ลายมือชื่อ MR <span className="text-rose-500">*</span>
            </label>
            {sigDataUrl ? (
              <div className="flex flex-col gap-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sigDataUrl} alt="ลายมือชื่อ" className="h-14 w-full object-contain" />
                </div>
                <button type="button" onClick={() => setSigDataUrl(null)}
                  className="w-full rounded-xl border border-slate-200 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-colors">
                  เซ็นใหม่
                </button>
              </div>
            ) : (
              <ApproveSignatureSection
                savedSignatureUrl={savedSignatureUrl}
                savedSignatureType={savedSignatureType}
                onSignatureChange={handleSigChange}
                onSaveChange={setSaveToProfile}
              />
            )}
          </div>

          {/* Comment */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">หมายเหตุ (ถ้ามี)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="เพิ่มหมายเหตุ..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {mutation.error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
              {(mutation.error as Error).message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-white transition-colors">
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !sigDataUrl}
            className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
          >
            {mutation.isPending ? "กำลังบันทึก..." : "ยืนยันลงนามปิด CAR"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CarMrSignDialog({ carId, car, token, savedSignatureUrl, savedSignatureType, onSuccess }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [done, setDone] = useState(false);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "long", year: "numeric" });

  function handleDone() {
    setShowModal(false);
    setDone(true);
    onSuccess?.();
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-12 text-center">
        <div className="mb-4 flex justify-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-emerald-800">ปิด CAR แล้ว</h2>
        <p className="mt-2 text-sm text-emerald-700">CAR {car.carNo} ได้รับการลงนามปิดเรียบร้อยแล้ว</p>
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
            <p className="text-sm font-semibold text-amber-900">ลงนามปิด CAR</p>
            <p className="mt-0.5 text-xs text-amber-700">CAR ผ่านการตรวจติดตามแล้ว กรุณากดปุ่มด้านล่างเพื่อลงนามปิดอย่างเป็นทางการ</p>
          </div>
        </div>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/car" className="hover:text-slate-600 transition-colors">CAR</Link>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          <Link href={`/car/${carId}`} className="font-mono hover:text-slate-600 transition-colors">{car.carNo}</Link>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          <span className="text-slate-600 font-medium">ลงนามปิด</span>
        </nav>

        {/* 2-column body */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* Left — CAR info */}
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

            {car.response && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-700">แผนการดำเนินการแก้ไข</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="ผู้ตอบกลับ" value={car.response.responder.name ?? "-"} />
                  <Field label="วันที่แผนกำหนดเสร็จ" value={fmt(car.response.plannedCompletionDate)} />
                  <Field label="การดำเนินการทันที" value={car.response.immediateAction} multiline />
                  <Field label="การดำเนินการป้องกัน" value={car.response.preventiveAction} multiline />
                </div>
              </div>
            )}

            {car.verifications.length > 0 && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-700">ผลการตรวจติดตาม</p>
                {car.verifications.map((v) => (
                  <div key={v.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">รอบที่ {v.round} — {v.verifier.name ?? "-"}</span>
                    <span className={`font-semibold ${v.result === "PASSED" ? "text-emerald-700" : "text-rose-700"}`}>
                      {v.result === "PASSED" ? "ผ่าน" : "ไม่ผ่าน"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right — timeline + action button */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-700 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                ขั้นตอนการอนุมัติ
              </h3>
              <ApprovalTimeline car={car} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-700">ขั้นตอนของคุณ: ลงนามปิด CAR</h3>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-500 bg-emerald-50 py-3 text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                <ShieldCheck className="h-4 w-4" />
                ลงนามปิด CAR
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sign modal */}
      {showModal && (
        <SignModal
          carId={carId}
          car={car}
          token={token}
          savedSignatureUrl={savedSignatureUrl}
          savedSignatureType={savedSignatureType}
          onClose={() => setShowModal(false)}
          onDone={handleDone}
        />
      )}
    </>
  );
}
