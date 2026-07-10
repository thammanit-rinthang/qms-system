"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export type FilePreviewTarget = {
  fileName: string;
  mimeType: string | null;
  sharePointItemId?: string | null;
  spDownloadUrl?: string | null;
  fileUrl?: string | null;
};

function isOfficeMime(mime: string) {
  return mime.includes("word") || mime.includes("excel") || mime.includes("spreadsheet") || mime.includes("powerpoint") || mime.includes("presentation");
}

function ExtBadge({ mime }: { mime: string }) {
  if (mime === "application/pdf") return <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">PDF</span>;
  if (mime.startsWith("image/")) return <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">IMG</span>;
  if (mime.includes("word")) return <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">DOC</span>;
  if (mime.includes("excel") || mime.includes("spreadsheet")) return <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">XLS</span>;
  return <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">FILE</span>;
}

export function FilePreviewModal({ target, onClose }: { target: FilePreviewTarget; onClose: () => void }) {
  const mime = target.mimeType ?? "application/octet-stream";
  const hasProxy = !!target.sharePointItemId;
  const isImage = mime.startsWith("image/");
  const isPdf = mime === "application/pdf";
  const isOffice = isOfficeMime(mime);

  const proxyUrl = hasProxy ? `/api/sharepoint/preview-proxy?itemId=${target.sharePointItemId}` : (target.spDownloadUrl ?? target.fileUrl ?? "");
  const downloadUrl = hasProxy ? proxyUrl : (target.spDownloadUrl ?? target.fileUrl ?? "");

  // PDF: fetch as blob (via proxy) or use direct URL
  const pdfBlobRef = useRef<string | null>(null);
  const { data: pdfBuffer, isFetching: pdfLoading } = useQuery<ArrayBuffer>({
    queryKey: ["filePreviewPdf", target.sharePointItemId ?? target.spDownloadUrl],
    queryFn: () => fetch(proxyUrl).then((r) => r.arrayBuffer()),
    enabled: isPdf && !!proxyUrl,
    staleTime: Infinity,
  });
  useEffect(() => {
    if (!pdfBuffer) return;
    if (pdfBlobRef.current) URL.revokeObjectURL(pdfBlobRef.current);
    pdfBlobRef.current = URL.createObjectURL(new Blob([pdfBuffer], { type: "application/pdf" }));
    return () => { if (pdfBlobRef.current) { URL.revokeObjectURL(pdfBlobRef.current); pdfBlobRef.current = null; } };
  }, [pdfBuffer]);

  // Office: embed URL via Graph API (only when sharePointItemId available)
  const { data: officeEmbedUrl, isFetching: officeLoading } = useQuery<string | null>({
    queryKey: ["filePreviewOffice", target.sharePointItemId],
    queryFn: () => fetch(`/api/sharepoint/office-embed?itemId=${target.sharePointItemId}`).then((r) => r.json()).then((j: { data: string | null }) => j.data ?? null),
    enabled: isOffice && hasProxy,
    staleTime: Infinity,
  });

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <ExtBadge mime={mime} />
            <span className="truncate text-sm font-semibold text-slate-800">{target.fileName}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {downloadUrl && (
              <a href={downloadUrl} download={target.fileName} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                <Download className="h-3.5 w-3.5" />
                ดาวน์โหลด
              </a>
            )}
            {target.spDownloadUrl && !hasProxy && (
              <a href={target.spDownloadUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors">
                <ExternalLink className="h-3.5 w-3.5" />
                เปิดใหม่
              </a>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Preview body */}
        <div className="flex flex-1 items-center justify-center overflow-auto bg-slate-50" style={{ minHeight: 360 }}>

          {/* Image */}
          {isImage && proxyUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={proxyUrl} alt={target.fileName} className="max-h-full max-w-full object-contain" />
          )}

          {/* PDF */}
          {isPdf && (
            pdfLoading || !pdfBlobRef.current
              ? <span className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
              : <object data={pdfBlobRef.current} type="application/pdf" className="h-full w-full border-0" style={{ minHeight: "65vh" }}>
                  <p className="p-6 text-sm text-slate-500">เบราว์เซอร์ไม่รองรับ PDF viewer</p>
                </object>
          )}

          {/* Office */}
          {isOffice && hasProxy && (
            officeLoading || !officeEmbedUrl
              ? <span className="h-6 w-6 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
              : <iframe src={officeEmbedUrl} className="h-full w-full border-0" style={{ minHeight: "65vh" }} title={target.fileName} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
          )}

          {/* Fallback */}
          {!isImage && !isPdf && !(isOffice && hasProxy) && (
            <div className="flex flex-col items-center gap-4 p-10 text-center">
              <ExtBadge mime={mime} />
              <p className="text-sm text-slate-500">ไม่รองรับการแสดงผลในเบราว์เซอร์</p>
              {downloadUrl && (
                <a href={downloadUrl} download={target.fileName} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
                  <Download className="h-4 w-4" />
                  ดาวน์โหลดไฟล์
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
