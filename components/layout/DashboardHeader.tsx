"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, ChevronRight, Menu } from "lucide-react";
import type { UserRole } from "@/generated/prisma/client";
import SignOutButton from "./SignOutButton";
import AnnouncementTicker from "./AnnouncementTicker";
import { NotificationBell } from "@/components/notifications/NotificationBell";

type Props = {
  role: UserRole;
  name: string;
  email: string;
  image?: string | null;
  locale: "th" | "en";
  onLocaleChange: (locale: "th" | "en") => void;
  onToggleSidebar?: () => void;
};

const ROUTE_LABELS: Record<string, { th: string; en: string }> = {
  "/announcements":          { th: "ประกาศทั้งหมด",   en: "All Announcements" },
  "/dar":                    { th: "คำขอเอกสาร",     en: "Document Requests" },
  "/dar/new":                { th: "สร้างคำขอใหม่",   en: "New Request" },
  "/qms/dar":                { th: "จัดการ DAR",      en: "Manage DAR" },
  "/qms/announcements":      { th: "จัดการประกาศ",    en: "Manage Announcements" },
  "/qms/announcements/new":  { th: "ประกาศใหม่",      en: "New Announcement" },
  "/qms/sharepoint":         { th: "SharePoint Files", en: "SharePoint Files" },
  "/qms/mr":                 { th: "กำหนด MR",         en: "Set MR" },
  "/approve":                { th: "งานรออนุมัติ",     en: "Approve Queue" },
  "/it/users":               { th: "จัดการผู้ใช้",    en: "Manage Users" },
  "/it/departments":         { th: "จัดการแผนก",      en: "Manage Departments" },
};

function getBreadcrumbs(pathname: string, locale: "th" | "en") {
  const t = (th: string, en: string) => locale === "th" ? th : en;
  const home = t("หน้าหลัก", "Home");
  const crumbs: string[] = [home];

  const match = ROUTE_LABELS[pathname];
  if (match) {
    crumbs.push(match[locale]);
  } else if (pathname.startsWith("/dar/")) {
    crumbs.push(t("คำขอเอกสาร", "Document Requests"));
    if (pathname.includes("/edit")) crumbs.push(t("แก้ไข", "Edit"));
    else crumbs.push(t("รายละเอียด", "Detail"));
  } else if (pathname.startsWith("/car/")) {
    crumbs.push(t("คำขอแก้ไข CAR", "Corrective Action Request"));
    crumbs.push(t("รายละเอียด", "Detail"));
  } else if (pathname === "/car") {
    crumbs.push(t("คำขอแก้ไข CAR", "Corrective Action Request"));
  } else if (pathname.startsWith("/audit/plans/")) {
    crumbs.push(t("แผนการตรวจสอบ", "Audit Plans"));
    crumbs.push(t("รายละเอียด", "Detail"));
  } else if (pathname === "/audit/plans") {
    crumbs.push(t("แผนการตรวจสอบ", "Audit Plans"));
  } else if (pathname.startsWith("/audit/appointments/")) {
    crumbs.push(t("การนัดหมายตรวจ", "Audit Appointments"));
    crumbs.push(t("รายละเอียด", "Detail"));
  } else if (pathname === "/audit/appointments") {
    crumbs.push(t("การนัดหมายตรวจ", "Audit Appointments"));
  } else if (pathname.startsWith("/audit/session-plans")) {
    crumbs.push(t("แผนการตรวจ", "Session Plans"));
  } else if (pathname === "/audit/my-tasks") {
    crumbs.push(t("งานของฉัน", "My Tasks"));
  } else if (pathname === "/audit") {
    crumbs.push(t("ตรวจสอบภายใน", "Internal Audit"));
  } else if (pathname.startsWith("/qms/kpi/")) {
    crumbs.push(t("KPI", "KPI"));
    crumbs.push(t("รายละเอียดแผนก", "Department Detail"));
  } else if (pathname === "/qms/kpi/monthly") {
    crumbs.push(t("KPI ประจำเดือน", "Monthly KPI"));
  } else if (pathname === "/qms/kpi") {
    crumbs.push(t("KPI", "KPI"));
  } else if (pathname.startsWith("/qms/document-controls/")) {
    crumbs.push(t("จัดการเอกสาร", "Document Controls"));
    crumbs.push(t("รายละเอียด", "Detail"));
  } else if (pathname === "/qms/document-controls") {
    crumbs.push(t("จัดการเอกสาร", "Document Controls"));
  } else if (pathname.startsWith("/it/departments/")) {
    crumbs.push(t("จัดการแผนก", "Manage Departments"));
    crumbs.push(t("รายละเอียด", "Detail"));
  } else if (pathname.startsWith("/approve/")) {
    crumbs.push(t("งานรออนุมัติ", "Approve Queue"));
    if (pathname.endsWith("/reviewer")) crumbs.push(t("ผู้ตรวจสอบ", "Reviewer"));
    else if (pathname.endsWith("/approver")) crumbs.push(t("ผู้อนุมัติ", "Approver"));
    else if (pathname.endsWith("/mr")) crumbs.push(t("ลงนาม MR", "MR Sign-off"));
    else if (pathname.endsWith("/mr-response")) crumbs.push(t("ตรวจสอบแผน MR", "MR Review"));
  } else if (pathname === "/notifications") {
    crumbs.push(t("การแจ้งเตือน", "Notifications"));
  } else if (pathname === "/profile") {
    crumbs.push(t("โปรไฟล์", "Profile"));
  } else if (pathname === "/it/audit-logs") {
    crumbs.push(t("บันทึกการใช้งาน", "Audit Logs"));
  }
  return crumbs;
}

