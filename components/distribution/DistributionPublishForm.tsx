"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STAMP_IMAGE_KEYS, type StampImageKey, type PctBox } from "@/types/distribution";
import { CheckCircle2, FileText, Search } from "lucide-react";

type RevisionCandidate = { id: string; revision: string; fileName: string | null; mimeType: string | null; darMasterId: string | null; documentControl: { docNumber: string; docName: string; departmentName: string | null; category: { name: string } | null } };
type SetupMeta = { requesterDepartmentName: string | null; docType: string; docControlDepartmentId: string | null; supportedTypes: string[] };
type CategoryOption = { id: string; name: string; departmentId: string; _count?: { documents: number } };
type DocumentOption = { id: string; docNumber: string; docName: string; revision: string | null; category?: { name: string } | null; revisions?: { id: string; revision: string; status: string; spItemId?: string | null }[] };
type DepartmentCode = { id: string; departmentName: string; code: string };
type MarkerKey = "stamp" | "date" | "copyTo";
type PageBoxes = Record<MarkerKey, PctBox>;
type DragState = { page: number; key: MarkerKey; mode: "move" | "resize"; offsetXPct: number; offsetYPct: number };

const DEFAULT_BOXES: PageBoxes = {
  stamp: { xPct: 0.65, yPct: 0.05, wPct: 0.2 },
  date: { xPct: 0.65, yPct: 0.24, fontSize: 10 },
  copyTo: { xPct: 0.65, yPct: 0.28, fontSize: 10 },
};

