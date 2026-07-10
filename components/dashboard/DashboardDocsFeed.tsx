"use client";

import type { PublicDocument } from "@/generated/prisma/client";
import { useT } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";

type Props = { docs: PublicDocument[] };

export default function DashboardDocsFeed({ docs }: Props) {
  const t = useT();
  const locale = useLocale();

  if (docs.length === 0) {
    return (
      <div className="px-5 py-10 text-center">
        <p className="text-sm text-gray-400">{t("dashboard.recentDocuments.empty")}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {docs.map((doc) => (
        <div key={doc.id} className="flex items-center gap-3 px-5 py-3.5 group hover:bg-slate-100/50 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-error/10 text-error flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-mono text-[10px] font-bold bg-primary/8 text-primary px-1.5 py-0.5 rounded shrink-0">
                {doc.docNumber}
              </span>
              <span className="text-xs text-gray-400 shrink-0">Rev.{doc.revision}</span>
            </div>
            <a href={doc.spWebUrl} target="_blank" rel="noopener noreferrer"
              className="text-sm font-semibold text-neutral group-hover:text-primary transition-colors truncate block leading-snug">
              {doc.docName}
            </a>
          </div>

          <div className="text-right shrink-0 flex flex-col items-end gap-1">
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/15 text-success">
              {t("dashboard.recentDocuments.badgeNew")}
            </span>
            <span className="text-[11px] text-gray-400">
              {new Date(doc.publishedDate).toLocaleDateString(locale === "th" ? "th-TH" : "en-US", { day: "2-digit", month: "short" })}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
