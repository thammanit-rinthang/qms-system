"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import type {
  Announcement,
  PublicDocument,
  DarAttachment,
  UserRole,
} from "@/generated/prisma/client";
import AnnouncementViewModal from "@/components/announcements/AnnouncementViewModal";
import type { AnnouncementRow } from "@/services/announcementService";
import HeroBanner from "@/components/dashboard/HeroBanner";
import DashboardQuickActions from "@/components/dashboard/DashboardQuickActions";
import DashboardAnnouncementsFeed from "@/components/dashboard/DashboardAnnouncementsFeed";
import DashboardDocsFeed from "@/components/dashboard/DashboardDocsFeed";
import DashboardKpiMonthlySection, { type KpiMatrixRow } from "@/components/dashboard/DashboardKpiMonthlySection";
import DashboardKpiMonthlyWidget from "@/components/dashboard/DashboardKpiMonthlyWidget";
import {
  DashboardCarWidget,
  DashboardAttachmentsWidget,
} from "@/components/dashboard/DashboardCarWidget";
import {
  Laptop,
  ClipboardCheck,
  Truck,
  ShieldCheck,
  Users,
  BadgeCheck,
  FolderOpen,
  ChevronRight,
  Network,
  FileText,
  Megaphone,
} from "lucide-react";

type RecentAttachment = DarAttachment;

interface Props {
  canManage: boolean;
  role: UserRole;
  announcements: Announcement[];
  tickerAnnouncements: Announcement[];
  recentPublicDocs: PublicDocument[];
  departments: { id: string; name: string; documentCount: number }[];
  recentAttachments: RecentAttachment[];
  kpiMonthlyMatrix: { year: number; noKpiDepartments: string[]; matrix: KpiMatrixRow[]; currentMonth: string; notSubmittedThisMonth: { department: string; kpiId: string }[]; ngThisMonth: { department: string; kpiId: string }[]; okThisMonth: { department: string; kpiId: string }[] };
}

function getDeptIcon(name: string) {
  const n = name.toUpperCase();
  if (n.includes("IT")) return <Laptop className="w-6 h-6 text-white" />;
  if (n.includes("QA") || n.includes("QC") || n.includes("ตรวจสอบ"))
    return <ClipboardCheck className="w-6 h-6 text-white" />;
  if (
    n.includes("PROCUR") ||
    n.includes("PURCHAS") ||
    n.includes("BUY") ||
    n.includes("จัดซื้อ")
  )
    return <Truck className="w-6 h-6 text-white" />;
  if (
    n.includes("SAFE") ||
    n.includes("SECURE") ||
    n.includes("HEALTH") ||
    n.includes("ความปลอดภัย")
  )
    return <ShieldCheck className="w-6 h-6 text-white" />;
  if (
    n.includes("HR") ||
    n.includes("HUMAN") ||
    n.includes("PEOPLE") ||
    n.includes("บุคคล")
  )
    return <Users className="w-6 h-6 text-white" />;
  if (n.includes("QMS") || n.includes("ISO") || n.includes("QUAL"))
    return <BadgeCheck className="w-6 h-6 text-white" />;
  return <FolderOpen className="w-6 h-6 text-white" />;
}

