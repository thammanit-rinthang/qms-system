"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/generated/prisma/client";
import SignOutButton from "./SignOutButton";

type Props = {
  role: UserRole;
  name: string;
  email: string;
  image?: string | null;
  locale: "th" | "en";
  onLocaleChange: (l: "th" | "en") => void;
  onToggleSidebar?: () => void;
};

const ROLE_LABELS: Record<UserRole, { th: string; en: string }> = {
  USER: { th: "ผู้ใช้งาน",         en: "User" },
  QMS:  { th: "เจ้าหน้าที่ QMS",   en: "QMS Officer" },
  MR:   { th: "ผู้แทนฝ่ายบริหาร",  en: "Mgmt. Rep." },
  IT:   { th: "เจ้าหน้าที่ IT",    en: "IT Officer" },
};




type NavItem = { labelTh: string; labelEn: string; href: string };

function getNavItems(role: UserRole): NavItem[] {
  const userItems: NavItem[] = [
    { labelTh: "หน้าหลัก", labelEn: "Dashboard", href: "/" },
    { labelTh: "คำขอเอกสาร", labelEn: "My Requests", href: "/dar" },
    { labelTh: "เอกสารรอรับทราบ", labelEn: "Pending Documents", href: "/distribution" },
  ];
  const qmsItems: NavItem[] = [
    { labelTh: "จัดการข่าวสาร", labelEn: "Manage Announcements", href: "/qms/announcements" },
    { labelTh: "จัดการ DAR", labelEn: "Manage DAR", href: "/qms/dar" },
    { labelTh: "การแจกจ่ายเอกสาร", labelEn: "Document Distribution", href: "/qms/distribution" },
    { labelTh: "SharePoint Files", labelEn: "SharePoint Files", href: "/qms/sharepoint" },
  ];
  const itItems: NavItem[] = [
    { labelTh: "จัดการผู้ใช้", labelEn: "Manage Users", href: "/it/users" },
    { labelTh: "จัดการแผนก", labelEn: "Manage Departments", href: "/it/departments" },
  ];

  if (role === "IT") return [...userItems, ...qmsItems, ...itItems];
  if (role === "QMS" || role === "MR") return [...userItems, ...qmsItems];
  return userItems;
}



function ChevronDown() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

/* ── Component ───────────────────────────────────────────────── */

export default function DashboardNavbar({ role, name, email, image, locale, onLocaleChange, onToggleSidebar }: Props) {
  const pathname = usePathname();
  const roleLabel = ROLE_LABELS[role][locale];
  const signOutLabel = locale === "th" ? "ออกจากระบบ" : "Sign Out";
  const navItems = getNavItems(role);

  return (
    <header className="h-20 topbar-surface px-4 md:px-6 flex items-center shrink-0 z-30">
      {/* Mobile: Hamburger + Logo */}
      <div className="flex items-center gap-2 md:hidden flex-1 min-w-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors shrink-0 text-white"
            aria-label="Toggle menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <Image src="/logo/logo.webp" alt="NDC Industrial" width={120} height={32} className="h-8 w-auto brightness-0 invert object-contain" />
      </div>

      {/* Desktop: Left — Logo */}
      <div className="hidden md:flex items-center shrink-0 w-52">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <Image src="/logo/logo.webp" alt="NDC Industrial" width={150} height={40} className="h-10 w-auto brightness-0 invert object-contain" />
        </Link>
      </div>

      {/* Desktop: Center — Nav links */}
      <nav className="hidden md:flex flex-1 items-center justify-center">
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const label = locale === "en" ? item.labelEn : item.labelTh;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3.5 py-2 rounded-[10px] text-[13px] font-medium transition-colors duration-200 ${
                  isActive
                    ? "text-white font-semibold bg-white/15 border border-white/10 shadow-sm"
                    : "text-white/65 hover:text-white hover:bg-white/8 border border-transparent"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Right actions — desktop */}
      <div className="hidden md:flex items-center gap-1 shrink-0 w-100 justify-end">
        {/* TH / EN switcher */}
        <div className="flex items-center rounded-lg overflow-hidden border border-white/20 bg-white/10 p-0.5 gap-0.5">
          {(["th", "en"] as const).map((l) => (
            <button
              key={l}
              onClick={() => onLocaleChange(l)}
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md transition-colors duration-150 ${
                locale === l
                  ? "bg-white text-primary font-bold tracking-wide"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Profile dropdown */}
        <div className="dropdown dropdown-end">
          <button
            tabIndex={0}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-white/10 transition-colors duration-150 group"
          >
            {image ? (
              <Image src={image} alt={name} width={28} height={28} className="w-7 h-7 rounded-full object-cover ring-2 ring-white/30" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center text-[11px] font-bold ring-2 ring-white/30">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-[13px] font-medium text-white max-w-28 truncate">
              {name}
            </span>
            <span className="text-white/60 group-hover:text-white transition-colors">
              <ChevronDown />
            </span>
          </button>

          {/* Dropdown panel */}
          <div tabIndex={0} className="dropdown-content z-50 mt-1.5 w-64 bg-white rounded-xl border border-slate-100 shadow-lg overflow-hidden">
            {/* User block */}
            <div className="px-4 py-3.5 flex items-center gap-3 border-b border-slate-100">
              {image ? (
                <Image src={image} alt={name} width={40} height={40} className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-slate-100" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center text-[14px] font-bold shrink-0">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-base-content truncate">{name}</p>
                <p className="text-[11px] text-neutral truncate">{email}</p>
                <span className="inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
                  {roleLabel}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-1.5">
              <SignOutButton label={signOutLabel} />
            </div>
          </div>
        </div>
      </div>

      {/* Right actions — mobile */}
      <div className="flex md:hidden items-center gap-1 shrink-0 ml-auto">
        {/* TH / EN switcher */}
        <div className="flex items-center rounded-lg overflow-hidden border border-white/20 bg-white/10 p-0.5 gap-0.5">
          {(["th", "en"] as const).map((l) => (
            <button
              key={l}
              onClick={() => onLocaleChange(l)}
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md transition-colors duration-150 ${
                locale === l
                  ? "bg-white text-primary"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Profile dropdown */}
        <div className="dropdown dropdown-end">
          <button
            tabIndex={0}
            className="flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-lg hover:bg-white/10 transition-colors duration-150"
          >
            {image ? (
              <Image src={image} alt={name} width={28} height={28} className="w-7 h-7 rounded-full object-cover ring-2 ring-white/30" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center text-[11px] font-bold ring-2 ring-white/30">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </button>
          <div tabIndex={0} className="dropdown-content z-50 mt-1.5 w-56 bg-white rounded-xl border border-slate-100 shadow-lg overflow-hidden">
            <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-100">
              {image ? (
                <Image src={image} alt={name} width={36} height={36} className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-slate-100" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary text-primary-content flex items-center justify-center text-[13px] font-bold shrink-0">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-base-content truncate">{name}</p>
                <p className="text-[11px] text-neutral truncate">{email}</p>
              </div>
            </div>
            <div className="p-1.5">
              <SignOutButton label={signOutLabel} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

