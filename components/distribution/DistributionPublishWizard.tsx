"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, ChevronRight, FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StampPositionEditor } from "@/components/distribution/DistributionPublishForm";
import { STAMP_IMAGE_KEYS, type PctBox, type StampImageKey } from "@/types/distribution";

type Meta = { requesterDepartmentName: string | null; docControlDepartmentId: string | null };
type Category = { id: string; name: string; _count?: { documents: number } };
type Revision = { id: string; revision: string; status: string; spItemId?: string | null };
type Document = { id: string; docNumber: string; docName: string; revision: string | null; revisions?: Revision[] };
type Department = { id: string; code: string; departmentName: string };
type PageBoxes = { stamp: PctBox; date: PctBox; copyTo: PctBox };

const DEFAULT_BOXES: PageBoxes = {
  stamp: { xPct: 0.68, yPct: 0.06, wPct: 0.2 },
  date: { xPct: 0.7, yPct: 0.13, fontSize: 7 },
  copyTo: { xPct: 0.7, yPct: 0.25, fontSize: 7 },
};

export default function DistributionPublishWizard({ darId, darNo }: { darId: string; darNo: string | null }) {
  const router = useRouter();
  const [linkToDocumentControl, setLinkToDocumentControl] = useState(false);
  const [documentMode, setDocumentMode] = useState<"existing" | "new">("existing");
  const [categoryId, setCategoryId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [docName, setDocName] = useState("");
  const [revision, setRevision] = useState("0");
  const [docNumber, setDocNumber] = useState("");
  const [revisionId, setRevisionId] = useState("");
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [stampImageKey, setStampImageKey] = useState<StampImageKey>(STAMP_IMAGE_KEYS[0]);
  const [pageBoxes, setPageBoxes] = useState<PageBoxes[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [editingCategoryName, setEditingCategoryName] = useState("");

  const { data: setup } = useQuery<{ meta: Meta }>({ queryKey: ["distribution-setup", darId], queryFn: () => fetch(`/api/dar/${darId}/distribution/candidates`).then((r) => r.json()) });
  const meta = setup?.meta;
  const { data: categories, refetch: refetchCategories } = useQuery<Category[]>({ queryKey: ["distribution-categories", meta?.docControlDepartmentId], enabled: linkToDocumentControl && !!meta?.docControlDepartmentId, queryFn: () => fetch(`/api/document-categories?departmentId=${meta!.docControlDepartmentId}`).then((r) => r.json()).then((j) => j.data ?? []) });
  const { data: documents } = useQuery<Document[]>({ queryKey: ["distribution-documents", meta?.docControlDepartmentId, categoryId], enabled: linkToDocumentControl && documentMode === "existing" && !!categoryId && !!meta?.docControlDepartmentId, queryFn: () => fetch(`/api/document-controls?departmentId=${meta!.docControlDepartmentId}&categoryId=${categoryId}&status=ACTIVE&limit=100`).then((r) => r.json()).then((j) => j.data ?? []) });
  const { data: departments } = useQuery<Department[]>({ queryKey: ["department-codes"], queryFn: () => fetch("/api/qms/department-codes").then((r) => r.json()).then((j) => j.data ?? []) });
  const { data: nextNumber } = useQuery<{ nextNumber: string }>({ queryKey: ["distribution-next-number", categoryId, meta?.docControlDepartmentId], enabled: linkToDocumentControl && documentMode === "new" && !!categoryId && !!meta?.docControlDepartmentId, queryFn: () => fetch(`/api/document-controls/next-number?categoryId=${categoryId}&departmentId=${meta!.docControlDepartmentId}`).then((r) => r.json()).then((j) => j.data) });

  useEffect(() => { if (nextNumber?.nextNumber) setDocNumber(nextNumber.nextNumber); }, [nextNumber?.nextNumber]);
  const selectedDocument = documents?.find((item) => item.id === documentId);
  const selectedRevisionId = selectedDocument?.revisions?.find((item) => item.status === "ACTIVE" && item.spItemId)?.id ?? selectedDocument?.revisions?.[0]?.id ?? "";
  const categoryName = categories?.find((item) => item.id === categoryId)?.name ?? "";

  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/document-categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ departmentId: meta?.docControlDepartmentId, name: newCategoryName.trim(), description: "สร้างจาก Distribution" }) });
      const json = await response.json();
      if (!response.ok || json.error) throw new Error(json.error ?? "สร้างหมวดหมู่ไม่สำเร็จ");
      return json.data as Category;
    },
    onSuccess: async (category) => { setNewCategoryName(""); await refetchCategories(); setCategoryId(category.id); setDocumentId(""); setError(null); },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "สร้างหมวดหมู่ไม่สำเร็จ"),
  });
  const updateCategoryMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/document-categories/${editingCategoryId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editingCategoryName.trim() }) });
      const json = await response.json();
      if (!response.ok || json.error) throw new Error(json.error ?? "แก้ไขหมวดหมู่ไม่สำเร็จ");
      return json.data;
    },
    onSuccess: async () => { setEditingCategoryId(""); setEditingCategoryName(""); await refetchCategories(); setError(null); },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "แก้ไขหมวดหมู่ไม่สำเร็จ"),
  });
  const deleteCategoryMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/document-categories/${categoryId}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok || json.error) throw new Error(json.error ?? "ลบหมวดหมู่ไม่สำเร็จ");
    },
    onSuccess: async () => { setCategoryId(""); setDocumentId(""); await refetchCategories(); setError(null); },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "ลบหมวดหมู่ไม่สำเร็จ"),
  });

  const setupMutation = useMutation({
    mutationFn: async () => {
      const body = !linkToDocumentControl
        ? { action: "standalone" }
        : documentMode === "existing"
          ? { action: "link", revisionId: selectedRevisionId }
          : { action: "create", categoryName, docNumber, docName, revision };
      const response = await fetch(`/api/dar/${darId}/distribution/setup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await response.json();
      const apiMessage = typeof json.error === "string" ? json.error : json.error?.message;
      if (!response.ok || json.error) throw new Error(apiMessage ?? "ไม่สามารถเตรียมเอกสารได้");
      return json.data as { revisionId: string };
    },
    onSuccess: (data) => { setRevisionId(data.revisionId); setError(null); },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "ไม่สามารถเตรียมเอกสารได้"),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const boxes = pageBoxes.length ? pageBoxes : [DEFAULT_BOXES];
      const response = await fetch(`/api/dar/${darId}/distribution`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revisionId, stampImageKey, stampImageBox: boxes.map((item) => item.stamp), dateFieldBox: boxes.map((item) => item.date), copyToFieldBox: boxes.map((item) => item.copyTo), targetDepartmentIds: departmentIds, linkToDocumentControl, createRevisionOnPublish: linkToDocumentControl && documentMode === "existing" }) });
      const json = await response.json();
      const apiMessage = typeof json.error === "string" ? json.error : json.error?.message;
      if (!response.ok || json.error) throw new Error(apiMessage ?? "Publish ไม่สำเร็จ");
      return json.data as { id: string };
    },
    onSuccess: (data) => { router.push(`/distribution/${data.id}`); router.refresh(); },
    onError: (reason) => setError(reason instanceof Error ? reason.message : "Publish ไม่สำเร็จ"),
  });

  const toggleDepartment = (id: string) => setDepartmentIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const handlePageBoxesChange = useCallback((next: PageBoxes[]) => {
    const normalized = next.map((item) => ({
      ...item,
      date: { ...item.date, xPct: Math.min(0.92, item.stamp.xPct + 0.02), yPct: Math.min(0.96, item.stamp.yPct + 0.08) },
      copyTo: { ...item.copyTo, xPct: Math.min(0.92, item.stamp.xPct + 0.02), yPct: Math.min(0.96, item.stamp.yPct + 0.15) },
    }));
    setPageBoxes((current) => JSON.stringify(current) === JSON.stringify(normalized) ? current : normalized);
  }, []);
  const canNext = departmentIds.length > 0 && (!linkToDocumentControl || (documentMode === "existing" ? !!selectedRevisionId : !!categoryId && !!docNumber && !!docName && !!revision));

  return <div className="flex flex-col gap-6">
    <div className="card-premium rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">DAR {darNo ?? "-"}</p><h1 className="mt-1 text-xl font-bold text-[#0F1059]">เตรียมเอกสารแจกจ่าย</h1><p className="mt-1 text-sm text-slate-500">Requester: {meta?.requesterDepartmentName ?? "-"}</p></div>
    {!revisionId ? <div className="card-premium flex flex-col gap-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <label className="flex w-fit cursor-pointer items-center gap-3 rounded-xl border border-[#0F1059]/15 bg-[#0F1059]/[0.04] px-4 py-3 text-sm font-bold text-[#0F1059]"><input type="checkbox" checked={linkToDocumentControl} onChange={(event) => { setLinkToDocumentControl(event.target.checked); setCategoryId(""); setDocumentId(""); }} />เชื่อมโยงไปยังเอกสารที่มีอยู่</label>
      {linkToDocumentControl && <><div className="flex gap-2"><Button type="button" variant={documentMode === "existing" ? "default" : "outline"} onClick={() => setDocumentMode("existing")}>Link เอกสารที่มีอยู่</Button><Button type="button" variant={documentMode === "new" ? "default" : "outline"} onClick={() => setDocumentMode("new")}>เอกสารใหม่</Button></div><div><div className="mb-2 flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">1. เลือกหมวดหมู่</p>{documentMode === "new" && <div className="flex gap-2"><input className="h-9 w-48 rounded-md border border-slate-200 px-3 text-xs" value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} placeholder="ชื่อหมวดหมู่ใหม่" /><Button type="button" variant="outline" className="h-9" disabled={!newCategoryName.trim() || createCategoryMutation.isPending} onClick={() => createCategoryMutation.mutate()}><Plus className="mr-1 h-3.5 w-3.5" />สร้างหมวดหมู่</Button></div>}</div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{(categories ?? []).map((category) => <button type="button" key={category.id} onClick={() => { setCategoryId(category.id); setDocumentId(""); }} className={`rounded-xl border p-3 text-left transition ${categoryId === category.id ? "border-[#0F1059] bg-[#0F1059]/[0.05] ring-2 ring-[#0F1059]/10" : "border-slate-100 hover:border-[#0F1059]/30"}`}><span className="flex items-center gap-2 text-sm font-bold text-slate-800"><FolderOpen className="h-4 w-4 text-[#0F1059]" />{category.name}</span><span className="mt-1 block text-xs text-slate-400">{category._count?.documents ?? 0} เอกสาร</span></button>)}</div></div>{documentMode === "existing" ? <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">2. เลือกเอกสาร</p><div className="grid gap-2 md:grid-cols-2">{(documents ?? []).map((document) => <button type="button" key={document.id} onClick={() => setDocumentId(document.id)} className={`rounded-xl border p-3 text-left transition ${documentId === document.id ? "border-[#0F1059] bg-[#0F1059]/[0.05]" : "border-slate-100 hover:border-[#0F1059]/30"}`}><span className="block text-sm font-bold text-slate-800">{document.docNumber}</span><span className="mt-1 block text-sm text-slate-600">{document.docName}</span><span className="mt-1 text-xs text-slate-400">Rev. {document.revision ?? document.revisions?.[0]?.revision ?? "-"}</span></button>)}{categoryId && documents?.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">หมวดหมู่นี้ยังไม่มีเอกสาร</p>}</div></div> : <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">2. ข้อมูลเอกสารใหม่</p><div className="grid gap-3 md:grid-cols-3"><input className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm" value={docNumber} readOnly placeholder="หมายเลขเอกสารอัตโนมัติ" /><input className="h-10 rounded-md border border-slate-200 px-3 text-sm" value={docName} onChange={(event) => setDocName(event.target.value)} placeholder="ชื่อเอกสาร" /><input className="h-10 rounded-md border border-slate-200 px-3 text-sm" value={revision} onChange={(event) => setRevision(event.target.value)} placeholder="Revision" /></div></div>}</>}
      {linkToDocumentControl && documentMode === "new" && categoryId && <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="min-w-[220px] flex-1"><label className="mb-1 block text-xs font-semibold text-slate-500">จัดการหมวดหมู่ที่เลือก</label><input className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm" value={editingCategoryId === categoryId ? editingCategoryName : (categories?.find((category) => category.id === categoryId)?.name ?? "")} onChange={(event) => { setEditingCategoryId(categoryId); setEditingCategoryName(event.target.value); }} /></div><Button type="button" variant="outline" className="h-9" disabled={editingCategoryId !== categoryId || !editingCategoryName.trim() || updateCategoryMutation.isPending} onClick={() => updateCategoryMutation.mutate()}>บันทึกแก้ไข</Button><Button type="button" variant="outline" className="h-9 text-rose-600 hover:bg-rose-50 hover:text-rose-700" disabled={deleteCategoryMutation.isPending} onClick={() => { if (window.confirm("ยืนยันการลบหมวดหมู่นี้ใช่หรือไม่")) deleteCategoryMutation.mutate(); }}>ลบหมวดหมู่</Button></div>}
      {!linkToDocumentControl && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">ไม่ได้เชื่อมโยง Document Control ระบบจะใช้ไฟล์ต้นฉบับของ DAR และเข้าสู่ Preview โดยตรง</p>}
      <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">เลือกแผนกแจกจ่าย ({departmentIds.length})</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{(departments ?? []).map((department) => <label key={department.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${departmentIds.includes(department.id) ? "border-[#0F1059]/30 bg-[#0F1059]/[0.04] text-[#0F1059]" : "border-slate-100 text-slate-600"}`}><input type="checkbox" checked={departmentIds.includes(department.id)} onChange={() => toggleDepartment(department.id)} />{department.code} — {department.departmentName}</label>)}</div></div>
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
      <div className="flex justify-end"><Button type="button" className="bg-[#0F1059] hover:bg-[#161875]" disabled={!canNext || setupMutation.isPending} onClick={() => setupMutation.mutate()}>{setupMutation.isPending ? "กำลังเตรียม PDF..." : <><span>Next: Preview PDF</span><ChevronRight className="ml-2 h-4 w-4" /></>}</Button></div>
    </div> : <><StampPositionEditor darId={darId} revisionId={revisionId} stampImageKey={stampImageKey} onStampImageKeyChange={setStampImageKey} pageBoxes={pageBoxes} onPageBoxesChange={handlePageBoxesChange} />{error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}<div className="flex items-center justify-between"><span className="text-sm text-slate-500"><Check className="mr-1 inline h-4 w-4 text-emerald-600" />พร้อม Publish</span><Button type="button" className="bg-[#0F1059] hover:bg-[#161875]" disabled={publishMutation.isPending} onClick={() => publishMutation.mutate()}>{publishMutation.isPending ? "กำลัง Publish..." : "Publish แจกจ่าย"}</Button></div></>}
  </div>;
}
