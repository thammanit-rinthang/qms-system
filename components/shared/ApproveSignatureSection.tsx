"use client";

/**
 * ApproveSignatureSection
 *
 * Shared inline signature capture used across all approve flows
 * (CAR MR-response, CAR close, DAR approve, KPI approve, etc.).
 *
 * Features:
 * - DRAW / TYPE / IMAGE mode tabs
 * - Saved-signature shortcut (auto-fetched from /api/profile)
 * - "Save to profile" checkbox
 * - No submit button — parent controls submission
 *
 * Usage:
 *   const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);
 *   const [sigType, setSigType]       = useState<SignatureType>("DRAW");
 *   const [saveSig, setSaveSig]       = useState(false);
 *
 *   <ApproveSignatureSection
 *     savedSignatureUrl={savedUrl}
 *     savedSignatureType={savedType}
 *     onSignatureChange={(url, type) => { setSigDataUrl(url); setSigType(type); }}
 *     onSaveChange={setSaveSig}
 *   />
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import type { SignatureType } from "@/types/dar";

export type SigMode = "DRAW" | "TYPE" | "IMAGE";

export interface ApproveSignatureSectionProps {
  /** Pre-loaded saved signature URL (SSR prop — will be refreshed from API on mount) */
  savedSignatureUrl?: string | null;
  /** Pre-loaded saved signature type */
  savedSignatureType?: SignatureType | null;
  /**
   * Called whenever the signature changes.
   * url === null means "cleared / no signature yet".
   */
  onSignatureChange: (url: string | null, type: SigMode) => void;
  /** Called when the "save to profile" checkbox changes */
  onSaveChange: (save: boolean) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CANVAS_W = 600;
const CANVAS_H = 160;

const TYPE_FONTS = [
  { label: "สคริปต์",   value: "Dancing Script, cursive" },
  { label: "สไตล์",     value: "Pacifico, cursive" },
  { label: "คอร์ซีฟ",  value: "Great Vibes, cursive" },
] as const;

// ── Draw mode ─────────────────────────────────────────────────────────────────

function DrawPad({ onChange }: { onChange: (url: string | null) => void }) {
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
      <button type="button" onClick={clear}
        className="self-end text-xs text-slate-400 hover:text-slate-600 transition-colors">
        ล้าง
      </button>
    </div>
  );
}

// ── Type mode ─────────────────────────────────────────────────────────────────

function TypePad({ onChange }: { onChange: (url: string | null) => void }) {
  const [text, setText] = useState("");
  const [font, setFont] = useState<string>(TYPE_FONTS[0].value);

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
        placeholder="พิมพ์ชื่อเพื่อสร้างลายมือชื่อ"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={40}
      />
      <div className="flex gap-2 flex-wrap">
        {TYPE_FONTS.map((f) => (
          <button key={f.value} type="button" onClick={() => setFont(f.value)}
            className={`h-8 px-3 text-sm rounded-lg font-medium transition-colors ${
              font === f.value ? "bg-primary text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}>
            <span style={{ fontFamily: f.value }}>{text || "ตัวอย่าง"}</span>
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

// ── Image upload mode ─────────────────────────────────────────────────────────

function ImagePad({ onChange }: { onChange: (url: string | null) => void }) {
  const [preview, setPreview] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("ไฟล์ต้องไม่เกิน 2MB", { duration: Infinity });
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
    <div className="flex flex-col gap-3">
      <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-slate-200 rounded-xl p-6 cursor-pointer hover:border-primary/60 transition-colors bg-white">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <span className="text-sm text-slate-500">อัปโหลดรูปลายมือชื่อ</span>
        <span className="text-xs text-slate-400 mt-1">PNG, JPG ขนาดไม่เกิน 2MB</span>
        <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </label>
      {preview && (
        <div className="border-2 border-dashed border-slate-200 rounded-xl bg-white p-3 flex items-center justify-center" style={{ height: 100 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="ลายมือชื่อ" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}

// ── Tab icons ─────────────────────────────────────────────────────────────────

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

// ── Main component ────────────────────────────────────────────────────────────

export default function ApproveSignatureSection({
  savedSignatureUrl,
  savedSignatureType,
  onSignatureChange,
  onSaveChange,
}: ApproveSignatureSectionProps) {
  const [mode, setMode] = useState<SigMode>("DRAW");
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(savedSignatureUrl ?? null);
  const [resolvedType, setResolvedType] = useState<SignatureType | null>(savedSignatureType ?? null);
  const [isUsingSaved, setIsUsingSaved] = useState(false);

  // Always fetch fresh from the API so stale SSR props never hide the saved signature
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((json) => {
        const u = json?.data?.savedSignatureUrl ?? null;
        const t = json?.data?.signatureType ?? null;
        if (u && t) { setResolvedUrl(u); setResolvedType(t); }
      })
      .catch(() => {});
  }, []);

  const handleChange = useCallback(
    (url: string | null) => { onSignatureChange(url, mode); },
    [mode, onSignatureChange],
  );

  const tabs: { key: SigMode; label: string; icon: React.ReactNode }[] = [
    { key: "DRAW",  label: "วาด",      icon: <IconDraw /> },
    { key: "TYPE",  label: "พิมพ์",    icon: <IconType /> },
    { key: "IMAGE", label: "อัปโหลด", icon: <IconImage /> },
  ];

  return (
    <div className="flex flex-col gap-4">

      {/* Saved signature shortcut */}
      {resolvedUrl && resolvedType && (
        <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
          isUsingSaved 
            ? "border-emerald-200 bg-emerald-50/60 ring-2 ring-emerald-500/20" 
            : "border-emerald-100 bg-emerald-50"
        }`}>
          <div className="bg-white border border-emerald-200 rounded-lg p-1.5 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={resolvedUrl} alt="ลายมือชื่อที่บันทึก" className="h-8 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-800">
              {isUsingSaved ? "กำลังใช้งานลายเซ็นที่บันทึกไว้" : "ลายมือชื่อที่บันทึกไว้"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (isUsingSaved) {
                setIsUsingSaved(false);
                onSignatureChange(null, mode);
              } else {
                setIsUsingSaved(true);
                onSignatureChange(resolvedUrl, resolvedType);
              }
            }}
            className={`shrink-0 h-8 px-3 text-xs font-medium rounded-lg transition-colors ${
              isUsingSaved
                ? "bg-slate-500 text-white hover:bg-slate-600"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {isUsingSaved ? "เซ็นใหม่" : "ใช้"}
          </button>
        </div>
      )}

      {!isUsingSaved && (
        <>
          {/* Mode tab pill bar */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
            {tabs.map((tab) => (
              <button key={tab.key} type="button"
                onClick={() => { setMode(tab.key); onSignatureChange(null, tab.key); }}
                className={`flex-1 flex items-center justify-center gap-1.5 h-8 text-xs font-medium rounded-lg transition-all ${
                  mode === tab.key
                    ? "bg-white shadow-sm text-primary"
                    : "text-slate-500 hover:text-slate-700"
                }`}>
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Mode content */}
          <div>
            {mode === "DRAW"  && <DrawPad  onChange={handleChange} />}
            {mode === "TYPE"  && <TypePad  onChange={handleChange} />}
            {mode === "IMAGE" && <ImagePad onChange={handleChange} />}
          </div>

          {/* Save to profile */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-slate-300 text-primary"
              onChange={(e) => onSaveChange(e.target.checked)}
            />
            <span className="text-xs text-slate-500">บันทึกลายมือชื่อนี้ไว้ใช้ครั้งต่อไป</span>
          </label>
        </>
      )}

    </div>
  );
}
