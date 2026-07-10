"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus, BookOpen, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAuditStandards,
  useCreateAuditStandard,
  useUpdateAuditStandard,
  useDeleteAuditStandard,
} from "@/hooks/api/use-audit-standards";

function EditableRow({ id, name }: { id: string; name: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const updateMutation = useUpdateAuditStandard();
  const deleteMutation = useDeleteAuditStandard();

  function save() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === name) { setEditing(false); setDraft(name); return; }
    updateMutation.mutate({ id, name: trimmed }, {
      onSuccess: () => { toast.success("แก้ไขสำเร็จ"); setEditing(false); },
      onError: (err) => toast.error(err.message),
    });
  }

  function cancel() { setEditing(false); setDraft(name); }

  if (editing) {
    return (
      <div className="flex items-center gap-2 px-6 py-3.5">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          className="flex-1 rounded-lg border border-primary/40 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <Button size="sm" variant="ghost" onClick={save} disabled={updateMutation.isPending} className="text-emerald-600 hover:bg-emerald-50">
          <Check className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={cancel} className="text-slate-400 hover:bg-slate-100">
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/60 transition-colors">
      <span className="text-sm font-medium text-slate-700">{name}</span>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)} className="text-slate-300 hover:bg-blue-50 hover:text-blue-500">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="sm" variant="ghost"
          onClick={() => deleteMutation.mutate(id, { onSuccess: () => toast.success("ลบแล้ว"), onError: (err) => toast.error(err.message) })}
          disabled={deleteMutation.isPending}
          className="text-slate-300 hover:bg-rose-50 hover:text-rose-400"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AuditStandardsManager() {
  const [name, setName] = useState("");
  const { data: standards = [], isLoading } = useAuditStandards();
  const createMutation = useCreateAuditStandard();

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    createMutation.mutate(trimmed, {
      onSuccess: () => { toast.success("เพิ่มมาตรฐานสำเร็จ"); setName(""); },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
        <p className="text-sm font-semibold text-slate-800 mb-3">เพิ่มมาตรฐานใหม่</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
            placeholder="เช่น ISO 9001:2015"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm transition-colors focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <Button onClick={handleAdd} disabled={createMutation.isPending || !name.trim()}>
            <Plus className="mr-1.5 h-4 w-4" />เพิ่ม
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-800">รายการมาตรฐาน</p>
        </div>
        {isLoading ? (
          <div className="px-6 py-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-40 rounded" />
                <Skeleton className="h-7 w-16 rounded-lg" />
              </div>
            ))}
          </div>
        ) : standards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-50">
              <BookOpen className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-800 mb-0.5">ยังไม่มีมาตรฐาน</p>
            <p className="text-xs text-slate-400">กดปุ่ม &quot;เพิ่ม&quot; เพื่อเพิ่มมาตรฐานใหม่</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {standards.map((s) => (
              <EditableRow key={s.id} id={s.id} name={s.name} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