const ROLE_LABELS: Record<UserRole, { th: string; en: string }> = {
  USER: { th: "ผู้ใช้งาน",         en: "User" },
  QMS:  { th: "เจ้าหน้าที่ QMS",   en: "QMS Officer" },
  MR:   { th: "ผู้แทนฝ่ายบริหาร",  en: "Management Rep." },
  IT:   { th: "เจ้าหน้าที่ IT",    en: "IT Officer" },
};

export default function DashboardHeader({ role, name, email, image, locale, onLocaleChange, onToggleSidebar }: Props) {
  const pathname = usePathname();
  const crumbs = getBreadcrumbs(pathname, locale);
  const pageTitle = crumbs[crumbs.length - 1];
  const roleLabel = ROLE_LABELS[role][locale];
  const signOutLabel = locale === "th" ? "ออกจากระบบ" : "Sign Out";

  return (
    <header className="flex flex-col bg-white/80 backdrop-blur-md border-b border-slate-100 shrink-0 z-30 sticky top-0">
      {/* Main row */}
      <div className="h-14 px-4 md:px-6 flex items-center justify-between gap-3">
        {/* Left: hamburger (mobile) + page title / breadcrumb */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Hamburger — mobile only */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors shrink-0 text-base-content"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          {/* Mobile: page title */}
          <p className="md:hidden text-[15px] font-semibold truncate min-w-0 flex-1 text-base-content">{pageTitle}</p>

          {/* Desktop: Breadcrumbs */}
          <div className="hidden md:flex items-center text-xs font-medium text-neutral">
            {crumbs.map((crumb, idx) => (
              <div key={idx} className="flex items-center">
                {idx > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 mx-1.5 opacity-50 text-neutral" />
                )}
                <span className={idx === crumbs.length - 1 ? "text-base-content font-bold tracking-wide" : "hover:text-base-content transition-colors cursor-default"}>
                  {crumb}
                </span>
              </div>
            ))}
          </div>
        </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* TH / EN switcher */}
        <div className="flex items-center rounded-lg overflow-hidden border border-slate-100 bg-white/50 p-0.5 gap-0.5">
          {(["th", "en"] as const).map((l) => (
            <button
              key={l}
              onClick={() => onLocaleChange(l)}
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md transition-colors duration-150 ${
                locale === l
                  ? "bg-primary text-primary-content font-bold tracking-wide"
                  : "text-neutral hover:text-base-content"
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Notification bell */}
        <NotificationBell />

        {/* Profile dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-100 transition-colors duration-150 outline-none">
              {image ? (
                <Image src={image} alt={name} width={28} height={28} className="w-7 h-7 rounded-full object-cover ring-2 ring-slate-100" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold ring-2 ring-slate-100 text-primary">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-[13px] font-medium hidden md:block max-w-28 truncate text-base-content">{name}</span>
              <ChevronDown className="h-3 w-3 hidden md:block text-neutral" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-[9999] w-60 bg-white rounded-xl border border-slate-100 shadow-lg overflow-hidden animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
            >
              {/* User info block */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                {image ? (
                  <Image src={image} alt={name} width={36} height={36} className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-slate-100" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary text-primary-content flex items-center justify-center text-[14px] font-bold shrink-0">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-base-content truncate">{name}</p>
                  <p className="text-[11px] text-neutral truncate">{email}</p>
                  <p className="text-[11px] text-neutral mt-0.5">{roleLabel}</p>
                </div>
              </div>

              {/* Sign out */}
              <div className="p-1">
                <SignOutButton label={signOutLabel} />
              </div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
      </div>{/* end main row */}

      {/* Full-width ticker strip */}
      <AnnouncementTicker locale={locale} />
    </header>
  );
}
