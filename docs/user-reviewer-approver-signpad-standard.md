# User / Reviewer / Approver Dropdown & Digital Signature Pad Specification

เอกสารข้อกำหนดมาตรฐานและโค้ดตัวอย่างสำหรับการพัฒนาระบบ **เลือกผู้ทบทวน/ผู้อนุมัติ (User / Reviewer / Approver Dropdown)** และ **ลายเซ็นดิจิทัล (Digital Signature Pad)** สำหรับนำไปใช้งานกับระบบเอกสาร ระบบอนุมัติ หรือระบบงานอื่น ๆ ในองค์กร

---

## 📋 สารบัญ (Table of Contents)

1. [ภาพรวมและสถาปัตยกรรม Workflow อนุมัติ](#1-ภาพรวมและสถาปัตยกรรม-workflow-อนุมัติ)
2. [ระบบเลือกผู้ทบทวนและผู้อนุมัติ (User / Reviewer / Approver Selection Dropdown)](#2-ระบบเลือกผู้ทบทวนและผู้อนุมัติ-user--reviewer--approver-selection-dropdown)
   - [2.1 คุณสมบัติสำคัญ (Key Features)](#21-คุณสมบัติสำคัญ-key-features)
   - [2.2 โค้ดตัวอย่าง: React / Next.js Component (`UserApproverSelectModal.tsx`)](#22-โค้ดตัวอย่าง-react--nextjs-component-userapproverselectmodaltsex)
   - [2.3 โค้ดตัวอย่าง: Pure HTML + Vanilla JS Dropdown](#23-โค้ดตัวอย่าง-pure-html--vanilla-js-dropdown)
3. [ระบบลายเซ็นดิจิทัล (Digital Signature Pad)](#3-ระบบลายเซ็นดิจิทัล-digital-signature-pad)
   - [3.1 โหมดการเซ็นชื่อ 3 รูปแบบ (3 Signing Modes)](#31-โหมดการเซ็นชื่อ-3-รูปแบบ-3-signing-modes)
   - [3.2 โค้ดตัวอย่าง: React / Next.js Signature Pad (`SignaturePad.tsx`)](#32-โค้ดตัวอย่าง-react--nextjs-signature-pad-signaturepadtsx)
   - [3.3 โค้ดตัวอย่าง: Pure HTML5 Canvas Signature Pad (Vanilla JS)](#33-โค้ดตัวอย่าง-pure-html5-canvas-signature-pad-vanilla-js)
4. [โครงสร้างข้อมูลสำหรับบันทึกและประทับตราบนเอกสาร (Data Payload & PDF Stamp)](#4-โครงสร้างข้อมูลสำหรับบันทึกและประทับตราบนเอกสาร-data-payload--pdf-stamp)

---

## 1. ภาพรวมและสถาปัตยกรรม Workflow อนุมัติ

ในระบบบริหารจัดการเอกสารและกระบวนการทำงานแบบดิจิทัล (Digital Workflow Approval) การระบุตัวบุคคลและการยืนยันตัวตนด้วยลายเซ็นแบ่งเป็น 2 ส่วนหลัก:

1. **User / Reviewer / Approver Selection**: การค้นหาและระบุตัวบุคคลตามบทบาท (เช่น ผู้ร้องขอ/Requester, ผู้ทบทวน/Reviewer, ผู้อนุมัติ/Approver) พร้อมตัวกรองแผนกและตำแหน่ง
2. **Digital Signature Pad**: การประทับลายเซ็นดิจิทัล ยืนยันเจตนาอนุมัติด้วย 3 โหมด (วาดเส้นเซ็น, พิมพ์ชื่อด้วยฟอนต์ประดิษฐ์, หรืออัปโหลดไฟล์ลายเซ็น)

---

## 2. ระบบเลือกผู้ทบทวนและผู้อนุมัติ (User / Reviewer / Approver Selection Dropdown)

### 2.1 คุณสมบัติสำคัญ (Key Features)

- **Debounced Live Search:** ค้นหาชื่อ-นามสกุล, อีเมล, หรือรหัสพนักงาน พร้อมการหน่วงเวลาเพื่อประหยัด API Load (Debounce 300-350ms)
- **Department & Job Title Filtering:** กรองรายชื่อแยกตามแผนกและตำแหน่งงาน
- **User Avatar & Initials:** แสดงวงกลมตัวอักษรแรกของชื่อหากไม่มีรูปถ่าย
- **Selected User Preview Card:** การ์ดยืนยันผู้ที่ถูกเลือกก่อนกดส่งอนุมัติ
- **Role Tagging:** ระบุชัดเจนว่าเป็น `REVIEWER` (ผู้ทบทวน) หรือ `APPROVER` (ผู้อนุมัติ)

---

### 2.2 โค้ดตัวอย่าง: React / Next.js Component (`UserApproverSelectModal.tsx`)

```tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";

export interface UserCandidate {
  id: string;
  name: string;
  email?: string;
  employeeId?: string;
  department?: string;
  jobTitle?: string;
  avatarUrl?: string;
}

interface UserApproverSelectModalProps {
  open: boolean;
  roleType?: "REVIEWER" | "APPROVER" | "USER";
  candidates: UserCandidate[];
  isLoading?: boolean;
  onClose: () => void;
  onSelectUser: (user: UserCandidate) => void | Promise<void>;
}

export const UserApproverSelectModal: React.FC<UserApproverSelectModalProps> = ({
  open,
  roleType = "REVIEWER",
  candidates,
  isLoading = false,
  onClose,
  onSelectUser,
}) => {
  const [selected, setSelected] = useState<UserCandidate | null>(null);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("__all__");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelected(null);
      setSearch("");
      setDeptFilter("__all__");
    }
  }, [open]);

  // Extract unique departments
  const departments = useMemo(() => {
    const set = new Set(candidates.map((c) => c.department).filter(Boolean) as string[]);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"));
  }, [candidates]);

  // Filter logic
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    return candidates.filter((user) => {
      const matchSearch =
        !q ||
        user.name.toLowerCase().includes(q) ||
        (user.email ?? "").toLowerCase().includes(q) ||
        (user.employeeId ?? "").toLowerCase().includes(q);
      const matchDept = deptFilter === "__all__" || user.department === deptFilter;
      return matchSearch && matchDept;
    });
  }, [candidates, search, deptFilter]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              เลือก {roleType === "APPROVER" ? "ผู้อนุมัติ (Approver)" : "ผู้ทบทวน (Reviewer)"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              ค้นหาและเลือกบุคลากรเพื่อรับผิดชอบขั้นตอนการดำเนินงาน
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 rounded-lg"
          >
            &times;
          </button>
        </div>

        {/* Search & Filters */}
        <div className="mt-4 flex flex-col gap-3">
          <input
            type="text"
            placeholder="ค้นหาชื่อ, รหัสพนักงาน, หรืออีเมล..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-sm placeholder:text-slate-400 focus:border-[#0F1059] focus:bg-white focus:outline-none"
          />

          <div className="flex items-center gap-2">
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none"
            >
              <option value="__all__">ทุกแผนก (All Departments)</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* User List */}
          <div className="mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">กำลังโหลดรายชื่อ...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">ไม่พบรายชื่อที่ค้นหา</div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selected?.id === user.id;
                const initial = (user.name || "?").charAt(0).toUpperCase();

                return (
                  <div
                    key={user.id}
                    onClick={() => setSelected(user)}
                    className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-emerald-50/70 border-l-4 border-l-emerald-500"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0F1059]/10 text-[#0F1059] font-bold text-xs">
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800 truncate">
                          {user.name}
                        </span>
                        {user.employeeId && (
                          <span className="text-xs text-slate-400">#{user.employeeId}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        {[user.jobTitle, user.department].filter(Boolean).join(" · ") || user.email}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Selected Preview Box */}
          {selected && (
            <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  ผู้ที่ถูกเลือก
                </span>
                <p className="text-sm font-semibold text-slate-800">{selected.name}</p>
                <p className="text-xs text-slate-500">
                  {[selected.jobTitle, selected.department].filter(Boolean).join(" · ")}
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-white px-2.5 py-1 rounded-full border border-emerald-200">
                พร้อมมอบหมาย
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="h-9 px-4 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            ยกเลิก
          </button>
          <button
            disabled={!selected || isSubmitting}
            onClick={async () => {
              if (!selected) return;
              setIsSubmitting(true);
              try {
                await onSelectUser(selected);
                onClose();
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="h-9 px-5 text-xs font-semibold text-white bg-[#0F1059] hover:bg-[#161875] disabled:opacity-50 rounded-xl transition-colors"
          >
            {isSubmitting ? "กำลังบันทึก..." : "ยืนยันมอบหมาย"}
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

### 2.3 โค้ดตัวอย่าง: Pure HTML + Vanilla JS Dropdown

```html
<!-- Native Dropdown Custom UI -->
<div class="user-select-container">
  <label class="user-select-label">เลือกผู้อนุมัติ (Approver)</label>
  <div class="user-select-box" id="userSelectBox">
    <input type="text" id="userSearchInput" placeholder="พิมพ์ชื่อเพื่อค้นหา..." class="user-search-input" />
    <ul id="userDropdownList" class="user-dropdown-list">
      <li data-id="1" data-name="สมชาย ใจดี" data-[#0F1059]="ผจก. แผนกควบคุมคุณภาพ">
        <strong>สมชาย ใจดี</strong> <small>(ผจก. แผนกควบคุมคุณภาพ)</small>
      </li>
      <li data-id="2" data-name="วิภาดา มั่งคั่ง" data-[#0F1059]="ผู้อำนวยการฝ่ายประกันคุณภาพ">
        <strong>วิภาดา มั่งคั่ง</strong> <small>(ผอ. ฝ่ายประกันคุณภาพ)</small>
      </li>
    </ul>
  </div>
</div>
```

---

## 3. ระบบลายเซ็นดิจิทัล (Digital Signature Pad)

### 3.1 โหมดการเซ็นชื่อ 3 รูปแบบ (3 Signing Modes)

1. **DRAW Mode (วาดลายเซ็น):** เซ็นชื่อด้วยเมาส์ หรือนิ้ว/ปากกาบนหน้าจอสัมผัสผ่าน HTML5 Canvas
2. **TYPE Mode (พิมพ์ชื่อด้วยฟอนต์ประดิษฐ์):** พิมพ์ชื่อแล้วระบบจะเรนเดอร์เป็นภาพลายเซ็นสวยงามด้วยฟอนต์ Cursive (เช่น `Dancing Script`, `Pacifico`, `Great Vibes`)
3. **IMAGE Mode (อัปโหลดรูปภาพ):** อัปโหลดไฟล์ภาพลายเซ็นสแกน (PNG/JPG) พร้อมระบบตรวจสอบขนาดไฟล์

---

### 3.2 โค้ดตัวอย่าง: React / Next.js Signature Pad (`SignaturePad.tsx`)

ไฟล์นี้เป็น Component พร้อมใช้งานในระบบ Next.js / React

```tsx
"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";

export type SignatureMode = "DRAW" | "TYPE" | "IMAGE";

interface SignaturePadProps {
  savedSignatureUrl?: string | null;
  onConfirm: (dataUrl: string, mode: SignatureMode, saveToProfile: boolean) => void | Promise<void>;
  onCancel: () => void;
}

const CANVAS_WIDTH = 550;
const CANVAS_HEIGHT = 150;

export const SignaturePad: React.FC<SignaturePadProps> = ({
  savedSignatureUrl,
  onConfirm,
  onCancel,
}) => {
  const [mode, setMode] = useState<SignatureMode>("DRAW");
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [saveToProfile, setSaveToProfile] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── DRAW Mode logic ──
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const hasDrawn = useRef(false);

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawing.current = true;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
    e.preventDefault();
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0F1059"; // Corporate Navy Line
    const { x, y } = getCanvasPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasDrawn.current = true;
    e.preventDefault();
  };

  const stopDrawing = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (canvas && hasDrawn.current) {
      setPendingUrl(canvas.toDataURL("image/png"));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn.current = false;
    setPendingUrl(null);
  };

  // ── TYPE Mode logic ──
  const [typedName, setTypedName] = useState("");
  const [selectedFont, setSelectedFont] = useState("Dancing Script, cursive");

  const renderTypedToCanvas = useCallback((text: string, font: string): string | null => {
    if (!text.trim()) return null;
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#0F1059";
    ctx.font = `48px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    return canvas.toDataURL("image/png");
  }, []);

  useEffect(() => {
    if (mode === "TYPE") {
      setPendingUrl(renderTypedToCanvas(typedName, selectedFont));
    }
  }, [typedName, selectedFont, mode, renderTypedToCanvas]);

  // ── IMAGE Mode logic ──
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("ขนาดไฟล์ภาพต้องไม่เกิน 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setPendingUrl(url);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white p-6 shadow-xl">
      <h3 className="text-lg font-semibold text-slate-800">ประทับลายเซ็นดิจิทัล (Digital Signature)</h3>
      <p className="text-xs text-slate-500 mt-0.5 mb-4">
        เลือกระบุลายเซ็นโดยการวาด, พิมพ์ข้อความชื่อ หรืออัปโหลดไฟล์ภาพ
      </p>

      {/* Saved Signature Banner (If Available) */}
      {savedSignatureUrl && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center gap-3">
            <img src={savedSignatureUrl} alt="Saved Signature" className="h-8 object-contain bg-white p-1 rounded border border-emerald-100" />
            <span className="text-xs font-medium text-emerald-800">มีลายเซ็นเดิมในระบบ</span>
          </div>
          <button
            onClick={() => onConfirm(savedSignatureUrl, "DRAW", false)}
            className="h-8 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
          >
            ใช้ลายเซ็นเดิม
          </button>
        </div>
      )}

      {/* Mode Selector Tabs */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1 mb-4">
        {(["DRAW", "TYPE", "IMAGE"] as SignatureMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setPendingUrl(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === m ? "bg-white text-[#0F1059] shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {m === "DRAW" ? "✍️ วาดลายเซ็น" : m === "TYPE" ? "⌨️ พิมพ์ชื่อ" : "🖼️ อัปโหลดรูป"}
          </button>
        ))}
      </div>

      {/* Mode 1: DRAW */}
      {mode === "DRAW" && (
        <div className="flex flex-col gap-2">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-36 rounded-xl border-2 border-dashed border-slate-200 bg-white cursor-crosshair touch-none"
          />
          <button onClick={clearCanvas} className="self-end text-xs text-slate-400 hover:text-slate-600">
            ล้างกระดานวาด
          </button>
        </div>
      )}

      {/* Mode 2: TYPE */}
      {mode === "TYPE" && (
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="พิมพ์ชื่อ-นามสกุล..."
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm focus:border-[#0F1059] focus:outline-none"
          />
          <div className="flex gap-2">
            {["Dancing Script, cursive", "Pacifico, cursive", "Great Vibes, cursive"].map((f, idx) => (
              <button
                key={f}
                onClick={() => setSelectedFont(f)}
                className={`flex-1 py-1.5 border text-xs rounded-lg ${
                  selectedFont === f ? "border-[#0F1059] bg-[#0F1059]/5 font-bold text-[#0F1059]" : "border-slate-200"
                }`}
              >
                แบบที่ {idx + 1}
              </button>
            ))}
          </div>
          {typedName && (
            <div className="h-24 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
              <span style={{ fontFamily: selectedFont, fontSize: 32 }} className="text-[#0F1059]">
                {typedName}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Mode 3: IMAGE */}
      {mode === "IMAGE" && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-[#0F1059] transition-colors">
            <span className="text-xs text-slate-500">คลิกเพื่ออัปโหลดไฟล์ภาพลายเซ็น (PNG/JPG)</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
          </label>
          {pendingUrl && mode === "IMAGE" && (
            <div className="h-20 rounded-xl border border-slate-200 p-2 flex items-center justify-center">
              <img src={pendingUrl} alt="Preview" className="max-h-full object-contain" />
            </div>
          )}
        </div>
      )}

      {/* Save to profile checkbox */}
      <label className="mt-4 flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={saveToProfile}
          onChange={(e) => setSaveToProfile(e.target.checked)}
          className="rounded border-slate-300 text-[#0F1059]"
        />
        <span className="text-xs text-slate-600">บันทึกลายเซ็นนี้ไว้ในโปรไฟล์เพื่อใช้ในครั้งถัดไป</span>
      </label>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button onClick={onCancel} className="h-9 px-4 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl">
          ยกเลิก
        </button>
        <button
          disabled={!pendingUrl || isSubmitting}
          onClick={async () => {
            if (!pendingUrl) return;
            setIsSubmitting(true);
            try {
              await onConfirm(pendingUrl, mode, saveToProfile);
            } finally {
              setIsSubmitting(false);
            }
          }}
          className="h-9 px-5 text-xs font-semibold text-white bg-[#0F1059] hover:bg-[#161875] disabled:opacity-50 rounded-xl"
        >
          {isSubmitting ? "กำลังประทับตรา..." : "ยืนยันประทับลายเซ็น"}
        </button>
      </div>
    </div>
  );
};
```

---

### 3.3 โค้ดตัวอย่าง: Pure HTML5 Canvas Signature Pad (Vanilla JS)

```html
<div class="sig-pad-box">
  <canvas id="vanillaCanvas" width="500" height="150" style="border: 2px dashed #cbd5e1; border-radius: 12px;"></canvas>
  <br>
  <button id="btnClear">Clear</button>
  <button id="btnSave">Save Signature</button>
</div>

<script>
  const canvas = document.getElementById('vanillaCanvas');
  const ctx = canvas.getContext('2d');
  let isDrawing = false;

  canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
  });
  canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0F1059';
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
  });
  canvas.addEventListener('mouseup', () => isDrawing = false);

  document.getElementById('btnClear').onclick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
  document.getElementById('btnSave').onclick = () => {
    const dataUrl = canvas.toDataURL('image/png');
    console.log('Signature Base64 Data:', dataUrl);
  };
</script>
```

---

## 4. โครงสร้างข้อมูลสำหรับบันทึกและประทับตราบนเอกสาร (Data Payload & PDF Stamp)

### 4.1 JSON Approval Step Payload
เมื่อผู้ใช้เลือกบุคคลและประทับลายเซ็น ข้อมูลจะถูกส่งไปยัง API เพื่อบันทึกลงในฐานข้อมูลด้วยโครงสร้างนี้:

```json
{
  "documentId": "DAR-2026-0042",
  "step": "REVIEWER_APPROVAL",
  "actor": {
    "userId": "usr_98213",
    "name": "นายสมชาย ใจดี",
    "employeeId": "EMP-0142",
    "role": "QUALITY_REVIEWER",
    "department": "Quality Assurance"
  },
  "signature": {
    "type": "DRAW",
    "dataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "signedAt": "2026-07-21T17:17:00.000Z",
    "ipAddress": "192.168.1.45"
  },
  "comment": "อนุมัติตามแบบร่างแก้ไขปรับปรุง"
}
```

---

### 4.2 การแสดงผลตารางลายเซ็นบนเอกสารการพิมพ์ (PDF / Print Stamp Template)

ในการเรนเดอร์เอกสารสำหรับพิมพ์หรือออก PDF (เช่น เอกสาร DAR, CAR, KPI) ให้จัดวางบล็อกลายเซ็นดังนี้:

```html
<div class="print-signature-grid" style="display: flex; gap: 16px; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px;">
  <!-- Signer Box -->
  <div style="flex: 1; text-align: center; border-right: 1px solid #f1f5f9; padding-right: 12px;">
    <p style="font-size: 11px; color: #64748b; margin-bottom: 4px;">ผู้จัดทำ (Prepared By)</p>
    <img src="data:image/png;base64,..." alt="Signature" style="height: 40px; margin: 0 auto; object-contain: contain;" />
    <p style="font-size: 12px; font-weight: 600; color: #1e293b; margin-top: 4px;">(นายสมชาย ใจดี)</p>
    <p style="font-size: 10px; color: #94a3b8;">วันที่: 21/07/2026</p>
  </div>
</div>
```
