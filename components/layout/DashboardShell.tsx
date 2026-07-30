"use client";

import { useState } from "react";
import type { UserRole } from "@/generated/prisma/client";
import { LocaleContext } from "@/lib/locale-context";
import DashboardHeader from "./DashboardHeader";
import DashboardSidebar from "./DashboardSidebar";
import AuthSessionRefresh from "@/components/auth/AuthSessionRefresh";

type Props = {
  role: UserRole;
  name: string;
  email: string;
  image?: string | null;
  children: React.ReactNode;
};

export default function DashboardShell({ role, name, email, image, children }: Props) {
  const [locale, setLocale] = useState<"th" | "en">("th");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <LocaleContext.Provider value={locale}>
      <AuthSessionRefresh />
      <div className="flex h-screen overflow-hidden bg-slate-100">
        {/* Sidebar: persistent on desktop, drawer on mobile */}
        <DashboardSidebar
          role={role}
          name={name}
          email={email}
          image={image}
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
          locale={locale}
        />

        {/* Main column */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <DashboardHeader
            role={role}
            name={name}
            email={email}
            image={image}
            locale={locale}
            onLocaleChange={setLocale}
            onToggleSidebar={() => setMobileSidebarOpen(true)}
          />

          {/* Scrollable content area */}
          <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 pb-8">
            {children}
          </main>
        </div>
      </div>
    </LocaleContext.Provider>
  );
}

