"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Save, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INPUT_CLASS } from "@/lib/styles";
import PageHeader from "@/components/common/PageHeader";

type ModuleItem = {
  module: string;
  label: string;
  format: string;
  requireSeq?: boolean;
};

const YEAR = new Date().getFullYear() + 543;

function preview(format: string): string {
  return format
    .replace(/\{PREFIX\}/g, "DAR")
    .replace(/\{DEPT\}/g, "PD")
    .replace(/\{YEAR:YYYY\}/g, String(YEAR))
    .replace(/\{YEAR:YY\}/g, String(YEAR).slice(-2))
    .replace(/\{SEQ:(\d+)\}/g, (_, n) => "1".padStart(Number(n), "0"));
}

function ModuleCard({ item, onSaved }: { item: ModuleItem; onSaved: (f: string) => void }) {
  const [format, setFormat] = useState(item.format);
  const [saving, setSaving] = useState(false);
  const dirty = format !== item.format;

  const err = (item.requireSeq !== false && !/\{SEQ:\d+\}/.test(format)) ? "ต้องมี {SEQ:N} เช่น {SEQ:4}" : null;

  async function save() {
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/qms/doc-no-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: item.module, format }),
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? "Error");
      onSaved(format);
      toast.success(`บันทึก ${item.label} สำเร็จ`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">{item.label}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-slate-400">ตัวอย่าง:</span>
            <span className="font-mono text-xs font-bold text-primary bg-primary/8 rounded px-1.5 py-0.5">
              {err ? <span className="text-red-400">—</span> : preview(format)}
            </span>
          </div>
        </div>
        <Button size="sm" onClick={save} disabled={saving || !dirty || !!err} className="shrink-0">
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </div>

      <div className="px-5 py-4 space-y-1.5">
        <label className="text-xs font-medium text-slate-500">Format string</label>
        <input
          value={format}
          onChange={e => setFormat(e.target.value)}
          placeholder="เช่น DAR-{DEPT}-{SEQ:4}"
          className={INPUT_CLASS + (err && format ? " border-red-300 focus:ring-red-200" : "")}
        />
        {err && format && (
          <p className="text-xs text-red-500">{err}</p>
        )}
      </div>
    </div>
  );
}

const TOKENS = [
  { token: "{PREFIX}",      color: "text-primary",      desc: "ค่า prefix คงที่ (เขียนตรงๆ ใน format ก็ได้)" },
  { token: "{DEPT}",        color: "text-amber-600",     desc: "ตัวย่อแผนก (มีเฉพาะ DAR)" },
  { token: "{YEAR:YY}",     color: "text-emerald-600",   desc: `ปี พ.ศ. 2 หลัก (${String(YEAR).slice(-2)})` },
  { token: "{YEAR:YYYY}",   color: "text-emerald-700",   desc: `ปี พ.ศ. 4 หลัก (${YEAR})` },
  { token: "{SEQ:N}",       color: "text-slate-700",     desc: "running number pad N หลัก เช่น {SEQ:4} → 0001" },
];

export default function DocNoConfigClient({ initial }: { initial: ModuleItem[] }) {
  const [configs, setConfigs] = useState(initial);

  return (
    <div className="space-y-5">
      <PageHeader
        title="รูปแบบเลขที่เอกสาร"
        subtitle="กำหนด format ของ running number แต่ละ module ด้วย token-based format string"
      />

      {/* Token reference */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Hash className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-slate-800">Token ที่ใช้ได้</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
          {TOKENS.map(t => (
            <div key={t.token} className="flex items-baseline gap-2 text-xs">
              <span className={`font-mono font-semibold shrink-0 ${t.color}`}>{t.token}</span>
              <span className="text-slate-500">{t.desc}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0.5 text-xs text-slate-500">
          <span>ตัวอย่าง: <span className="font-mono text-slate-700">DAR-{"{DEPT}"}-{"{SEQ:4}"}</span> → DAR-PD-0001</span>
          <span>ตัวอย่าง: <span className="font-mono text-slate-700">C{"{YEAR:YY}"}-{"{SEQ:3}"}</span> → C{String(YEAR).slice(-2)}-001</span>
          <span>ตัวอย่าง: <span className="font-mono text-slate-700">APPT-{"{YEAR:YY}"}-{"{SEQ:3}"}</span> → APPT-{String(YEAR).slice(-2)}-001</span>
          <span>ข้อความตรงๆ ระหว่าง token ถูก render ตามที่กรอก (เช่น - , / , ช่องว่าง)</span>
        </div>
      </div>

      {configs.map(item => (
        <ModuleCard
          key={item.module}
          item={item}
          onSaved={format =>
            setConfigs(prev => prev.map(c => c.module === item.module ? { ...c, format } : c))
          }
        />
      ))}
    </div>
  );
}
