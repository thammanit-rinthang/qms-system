"use client";

import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n";
import type { AnnouncementRow } from "@/services/announcementService";
import RichTextView from "@/components/shared/RichTextView";

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

function AttachmentPreview({ itemId, fileName }: { itemId: string; fileName: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ downloadUrl: string; previewUrl?: string; officeEmbedUrl?: string | null; mimeType?: string } | null>(null);

  useEffect(() => {
    let active = true;
    async function loadPreview() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/sharepoint/get-file?itemId=${encodeURIComponent(itemId)}`);
        if (!res.ok) throw new Error("โหลดข้อมูลตัวอย่างไฟล์ล้มเหลว");
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        if (active) {
          setPreviewData(json.data);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดไฟล์");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadPreview();
    return () => { active = false; };
  }, [itemId]);

  if (loading) {
    return (
      <div className="mt-2 w-full h-48 bg-slate-50 rounded-lg flex items-center justify-center border border-dashed border-slate-200 animate-pulse">
        <span className="text-xs text-slate-400">กำลังโหลดตัวอย่างไฟล์...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-2 w-full p-3 bg-red-50 text-red-600 rounded-lg text-xs border border-red-100">
        {error}
      </div>
    );
  }

  if (!previewData) return null;

  const { downloadUrl, previewUrl, officeEmbedUrl, mimeType } = previewData;
  const filePreviewUrl = previewUrl || downloadUrl;
  const lowerName = fileName.toLowerCase();
  const isImage = mimeType?.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp)$/i.test(lowerName);
  const isPdf = mimeType === "application/pdf" || lowerName.endsWith(".pdf");

  if (isImage) {
    return (
      <div className="mt-2 max-w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={filePreviewUrl}
          alt={fileName}
          className="max-h-[300px] w-auto object-contain rounded"
        />
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="mt-2 w-full h-[350px] rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
        <iframe
          src={`${filePreviewUrl}#toolbar=0`}
          className="w-full h-full border-none"
          title={fileName}
        />
      </div>
    );
  }

  if (officeEmbedUrl) {
    return (
      <div className="mt-2 w-full h-[350px] rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
        <iframe
          src={officeEmbedUrl}
          className="w-full h-full border-none"
          title={fileName}
        />
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 text-xs text-slate-500">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span>ไม่สามารถแสดงตัวอย่างของไฟล์ประเภทนี้ได้โดยตรง</span>
    </div>
  );
}

export default function AnnouncementViewFields({ item }: { item: AnnouncementRow }) {
  const t = useT();
  const isActive = item.status === "ACTIVE";

  const label = "text-xs text-slate-400 mb-1 font-medium tracking-wide uppercase block";
  const value = "text-sm text-slate-800 font-medium";

  const hasAttachment = !!(item.fileName && item.spWebUrl);

  if (hasAttachment) {
    return (
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-[450px]">
          {/* Left Column: Metadata (5/12 width) */}
          <div className="lg:col-span-5 space-y-5 lg:pr-6 lg:border-r lg:border-slate-100 flex flex-col justify-start">
            <div>
              <span className={label}>{t("announcement.fieldTitle")}</span>
              <p className={value}>{item.title}</p>
            </div>

            <div>
              <span className={label}>{t("announcement.fieldContent")}</span>
              <div className="max-h-[150px] overflow-y-auto pr-1">
                <RichTextView content={item.content} className="text-slate-600" />
              </div>
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

          {/* Right Column: Live File Preview (7/12 width) */}
          <div className="lg:col-span-7 flex flex-col h-full">
            <span className={label}>{t("announcement.fieldAttachment")}</span>
            <div className="mb-2">
              <a
                href={item.spWebUrl ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[#1D6A8A] hover:underline text-sm font-semibold"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                {item.fileName}
              </a>
            </div>
            {item.spItemId && (
              <div className="flex-1 min-h-[380px] lg:h-[450px]">
                <AttachmentPreview itemId={item.spItemId} fileName={item.fileName ?? ""} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Fallback layout when there is no attachment
  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
      <div>
        <span className={label}>{t("announcement.fieldTitle")}</span>
        <p className={value}>{item.title}</p>
      </div>

      <div>
        <span className={label}>{t("announcement.fieldContent")}</span>
        <RichTextView content={item.content} className="text-slate-600 leading-relaxed" />
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
        <p className="text-sm text-slate-400">{t("announcement.noAttachment")}</p>
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
