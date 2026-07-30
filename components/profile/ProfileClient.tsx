"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error-message";
import type { SignatureType } from "@/types/dar";

// ── Types ─────────────────────────────────────────────────────────────────────

type ProfileData = {
  id: string;
  name: string | null;
  email: string;
  employeeId: string | null;
  position: string | null;
  departmentId: string | null;
  savedSignatureUrl: string | null;
  signatureType: SignatureType | null;
  image: string | null;
  role: string;
};

type Props = {
  profile: ProfileData;
  departmentName: string | null;
};

// ── Signature sub-components ───────────────────────────────────────────────────

const CANVAS_W = 500;
const CANVAS_H = 160;

type SigMode = "DRAW" | "TYPE" | "IMAGE";

const TYPE_FONTS = [
  { labelKey: "dar.approval.sigFontScript", value: "Dancing Script, cursive" },
  { labelKey: "dar.approval.sigFontStyle", value: "Pacifico, cursive" },
  { labelKey: "dar.approval.sigFontCursive", value: "Great Vibes, cursive" },
] as const;

function DrawPad({ onChange }: { onChange: (url: string | null) => void }) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasContent = useRef(false);

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawing.current = true;
    const ctx = canvas.getContext("2d")!;
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    e.preventDefault();
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f1059";
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasContent.current = true;
    e.preventDefault();
  }

  function stopDraw() {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(hasContent.current ? canvas.toDataURL("image/png") : null);
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    hasContent.current = false;
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative bg-white border-2 border-slate-200 rounded-xl overflow-hidden">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full cursor-crosshair touch-none block"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        <p className="text-xs text-slate-400 absolute bottom-2 left-2 pointer-events-none">{t("dar.approval.sigTypePlaceholder")}</p>
      </div>
      <Button
        variant="outline"
        size="sm"
        type="button"
        className="self-end text-xs"
        onClick={clear}
      >
        {t("dar.approval.sigClear")}
      </Button>
    </div>
  );
}

