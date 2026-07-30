"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Pencil, Save, Trash2, X } from "lucide-react";
import { STAMP_IMAGE_KEYS } from "@/types/distribution";

type Department = { id: string; code: string; departmentName: string };

export default function DistributionManageActions({
  distributionId,
  stampImageKey,
  targetDepartmentIds,
  downloadedDepartmentIds,
}: {
  distributionId: string;
  stampImageKey: string;
  targetDepartmentIds: string[];
  downloadedDepartmentIds: string[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [stamp, setStamp] = useState(stampImageKey);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selected, setSelected] = useState<string[]>(targetDepartmentIds);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) return;
    fetch("/api/qms/department-codes")
      .then((response) => response.json())
      .then((json) => setDepartments(json.data ?? []))
      .catch(() => setError("โหลดรายการแผนกไม่สำเร็จ"));
  }, [editing]);

  const downloaded = useMemo(() => new Set(downloadedDepartmentIds), [downloadedDepartmentIds]);

  function toggleDepartment(id: string) {
    if (downloaded.has(id)) return;
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function save() {
    setError(null);
    if (!selected.length) { setError("ต้องเลือกอย่างน้อย 1 แผนก"); return; }
    setBusy(true);
    try {
      const response = await fetch(`/api/distribution/${distributionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stampImageKey: stamp, targetDepartmentIds: selected }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok || json?.error) throw new Error(json?.error ?? "บันทึกการแก้ไขไม่สำเร็จ");
      setEditing(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "บันทึกการแก้ไขไม่สำเร็จ");
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!window.confirm("ยืนยันลบรายการแจกจ่ายนี้? รายการแผนกและสถานะการดาวน์โหลดจะถูกลบด้วย")) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/distribution/${distributionId}`, { method: "DELETE" });
      const json = await response.json().catch(() => null);
      if (!response.ok || json?.error) throw new Error(json?.error ?? "ลบรายการไม่สำเร็จ");
      router.push("/distribution");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ลบรายการไม่สำเร็จ");
      setBusy(false);
    }
  }

  return (
    <div className="shrink-0">
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => { setEditing((value) => !value); setError(null); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-[#0F1059]/30 hover:bg-[#0F1059]/5">
          {editing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />} {editing ? "ปิดการแก้ไข" : "แก้ไข"}
        </button>
        <button type="button" onClick={remove} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
          <Trash2 className="h-3.5 w-3.5" /> ลบ
        </button>
      </div>

      {editing && <div className="mt-4 w-full min-w-[min(92vw,420px)] rounded-xl border border-[#0F1059]/15 bg-[#0F1059]/[0.025] p-4 text-left shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-[#0F1059]">แก้ไขรายการแจกจ่าย</p>
        <label className="mt-3 block text-xs font-semibold text-slate-600">ตราประทับ</label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {STAMP_IMAGE_KEYS.map((key) => <button key={key} type="button" onClick={() => setStamp(key)} className={`rounded-lg border p-2 text-center text-[11px] font-semibold ${stamp === key ? "border-[#0F1059] bg-white text-[#0F1059] ring-2 ring-[#0F1059]/10" : "border-slate-200 bg-white text-slate-500"}`}><Image src={`/stamp/${key}`} alt={key} width={96} height={40} className="mx-auto h-10 w-24 object-contain" /><span className="mt-1 block">{key.replace(".webp", "")}</span></button>)}
        </div>
        <label className="mt-4 block text-xs font-semibold text-slate-600">แผนกที่แจกจ่าย</label>
        <div className="mt-2 grid max-h-44 gap-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 sm:grid-cols-2">
          {departments.map((department) => { const locked = downloaded.has(department.id); return <label key={department.id} className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${locked ? "bg-slate-50 text-slate-400" : "hover:bg-slate-50"}`}><input type="checkbox" checked={selected.includes(department.id)} disabled={locked} onChange={() => toggleDepartment(department.id)} /> <span>{department.code} — {department.departmentName}{locked ? " (ดาวน์โหลดแล้ว)" : ""}</span></label>; })}
        </div>
        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        <div className="mt-4 flex justify-end"><button type="button" onClick={save} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F1059] px-3 py-2 text-xs font-semibold text-white hover:bg-[#161875] disabled:opacity-50"><Save className="h-3.5 w-3.5" /> {busy ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}</button></div>
      </div>}
    </div>
  );
}