export default function DistributionPublishForm({ darId, darNo }: { darId: string; darNo: string | null }) {
  const router = useRouter();
  const [revisionId, setRevisionId] = useState("");
  const [stampImageKey, setStampImageKey] = useState<StampImageKey>(STAMP_IMAGE_KEYS[0]);
  const [pageBoxes, setPageBoxes] = useState<PageBoxes[]>([]);
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [linkToDocumentControl, setLinkToDocumentControl] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setupMode, setSetupMode] = useState<"link" | "create">("link");
  const [categoryName, setCategoryName] = useState("");
  const [newDocNumber, setNewDocNumber] = useState("");
  const [newDocName, setNewDocName] = useState("");
  const [newRevision, setNewRevision] = useState("0");
  const [categoryId, setCategoryId] = useState("");
  const [documentId, setDocumentId] = useState("");

  const { data: candidateResponse, refetch: refetchCandidates } = useQuery<{ data: RevisionCandidate[]; meta: SetupMeta }>({
    queryKey: ["distribution-candidates", darId],
    queryFn: () => fetch(`/api/dar/${darId}/distribution/candidates`).then((r) => r.json()),
  });
  const candidates = candidateResponse?.data ?? [];
  const setupMeta = candidateResponse?.meta;
  const { data: categories } = useQuery<CategoryOption[]>({
    queryKey: ["distribution-categories", setupMeta?.docControlDepartmentId],
    enabled: !!setupMeta?.docControlDepartmentId,
    queryFn: () => fetch(`/api/document-categories?departmentId=${encodeURIComponent(setupMeta!.docControlDepartmentId!)}`).then((r) => r.json()).then((j) => j.data ?? []),
  });
  const { data: documents } = useQuery<DocumentOption[]>({
    queryKey: ["distribution-documents", setupMeta?.docControlDepartmentId, categoryId],
    enabled: !!setupMeta?.docControlDepartmentId && !!categoryId,
    queryFn: () => fetch(`/api/document-controls?departmentId=${encodeURIComponent(setupMeta!.docControlDepartmentId!)}&categoryId=${encodeURIComponent(categoryId)}&status=ACTIVE&limit=100`).then((r) => r.json()).then((j) => j.data ?? []),
  });
  const selectedDocument = documents?.find((document) => document.id === documentId);
  const selectedRevisionId = selectedDocument?.revisions?.find((revision) => revision.status === "ACTIVE" && revision.spItemId)?.id ?? selectedDocument?.revisions?.[0]?.id ?? "";
  const { data: nextNumber } = useQuery<{ nextNumber: string }>({
    queryKey: ["distribution-next-number", categoryId, setupMeta?.docControlDepartmentId],
    enabled: setupMode === "create" && !!categoryId && !!setupMeta?.docControlDepartmentId,
    queryFn: () => fetch(`/api/document-controls/next-number?categoryId=${encodeURIComponent(categoryId)}&departmentId=${encodeURIComponent(setupMeta!.docControlDepartmentId!)}`).then((r) => r.json()).then((j) => j.data),
  });
  const { data: departments } = useQuery<DepartmentCode[]>({
    queryKey: ["department-codes"],
    queryFn: () => fetch(`/api/qms/department-codes`).then((r) => r.json()).then((j) => j.data ?? []),
  });

  useEffect(() => { if (!categoryName && setupMeta?.docType) setCategoryName(({ MANUAL: "M", PROCEDURE: "P", DRAWING: "Drawing" } as Record<string, string>)[setupMeta.docType] ?? setupMeta.docType); }, [categoryName, setupMeta?.docType]);
  useEffect(() => { if (nextNumber?.nextNumber) setNewDocNumber(nextNumber.nextNumber); }, [nextNumber?.nextNumber]);

  const setupMutation = useMutation({
    mutationFn: async () => {
      const body = setupMode === "link" ? { action: "link", revisionId: selectedRevisionId } : { action: "create", categoryName: categories?.find((category) => category.id === categoryId)?.name ?? categoryName, docNumber: newDocNumber, docName: newDocName, revision: newRevision };
      const res = await fetch(`/api/dar/${darId}/distribution/setup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "เตรียมเอกสารไม่สำเร็จ");
      return json.data as { revisionId: string };
    },
    onSuccess: async (data) => { setRevisionId(data.revisionId); await refetchCandidates(); },
    onError: (err) => setError(err instanceof Error ? err.message : "เตรียมเอกสารไม่สำเร็จ"),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const boxes = pageBoxes.length ? pageBoxes : [DEFAULT_BOXES];
      const res = await fetch(`/api/dar/${darId}/distribution`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisionId, stampImageKey, stampImageBox: boxes.map((p) => p.stamp), dateFieldBox: boxes.map((p) => p.date), copyToFieldBox: boxes.map((p) => p.copyTo), targetDepartmentIds: selectedDeptIds, linkToDocumentControl }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "เผยแพร่ไม่สำเร็จ");
      return json.data;
    },
    onSuccess: (data) => { router.push(`/qms/distribution/${data.id}`); router.refresh(); },
    onError: (err) => setError(err instanceof Error ? err.message : "เผยแพร่ไม่สำเร็จ"),
  });

  const toggleDept = (id: string) => setSelectedDeptIds((prev) => prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]);
  function handlePublish() {
    setError(null);
    if (!revisionId) return setError("กรุณาเลือกรุ่นเอกสาร");
    if (!selectedDeptIds.length) return setError("กรุณาเลือกแผนกที่ต้องแจกจ่ายอย่างน้อย 1 แผนก");
    publishMutation.mutate();
  }

  return <div className="flex flex-col gap-6">
    <div className="hidden card-premium flex flex-col gap-4 rounded-2xl border border-slate-100 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div><h2 className="text-base font-bold text-[#0F1059]">เตรียมเอกสารก่อนแจกจ่าย</h2><p className="mt-1 text-sm text-slate-500">Requester: {setupMeta?.requesterDepartmentName ?? "ไม่ระบุแผนก"} · ระบบจะแสดงเฉพาะเอกสารของแผนก Requester</p></div>
      <div className="flex gap-2"><Button type="button" variant={setupMode === "link" ? "default" : "outline"} onClick={() => setSetupMode("link")}>Link เอกสารเดิม</Button><Button type="button" variant={setupMode === "create" ? "default" : "outline"} onClick={() => setSetupMode("create")}>สร้างเอกสารใหม่</Button></div>
      {setupMode === "link" ? <div className="flex flex-col gap-2"><p className="text-xs text-slate-500">เลือกเอกสารที่ต้องการเชื่อมโยง แล้วกดยืนยัน Link</p><Button type="button" className="w-fit bg-[#0F1059] hover:bg-[#161875]" onClick={() => setupMutation.mutate()} disabled={!revisionId || setupMutation.isPending}>ยืนยัน Link เอกสาร</Button></div> : <div className="grid gap-3 md:grid-cols-2"><Select value={categoryName} onValueChange={setCategoryName}><SelectTrigger><SelectValue placeholder="เลือกประเภทเอกสาร" /></SelectTrigger><SelectContent>{(setupMeta?.supportedTypes ?? ["P", "SOP", "M", "Drawing", "SIP", "IPQC"]).map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select><input className="h-10 rounded-md border border-slate-200 px-3 text-sm" placeholder="หมายเลขเอกสาร" value={newDocNumber} onChange={(e) => setNewDocNumber(e.target.value)} /><input className="h-10 rounded-md border border-slate-200 px-3 text-sm" placeholder="ชื่อเอกสาร" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} /><input className="h-10 rounded-md border border-slate-200 px-3 text-sm" placeholder="Revision" value={newRevision} onChange={(e) => setNewRevision(e.target.value)} /><Button type="button" className="w-fit bg-[#0F1059] hover:bg-[#161875]" onClick={() => setupMutation.mutate()} disabled={setupMutation.isPending}>สร้างและใช้เอกสารนี้</Button></div>}
    </div>
    <div className="card-premium flex flex-col gap-5 rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-bold text-[#0F1059]">เลือกเอกสารสำหรับแจกจ่าย</h2><p className="mt-1 text-sm text-slate-500">เลือกหมวดหมู่และเอกสารก่อนกด Next เพื่อเปิด Preview PDF</p></div><label className="flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={linkToDocumentControl} onChange={(event) => { setLinkToDocumentControl(event.target.checked); setSetupMode(event.target.checked ? "link" : "create"); }} />เชื่อมโยงเอกสาร</label></div>
      {linkToDocumentControl ? <><div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">1. เลือกหมวดหมู่</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{(categories ?? []).map((category) => <button type="button" key={category.id} onClick={() => { setCategoryId(category.id); setDocumentId(""); }} className={`rounded-xl border p-3 text-left transition ${categoryId === category.id ? "border-[#0F1059] bg-[#0F1059]/[0.05] ring-2 ring-[#0F1059]/10" : "border-slate-100 hover:border-[#0F1059]/30"}`}><span className="block text-sm font-bold text-slate-800">{category.name}</span><span className="mt-1 block text-xs text-slate-400">{category._count?.documents ?? 0} เอกสาร</span></button>)}</div></div><div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">2. เลือกเอกสาร</p>{!categoryId ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">เลือกหมวดหมู่เพื่อแสดงเอกสาร</p> : <div className="grid gap-2 md:grid-cols-2">{(documents ?? []).map((document) => { const selected = documentId === document.id; return <button type="button" key={document.id} onClick={() => { setDocumentId(document.id); setRevisionId(document.revisions?.find((revision) => revision.status === "ACTIVE")?.id ?? ""); }} className={`rounded-xl border p-3 text-left ${selected ? "border-[#0F1059] bg-[#0F1059]/[0.05]" : "border-slate-100 hover:border-[#0F1059]/30"}`}><span className="block text-sm font-bold text-slate-800">{document.docNumber}</span><span className="mt-1 block text-sm text-slate-600">{document.docName}</span><span className="mt-1 block text-xs text-slate-400">Revision {document.revision ?? document.revisions?.[0]?.revision ?? "-"}</span></button>; })}{documents?.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">หมวดหมู่นี้ยังไม่มีเอกสาร</p>}</div>}</div></> : <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">เลือกหมวดหมู่และข้อมูลเอกสารใหม่</p><div className="grid gap-3 md:grid-cols-2"><Select value={categoryId} onValueChange={(value) => { setCategoryId(value); setCategoryName(categories?.find((category) => category.id === value)?.name ?? ""); }}><SelectTrigger><SelectValue placeholder="เลือกหมวดหมู่" /></SelectTrigger><SelectContent>{(categories ?? []).map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent></Select><input className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm" placeholder="หมายเลขเอกสาร (ระบบกำหนดให้)" value={newDocNumber} readOnly /><input className="h-10 rounded-md border border-slate-200 px-3 text-sm" placeholder="ชื่อเอกสาร" value={newDocName} onChange={(event) => setNewDocName(event.target.value)} /><input className="h-10 rounded-md border border-slate-200 px-3 text-sm" placeholder="Revision" value={newRevision} onChange={(event) => setNewRevision(event.target.value)} /></div></div>}
      <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">3. เลือกแผนกที่ต้องแจกจ่าย ({selectedDeptIds.length} แผนก)</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{(departments ?? []).map((department) => <label key={department.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${selectedDeptIds.includes(department.id) ? "border-[#0F1059]/30 bg-[#0F1059]/[0.04] text-[#0F1059]" : "border-slate-100 text-slate-600"}`}><input type="checkbox" checked={selectedDeptIds.includes(department.id)} onChange={() => toggleDept(department.id)} />{department.code} — {department.departmentName}</label>)}</div></div>
      <div className="flex justify-end"><Button type="button" className="bg-[#0F1059] hover:bg-[#161875]" onClick={() => setupMutation.mutate()} disabled={setupMutation.isPending || (linkToDocumentControl ? !selectedRevisionId : !categoryId || !newDocNumber || !newDocName || !newRevision) || !selectedDeptIds.length}>{setupMutation.isPending ? "กำลังเตรียม Preview..." : "Next: Preview PDF"}</Button></div>
    </div>
    {setupMode === "link" && <div className="hidden card-premium rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="mb-3 flex items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-sm font-bold text-[#0F1059]"><Search className="h-4 w-4" />เอกสารเดิมที่พบ</div><p className="mt-1 text-xs text-slate-500">ระบบค้นหาจากแผนก Requester และประเภทเอกสารของ DAR</p></div><span className="rounded-full bg-[#0F1059]/10 px-3 py-1 text-xs font-bold text-[#0F1059]">{candidates.length} รายการ</span></div>
      {candidates.length ? <div className="grid gap-2 md:grid-cols-2">{candidates.map((candidate) => { const selected = revisionId === candidate.id; return <button key={candidate.id} type="button" onClick={() => setRevisionId(candidate.id)} className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${selected ? "border-[#0F1059] bg-[#0F1059]/[0.05] ring-2 ring-[#0F1059]/10" : "border-slate-100 bg-white hover:border-[#0F1059]/30 hover:bg-slate-50"}`}><span className={`mt-0.5 rounded-lg p-2 ${selected ? "bg-[#0F1059] text-white" : "bg-slate-100 text-slate-500"}`}><FileText className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-800">{candidate.documentControl.docNumber}</span><span className="mt-0.5 block truncate text-xs text-slate-600">{candidate.documentControl.docName}</span><span className="mt-1 block text-[11px] text-slate-400">{candidate.documentControl.category?.name ?? "ไม่ระบุประเภท"} · Rev. {candidate.revision}</span></span>{selected && <CheckCircle2 className="h-5 w-5 shrink-0 text-[#0F1059]" />}</button>; })}</div> : <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center"><FileText className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-600">ยังไม่พบเอกสารเดิมที่ตรงเงื่อนไข</p><p className="mt-1 text-xs text-slate-400">ตรวจสอบแผนก Requester หรือเลือก “สร้างเอกสารใหม่” ด้านบน</p></div>}
    </div>}
    <div><h1 className="text-lg font-bold text-slate-800">แจกจ่ายเอกสาร {darNo ?? ""}</h1><p className="text-sm text-slate-500">แปลงไฟล์ต้นฉบับเป็น PDF แล้วลากตำแหน่งต่อหน้า</p></div>
    <div className="hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col gap-2">
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">รุ่นเอกสารต้นฉบับ</label>
      <Select value={revisionId} onValueChange={setRevisionId}><SelectTrigger><SelectValue placeholder="เลือกรุ่นเอกสาร" /></SelectTrigger><SelectContent>{(candidates ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.documentControl.docNumber} — {c.documentControl.docName} (Rev. {c.revision})</SelectItem>)}</SelectContent></Select>
      {candidates?.length === 0 && <p className="text-xs text-warning">ไม่พบรุ่นเอกสารที่เชื่อมกับ DAR นี้</p>}
    </div>
    {revisionId && <StampPositionEditor darId={darId} revisionId={revisionId} stampImageKey={stampImageKey} onStampImageKeyChange={setStampImageKey} pageBoxes={pageBoxes} onPageBoxesChange={setPageBoxes} />}
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col gap-2"><label className="text-xs font-semibold uppercase tracking-wide text-slate-500">แผนกที่ต้องแจกจ่าย</label><div className="grid grid-cols-2 md:grid-cols-4 gap-2">{(departments ?? []).map((d) => <label key={d.id} className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={selectedDeptIds.includes(d.id)} onChange={() => toggleDept(d.id)} />{d.code} — {d.departmentName}</label>)}</div></div>
    <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={linkToDocumentControl} onChange={(e) => setLinkToDocumentControl(e.target.checked)} />เชื่อมโยงไปยังหน้าเอกสารทั้งหมด</label>
    {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-md py-2 px-3 text-[13px]">{error}</div>}
    <div className="flex justify-end"><Button onClick={handlePublish} disabled={publishMutation.isPending}>{publishMutation.isPending ? "กำลังสร้าง PDF..." : "Publish ไปหน้าแจกจ่าย"}</Button></div>
  </div>;
}

export function StampPositionEditor({ darId, revisionId, stampImageKey, onStampImageKeyChange, pageBoxes, onPageBoxesChange }: { darId: string; revisionId: string; stampImageKey: StampImageKey; onStampImageKeyChange: (key: StampImageKey) => void; pageBoxes: PageBoxes[]; onPageBoxesChange: (boxes: PageBoxes[]) => void }) {
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const draggingRef = useRef<DragState | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPdfDocument(null); setRenderError(null); onPageBoxesChange([]);
    (async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const res = await fetch(`/api/dar/${darId}/distribution/candidates/${revisionId}/preview`);
        if (!res.ok) throw new Error("โหลดตัวอย่างเอกสารไม่สำเร็จ");
        const data = await res.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data }).promise;
        if (!cancelled) { setPdfDocument(pdf); onPageBoxesChange(Array.from({ length: pdf.numPages }, () => structuredClone(DEFAULT_BOXES))); }
      } catch (e) { if (!cancelled) setRenderError(e instanceof Error ? e.message : "แสดงตัวอย่างเอกสารไม่สำเร็จ"); }
    })();
    return () => { cancelled = true; };
  }, [darId, revisionId, onPageBoxesChange]);

  useEffect(() => {
    if (!pdfDocument) return;
    let cancelled = false;
    (async () => { for (let i = 1; i <= pdfDocument.numPages; i++) { const page = await pdfDocument.getPage(i); const viewport = page.getViewport({ scale: 1.05 }); const canvas = canvasRefs.current[i - 1]; const ctx = canvas?.getContext("2d"); if (!canvas || !ctx || cancelled) continue; canvas.width = viewport.width; canvas.height = viewport.height; await page.render({ canvas, canvasContext: ctx, viewport }).promise; } })();
    return () => { cancelled = true; };
  }, [pdfDocument]);

  function startDrag(event: ReactPointerEvent<Element>, pageIndex: number, key: MarkerKey, mode: "move" | "resize") {
    event.stopPropagation();
    const container = pageRefs.current[pageIndex];
    let offsetXPct = 0, offsetYPct = 0;
    if (container && mode === "move") {
      const rect = container.getBoundingClientRect();
      const box = pageBoxes[pageIndex][key];
      offsetXPct = (event.clientX - rect.left) / rect.width - box.xPct;
      offsetYPct = (event.clientY - rect.top) / rect.height - box.yPct;
    }
    draggingRef.current = { page: pageIndex, key, mode, offsetXPct, offsetYPct };
  }

  function moveMarker(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = draggingRef.current; const container = drag ? pageRefs.current[drag.page] : null;
    if (!drag || !container) return;
    const rect = container.getBoundingClientRect();
    const xPct = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width - drag.offsetXPct));
    const yPct = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height - drag.offsetYPct));
    onPageBoxesChange(pageBoxes.map((page, index) => {
      if (index !== drag.page) return page;
      if (drag.mode === "resize" && drag.key === "stamp") {
        const resizeXPct = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        return { ...page, stamp: { ...page.stamp, wPct: Math.min(0.52, Math.max(0.07, resizeXPct - page.stamp.xPct)) } };
      }
      return { ...page, [drag.key]: { ...page[drag.key], xPct, yPct } };
    }));
  }

  // eslint-disable-next-line @next/next/no-img-element -- dynamic /stamp/:key images sized by drag-percentage, not fit for next/image
  return <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col gap-4"><div><label className="text-xs font-semibold uppercase tracking-wide text-slate-500">ตราประทับ</label><div className="flex flex-wrap gap-3 mt-2">{STAMP_IMAGE_KEYS.map((key) => <button key={key} type="button" onClick={() => onStampImageKeyChange(key)} className={`rounded-lg border-2 p-1 ${stampImageKey === key ? "border-primary" : "border-transparent"}`}><img src={`/stamp/${key}`} alt={key} className="h-16 w-auto object-contain" /></button>)}</div></div><div><label className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 block">ลากรูป Stamp เพื่อย้ายตำแหน่ง และลากมุมขวาล่างเพื่อยืด/หด · Date/Department อยู่ในรูป Stamp แบบ fixed</label>{renderError && <p className="text-sm text-error">{renderError}</p>}<div className="flex flex-col gap-5">{pageBoxes.map((boxes, pageIndex) => <div key={pageIndex} ref={(el) => { pageRefs.current[pageIndex] = el; }} className="relative w-fit border border-slate-200 rounded-lg overflow-hidden select-none touch-none" onPointerMove={moveMarker} onPointerUp={() => { draggingRef.current = null; }} onPointerLeave={() => { draggingRef.current = null; }}><canvas ref={(el) => { canvasRefs.current[pageIndex] = el; }} className="block max-w-full" /><span className="absolute left-2 top-2 z-20 rounded bg-slate-900/70 px-2 py-1 text-[10px] font-bold text-white">หน้า {pageIndex + 1}</span><div onPointerDown={(event) => startDrag(event, pageIndex, "stamp", "move")} style={{ position: "absolute", left: `${boxes.stamp.xPct * 100}%`, top: `${boxes.stamp.yPct * 100}%`, width: `${(boxes.stamp.wPct ?? 0.2) * 100}%` }} className="group absolute z-10 cursor-move rounded-sm outline outline-2 outline-transparent transition hover:outline-[#0F1059]/60"><img src={`/stamp/${stampImageKey}`} alt="Stamp preview" draggable={false} className="block h-auto w-full select-none" /><span onPointerDown={(event) => startDrag(event, pageIndex, "stamp", "resize")} className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-se-resize rounded-sm border-2 border-white bg-[#0F1059] opacity-0 shadow transition group-hover:opacity-100" aria-label="ปรับขนาด Stamp" /></div></div>)}</div></div></div>;
}
