"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import type { SignatureType } from "@/types/dar";

interface Props {
  onConfirm: (dataUrl: string, type: SignatureType, saveToProfile: boolean) => void | Promise<void>;
  onCancel: () => void;
  savedSignatureUrl?: string | null;
  savedSignatureType?: SignatureType | null;
  isLoading?: boolean;
}

type Mode = "DRAW" | "TYPE" | "IMAGE";

function useSavedSignature(
  propUrl?: string | null,
  propType?: SignatureType | null,
): { url: string | null; type: SignatureType | null } {
  const [url, setUrl] = useState<string | null>(propUrl ?? null);
  const [type, setType] = useState<SignatureType | null>(propType ?? null);

  // Always fetch fresh from the API when mounted so stale SSR props never hide the saved signature
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((json) => {
        const u = json?.data?.savedSignatureUrl ?? null;
        const t = json?.data?.signatureType ?? null;
        if (u && t) { setUrl(u); setType(t); }
      })
      .catch(() => {});
  }, []);

  return { url, type };
}

const CANVAS_W = 600;
const CANVAS_H = 160;

// ── Draw mode ──────────────────────────────────────────────────────────────────
function DrawPad({ onChange }: { onChange: (url: string | null) => void }) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasContent = useRef(false);

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * sx, y: (touch.clientY - rect.top) * sy };
    }
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current; if (!canvas) return;
    drawing.current = true;
    const ctx = canvas.getContext("2d")!;
    const { x, y } = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(x, y);
    e.preventDefault();
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#0f1059";
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y); ctx.stroke();
    hasContent.current = true;
    e.preventDefault();
  }

  function stopDraw() {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current; if (!canvas) return;
    onChange(hasContent.current ? canvas.toDataURL("image/png") : null);
  }

  function clear() {
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    hasContent.current = false;
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
        className="w-full border-2 border-dashed border-slate-200 rounded-xl bg-white cursor-crosshair touch-none"
        style={{ maxHeight: 160 }}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
      />
      <button type="button" onClick={clear} className="self-end text-xs text-slate-400 hover:text-slate-600 transition-colors">
        {t("dar.approval.sigClear")}
      </button>
    </div>
  );
}

