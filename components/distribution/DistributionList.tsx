"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CheckCircle2, Clock3, Download, FileText, Search, Users } from "lucide-react";

type Target = { id: string; departmentCode: string; departmentName: string; downloadedAt: string | Date | null };
type DistributionRow = {
  id: string;
  darMasterId: string;
  darMaster: { darNo: string | null };
  revision: { revision: string; documentControl: { docNumber: string; docName: string } };
  targets: Target[];
  myTarget?: Target | null;
};

export default function DistributionList({ distributions }: { distributions: DistributionRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | "PENDING" | "DONE">("ALL");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => distributions.filter((item) => {
    const haystack = `${item.revision.documentControl.docNumber} ${item.revision.documentControl.docName} ${item.darMaster.darNo ?? ""}`.toLowerCase();
    const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase());
    const done = item.myTarget?.downloadedAt || (item.targets.length > 0 && item.targets.every((target) => target.downloadedAt));
    return matchesSearch && (status === "ALL" || (status === "DONE" ? done : !done));
  }), [distributions, search, status]);

  async function handleDownload(item: DistributionRow) {
    setError(null); setDownloadingId(item.id);
    try {
      const res = await fetch(`/api/dar/${item.darMasterId}/distribution/${item.id}/download`);
      if (!res.ok) { const json = await res.json().catch(() => null); throw new Error(json?.error || "ดาวน์โหลดไม่สำเร็จ"); }
      const blob = await res.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `${item.darMaster.darNo ?? "document"}.pdf`; anchor.click(); URL.revokeObjectURL(url); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "ดาวน์โหลดไม่สำเร็จ"); }
    finally { setDownloadingId(null); }
  }

  return <div className="space-y-4">
    <div className="card-premium p-3"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><label className="relative block flex-1 md:max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาเลขที่เอกสาร, ชื่อเอกสาร หรือ DAR" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-[#0F1059] focus:bg-white focus:ring-2 focus:ring-[#0F1059]/10" /></label><div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => setStatus("ALL")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${status === "ALL" ? "bg-white text-[#0F1059] shadow-sm" : "text-slate-500"}`}>ทั้งหมด</button><button type="button" onClick={() => setStatus("PENDING")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${status === "PENDING" ? "bg-white text-[#0F1059] shadow-sm" : "text-slate-500"}`}>รอดาวน์โหลด</button><button type="button" onClick={() => setStatus("DONE")} className={`rounded-lg px-3 py-2 text-xs font-semibold ${status === "DONE" ? "bg-white text-[#0F1059] shadow-sm" : "text-slate-500"}`}>เสร็จแล้ว</button></div></div></div>
    {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
    {!filtered.length ? <div className="card-premium flex flex-col items-center justify-center px-6 py-16 text-center"><FileText className="mb-3 h-8 w-8 text-slate-300" /><p className="font-semibold text-slate-700">ไม่พบเอกสารแจกจ่าย</p><p className="mt-1 text-sm text-slate-400">ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p></div> : <>
      <div className="space-y-3 lg:hidden">{filtered.map((item) => <DistributionCard key={item.id} item={item} downloadingId={downloadingId} onDownload={handleDownload} />)}</div>
      <div className="card-premium hidden overflow-hidden lg:block"><table className="w-full"><thead><tr className="border-b border-slate-100"><th className="w-36 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral">DAR</th><th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral">เอกสาร</th><th className="w-32 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-neutral">แผนก</th><th className="w-32 px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-neutral">สถานะ</th><th className="w-40 px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-neutral">การทำงาน</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-[#0F1059]/[0.02]" onClick={() => window.location.href = `/distribution/${item.id}`}><td className="px-4 py-3 font-mono text-sm text-slate-600">{item.darMaster.darNo ?? "—"}</td><td className="px-4 py-3"><p className="max-w-[360px] truncate text-sm font-semibold text-[#0F1059]">{item.revision.documentControl.docNumber} — {item.revision.documentControl.docName}</p><p className="mt-1 text-xs text-slate-400">Revision {item.revision.revision}</p></td><td className="px-4 py-3 text-center"><span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"><Users className="h-3 w-3" /> {item.targets.length}</span></td><td className="px-4 py-3 text-center"><StatusBadge item={item} /></td><td className="px-4 py-3 text-right"><div className="flex justify-end gap-1" onClick={(event) => event.stopPropagation()}><Link href={`/distribution/${item.id}`} className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">ดู <ArrowUpRight className="h-3.5 w-3.5" /></Link>{item.myTarget && !item.myTarget.downloadedAt && <button type="button" onClick={() => handleDownload(item)} disabled={downloadingId === item.id} className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#0F1059] px-2.5 text-xs font-semibold text-white hover:bg-[#161875] disabled:opacity-60"><Download className="h-3.5 w-3.5" />{downloadingId === item.id ? "..." : "ดาวน์โหลด"}</button>}</div></td></tr>)}</tbody></table></div>
    </>}
  </div>;
}

function DistributionCard({ item, downloadingId, onDownload }: { item: DistributionRow; downloadingId: string | null; onDownload: (item: DistributionRow) => void }) {
  return <div className="card-premium p-4"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F1059]/10 text-[#0F1059]"><FileText className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold text-[#0F1059]">{item.revision.documentControl.docNumber} — {item.revision.documentControl.docName}</h3><p className="mt-1 text-xs text-slate-400">DAR {item.darMaster.darNo ?? "—"} · Rev. {item.revision.revision}</p></div><StatusBadge item={item} /></div><div className="mt-3 flex flex-wrap items-center gap-1.5"><span className="text-[11px] text-slate-400">แจกจ่ายให้</span>{item.targets.map((target) => <span key={target.id} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">{target.departmentCode}</span>)}</div><div className="mt-4 flex justify-end gap-2"><Link href={`/distribution/${item.id}`} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">ดูรายละเอียด <ArrowUpRight className="h-3.5 w-3.5" /></Link>{item.myTarget && !item.myTarget.downloadedAt && <button type="button" onClick={() => onDownload(item)} disabled={downloadingId === item.id} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0F1059] px-3 text-xs font-semibold text-white hover:bg-[#161875] disabled:opacity-60"><Download className="h-3.5 w-3.5" />{downloadingId === item.id ? "กำลังดาวน์โหลด..." : "ดาวน์โหลด"}</button>}</div></div></div></div>;
}

function StatusBadge({ item }: { item: DistributionRow }) {
  const done = item.myTarget ? Boolean(item.myTarget.downloadedAt) : item.targets.length > 0 && item.targets.every((target) => target.downloadedAt);
  return done ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> เสร็จแล้ว</span> : <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"><Clock3 className="h-3.5 w-3.5" /> รอดาวน์โหลด</span>;
}
