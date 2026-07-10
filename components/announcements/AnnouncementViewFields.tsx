"use client";

import { useT } from "@/lib/i18n";
import type { AnnouncementRow } from "@/services/announcementService";

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

export default function AnnouncementViewFields({ item }: { item: AnnouncementRow }) {
  const t = useT();
  const isActive = item.status === "ACTIVE";

  const label = "text-xs text-slate-400 mb-1 font-medium tracking-wide uppercase block";
  const value = "text-sm text-slate-800 font-medium";

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
      <div>
        <span className={label}>{t("announcement.fieldTitle")}</span>
        <p className={value}>{item.title}</p>
      </div>

      <div>
        <span className={label}>{t("announcement.fieldContent")}</span>
        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{item.content}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className={label}>{t("announcement.fieldSourceSystem")}</span>
          <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#0F1059]/10 text-[#0F1059] border border-[#0F1059]/20">
            {item.sourceSystem}
          </span>
        </div>
        <div>
          <span className={label}>{t("announcement.fieldDisplayType")}</span>
          <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${
            item.displayType === "SCROLLING" ? "bg-sky-50 text-sky-600 border border-sky-200" : "bg-slate-100 text-slate-500 border border-slate-200"
          }`}>
            {item.displayType === "SCROLLING" ? t("announcement.displayTypeMain") : t("announcement.displayTypeNormal")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className={label}>{t("announcement.fieldStartDate")}</span>
          <p className="text-sm font-mono text-slate-600">{formatDate(item.startDate)}</p>
        </div>
        <div>
          <span className={label}>{t("announcement.fieldEndDate")}</span>
          <p className="text-sm font-mono text-slate-600">{formatDate(item.endDate)}</p>
        </div>
      </div>

      <div>
        <span className={label}>{t("announcement.fieldAttachment")}</span>
        {item.fileName && item.spWebUrl ? (
          <a
            href={item.spWebUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[#1D6A8A] hover:underline text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            {item.fileName}
          </a>
        ) : (
          <p className="text-sm text-slate-400">{t("announcement.noAttachment")}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className={label}>{t("announcement.fieldStatus")}</span>
          {isActive ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              {t("announcement.statusActive")}
            </span>
          ) : (
            <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-500 border border-slate-200">
              {t("announcement.statusInactive")}
            </span>
          )}
        </div>
        <div>
          <span className={label}>{t("announcement.fieldPushToCompany")}</span>
          {item.pushToCompanyCenter ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-sky-50 text-sky-600 border border-sky-200">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              แสดงหน้าหลัก
            </span>
          ) : (
            <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-500 border border-slate-200">
              ไม่แสดง
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className={label}>{t("announcement.fieldCreatedBy")}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-6 h-6 rounded-full bg-[#0F1059]/10 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-[#0F1059]">
                {(item.createdByName ?? "?").charAt(0).toUpperCase()}
              </span>
            </div>
            <p className={value}>{item.createdByName}</p>
          </div>
        </div>
        <div>
          <span className={label}>{t("announcement.fieldCreatedAt")}</span>
          <p className="text-sm font-mono text-slate-600">{formatDate(item.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}
