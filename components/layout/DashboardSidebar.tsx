"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FolderOpen,
  House,
  Megaphone,
  Search,
  Settings,
  ShieldCheck,
  User,
  UserCog,
  Users,
  X,
} from "lucide-react";
import type { UserRole } from "@/generated/prisma/client";
import SignOutButton from "./SignOutButton";
import { t } from "@/lib/i18n";
import { useAppQuery } from "@/hooks/use-app-query";

type NavItem = {
  labelTh: string;
  labelEn: string;
  href: string;
  icon: React.ReactNode;
  exact?: boolean;
};

type Props = {
  role: UserRole;
  name: string;
  email: string;
  image?: string | null;
  isOpen: boolean;
  onClose: () => void;
  locale: "th" | "en";
};

function getSections(
  role: UserRole,
  locale: "th" | "en",
): { label: string; items: NavItem[] }[] {
  const userItems: NavItem[] = [
    {
      labelTh: "หน้าหลัก",
      labelEn: "Dashboard",
      href: "/",
      icon: <House className="h-[18px] w-[18px] shrink-0" />,
    },
    {
      labelTh: "DAR",
      labelEn: "DAR Requests",
      href: "/dar",
      icon: <FileText className="h-[18px] w-[18px] shrink-0" />,
    },
    {
      labelTh: "เอกสารทั้งหมด",
      labelEn: "Document Control",
      href: "/qms/document-controls",
      icon: <FolderOpen className="h-[18px] w-[18px] shrink-0" />,
    },
    {
      labelTh: "วัตถุประสงค์ KPI",
      labelEn: "KPI Objectives",
      href: "/qms/kpi",
      icon: <BarChart3 className="h-[18px] w-[18px] shrink-0" />,
      exact: true,
    },
    {
      labelTh: "รายงาน KPI รายเดือน",
      labelEn: "Monthly KPI",
      href: "/qms/kpi/monthly",
      icon: <CalendarDays className="h-[18px] w-[18px] shrink-0" />,
    },
    {
      labelTh: "ประกาศทั้งหมด",
      labelEn: "Announcements",
      href: "/announcements",
      icon: <Megaphone className="h-[18px] w-[18px] shrink-0" />,
    },
    {
      labelTh: "CAR ของแผนก",
      labelEn: "CAR (My Dept)",
      href: "/car",
      icon: <ClipboardCheck className="h-[18px] w-[18px] shrink-0" />,
    },
    {
      labelTh: "แผนการตรวจสอบ",
      labelEn: "Audit Plans",
      href: "/audit/plans",
      icon: <Search className="h-[18px] w-[18px] shrink-0" />,
    },
    {
      labelTh: "ประกาศแต่งตั้งผู้ตรวจ",
      labelEn: "Audit Appointments",
      href: "/audit/appointments",
      icon: <FileText className="h-[18px] w-[18px] shrink-0" />,
    },
    {
      labelTh: "งานรออนุมัติ",
      labelEn: "Approve Queue",
      href: "/approve",
      icon: <ShieldCheck className="h-[18px] w-[18px] shrink-0" />,
    },
    {
      labelTh: "โปรไฟล์ของฉัน",
      labelEn: "My Profile",
      href: "/profile",
      icon: <User className="h-[18px] w-[18px] shrink-0" />,
    },
  ];

  const qmsItems: NavItem[] = [
    {
      labelTh: "มาตรฐาน Audit",
      labelEn: "Audit Standards",
      href: "/qms/audit-standards",
      icon: <ClipboardCheck className="h-[18px] w-[18px] shrink-0" />,
    },
    {
      labelTh: "จัดการข่าวสาร",
      labelEn: "Manage Announcements",
      href: "/qms/announcements",
      icon: <Megaphone className="h-[18px] w-[18px] shrink-0" />,
    },
    {
      labelTh: "จัดการ DAR",
      labelEn: "Manage DAR",
      href: "/qms/dar",
      icon: <ShieldCheck className="h-[18px] w-[18px] shrink-0" />,
    },
    {
      labelTh: "CAR (คำร้องขอแก้ไข)",
      labelEn: "CAR Management",
      href: "/qms/car",
      icon: <ClipboardList className="h-[18px] w-[18px] shrink-0" />,
    },
    {
      labelTh: "SharePoint Files",
      labelEn: "SharePoint Files",
      href: "/qms/sharepoint",
      icon: <FolderOpen className="h-[18px] w-[18px] shrink-0" />,
    },
  ];

  const itItems: NavItem[] = [
    {
      labelTh: "จัดการผู้ใช้",
      labelEn: "Manage Users",
      href: "/it/users",
      icon: <Users className="h-[18px] w-[18px] shrink-0" />,
    },
    {
      labelTh: "จัดการแผนก",
      labelEn: "Manage Departments",
      href: "/it/departments",
      icon: <Building2 className="h-4.5 w-4.5 shrink-0" />,
    },
    {
      labelTh: "Audit Log",
      labelEn: "Audit Log",
      href: "/it/audit-logs",
      icon: <ClipboardList className="h-[18px] w-[18px] shrink-0" />,
    },
  ];

  const sections: { label: string; items: NavItem[] }[] = [
    { label: t("nav.myWork", locale), items: userItems },
  ];

  const setMrItem: NavItem = {
    labelTh: "กำหนด MR",
    labelEn: "Set MR",
    href: "/qms/mr",
    icon: <UserCog className="h-[18px] w-[18px] shrink-0" />,
  };
  const deptCodeItem: NavItem = {
    labelTh: "ตัวย่อแผนก",
    labelEn: "Department Codes",
    href: "/qms/department-codes",
    icon: <Building2 className="h-4.5 w-4.5 shrink-0" />,
  };
  const docNoConfigItem: NavItem = {
    labelTh: "รูปแบบเลขที่เอกสาร",
    labelEn: "Document No. Format",
    href: "/qms/doc-no-config",
    icon: <Settings className="h-4.5 w-4.5 shrink-0" />,
  };

  const qmsConfigItems = [deptCodeItem, docNoConfigItem];
  if (role === "QMS" || role === "MR") {
    sections.push({
      label: "QMS",
      items: [...qmsItems, setMrItem, ...qmsConfigItems],
    });
  } else if (role === "IT") {
    sections.push({
      label: "QMS",
      items: [...qmsItems, setMrItem, ...qmsConfigItems],
    });
    sections.push({
      label: t("nav.itAdmin", locale),
      items: itItems,
    });
  }

  return sections;
}