function TypePad({ onChange }: { onChange: (url: string | null) => void }) {
  const t = useT();
  const [text, setText] = useState("");
  const [font, setFont] = useState<string>(TYPE_FONTS[0].value);

  const renderToCanvas = useCallback((txt: string, f: string): string | null => {
    if (!txt.trim()) return null;
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = "#0f1059";
    ctx.font = `48px ${f}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(txt, CANVAS_W / 2, CANVAS_H / 2);
    return canvas.toDataURL("image/png");
  }, []);

  function handleText(v: string) {
    setText(v);
    onChange(renderToCanvas(v, font));
  }

  function handleFont(f: string) {
    setFont(f);
    onChange(renderToCanvas(text, f));
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-transparent"
        placeholder={t("dar.approval.sigTypePlaceholder")}
        value={text}
        onChange={(e) => handleText(e.target.value)}
        maxLength={40}
      />
      <div className="flex gap-2 flex-wrap">
        {TYPE_FONTS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => handleFont(f.value)}
            className={cn(
              "h-9 px-4 text-xs rounded-lg font-medium transition-all",
              font === f.value
                ? "bg-primary text-white shadow-sm"
                : "border border-slate-200 text-slate-700 bg-white hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            <span style={{ fontFamily: f.value }}>{text || t("dar.approval.sigTypeSample")}</span>
          </button>
        ))}
      </div>
      {text.trim() && (
        <div className="w-full border-2 border-slate-200 rounded-lg bg-white flex items-center justify-center py-8">
          <span style={{ fontFamily: font, fontSize: 40 }} className="text-primary">
            {text}
          </span>
        </div>
      )}
    </div>
  );
}

function ImagePad({ onChange }: { onChange: (url: string | null) => void }) {
  const t = useT();
  const [preview, setPreview] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("dar.approval.sigImageSizeError"));
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setPreview(url);
      onChange(url);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-slate-300 rounded-xl p-8 cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors bg-white">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-10 h-10 text-slate-400 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        <span className="text-sm font-medium text-slate-700">{t("dar.approval.sigImageUploadLabel")}</span>
        <span className="text-xs text-slate-500 mt-1">{t("dar.approval.sigImageUploadHint")}</span>
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </label>
      {preview && (
        <div className="border-2 border-slate-200 rounded-lg bg-white p-4 flex items-center justify-center" style={{ height: 140 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={t("dar.approval.sigAlt")} className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}

// ── Signature editor section ──────────────────────────────────────────────────

function SignatureEditor({
  currentUrl,
  currentType,
  onSaved,
}: {
  currentUrl: string | null;
  currentType: SignatureType | null;
  onSaved: (url: string | null, type: SignatureType | null) => void;
}) {
  const t = useT();
  const [mode, setMode] = useState<SigMode>("DRAW");
  const [pending, setPending] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const tabs: { key: SigMode; label: string }[] = [
    { key: "DRAW", label: t("profile.tabDraw") },
    { key: "TYPE", label: t("profile.tabType") },
    { key: "IMAGE", label: t("profile.tabImage") },
  ];

  async function handleSave() {
    if (!pending) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ savedSignatureUrl: pending, signatureType: mode }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(getErrorMessage(json.error, t("profile.sigSaveFail")));
        return;
      }
      toast.success(t("profile.sigSaved"));
      onSaved(pending, mode);
      setEditing(false);
      setPending(null);
    } catch {
      toast.error(t("profile.sigSaveFail"));
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearSignature: true }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(getErrorMessage(json.error, t("profile.sigRemoveFail")));
        return;
      }
      toast.success(t("profile.sigRemoved"));
      onSaved(null, null);
    } catch {
      toast.error(t("profile.sigRemoveFail"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Current saved signature */}
      {currentUrl && !editing && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="bg-white border border-emerald-200 rounded-lg p-3 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentUrl} alt={t("dar.approval.sigSavedAlt")} className="h-14 object-contain max-w-44" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-semibold text-emerald-900">{t("profile.sigCurrentLabel")}</p>
            </div>
            <p className="text-xs text-emerald-700">{t("profile.sigCurrentType")}: <span className="font-medium">{currentType}</span></p>
          </div>
          <div className="flex gap-2 shrink-0 sm:flex-col">
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="text-slate-700 border-emerald-300 hover:bg-emerald-100"
              onClick={() => setEditing(true)}
            >
              {t("profile.btnChange")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
              onClick={handleClear}
              disabled={saving}
            >
              {t("profile.btnRemove")}
            </Button>
          </div>
        </div>
      )}

      {(!currentUrl || editing) && (
        <div className="flex flex-col gap-6 p-6 border border-slate-200 rounded-2xl bg-white">
          {/* Mode tabs */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-full">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setMode(tab.key);
                  setPending(null);
                }}
                className={cn(
                  "flex-1 h-9 text-sm font-medium rounded-md transition-all",
                  mode === tab.key
                    ? "bg-primary text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-200"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div>
            {mode === "DRAW" && <DrawPad onChange={setPending} />}
            {mode === "TYPE" && <TypePad onChange={setPending} />}
            {mode === "IMAGE" && <ImagePad onChange={setPending} />}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            {editing && (
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  setEditing(false);
                  setPending(null);
                }}
              >
                {t("common.cancel")}
              </Button>
            )}
            <Button size="sm" type="button" disabled={!pending || saving} onClick={handleSave}>
              {saving && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block mr-2" />}
              {t("profile.btnSaveSig")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main profile client ────────────────────────────────────────────────────────

export default function ProfileClient({ profile, departmentName }: Props) {
  const t = useT();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile.name ?? "");
  const [employeeId, setEmployeeId] = useState(profile.employeeId ?? "");
  const [position, setPosition] = useState(profile.position ?? "");
  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [savedSigUrl, setSavedSigUrl] = useState(profile.savedSignatureUrl);
  const [savedSigType, setSavedSigType] = useState(profile.signatureType);

  const hasChanges =
    name !== (profile.name ?? "") ||
    position !== (profile.position ?? "");

  async function handleConfirmSave() {
    if (!name.trim()) {
      toast.error(t("profile.nameRequired"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          position: position.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(getErrorMessage(json.error, t("profile.saveFail")));
        return;
      }
      toast.success(t("profile.saveSuccess"));
      setIsEditing(false);
      setShowConfirmModal(false);
    } catch {
      toast.error(t("profile.saveFail"));
    } finally {
      setSaving(false);
    }
  }

  function handleEditClick() {
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setName(profile.name ?? "");
    setPosition(profile.position ?? "");
    setIsEditing(false);
  }

  function handleSaveClick(e: React.FormEvent) {
    e.preventDefault();
    setShowConfirmModal(true);
  }

  const initials = (profile.name ?? profile.email).charAt(0).toUpperCase();
  const avatarBg = "linear-gradient(135deg, oklch(36% 0.16 264), oklch(28% 0.13 264))";

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Avatar + basic info card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold shrink-0 text-white shadow-sm"
            style={{ background: avatarBg }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-slate-800 truncate">{profile.name ?? "—"}</h1>
            <p className="text-sm text-slate-500 mt-1 truncate">{profile.email}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                {t(`roles.${profile.role}`)}
              </span>
              {profile.employeeId && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-slate-100 text-slate-700 font-medium">
                  ID: {profile.employeeId}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile information card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
        <form onSubmit={handleSaveClick} className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-800">{t("profile.infoSection")}</h2>
              <p className="text-sm text-slate-500 mt-1">{isEditing ? "Edit your account information" : "Your account information"}</p>
            </div>
            {!isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleEditClick}
                className="gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {t("common.edit")}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Name */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">
                {t("profile.fieldName")} <span className="text-rose-500">*</span>
              </label>
              {isEditing ? (
                <input
                  type="text"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-transparent transition-colors"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={255}
                  required
                  autoFocus
                />
              ) : (
                <div className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 flex items-center">
                  {name || "—"}
                </div>
              )}
            </div>

            {/* Employee ID */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">{t("profile.fieldEmpId")}</label>
              {isEditing ? (
                <input
                  type="text"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-transparent transition-colors"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  maxLength={255}
                />
              ) : (
                <div className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 flex items-center">
                  {employeeId || "—"}
                </div>
              )}
            </div>

            {/* Department — read only */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">{t("profile.fieldDept")}</label>
              <div className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 flex items-center">
                {departmentName ?? "—"}
              </div>
            </div>

            {/* Position */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">{t("profile.fieldPosition")}</label>
              {isEditing ? (
                <input
                  type="text"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 focus-visible:border-transparent transition-colors"
                  placeholder={t("profile.placeholderPosition")}
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  maxLength={255}
                />
              ) : (
                <div className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 flex items-center">
                  {position || "—"}
                </div>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
                disabled={saving}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={!hasChanges || saving}>
                {saving && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block mr-2" />}
                {t("profile.btnSave")}
              </Button>
            </div>
          )}
        </form>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-6 h-6 text-amber-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <h3 className="text-lg font-bold text-slate-900">Confirm Update</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Your profile information will be updated in Auth Center and reflected in connected apps. Do you want to proceed?
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
              <p className="text-xs font-medium text-amber-900">
                <strong>Changes:</strong><br />
                {name !== (profile.name ?? "") && `• Name: ${profile.name} → ${name}`}<br />
                {employeeId !== (profile.employeeId ?? "") && `• Employee ID: ${profile.employeeId || "(empty)"} → ${employeeId || "(empty)"}`}<br />
                {position !== (profile.position ?? "") && `• Position: ${profile.position || "(empty)"} → ${position || "(empty)"}`}
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
                disabled={saving}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleConfirmSave}
                disabled={saving}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {saving && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block mr-2" />}
                Confirm & Update
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Signature section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{t("profile.sigSection")}</h2>
            <p className="text-sm text-slate-500 mt-1">{t("profile.sigSectionDesc")}</p>
          </div>

          <SignatureEditor
            currentUrl={savedSigUrl ?? null}
            currentType={savedSigType ?? null}
            onSaved={(url, type) => {
              setSavedSigUrl(url);
              setSavedSigType(type);
            }}
          />
        </div>
      </div>
    </div>
  );
}
