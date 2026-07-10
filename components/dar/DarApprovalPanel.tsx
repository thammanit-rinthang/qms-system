"use client";

import { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import type { DarDetail, DarApprovalRow, SignatureType, ReviewerCandidate } from "@/types/dar";
import DarApprovalTimeline from "./DarApprovalTimeline";
import ApproveSignatureSection, { type SigMode } from "@/components/shared/ApproveSignatureSection";

interface Props {
  dar: DarDetail;
  currentUserId: string;
  savedSignatureUrl?: string | null;
  savedSignatureType?: SignatureType | null;
  onUpdated: (dar: DarDetail) => void;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null) {
    const payload = error as { message?: unknown; code?: unknown };
    const maybeCode = typeof payload.code === "string" ? payload.code : "";
    if (maybeCode === "QMS_NOT_CONFIGURED") return "ยังไม่ได้ตั้งค่า QMS signer ในระบบ";
    if (maybeCode === "MR_NOT_CONFIGURED") return "ยังไม่ได้ตั้งค่า MR ในระบบ";
    const maybeMessage = payload.message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      // Guard against mojibake text leaking from backend.
      if (maybeMessage.includes("à¸") || maybeMessage.includes("Ã")) return fallback;
      return maybeMessage;
    }
  }
  return fallback;
}

// ── Modal shell ───────────────────────────────────────────────────────────────

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-[122] flex items-center justify-center p-4"
      onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      {/* Dialog */}
      <div
        className="relative z-[123] w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ── Approve modal ─────────────────────────────────────────────────────────────

interface RoleUser { authUserId: string; name: string; email: string | null }

function useRoleUsers(role: "MR" | "QMS" | null) {
  return useQuery<RoleUser[]>({
    queryKey: ["dar-role-users", role],
    queryFn: async () => {
      const res = await fetch(`/api/dar/role-users?role=${role}`);
      const json = await res.json();
      return (json.data ?? []) as RoleUser[];
    },
    enabled: role !== null,
    staleTime: 60_000,
  });
}

interface ApproveModalProps {
  darId: string;
  stepLabel: string;
  stepRole: DarApprovalRow["stepRole"];
  savedSignatureUrl?: string | null;
  savedSignatureType?: SignatureType | null;
  onClose: () => void;
  onDone: (dar: DarDetail) => void;
}

