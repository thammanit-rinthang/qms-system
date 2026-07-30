"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, X, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/common/PageHeader";

type Row = {
  authDeptId: string;
  departmentName: string;
  code: string;       // "" = ยังไม่ได้กำหนด
  savedId: string | null;
};

function CodeCell({ row, onSaved }: { row: Row; onSaved: (code: string, savedId: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(row.code);
  const [saving, setSaving] = useState(false);

  function cancel() { setEditing(false); setDraft(row.code); }

  async function save() {
    const code = draft.trim().toUpperCase();
    if (!code) { cancel(); return; }
    if (code === row.code) { setEditing(false); return; }
    setSaving(true);
    try {
      const url = row.savedId
        ? `/api/qms/department-codes/${row.savedId}`
        : `/api/qms/department-codes`;
      const method = row.savedId ? "PUT" : "POST";
      const body = row.savedId
        ? { departmentName: row.departmentName, code }
        : { authDeptId: row.authDeptId, departmentName: row.departmentName, code };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json())?.error ?? "Error");
      const { data } = await res.json();
      onSaved(code, data.id);
      toast.success(`บันทึก ${row.departmentName} → ${code}`);
      setEditing(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value.toUpperCase())}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          maxLength={20}
          placeholder="เช่น PD"
          className="w-24 rounded-lg border border-primary/40 px-2 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <Button size="sm" variant="ghost" onClick={save} disabled={saving} className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-50">
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={cancel} className="h-7 w-7 p-0 text-slate-400 hover:bg-slate-100">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setDraft(row.code); setEditing(true); }}
      className="group flex items-center gap-2"
      title="คลิกเพื่อแก้ไข"
    >
      {row.code ? (
        <span className="rounded-md bg-primary/8 px-2 py-0.5 font-mono text-xs font-bold text-primary group-hover:bg-primary/15 transition-colors">
          {row.code}
        </span>
      ) : (
        <span className="rounded-md border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-400 group-hover:border-primary/40 group-hover:text-primary/60 transition-colors">
          + กำหนด
        </span>
      )}
    </button>
  );
}

export default function DepartmentCodeClient({ rows: initialRows }: { rows: Row[] }) {
  const [rows, setRows] = useState(initialRows);

  function handleSaved(authDeptId: string, code: string, savedId: string) {
    setRows(prev => prev.map(r => r.authDeptId === authDeptId ? { ...r, code, savedId } : r));
  }

  const configured = rows.filter(r => r.code).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="ตัวย่อแผนก"
        subtitle="กำหนดตัวย่อแผนกสำหรับสร้างเลขที่ DAR เช่น DAR-PD-0001"
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-800">แผนกทั้งหมด</p>
          <p className="text-xs text-slate-400">
            กำหนดแล้ว {configured}/{rows.length} แผนก
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-50">
              <Building2 className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-800 mb-0.5">ไม่พบข้อมูลแผนก</p>
            <p className="text-xs text-slate-400">ตรวจสอบการเชื่อมต่อ Auth Center</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map(row => (
              <div key={row.authDeptId} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/60 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{row.departmentName}</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">{row.authDeptId}</p>
                </div>
                <div className="ml-4 shrink-0">
                  <CodeCell
                    row={row}
                    onSaved={(code, savedId) => handleSaved(row.authDeptId, code, savedId)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 px-1">
        แผนกที่ไม่ได้กำหนดตัวย่อจะใช้ <span className="font-mono font-medium text-slate-500">GEN</span> เป็น default — คลิกที่ &quot;+ กำหนด&quot; เพื่อตั้งค่า
      </p>
    </div>
  );
}
