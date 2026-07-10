"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import ConfirmModal from "@/components/common/ConfirmModal";
import type { DarAttachmentRow, TempAttachmentInput } from "@/types/dar";

const ALLOWED_EXT = ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp";
const MAX_MB = 20;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType === "application/pdf")
    return <span className="text-error font-bold text-[11px] bg-error/10 rounded px-1 py-0.5">PDF</span>;
  if (mimeType.startsWith("image/"))
    return <span className="text-success font-bold text-[11px] bg-success/10 rounded px-1 py-0.5">IMG</span>;
  if (mimeType.includes("word"))
    return <span className="text-info font-bold text-[11px] bg-info/10 rounded px-1 py-0.5">DOC</span>;
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet"))
    return <span className="text-success font-bold text-[11px] bg-success/10 rounded px-1 py-0.5">XLS</span>;
  return <span className="text-neutral font-bold text-[11px] bg-slate-100 rounded px-1 py-0.5">FILE</span>;
}

// ── Preview rules ─────────────────────────────────────────────────────────────
// 2.1 Image  → <img src="/api/sharepoint/preview-proxy?itemId=...">
// 2.2 PDF    → fetch blob → URL.createObjectURL → <object type="application/pdf">
// 2.3 Office → POST Graph /preview → getUrl → <iframe>
// 2.4 Other  → Download link + Open in SharePoint link

function isOfficeMime(mimeType: string): boolean {
  return (
    mimeType.includes("word") ||
    mimeType.includes("excel") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("powerpoint") ||
    mimeType.includes("presentation")
  );
}

type PreviewTarget = {
  fileName: string;
  mimeType: string;
  spItemId: string;
  spWebUrl: string;
  spDownloadUrl: string;
};

