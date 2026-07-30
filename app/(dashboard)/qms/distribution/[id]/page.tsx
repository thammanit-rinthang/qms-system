import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, ExternalLink, FileText, Users } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { hasQmsRole } from "@/lib/qms-roles";
import { DocumentDistributionService } from "@/services/documentDistributionService";
import { fmtDate } from "@/lib/format";
import AddTargetDepartmentForm from "@/components/distribution/AddTargetDepartmentForm";
import DistributionManageActions from "@/components/distribution/DistributionManageActions";
import DistributionDownloadButton from "@/components/distribution/DistributionDownloadButton";

const service = new DocumentDistributionService();
type Props = { params: Promise<{ id: string }> };
export const metadata = { title: "รายละเอียดการแจกจ่าย — Distribution Detail" };

export default async function DistributionDetailPage({ params }: Props) {
  const session = await requireAuth();
  const canManageDistribution = hasQmsRole(session.user.role, "QMS", "IT", "MR");
  const { id } = await params;
  let distribution;
  try { distribution = await service.getByIdForUser(id, session.user.authDepartmentId ?? null); } catch { notFound(); }
  if (!distribution) notFound();

  const downloadedCount = distribution.targets.filter((target) => target.downloadedAt).length;
  const pendingCount = distribution.targets.length - downloadedCount;
  const previewUrl = `/api/distribution/${distribution.id}/preview`;

  return (
    <div className="min-h-full bg-slate-50/60">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 lg:px-8">
        <Link href="/distribution" className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-blue-700"><ArrowLeft className="h-4 w-4" /> กลับไปรายการเอกสาร</Link>
        <section className="card-premium relative overflow-hidden rounded-2xl border border-slate-100 px-6 py-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:px-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#0F1059]/[0.04] blur-2xl" />
          <div className="relative flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
             <div className="flex min-w-0 items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0F1059]/10 text-[#0F1059]"><FileText className="h-5 w-5" /></div><div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700">Published</span><span className="text-xs text-slate-400">DAR {distribution.darMaster.darNo ?? "-"} · Rev. {distribution.revision.revision}</span></div><h1 className="text-xl font-semibold tracking-tight text-[#0F1059] md:text-2xl">{distribution.revision.documentControl.docNumber} — {distribution.revision.documentControl.docName}</h1><p className="mt-2 text-xs text-slate-500">เผยแพร่โดย {distribution.publishedByName ?? "-"} เมื่อ {fmtDate(distribution.publishedAt.toISOString())}</p></div></div>
             <div className="flex flex-col items-end gap-2">
               {distribution.myTarget && !distribution.myTarget.downloadedAt && <DistributionDownloadButton darMasterId={distribution.darMasterId} distributionId={distribution.id} fileNamePrefix={distribution.darMaster.darNo ?? distribution.darMasterId} />}
               {canManageDistribution && <><Link href={`/qms/distribution/publish/${distribution.darMasterId}`} className="shrink-0 rounded-lg bg-[#0F1059] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#161875]">Re-distribute ใหม่</Link><DistributionManageActions distributionId={distribution.id} stampImageKey={distribution.stampImageKey} targetDepartmentIds={distribution.targets.map((target) => target.departmentId)} downloadedDepartmentIds={distribution.targets.filter((target) => target.downloadedAt).map((target) => target.departmentId)} /></>}
             </div>
          </div>
        </section>

        <div className="my-5 grid gap-2 sm:grid-cols-3">{[{ label: "แผนกที่ได้รับแจกจ่าย", value: distribution.targets.length, icon: Users, tone: "bg-slate-100 text-slate-600" }, { label: "ดาวน์โหลดแล้ว", value: downloadedCount, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600" }, { label: "รอดาวน์โหลด", value: pendingCount, icon: Clock3, tone: "bg-amber-50 text-amber-600" }].map((stat) => <div key={stat.label} className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm"><div className="flex items-center justify-between"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.tone}`}><stat.icon className="h-4 w-4" /></span><span className="text-2xl font-semibold leading-none text-slate-700">{stat.value}</span></div><p className="mt-2 text-[11px] text-slate-400">{stat.label}</p></div>)}</div>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.75fr)]">
          <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Acknowledgement tracker</p><h2 className="mt-1 text-base font-semibold text-slate-900">สถานะการรับทราบ</h2></div><span className="text-xs text-slate-400">{downloadedCount}/{distribution.targets.length} complete</span></div><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead className="bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 text-left">แผนก</th><th className="px-5 py-3 text-left">สถานะ</th><th className="px-5 py-3 text-left">ผู้ดาวน์โหลด</th><th className="px-5 py-3 text-left">วันที่ดาวน์โหลด</th></tr></thead><tbody>{distribution.targets.map((target) => <tr key={target.id} className="border-t border-slate-100 transition-colors hover:bg-slate-50/70"><td className="px-5 py-3 font-medium text-slate-700">{target.departmentCode} <span className="font-normal text-slate-400">— {target.departmentName}</span></td><td className="px-5 py-3">{target.downloadedAt ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> ดาวน์โหลดแล้ว</span> : <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"><Clock3 className="h-3.5 w-3.5" /> รอดาวน์โหลด</span>}</td><td className="px-5 py-3 text-slate-600">{target.downloadedByName ?? "-"}</td><td className="px-5 py-3 text-slate-600">{target.downloadedAt ? fmtDate(target.downloadedAt.toISOString()) : "-"}</td></tr>)}</tbody></table></div></section>
          <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><FileText className="h-3.5 w-3.5" /></span><h2 className="text-sm font-semibold text-slate-900">Preview เอกสาร</h2></div><p className="mt-1 text-xs text-slate-400">ฉบับพร้อมตราประทับ</p></div><a href={previewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">เปิด PDF <ExternalLink className="h-3.5 w-3.5" /></a></div><iframe title="Distribution PDF preview" src={previewUrl} className="h-[620px] w-full bg-slate-100" /></section>
        </div>
        {canManageDistribution && <div className="mt-5"><AddTargetDepartmentForm darId={distribution.darMasterId} distributionId={distribution.id} existingDepartmentIds={distribution.targets.map((target) => target.departmentId)} /></div>}
      </div>
    </div>
  );
}