// ── Type mode ──────────────────────────────────────────────────────────────────
function TypePad({ onChange }: { onChange: (url: string | null) => void }) {
  const t = useT();
  const TYPE_FONTS = [
    { label: t("dar.approval.sigFontScript"), value: "Dancing Script, cursive" },
    { label: t("dar.approval.sigFontStyle"),  value: "Pacifico, cursive" },
    { label: t("dar.approval.sigFontCursive"), value: "Great Vibes, cursive" },
  ];

  const [text, setText] = useState("");
  const [font, setFont] = useState(TYPE_FONTS[0].value);

  const renderToCanvas = useCallback((txt: string, f: string): string | null => {
    if (!txt.trim()) return null;
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_W; canvas.height = CANVAS_H;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = "#0f1059"; ctx.font = `52px ${f}`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(txt, CANVAS_W / 2, CANVAS_H / 2);
    return canvas.toDataURL("image/png");
  }, []);

  useEffect(() => { onChange(renderToCanvas(text, font)); }, [text, font, onChange, renderToCanvas]);

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition-colors"
        placeholder={t("dar.approval.sigTypePlaceholder")}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={40}
      />
      <div className="flex gap-2 flex-wrap">
        {TYPE_FONTS.map((f) => (
          <button key={f.value} type="button" onClick={() => setFont(f.value)}
            className={`h-8 px-3 text-sm rounded-lg font-medium transition-colors ${font === f.value ? "bg-primary text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            <span style={{ fontFamily: f.value }}>{text || t("dar.approval.sigTypeSample")}</span>
          </button>
        ))}
      </div>
      {text.trim() && (
        <div className="w-full border-2 border-dashed border-slate-200 rounded-xl bg-white flex items-center justify-center" style={{ height: 100 }}>
          <span style={{ fontFamily: font, fontSize: 42 }} className="text-primary">{text}</span>
        </div>
      )}
    </div>
  );
}

// ── Image upload mode ──────────────────────────────────────────────────────────
function ImagePad({ onChange }: { onChange: (url: string | null) => void }) {
  const t = useT();
  const [preview, setPreview] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error(t("dar.approval.sigImageSizeError"), { duration: Infinity }); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { const url = ev.target?.result as string; setPreview(url); onChange(url); };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-slate-200 rounded-xl p-6 cursor-pointer hover:border-primary/60 transition-colors bg-white">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <span className="text-sm text-slate-500">{t("dar.approval.sigImageUploadLabel")}</span>
        <span className="text-xs text-slate-400 mt-1">{t("dar.approval.sigImageUploadHint")}</span>
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </label>
      {preview && (
        <div className="border-2 border-dashed border-slate-200 rounded-xl bg-white p-3 flex items-center justify-center" style={{ height: 100 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={t("dar.approval.sigAlt")} className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}

// ── Tab icons ──────────────────────────────────────────────────────────────────
function IconDraw() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}
function IconType() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
    </svg>
  );
}
function IconImage() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function SignaturePad({ onConfirm, onCancel, savedSignatureUrl, savedSignatureType, isLoading = false }: Props) {
  const t = useT();
  const [mode, setMode] = useState<Mode>("DRAW");
  const [pending, setPending] = useState<string | null>(null);
  const [saveToProfile, setSaveToProfile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { url: resolvedUrl, type: resolvedType } = useSavedSignature(savedSignatureUrl, savedSignatureType);
  const busy = isLoading || submitting;

  const tabs: { key: Mode; label: string; icon: React.ReactNode }[] = [
    { key: "DRAW",  label: t("dar.approval.sigModeDrawLabel"),  icon: <IconDraw /> },
    { key: "TYPE",  label: t("dar.approval.sigModeTypeLabel"),  icon: <IconType /> },
    { key: "IMAGE", label: t("dar.approval.sigModeImageLabel"), icon: <IconImage /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Saved signature shortcut */}
      {resolvedUrl && resolvedType && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
          <div className="bg-white border border-emerald-200 rounded-lg p-1.5 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolvedUrl} alt={t("dar.approval.sigSavedAlt")} className="h-8 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-800">{t("dar.approval.savedSigLabel")}</p>
          </div>
          <button type="button"
            disabled={busy}
            onClick={async () => {
              setSubmitting(true);
              try { await onConfirm(resolvedUrl, resolvedType, false); } finally { setSubmitting(false); }
            }}
            className="shrink-0 h-8 px-3 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {busy ? "..." : t("dar.approval.btnUseSavedSig")}
          </button>
        </div>
      )}

      {/* Mode tabs — icon pill bar */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
        {tabs.map((tab) => (
          <button key={tab.key} type="button"
            onClick={() => { setMode(tab.key); setPending(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 h-8 text-xs font-medium rounded-lg transition-all ${mode === tab.key ? "bg-white shadow-sm text-primary" : "text-slate-500 hover:text-slate-700"}`}>
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Mode content */}
      <div>
        {mode === "DRAW"  && <DrawPad  onChange={setPending} />}
        {mode === "TYPE"  && <TypePad  onChange={setPending} />}
        {mode === "IMAGE" && <ImagePad onChange={setPending} />}
      </div>

      {/* Save to profile checkbox */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary"
          checked={saveToProfile} onChange={(e) => setSaveToProfile(e.target.checked)} />
        <span className="text-xs text-slate-500">{t("dar.approval.saveSigCheckbox")}</span>
      </label>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <Button variant="ghost" size="sm" type="button" onClick={onCancel} disabled={busy}>
          {t("common.cancel")}
        </Button>
        <button type="button"
          disabled={!pending || busy}
          onClick={async () => {
            if (!pending) return;
            setSubmitting(true);
            try { await onConfirm(pending, mode, saveToProfile); } finally { setSubmitting(false); }
          }}
          className="h-8 px-5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5">
          {busy ? (
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {busy ? "กำลังส่ง..." : t("dar.approval.btnConfirmSign")}
        </button>
      </div>
    </div>
  );
}