function PreviewModal({ target, onClose }: { target: PreviewTarget; onClose: () => void }) {
  const isImage  = target.mimeType.startsWith("image/");
  const isPdf    = target.mimeType === "application/pdf";
  const isOffice = isOfficeMime(target.mimeType);

  // RULE 2.2 — PDF blob URL via useQuery; revoke object URL on unmount / item change
  const pdfBlobRef = useRef<string | null>(null);
  const { data: pdfBuffer, isFetching: pdfLoading } = useQuery<ArrayBuffer>({
    queryKey: ["darPdfPreview", target.spItemId],
    queryFn: () => fetch(`/api/sharepoint/preview-proxy?itemId=${target.spItemId}`).then((r) => r.arrayBuffer()),
    enabled: isPdf,
    staleTime: Infinity,
  });
  const pdfBlobUrl = useRef<string | null>(null);
  useEffect(() => {
    if (!pdfBuffer) return;
    if (pdfBlobRef.current) URL.revokeObjectURL(pdfBlobRef.current);
    const url = URL.createObjectURL(new Blob([pdfBuffer], { type: "application/pdf" }));
    pdfBlobRef.current = url;
    pdfBlobUrl.current = url;
    return () => { if (pdfBlobRef.current) { URL.revokeObjectURL(pdfBlobRef.current); pdfBlobRef.current = null; } };
  }, [pdfBuffer]);

  // RULE 2.3 — Office embed URL via useQuery
  const { data: officeEmbedUrl, isFetching: officeLoading } = useQuery<string | null>({
    queryKey: ["darOfficeEmbed", target.spItemId],
    queryFn: () =>
      fetch(`/api/sharepoint/office-embed?itemId=${target.spItemId}`)
        .then((r) => r.json())
        .then((json: { data: string | null }) => json.data ?? null),
    enabled: isOffice,
    staleTime: Infinity,
  });

  const proxyUrl = `/api/sharepoint/preview-proxy?itemId=${target.spItemId}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-base-content/20 p-4"
      onClick={onClose}
    >
      <div
        className="bg-base-100 rounded-xl shadow-lg border border-slate-100 w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 900, maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <FileIcon mimeType={target.mimeType} />
            <span className="text-[14px] font-medium text-base-content truncate">{target.fileName}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={proxyUrl}
              download={target.fileName}
              className="h-6 px-2 text-xs gap-1 text-slate-600 hover:bg-slate-100 rounded-md font-medium inline-flex items-center"
              title="ดาวน์โหลด"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              ดาวน์โหลด
            </a>
            <a
              href={target.spWebUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="h-6 px-2 text-xs gap-1 text-slate-600 hover:bg-slate-100 rounded-md font-medium inline-flex items-center"
              title="เปิดใน SharePoint"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              SharePoint
            </a>
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0"  type="button"   onClick={onClose}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Preview body */}
        <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center" style={{ minHeight: 400 }}>

          {/* RULE 2.1 — Image: direct proxy */}
          {isImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={proxyUrl} alt={target.fileName} className="max-w-full max-h-full object-contain" />
          )}

          {/* RULE 2.2 — PDF: client-side blob via <object> */}
          {isPdf && (
            pdfLoading || !pdfBlobUrl.current
              ? <span className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin inline-block" />
              : <object data={pdfBlobUrl.current} type="application/pdf" className="w-full border-0" style={{ height: "70vh" }}>
                  <p className="text-[14px] text-neutral p-4">เบราว์เซอร์ไม่รองรับ PDF viewer</p>
                </object>
          )}

          {/* RULE 2.3 — Office: Graph /preview embed URL in <iframe> */}
          {isOffice && (
            officeLoading || !officeEmbedUrl
              ? <span className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin inline-block" />
              : <iframe
                  src={officeEmbedUrl}
                  className="w-full border-0"
                  style={{ height: "70vh" }}
                  title={target.fileName}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
          )}

          {/* RULE 2.4 — Fallback: download + open in SharePoint */}
          {!isImage && !isPdf && !isOffice && (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <FileIcon mimeType={target.mimeType} />
              <p className="text-[14px] text-neutral">ไม่รองรับการแสดงผลในเบราว์เซอร์</p>
              <div className="flex gap-3">
                <a className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 text-xs"  href={proxyUrl} download={target.fileName}  >
                  ดาวน์โหลดไฟล์
                </a>
                <a className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-8 px-3 text-xs"  href={target.spWebUrl} target="_blank" rel="noopener noreferrer"  >
                  เปิดใน SharePoint
                </a>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Temp item (before DAR exists) ─────────────────────────────────────────────
type TempItem = TempAttachmentInput & { _localId: string };

// ── Unified display shape for both modes ─────────────────────────────────────
type DisplayItem =
  | { kind: "saved"; data: DarAttachmentRow }
  | { kind: "temp"; data: TempItem };

// ── Props ─────────────────────────────────────────────────────────────────────
type SavedProps = {
  mode: "saved";
  darId: string;
  initialAttachments: DarAttachmentRow[];
  canEdit: boolean;
  readOnly?: boolean;
};

type TempProps = {
  mode: "temp";
  tempId: string;
  onTempItemsChange: (items: TempAttachmentInput[]) => void;
};

type Props = SavedProps | TempProps;

// ── Inline preview card (read-only mode — no click needed) ────────────────────
function InlinePreviewCard({
  fileName, fileSize, mimeType, spItemId, spWebUrl, spDownloadUrl: _spDownloadUrl,
}: {
  fileName: string; fileSize: number; mimeType: string;
  spItemId: string; spWebUrl: string; spDownloadUrl: string;
}) {
  const isImage  = mimeType.startsWith("image/");
  const isPdf    = mimeType === "application/pdf";
  const isOffice = isOfficeMime(mimeType);

  const proxyUrl = `/api/sharepoint/preview-proxy?itemId=${spItemId}`;

  // PDF — fetch as blob so browser renders inline
  const pdfBlobRef = useRef<string | null>(null);
  const { data: pdfBuffer, isFetching: pdfLoading } = useQuery<ArrayBuffer>({
    queryKey: ["darPdfPreview", spItemId],
    queryFn: () => fetch(proxyUrl).then((r) => r.arrayBuffer()),
    enabled: isPdf,
    staleTime: Infinity,
  });
  const pdfBlobUrl = useRef<string | null>(null);
  useEffect(() => {
    if (!pdfBuffer) return;
    if (pdfBlobRef.current) URL.revokeObjectURL(pdfBlobRef.current);
    const url = URL.createObjectURL(new Blob([pdfBuffer], { type: "application/pdf" }));
    pdfBlobRef.current = url;
    pdfBlobUrl.current = url;
    return () => { if (pdfBlobRef.current) { URL.revokeObjectURL(pdfBlobRef.current); pdfBlobRef.current = null; } };
  }, [pdfBuffer]);

  // Office — fetch embed URL from Graph /preview
  const { data: officeEmbedUrl, isFetching: officeLoading } = useQuery<string | null>({
    queryKey: ["darOfficeEmbed", spItemId],
    queryFn: () =>
      fetch(`/api/sharepoint/office-embed?itemId=${spItemId}`)
        .then((r) => r.json())
        .then((json: { data: string | null }) => json.data ?? null),
    enabled: isOffice,
    staleTime: Infinity,
  });

  const spinner = (
    <div className="flex items-center justify-center py-16">
      <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin inline-block" />
    </div>
  );

  return (
    <li className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        <FileIcon mimeType={mimeType} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{fileName}</p>
          <p className="text-xs text-slate-400">{formatBytes(fileSize)}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={proxyUrl}
            download={fileName}
            className="h-7 px-2.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md font-medium inline-flex items-center gap-1 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            ดาวน์โหลด
          </a>
          <a
            href={spWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-7 px-2.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md font-medium inline-flex items-center gap-1 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            SharePoint
          </a>
        </div>
      </div>

      {/* Inline preview body */}
      <div className="bg-slate-50">
        {isImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={proxyUrl} alt={fileName} className="w-full object-contain max-h-[70vh]" />
        )}
        {isPdf && (
          pdfLoading || !pdfBlobUrl.current ? spinner : (
            <object data={pdfBlobUrl.current} type="application/pdf" className="w-full border-0" style={{ height: "70vh" }}>
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <p className="text-sm text-slate-500">เบราว์เซอร์ไม่รองรับ PDF viewer</p>
                <a href={proxyUrl} download={fileName} className="text-sm font-medium text-primary underline">ดาวน์โหลดไฟล์</a>
              </div>
            </object>
          )
        )}
        {isOffice && (
          officeLoading || !officeEmbedUrl ? spinner : (
            <iframe
              src={officeEmbedUrl}
              className="w-full border-0"
              style={{ height: "70vh" }}
              title={fileName}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          )
        )}
        {!isImage && !isPdf && !isOffice && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <FileIcon mimeType={mimeType} />
            <p className="text-sm text-slate-500">ไม่รองรับการแสดงผลในเบราว์เซอร์</p>
            <div className="flex gap-3">
              <a href={proxyUrl} download={fileName} className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium rounded-md border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                ดาวน์โหลดไฟล์
              </a>
              <a href={spWebUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium rounded-md bg-primary text-white hover:bg-primary/90 transition-colors">
                เปิดใน SharePoint
              </a>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

// ── Drop zone ─────────────────────────────────────────────────────────────────
function DropZone({ uploading, onFiles }: { uploading: boolean; onFiles: (f: FileList) => void }) {
  return (
    <label
      className="flex flex-col items-center justify-center w-full border-2 border-dashed border-slate-100 rounded-lg p-5 cursor-pointer hover:border-primary transition-colors duration-150 bg-base-100"
      onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files); }}
      onDragOver={(e) => e.preventDefault()}
    >
      {uploading ? (
        <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin inline-block" />
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-neutral mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <span className="text-[14px] text-neutral">คลิกหรือลากไฟล์มาวางที่นี่</span>
          <span className="text-[12px] text-neutral opacity-60 mt-0.5">
            PDF, Word, Excel, รูปภาพ — ไม่เกิน {MAX_MB} MB ต่อไฟล์
          </span>
        </>
      )}
      <input type="file" multiple accept={ALLOWED_EXT} className="hidden" disabled={uploading}
        onChange={(e) => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = ""; }} />
    </label>
  );
}

// ── File row ──────────────────────────────────────────────────────────────────
function FileRow({
  fileName, fileSize, mimeType, spWebUrl: _spWebUrl, spDownloadUrl: _spDownloadUrl, folderPath,
  label, onPreview, onDelete, deleting,
}: {
  fileName: string; fileSize: number; mimeType: string;
  spWebUrl: string; spDownloadUrl: string; folderPath: string;
  label?: string; onPreview: () => void; onDelete?: () => void; deleting?: boolean;
  spItemId?: string;
}) {
  return (
    <li className="flex items-center gap-3 bg-slate-100 rounded-lg px-3 py-2">
      <FileIcon mimeType={mimeType} />
      <div className="flex-1 min-w-0">
        <button
          type="button"
          className="text-[14px] font-medium text-base-content hover:text-primary truncate block w-full text-left"
          onClick={onPreview}
        >
          {fileName}
        </button>
        <p className="text-[11px] text-neutral">
          {formatBytes(fileSize)}
          {label && <> · <span className="text-warning">{label}</span></>}
        </p>
        <p className="text-[11px] text-neutral opacity-50 truncate">{folderPath}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {/* Preview */}
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-neutral"  type="button"   onClick={onPreview} title="ดูตัวอย่าง">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </Button>
        {/* Delete */}
        {onDelete && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-error"  type="button"   onClick={onDelete}
            disabled={deleting} title="ลบไฟล์">
            {deleting ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" /> : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </Button>
        )}
      </div>
    </li>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DarAttachmentUpload(props: Props) {
  const [savedItems, setSavedItems] = useState<DarAttachmentRow[]>(
    props.mode === "saved" ? props.initialAttachments : [],
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [tempItems, setTempItems] = useState<TempItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewTarget | null>(null);

  // Keep a ref to the latest callback so the effect below never goes stale
  const onTempItemsChangeRef = useRef(props.mode === "temp" ? props.onTempItemsChange : undefined);
  if (props.mode === "temp") onTempItemsChangeRef.current = props.onTempItemsChange;

  // Notify parent whenever tempItems changes — avoids calling setState inside a state updater
  useEffect(() => {
    if (props.mode === "temp") {
      onTempItemsChangeRef.current?.(tempItems.map(({ _localId: _, ...rest }) => rest));
    }
  }, [tempItems, props.mode]);

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const succeeded: Array<{ kind: "saved"; data: DarAttachmentRow } | { kind: "temp"; data: TempItem }> = [];
      const errors: string[] = [];
      await Promise.all(files.map(async (file) => {
        const form = new FormData();
        form.append("file", file);
        try {
          if (props.mode === "saved") {
            const res = await fetch(`/api/dar/${props.darId}/attachments`, { method: "POST", body: form });
            const json = await res.json();
            if (!res.ok || json.error) throw new Error(json.error || "อัปโหลดล้มเหลว");
            succeeded.push({ kind: "saved", data: json.data as DarAttachmentRow });
          } else {
            const res = await fetch(`/api/dar/attachments/temp?tempId=${props.tempId}`, { method: "POST", body: form });
            const json = await res.json();
            if (!res.ok || json.error) throw new Error(json.error || "อัปโหลดล้มเหลว");
            const item: TempItem = { ...json.data as TempAttachmentInput, _localId: crypto.randomUUID() };
            succeeded.push({ kind: "temp", data: item });
          }
        } catch (e) {
          errors.push(`"${file.name}": ${e instanceof Error ? e.message : "อัปโหลดล้มเหลว"}`);
        }
      }));
      return { succeeded, errors };
    },
    onSuccess: ({ succeeded, errors }) => {
      succeeded.forEach((r) => {
        if (r.kind === "saved") setSavedItems((prev) => [...prev, r.data as DarAttachmentRow]);
        else setTempItems((prev) => [...prev, r.data as TempItem]);
      });
      if (errors.length) setError(errors.join("\n"));
    },
    onError: (err) => setError(err instanceof Error ? err.message : "อัปโหลดล้มเหลว"),
  });

  function handleFiles(files: FileList) {
    setError(null);
    const toUpload: File[] = [];
    const sizeErrors: string[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_MB * 1024 * 1024) sizeErrors.push(`"${file.name}" มีขนาดเกิน ${MAX_MB} MB`);
      else toUpload.push(file);
    }
    if (sizeErrors.length) setError(sizeErrors.join("\n"));
    if (toUpload.length) uploadMutation.mutate(toUpload);
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const darId = props.mode === "saved" ? props.darId : "";
      const res = await fetch(`/api/dar/${darId}/attachments/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || "ลบไม่สำเร็จ");
      return id;
    },
    onSuccess: (id) => setSavedItems((prev) => prev.filter((a) => a.id !== id)),
    onError: (err) => setError(err.message),
    onSettled: () => setDeletingId(null),
  });

  function executeDeleteSaved(id: string) {
    if (props.mode !== "saved") return;
    setConfirmDeleteId(null);
    setDeletingId(id);
    deleteMutation.mutate(id);
  }

  function handleDeleteTemp(localId: string) {
    if (props.mode !== "temp") return;
    setTempItems((prev) => prev.filter((t) => t._localId !== localId));
  }

  const canEdit = props.mode === "temp" || props.canEdit;
  const isReadOnly = props.mode === "saved" && (props.readOnly ?? false);

  const allItems: DisplayItem[] = [
    ...savedItems.map((d): DisplayItem => ({ kind: "saved", data: d })),
    ...tempItems.map((d): DisplayItem => ({ kind: "temp", data: d })),
  ];

  return (
    <>
      <div className="flex flex-col gap-3">
        {canEdit && <DropZone uploading={uploadMutation.isPending} onFiles={handleFiles} />}

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-md py-2 px-3 text-[13px]">
            <span>{error}</span>
            <button type="button" className="ml-auto" onClick={() => setError(null)}>✕</button>
          </div>
        )}

        {allItems.length === 0 ? (
          <p className="text-[13px] text-neutral opacity-60">ยังไม่มีไฟล์แนบ</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {allItems.map((item) => {
              if (item.kind === "saved") {
                const a = item.data;
                if (isReadOnly) {
                  return (
                    <InlinePreviewCard key={a.id}
                      fileName={a.fileName} fileSize={a.fileSize} mimeType={a.mimeType}
                      spItemId={a.spItemId} spWebUrl={a.spWebUrl} spDownloadUrl={a.spDownloadUrl}
                    />
                  );
                }
                return (
                  <FileRow key={a.id}
                    fileName={a.fileName} fileSize={a.fileSize} mimeType={a.mimeType}
                    spWebUrl={a.spWebUrl} spDownloadUrl={a.spDownloadUrl} folderPath={a.folderPath}
                    onPreview={() => setPreview({ fileName: a.fileName, mimeType: a.mimeType, spItemId: a.spItemId, spWebUrl: a.spWebUrl, spDownloadUrl: a.spDownloadUrl })}
                    onDelete={props.mode === "saved" && props.canEdit ? () => setConfirmDeleteId(a.id) : undefined}
                    deleting={deletingId === a.id}
                  />
                );
              } else {
                const t = item.data;
                return (
                  <FileRow key={t._localId}
                    fileName={t.fileName} fileSize={t.fileSize} mimeType={t.mimeType}
                    spWebUrl={t.spWebUrl} spDownloadUrl={t.spDownloadUrl} folderPath={t.folderPath}
                    label="รอบันทึก"
                    onPreview={() => setPreview({ fileName: t.fileName, mimeType: t.mimeType, spItemId: t.spItemId, spWebUrl: t.spWebUrl, spDownloadUrl: t.spDownloadUrl })}
                    onDelete={() => handleDeleteTemp(t._localId)}
                  />
                );
              }
            })}
          </ul>
        )}
      </div>

      {preview && <PreviewModal target={preview} onClose={() => setPreview(null)} />}

      {confirmDeleteId && (
        <ConfirmModal
          title="ลบไฟล์แนบ"
          message="ยืนยันลบไฟล์นี้? ไฟล์จะถูกลบออกจากระบบและ SharePoint"
          confirmLabel="ลบ"
          cancelLabel="ยกเลิก"
          loading={deletingId === confirmDeleteId}
          danger
          onConfirm={() => executeDeleteSaved(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </>
  );
}
