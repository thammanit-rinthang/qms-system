"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  FileText,
  FolderOpen,
  Megaphone,
  Plus,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import type { UserRole } from "@/generated/prisma/client";
import { useT } from "@/lib/i18n";

type ActionDef = {
  roles: UserRole[];
  href: string;
  labelKey: string;
  subKey: string;
  color: string;
  light: string;
  icon: React.ReactNode;
};

type Props = { role: UserRole };

const ALL_ACTIONS: ActionDef[] = [
  { roles: ["USER", "QMS", "MR", "IT"], href: "/dar?newRequest=1", labelKey: "dashboard.quickActions.newDar", subKey: "dashboard.quickActions.docRequest", color: "#0F1059", light: "rgba(15,16,89,0.08)", icon: <Plus className="w-5 h-5" /> },
  { roles: ["USER", "QMS", "MR", "IT"], href: "/dar", labelKey: "dashboard.quickActions.trackDar", subKey: "dashboard.quickActions.myRequests", color: "#1D6A8A", light: "rgba(29,106,138,0.08)", icon: <FileText className="w-5 h-5" /> },
  { roles: ["USER", "QMS", "MR", "IT"], href: "/car", labelKey: "dashboard.quickActions.myCar", subKey: "dashboard.quickActions.correctiveAction", color: "#B45309", light: "rgba(180,83,9,0.08)", icon: <AlertTriangle className="w-5 h-5" /> },
  { roles: ["QMS", "MR", "IT"], href: "/qms/dar", labelKey: "dashboard.quickActions.manageDar", subKey: "dashboard.quickActions.reviewApprove", color: "#7C3AED", light: "rgba(124,58,237,0.08)", icon: <ShieldCheck className="w-5 h-5" /> },
  { roles: ["QMS", "MR", "IT"], href: "/qms/sharepoint", labelKey: "dashboard.quickActions.documents", subKey: "dashboard.quickActions.sharepointFiles", color: "#059669", light: "rgba(5,150,105,0.08)", icon: <FolderOpen className="w-5 h-5" /> },
  { roles: ["QMS", "MR", "IT"], href: "/qms/announcements", labelKey: "dashboard.quickActions.announcements", subKey: "dashboard.quickActions.manageNews", color: "#D97706", light: "rgba(217,119,6,0.08)", icon: <Megaphone className="w-5 h-5" /> },
  { roles: ["QMS", "IT", "MR"], href: "/qms/mr", labelKey: "dashboard.quickActions.mr", subKey: "dashboard.quickActions.mgmtRep", color: "#DC2626", light: "rgba(220,38,38,0.08)", icon: <UserCog className="w-5 h-5" /> },
  { roles: ["IT"], href: "/it/users", labelKey: "dashboard.quickActions.users", subKey: "dashboard.quickActions.userAccounts", color: "#0369A1", light: "rgba(3,105,161,0.08)", icon: <Users className="w-5 h-5" /> },
  { roles: ["IT"], href: "/it/departments", labelKey: "dashboard.quickActions.departments", subKey: "dashboard.quickActions.organization", color: "#0F766E", light: "rgba(15,118,110,0.08)", icon: <Building2 className="w-5 h-5" /> },
];

export default function DashboardQuickActions({ role }: Props) {
  const t = useT();
  const actions = ALL_ACTIONS.filter((a) => (a.roles as string[]).includes(role));

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {actions.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="group relative flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3.5 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <div className="absolute left-0 top-0 bottom-0 w-0.75 rounded-r-sm" style={{ background: a.color }} />
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 group-hover:scale-110"
            style={{ background: a.light, color: a.color }}
          >
            {a.icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: a.color }}>{t(a.labelKey)}</p>
            <p className="text-xs text-slate-400 truncate">{t(a.subKey)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