function ApproveModal({ darId, stepLabel, stepRole, savedSignatureUrl, savedSignatureType, onClose, onDone }: ApproveModalProps) {
  const t = useT();
  const isQmsStep = stepRole === "QMS_PROCESSOR";
  const isReviewerStep = stepRole === "REVIEWER";
  const isMrStep = stepRole === "APPROVER_MR";
  const needsUserPick = isReviewerStep || isMrStep;
  const pickRole = isReviewerStep ? "MR" : isMrStep ? "QMS" : null;
  const pickLabel = isReviewerStep ? "เลือกผู้อนุมัติ MR" : "เลือกผู้ประมวลผล QMS";

  const { data: roleUsers = [], isLoading: roleUsersLoading } = useRoleUsers(pickRole);
  const [targetAuthUserId, setTargetAuthUserId] = useState("");

  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);
  const [sigType, setSigType] = useState<SigMode>("DRAW");
  const [saveSignature, setSaveSignature] = useState(false);
  const [comment, setComment] = useState("");
  const [qmsComment, setQmsComment] = useState("");
  const [qmsChecklist, setQmsChecklist] = useState({
    chkHasAttachment: false,
    chkPrintAndValidate: false,
    chkRenumber: false,
    chkImpactInvestigated: false,
    chkSubmitVerification: false,
    chkGetBackProcess: false,
    chkCopyDistribute: false,
  });
  const [error, setError] = useState<string | null>(null);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/dar/${darId}/approve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signatureDataUrl: sigDataUrl,
          signatureType: sigType,
          saveSignature,
          comment: comment.trim() || null,
          targetAuthUserId: targetAuthUserId || null,
          qmsProcessing: isQmsStep ? { ...qmsChecklist, comments: qmsComment.trim() || null } : null,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(getErrorMessage(json.error, t("dar.approval.errorGeneric")));
      return json.data;
    },
    onSuccess: (data) => onDone(data),
    onError: (err) => setError(err.message),
  });

  const submitting = submitMutation.isPending;

  const qmsCheckedCount = Object.values(qmsChecklist).filter(Boolean).length;
  const canSubmit = !!sigDataUrl && !submitting && (!needsUserPick || !!targetAuthUserId);

  const handleSignatureChange = useCallback((url: string | null, type: SigMode) => {
    setSigDataUrl(url); setSigType(type);
  }, []);

  function handleSubmit() {
    if (!sigDataUrl) return;
    setError(null);
    submitMutation.mutate();
  }

  return (
    <Modal onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{t("dar.approval.btnApprove")}</p>
            <p className="text-xs text-slate-400">{stepLabel}</p>
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
        {/* Role user picker */}
        {needsUserPick && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600">
              {pickLabel} <span className="text-rose-500">*</span>
            </label>
            {roleUsersLoading ? (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="w-3 h-3 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
                กำลังโหลด...
              </div>
            ) : (
              <select
                className="w-full h-9 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={targetAuthUserId}
                onChange={(e) => setTargetAuthUserId(e.target.value)}
              >
                <option value="">-- เลือก --</option>
                {roleUsers.map((u) => (
                  <option key={u.authUserId} value={u.authUserId}>
                    {u.name}{u.email ? ` (${u.email})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Comment */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-600">
            {t("dar.approval.commentLabel")} <span className="text-slate-400 font-normal">{t("dar.approval.commentOptional")}</span>
          </label>
          <textarea
            rows={3}
            placeholder={t("dar.approval.commentPlaceholder")}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1000}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition-colors"
          />
        </div>

        {isQmsStep && (
          <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">QMS Checklist</p>
            {[
              ["chkHasAttachment", "ตรวจสอบเอกสารแนบ", "Check attachment"],
              ["chkPrintAndValidate", "พิมพ์และตรวจสอบเอกสารเก่า/ใหม่", "Print and validate old/new documents"],
              ["chkRenumber", "ปรับเลขเอกสาร/อัปเดตรายการฟอร์ม", "Renumber / update format list"],
              ["chkImpactInvestigated", "ตรวจสอบผลกระทบจากการเปลี่ยนแปลงเอกสาร", "Investigate impact from document changes"],
              ["chkSubmitVerification", "ส่งหลักฐานการตรวจสอบ", "Submit verification evidence"],
              ["chkGetBackProcess", "เรียกคืนและดำเนินการกับสำเนาควบคุม", "Get back and process controlled copies"],
              ["chkCopyDistribute", "สำเนาและแจกจ่ายให้หน่วยงานที่เกี่ยวข้อง", "Copy and distribute to related departments"],
            ].map(([key, labelTh, labelEn]) => (
              <label key={key} className="flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={qmsChecklist[key as keyof typeof qmsChecklist]}
                  onChange={(e) => setQmsChecklist((prev) => ({ ...prev, [key]: e.target.checked }))}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-primary"
                />
                <span className="leading-snug">
                  <span className="block text-slate-800">{labelTh}</span>
                  <span className="block text-xs text-slate-500">{labelEn}</span>
                </span>
              </label>
            ))}
            <textarea
              rows={2}
              value={qmsComment}
              onChange={(e) => setQmsComment(e.target.value)}
              placeholder="QMS note (optional)"
              className="mt-2 w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        )}

        {/* Signature */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-slate-600">
            {t("dar.approval.signatureLabel")} <span className="text-rose-500">*</span>
          </label>
          <ApproveSignatureSection
            savedSignatureUrl={savedSignatureUrl}
            savedSignatureType={savedSignatureType}
            onSignatureChange={handleSignatureChange}
            onSaveChange={setSaveSignature}
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
        <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={submitting}>{t("common.cancel")}</Button>
        <button type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="h-8 px-5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5">
          {submitting
            ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
          }
          {t("dar.approval.btnConfirmApprove")}
        </button>
      </div>
      <div className="px-6 pb-4">
        <p className="text-xs text-slate-500">
          {sigDataUrl ? "ลายเซ็น: พร้อม" : "ลายเซ็น: ยังไม่ครบ"}
          {isQmsStep ? ` | Checklist: ${qmsCheckedCount}/7` : ""}
        </p>
      </div>
    </Modal>
  );
}

// ── Reject modal ──────────────────────────────────────────────────────────────

interface RejectModalProps {
  darId: string;
  stepLabel: string;
  onClose: () => void;
  onDone: (dar: DarDetail) => void;
}

function RejectModal({ darId, stepLabel, onClose, onDone }: RejectModalProps) {
  const t = useT();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/dar/${darId}/reject`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(getErrorMessage(json.error, t("dar.approval.errorGeneric")));
      return json.data;
    },
    onSuccess: (data) => onDone(data),
    onError: (err) => setError(err.message),
  });

  const submitting = submitMutation.isPending;

  function handleSubmit() {
    if (!reason.trim()) return;
    setError(null);
    submitMutation.mutate();
  }

  return (
    <Modal onClose={onClose}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{t("dar.approval.btnReject")}</p>
            <p className="text-xs text-slate-400">{stepLabel}</p>
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
      <div className="px-6 py-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-600">
            {t("dar.approval.rejectReasonLabel")} <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={5}
            autoFocus
            placeholder={t("dar.approval.rejectReasonPlaceholder")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={1000}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-rose-300/50 focus:border-rose-300 transition-colors"
          />
          <p className="text-[11px] text-slate-400 text-right">{reason.length}/1000</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
        <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={submitting}>{t("common.cancel")}</Button>
        <button type="button"
          disabled={!reason.trim() || submitting}
          onClick={handleSubmit}
          className="h-8 px-5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5">
          {submitting
            ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          }
          {t("dar.approval.btnConfirmReject")}
        </button>
      </div>
    </Modal>
  );
}

// ── Preparer sign modal ───────────────────────────────────────────────────────

interface PreparerSignModalProps {
  darId: string;
  savedSignatureUrl?: string | null;
  savedSignatureType?: SignatureType | null;
  onClose: () => void;
  onDone: (dar: DarDetail) => void;
}

function PreparerSignModal({ darId, savedSignatureUrl, savedSignatureType, onClose, onDone }: PreparerSignModalProps) {
  const t = useT();
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);
  const [sigType, setSigType] = useState<SigMode>("DRAW");
  const [saveSignature, setSaveSignature] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignatureChange = useCallback((url: string | null, type: SigMode) => {
    setSigDataUrl(url); setSigType(type);
  }, []);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/dar/${darId}/approve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureDataUrl: sigDataUrl, signatureType: sigType, saveSignature, comment: null }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(getErrorMessage(json.error, t("dar.approval.errorGeneric")));
      return json.data;
    },
    onSuccess: (data) => onDone(data),
    onError: (err) => setError(err.message),
  });

  const submitting = submitMutation.isPending;

  function handleSubmit() {
    if (!sigDataUrl) return;
    setError(null);
    submitMutation.mutate();
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <p className="text-sm font-bold text-slate-800">{t("dar.approval.preparerSignTitle")}</p>
        </div>
        <button type="button" onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
        <ApproveSignatureSection
          savedSignatureUrl={savedSignatureUrl}
          savedSignatureType={savedSignatureType}
          onSignatureChange={handleSignatureChange}
          onSaveChange={setSaveSignature}
        />
        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
        <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={submitting}>{t("common.cancel")}</Button>
        <Button size="sm" type="button" disabled={!sigDataUrl || submitting} onClick={handleSubmit}>
          {submitting && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />}
          {t("dar.approval.btnConfirmSign")}
        </Button>
      </div>
    </Modal>
  );
}