export default function DashboardSidebar({
  role,
  name,
  email,
  image,
  isOpen,
  onClose,
  locale,
}: Props) {
  const pathname = usePathname();
  const sections = getSections(role, locale);
  const signOutLabel = t("auth.signOut", locale);

  const { data: pendingSummary } = useAppQuery<{ totalPending: number }>({
    queryKey: ["approvals", "pending-summary"],
    realtimeClass: "A",
    queryFn: async () => {
      const res = await fetch("/api/approvals/pending-summary");
      if (!res.ok) return { totalPending: 0 };
      const json = await res.json();
      return json.data ?? { totalPending: 0 };
    },
  });
  const pendingCount = pendingSummary?.totalPending ?? 0;

  const { data: carPendingData } = useAppQuery<{ count: number }>({
    queryKey: ["car", "pending-count"],
    realtimeClass: "A",
    queryFn: async () => {
      const res = await fetch("/api/car/pending-count");
      if (!res.ok) return { count: 0 };
      const json = await res.json();
      return json.data ?? { count: 0 };
    },
  });
  const carPendingCount = carPendingData?.count ?? 0;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 md:z-auto flex flex-col shrink-0 h-screen w-60 overflow-hidden sidebar-surface transform transition-transform duration-300 ease-out md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div
          className="flex items-center justify-between h-16 px-5 shrink-0"
          style={{ borderBottom: "1px solid var(--sidebar-border)" }}
        >
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image
              src="/logo/logo.webp"
              alt="NDC Industrial"
              width={150}
              height={40}
              className="h-10 w-auto brightness-0 invert object-contain"
            />
          </Link>

          <button
            onClick={onClose}
            className="md:hidden shrink-0 w-8 h-8 rounded-md flex items-center justify-center transition-colors duration-150 hover:bg-white/10"
            style={{ color: "var(--sidebar-text-muted)" }}
            aria-label={t("nav.closeSidebar", locale)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-4">
          {sections.map((section) => (
            <div key={section.label} className="flex flex-col gap-1">
              <p
                className="px-4 mb-2 text-[10px] font-bold uppercase tracking-[0.15em] mt-3 flex items-center gap-2"
                style={{ color: "var(--sidebar-text-muted)" }}
              >
                {section.label}
              </p>

              {section.items.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + "/");
                const label = locale === "en" ? item.labelEn : item.labelTh;

                const showBadge = item.href === "/approve" && pendingCount > 0;
                const showCarBadge = item.href === "/car" && carPendingCount > 0;

                return (
                  <div key={item.href} className="relative group">
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3.5 px-4 py-3 text-[13px] font-medium ${
                        isActive ? "sidebar-item-active" : "sidebar-item"
                      }`}
                    >
                      <span
                        className="scale-110"
                        style={{
                          color: isActive
                            ? "var(--sidebar-icon-active)"
                            : "var(--sidebar-text-muted)",
                        }}
                      >
                        {item.icon}
                      </span>
                      <span
                        className="truncate"
                        style={{
                          color: isActive
                            ? "var(--sidebar-text-active)"
                            : "var(--sidebar-text)",
                        }}
                      >
                        {label}
                      </span>
                      <span className="ml-auto flex items-center gap-1 shrink-0">
                        {showBadge && (
                          <span className="flex items-center justify-center min-w-4.5 h-4.5 rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
                            {pendingCount > 99 ? "99+" : pendingCount}
                          </span>
                        )}
                        {showCarBadge && (
                          <span className="flex items-center justify-center min-w-4.5 h-4.5 rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
                            {carPendingCount > 99 ? "99+" : carPendingCount}
                          </span>
                        )}
                        {isActive && (
                          <span
                            className="w-1.5 h-6 rounded-full"
                            style={{ background: "var(--sidebar-icon-active)" }}
                          />
                        )}
                      </span>
                    </Link>
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        <div
          className="px-4 py-5 mt-auto shrink-0"
          style={{ borderTop: "1px solid var(--sidebar-border)" }}
        >
          <Link
            href="/profile"
            onClick={onClose}
            className="flex items-center gap-3.5 px-1 min-w-0 mb-4 rounded-lg py-1 hover:bg-white/5 transition-colors group"
          >
            {image ? (
              <Image
                src={image}
                alt={name}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-white/20"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0 ring-2 ring-white/10"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(36% 0.16 264), oklch(28% 0.13 264))",
                  color: "var(--sidebar-text-active)",
                }}
              >
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p
                className="text-[13px] font-semibold truncate leading-tight"
                style={{ color: "var(--sidebar-text-active)" }}
              >
                {name}
              </p>
              <p
                className="text-[11px] truncate leading-tight mt-1"
                style={{ color: "var(--sidebar-text-muted)" }}
              >
                {email}
              </p>
            </div>
          </Link>
          <SignOutButton label={signOutLabel} />
        </div>
      </aside>
    </>
  );
}
