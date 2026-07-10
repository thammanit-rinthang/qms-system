"use client";

import type { Announcement } from "@/generated/prisma/client";
import { useT } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";

const SOURCE_COLORS: Record<string, string> = {
  QMS: "#0F1059", IT: "#1D6A8A", HR: "#7C3AED", GA: "#059669", SAFETY: "#DC2626",
};

type Props = { announcements: Announcement[]; canManage: boolean; onView?: (a: Announcement) => void };

export default function DashboardAnnouncementsFeed({ announcements, onView }: Props) {
  const t = useT();
  const locale = useLocale();

  if (announcements.length === 0) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-sm text-slate-400">{t("dashboard.announcements.empty")}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {announcements.map((a) => {
        const color = SOURCE_COLORS[a.sourceSystem] ?? "#6B7280";
        const dateStr = new Date(a.createdAt).toLocaleDateString(locale === "th" ? "th-TH" : "en-US", {
          day: "2-digit", month: "short", year: "numeric",
        });

        return (
          <div key={a.id} onClick={() => onView?.(a)} className={`group flex gap-0 hover:bg-slate-50 transition-colors duration-150 ${onView ? "cursor-pointer" : ""}`}>
            <div className="w-0.75 shrink-0 rounded-r-sm my-3 ml-5 transition-all duration-200 group-hover:w-1"
              style={{ background: color }} />

            <div className="flex flex-1 items-start gap-3 px-4 py-3.5 min-w-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full text-white"
                    style={{ background: color }}>
                    {a.sourceSystem}
                  </span>
                  <span className="text-xs text-slate-400">{dateStr}</span>
                </div>
                <h3 className="text-sm font-semibold text-slate-800 group-hover:text-primary transition-colors truncate leading-snug">
                  {a.title}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">{a.content}</p>
              </div>

              {a.spWebUrl && (
                <a href={a.spWebUrl} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 w-7 h-7 mt-0.5 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:border-primary hover:text-primary transition-all duration-150 hover:scale-110">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
