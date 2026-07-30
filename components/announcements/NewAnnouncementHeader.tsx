"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

export default function NewAnnouncementHeader() {
  const t = useT();

  return (
    <div>
      <Link
        href="/qms/announcements"
        className="text-xs md:text-sm font-semibold text-gray-500 hover:text-primary flex items-center gap-1 mb-3 w-fit"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t("common.back")}
      </Link>
      <h1 className="text-xl md:text-2xl font-bold text-primary">{t("announcement.createTitle")}</h1>
      <p className="text-xs md:text-sm text-gray-500 mt-0.5">{t("announcement.pushToCompanyHint")}</p>
    </div>
  );
}