export default function DashboardClientView({
  canManage,
  role,
  announcements,
  tickerAnnouncements,
  recentPublicDocs,
  departments,
  recentAttachments,
  kpiMonthlyMatrix,
}: Props) {
  const t = useT();
  const router = useRouter();
  const [deptFilter, setDeptFilter] = useState("");
  const [deptSelected, setDeptSelected] = useState("all");
  const [viewItem, setViewItem] = useState<AnnouncementRow | null>(null);
  const previewDepartments = useMemo(() => {
    const q = deptFilter.trim().toLowerCase();
    return departments.filter((dept) => {
      const matchesDropdown = deptSelected === "all" || dept.id === deptSelected;
      const matchesText = !q || dept.name.toLowerCase().includes(q);
      return matchesDropdown && matchesText;
    });
  }, [departments, deptFilter, deptSelected]);

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 pb-10">
      <HeroBanner announcements={tickerAnnouncements} />

      <DashboardQuickActions role={role} />

      <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
          <div className="flex items-center justify-between gap-3 mb-6 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[rgb(15,16,89)]/10 flex items-center justify-center">
              <Network className="w-4 h-4 text-[rgb(15,16,89)]" />
            </div>
            <h2 className="text-base font-semibold text-[rgb(15,16,89)]">
              {t("dashboard.departments.title")}
            </h2>
          </div>
          <Link
            href="/qms/document-controls"
            className="h-11 inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {t("dashboard.departments.viewAll")}
            </Link>
          </div>

          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={deptSelected}
              onChange={(e) => setDeptSelected(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[rgb(15,16,89)]/20"
            >
              <option value="all">{t("dashboard.departments.allDepartments")}</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              placeholder={t("dashboard.departments.searchPlaceholder")}
              className="w-full md:col-span-2 h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[rgb(15,16,89)]/20"
            />
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 pr-1 snap-x snap-mandatory scrollbar-thin">
          {previewDepartments.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 px-2">{t("dashboard.departments.emptySearch")}</p>
          ) : previewDepartments.map((dept) => (
            <Link
              key={dept.id}
              href={`/qms/document-controls/dept/${dept.id}`}
              className="group relative shrink-0 w-42 flex flex-col items-center justify-center p-4 bg-linear-to-br from-[#101257] to-[#080936] rounded-xl border border-white/5 shadow-md hover:shadow-xl hover:shadow-indigo-950/20 hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer min-h-33 snap-start"
            >
              <div className="absolute -top-5 -right-5 w-16 h-16 bg-white/5 rounded-full border border-white/5 pointer-events-none transition-transform duration-500 group-hover:scale-110" />
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-white/20">
                {getDeptIcon(dept.name)}
              </div>
              <span className="text-white font-semibold text-sm mt-3 tracking-wide group-hover:text-sky-300 transition-colors duration-200 text-center line-clamp-2">
                {dept.name}
              </span>
              <span className="text-slate-300/80 font-medium text-[11px] mt-1">
                {dept.documentCount} {t("dashboard.departments.documentsUnit")}
              </span>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300">
                <ChevronRight className="w-4 h-4 text-white" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[rgb(15,16,89)] flex items-center gap-2">
                <Megaphone className="w-4 h-4" />
                {t("dashboard.announcements.title")}
              </h2>
              <div className="flex items-center gap-3">
                <Link
                  href="/announcements"
                  className="text-xs text-slate-500 hover:text-[rgb(15,16,89)] hover:underline"
                >
                  {t("dashboard.announcements.viewAll")}
                </Link>
                {canManage && (
                  <Link
                    href="/qms/announcements"
                    className="text-xs text-[rgb(15,16,89)] font-semibold hover:underline"
                  >
                    {t("dashboard.announcements.manage")}
                  </Link>
                )}
              </div>
            </div>
            <DashboardAnnouncementsFeed
              announcements={announcements}
              canManage={canManage}
              onView={(a) => setViewItem(a as unknown as AnnouncementRow)}
            />
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-[rgb(15,16,89)] flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {t("dashboard.recentDocuments.title")}
              </h2>
            </div>
            <DashboardDocsFeed docs={recentPublicDocs} />
          </div>

          <DashboardKpiMonthlySection
            year={kpiMonthlyMatrix.year}
            noKpiDepartments={kpiMonthlyMatrix.noKpiDepartments}
            matrix={kpiMonthlyMatrix.matrix}
            currentMonth={kpiMonthlyMatrix.currentMonth}
            notSubmittedThisMonth={kpiMonthlyMatrix.notSubmittedThisMonth}
            ngThisMonth={kpiMonthlyMatrix.ngThisMonth}
          />
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <DashboardKpiMonthlyWidget
            currentMonth={kpiMonthlyMatrix.currentMonth}
            ok={kpiMonthlyMatrix.okThisMonth}
            ng={kpiMonthlyMatrix.ngThisMonth}
            notSubmitted={kpiMonthlyMatrix.notSubmittedThisMonth}
          />

          <DashboardCarWidget />
          <DashboardAttachmentsWidget recentAttachments={recentAttachments} />
        </div>
      </div>

      <AnnouncementViewModal
        item={viewItem}
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        {...(canManage ? { onEdit: () => { setViewItem(null); router.push("/qms/announcements"); } } : {})}
      />
    </div>
  );
}





