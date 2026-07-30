import { requireAuth } from "@/lib/auth";
import { DocumentDistributionService } from "@/services/documentDistributionService";
import DistributionList from "@/components/distribution/DistributionList";
import PageHeader from "@/components/common/PageHeader";
import { CheckCircle2, Clock3, FileText } from "lucide-react";

const service = new DocumentDistributionService();
export const metadata = { title: "การแจกจ่ายเอกสาร — Document Distribution" };

export default async function DistributionListPage() {
  const session = await requireAuth();
  const distributions = await service.listAllForUser(session.user.authDepartmentId ?? null);
  const totalTargets = distributions.reduce((sum, item) => sum + item.targets.length, 0);
  const downloadedTargets = distributions.reduce((sum, item) => sum + item.targets.filter((target) => target.downloadedAt).length, 0);
  const pendingTargets = totalTargets - downloadedTargets;
  const stats = [{ label: "เอกสารที่เผยแพร่", value: distributions.length, icon: FileText, tone: "bg-slate-100 text-slate-600" }, { label: "รอดาวน์โหลด", value: pendingTargets, icon: Clock3, tone: "bg-amber-50 text-amber-600" }, { label: "ดาวน์โหลดแล้ว", value: `${downloadedTargets}/${totalTargets}`, icon: CheckCircle2, tone: "bg-emerald-50 text-emerald-600" }];

  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8"><PageHeader title="การแจกจ่ายเอกสาร" subtitle="ติดตามเอกสารที่เผยแพร่ แผนกผู้รับ และสถานะการดาวน์โหลด" /><div className="grid grid-cols-3 gap-2">{stats.map((stat) => <div key={stat.label} className="card-premium p-3 sm:p-4"><div className="flex items-center justify-between"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.tone}`}><stat.icon className="h-4 w-4" /></span><span className="text-lg font-semibold text-slate-800 sm:text-2xl">{stat.value}</span></div><p className="mt-2 text-[11px] text-neutral sm:text-xs">{stat.label}</p></div>)}</div><DistributionList distributions={distributions} /></div>;
}