// ── Assign reviewer panel ─────────────────────────────────────────────────────

function AssignReviewerPanel({ darId, onDone }: { darId: string; onDone: (dar: DarDetail) => void }) {
  const t = useT();
  const [isSelecting, setIsSelecting] = useState(false);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: candidates = [], isLoading: loading } = useQuery({
    queryKey: ["reviewer-candidates"],
    queryFn: async () => {
      const res = await fetch("/api/dar/reviewer-candidates");
      if (!res.ok) throw new Error("Failed to fetch candidates");
      const json = await res.json();
      return (json.data ?? []) as ReviewerCandidate[];
    },
    enabled: isSelecting,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/dar/${darId}/assign-reviewer`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerUserId: selected }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(getErrorMessage(json.error, t("dar.approval.errorGeneric")));
      return json.data;
    },
    onSuccess: (data) => onDone(data),
    onError: (err) => setError(err.message),
  });

  const submitting = submitMutation.isPending;

  function submit() {
    if (!selected) return;
    setError(null);
    submitMutation.mutate();
  }

  if (!isSelecting) {
    return (
      <Button size="sm" type="button" onClick={() => setIsSelecting(true)} disabled={loading}>
        {loading && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />}
        {t("dar.approval.btnAssignReviewer")}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-slate-700">{t("dar.approval.selectReviewer")}</p>
      <select className="w-full h-9 px-3 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        value={selected} onChange={(e) => setSelected(e.target.value)}>
        <option value="">{t("dar.approval.selectReviewerPlaceholder")}</option>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>{c.name ?? c.email}{c.department ? ` (${c.department.name})` : ""}</option>
        ))}
      </select>
      {error && <p className="text-xs text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" type="button" disabled={!selected || submitting} onClick={submit}>
          {submitting && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />}
          {t("common.confirm")}
        </Button>
        <Button variant="ghost" size="sm" type="button" onClick={() => setIsSelecting(false)}>{t("common.cancel")}</Button>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

type ModalMode = "none" | "approve" | "reject" | "preparerSign";

export default function DarApprovalPanel({ dar, currentUserId, savedSignatureUrl, savedSignatureType, onUpdated }: Props) {
  const t = useT();
  const [modal, setModal] = useState<ModalMode>("none");

  const myPendingStep = dar.approvals.find((a) => a.assignedUser.id === currentUserId && a.action === "PENDING");
  const preparerStep = dar.approvals.find((a) => a.stepRole === "PREPARER");
  const isRequester = dar.requester.id === currentUserId;
  const preparerApproved = preparerStep?.action === "APPROVED";
  const reviewerAssigned = dar.approvals.some((a) => a.stepRole === "REVIEWER");
  const isPreparerStep = myPendingStep?.stepRole === "PREPARER";

  const stepLabel = (role: DarApprovalRow["stepRole"]): string => {
    switch (role) {
      case "PREPARER":
        return t("dar.approval.stepPreparer");
      case "REVIEWER":
        return t("dar.approval.stepReviewer");
      case "APPROVER_MR":
      case "APPROVER":
      case "APPROVER_DCC":
      case "REQUESTER":
      case "REQUESTER_MANAGER":
        return t("dar.approval.stepApproverMr");
      case "QMS_PROCESSOR":
        return "QMS";
      default:
        return String(role);
    }
  };

  function handleDone(updated: DarDetail) {
    setModal("none");
    onUpdated(updated);
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-sm font-bold text-slate-800">{t("dar.approval.title")}</h2>
        </div>

        <div className="p-6 flex flex-col gap-6">
          <DarApprovalTimeline approvals={dar.approvals} />

          {/* 1. Preparer self-sign */}
          {myPendingStep && isPreparerStep && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-primary">{t("dar.approval.preparerSignTitle")}</p>
                <p className="text-xs text-slate-500 mt-0.5">{t("dar.approval.stepPreparer")}</p>
              </div>
              <button type="button" onClick={() => setModal("preparerSign")}
                className="shrink-0 h-9 px-4 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                {t("dar.approval.btnConfirmSign")}
              </button>
            </div>
          )}

          {/* 2. Assign reviewer */}
          {isRequester && preparerApproved && !reviewerAssigned && dar.status === "PENDING_REVIEW" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <AssignReviewerPanel darId={dar.id} onDone={onUpdated} />
            </div>
          )}

          {/* 3. Reviewer / MR approve or reject */}
          {myPendingStep && !isPreparerStep && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-700">
                  {t("dar.approval.yourStep")}: <span className="text-primary">{stepLabel(myPendingStep.stepRole)}</span>
                </span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setModal("approve")}
                    className="h-8 px-4 text-xs font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
                    {t("dar.approval.btnApprove")}
                  </button>
                  <button type="button" onClick={() => setModal("reject")}
                    className="h-8 px-4 text-xs font-medium rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    {t("dar.approval.btnReject")}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {modal === "preparerSign" && (
        <PreparerSignModal
          darId={dar.id}
          savedSignatureUrl={savedSignatureUrl}
          savedSignatureType={savedSignatureType}
          onClose={() => setModal("none")}
          onDone={handleDone}
        />
      )}
      {modal === "approve" && myPendingStep && (
        <ApproveModal
          darId={dar.id}
          stepLabel={stepLabel(myPendingStep.stepRole)}
          stepRole={myPendingStep.stepRole}
          savedSignatureUrl={savedSignatureUrl}
          savedSignatureType={savedSignatureType}
          onClose={() => setModal("none")}
          onDone={handleDone}
        />
      )}
      {modal === "reject" && myPendingStep && (
        <RejectModal
          darId={dar.id}
          stepLabel={stepLabel(myPendingStep.stepRole)}
          onClose={() => setModal("none")}
          onDone={handleDone}
        />
      )}
    </>
  );
}
