"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, FileText, FolderOpen, LayoutGrid, ShieldCheck, Users } from "lucide-react";
import type { UserRole } from "@/generated/prisma/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type NavItem = { labelTh: string; labelEn: string; href: string; icon: React.ReactNode };
type Props = { role: UserRole; locale: "th" | "en" };

function getAllNavItems(role: UserRole): NavItem[] {
  const userItems: NavItem[] = [
    { labelTh: "คำขอเอกสาร", labelEn: "Requests", href: "/dar", icon: <FileText className="h-5 w-5" /> },
  ];
  const qmsItems: NavItem[] = [
    { labelTh: "จัดการ DAR", labelEn: "DAR", href: "/qms/dar", icon: <ShieldCheck className="h-5 w-5" /> },
    { labelTh: "SharePoint", labelEn: "SharePoint", href: "/qms/sharepoint", icon: <FolderOpen className="h-5 w-5" /> },
  ];
  const itItems: NavItem[] = [
    { labelTh: "ผู้ใช้", labelEn: "Users", href: "/it/users", icon: <Users className="h-5 w-5" /> },
    { labelTh: "แผนก", labelEn: "Dept.", href: "/it/departments", icon: <Building2 className="h-5 w-5" /> },
  ];

  if (role === "IT") return [...userItems, ...qmsItems, ...itItems];
  if (role === "QMS" || role === "MR") return [...userItems, ...qmsItems];
  return userItems;
}

const MAX_VISIBLE = 4;

export default function MobileNav({ role, locale }: Props) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const allItems = getAllNavItems(role);
  const activeMap = Object.fromEntries(
    allItems.map((item) => [item.href, pathname === item.href || pathname.startsWith(item.href + "/")]),
  ) as Record<string, boolean>;

  const visibleItems = allItems.slice(0, MAX_VISIBLE);
  const overflowItems = allItems.slice(MAX_VISIBLE);
  const hasOverflow = overflowItems.length > 0;
  const overflowActive = overflowItems.some((i) => activeMap[i.href]);

  const moreLabel = locale === "th" ? "เพิ่มเติม" : "More";
  const menuLabel = locale === "th" ? "เมนูเพิ่มเติม" : "More options";

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 flex items-stretch h-16 safe-area-inset-bottom">
        {visibleItems.map((item) => {
          const isActive = activeMap[item.href] ?? false;
          const label = locale === "en" ? item.labelEn : item.labelTh;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors duration-150 px-1 ${
                isActive ? "text-[#0F1059]" : "text-slate-500"
              }`}
            >
              <div className="relative">
                {item.icon}
                {isActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#0F1059]" />
                )}
              </div>
              <span className="truncate max-w-full leading-none">{label}</span>
            </Link>
          );
        })}

        {hasOverflow && (
          <button
            onClick={() => setDrawerOpen(true)}
            className={`flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors duration-150 px-1 ${
              overflowActive ? "text-[#0F1059]" : "text-slate-500"
            }`}
            aria-label={menuLabel}
          >
            <div className="relative">
              <LayoutGrid className="h-5 w-5" />
              {overflowActive && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#0F1059]" />
              )}
            </div>
            <span className="leading-none">{moreLabel}</span>
          </button>
        )}
      </nav>

      {hasOverflow && (
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="bottom" className="md:hidden px-4 pt-0 pb-6 mb-16 shadow-[0_-8px_30px_rgb(0,0,0,0.12)]">
            <SheetHeader className="mb-4 mt-2">
              <SheetTitle className="text-[14px]">{menuLabel}</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-3">
              {overflowItems.map((item) => {
                const isActive = activeMap[item.href] ?? false;
                const label = locale === "en" ? item.labelEn : item.labelTh;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-xl text-[12px] font-medium transition-colors ${
                      isActive
                        ? "bg-[#0F1059] text-white"
                        : "bg-slate-100 text-slate-800 hover:bg-slate-200"
                    }`}
                  >
                    {item.icon}
                    <span className="text-center leading-tight">{label}</span>
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
