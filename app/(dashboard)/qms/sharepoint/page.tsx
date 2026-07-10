"use client";


import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ExternalLink, FileText, FolderOpen, RefreshCw, X } from "lucide-react";
import type { SpFile } from "@/lib/sharepoint";
import { useT } from "@/lib/i18n";
import { ActionIconButton } from "@/components/common/ActionButtons";
import { Button } from "@/components/ui/button";

// ── Types ─────────────────────────────────────────────────────────────────────

type PreviewState =
  | { kind: "none" }
  | { kind: "loading"; file: SpFile }
  | { kind: "image"; file: SpFile; proxyUrl: string }
  | { kind: "pdf"; file: SpFile; blobUrl: string }
  | { kind: "office"; file: SpFile; embedUrl: string }
  | { kind: "download"; file: SpFile }
  | { kind: "error"; file: SpFile; message: string };

const OFFICE_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
]);

function mimeOf(file: SpFile): string {
  return file.file?.mimeType ?? "";
}

function isImage(mime: string) { return mime.startsWith("image/"); }
function isPdf(mime: string) { return mime === "application/pdf"; }
function isOffice(mime: string) { return OFFICE_MIMES.has(mime); }

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function FileTypeBadge({ mime }: { mime: string }) {
  if (isPdf(mime)) return <span className="inline-block px-2 py-0.5 text-[10px] rounded-full font-bold bg-error/15 text-error">PDF</span>;
  if (isImage(mime)) return <span className="inline-block px-2 py-0.5 text-[10px] rounded-full font-bold bg-success/15 text-success">IMG</span>;
  if (mime.includes("word")) return <span className="inline-block px-2 py-0.5 text-[10px] rounded-full font-bold bg-info/15 text-info">DOC</span>;
  if (mime.includes("excel") || mime.includes("spreadsheet")) return <span className="inline-block px-2 py-0.5 text-[10px] rounded-full font-bold bg-success/15 text-success">XLS</span>;
  if (mime.includes("powerpoint") || mime.includes("presentation")) return <span className="inline-block px-2 py-0.5 text-[10px] rounded-full font-bold bg-warning/15 text-warning">PPT</span>;
  if (!mime) return <span className="inline-block px-2 py-0.5 text-[10px] rounded-full font-bold bg-slate-100 text-slate-500">DIR</span>;
  return <span className="inline-block px-2 py-0.5 text-[10px] rounded-full font-bold bg-slate-100 text-slate-500">FILE</span>;
}

function FolderIcon() {
  return <FolderOpen className="w-5 h-5 text-warning shrink-0" />;
}

function FileDocIcon() {
  return <FileText className="w-5 h-5 text-neutral shrink-0" />;
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────

function Breadcrumb({ path, onNavigate }: { path: string; onNavigate: (p: string) => void }) {
  const segments = path ? path.split("/").filter(Boolean) : [];

  return (
    <nav className="flex items-center gap-1 text-[13px] flex-wrap">
      <button
        type="button"
        className="text-primary hover:underline font-medium"
        onClick={() => onNavigate("")}
      >
        Root
      </button>
      {segments.map((seg, i) => {
        const segPath = segments.slice(0, i + 1).join("/");
        const isLast = i === segments.length - 1;
        return (
          <span key={segPath} className="flex items-center gap-1">
            <span className="text-neutral">/</span>
            {isLast ? (
              <span className="text-base-content font-medium">{seg}</span>
            ) : (
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => onNavigate(segPath)}
              >
                {seg}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}

// ── Delete confirm modal ──────────────────────────────────────────────────────

function DeleteModal({
  file,
  onConfirm,
  onCancel,
  deleting,
  t,
}: {
  file: SpFile;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
  t: (k: import("@/lib/i18n").TranslationKey) => string;
}) {
  const isFolder = !!file.folder;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-content/20 p-4">
      <div className="bg-white rounded-xl shadow-lg border border-slate-100 w-full max-w-sm p-6 flex flex-col gap-4">
        <h3 className="text-sm md:text-base font-bold text-primary">
          {t("spConfirmDelete")}
        </h3>
        <p className="text-xs md:text-sm text-neutral">
          {isFolder
            ? <>{t("spDeleteFolder")} <span className="text-base-content font-medium">{file.name}</span> {t("spDeleteSuffix")}</>
            : <>{t("spDeleteFile")} <span className="text-base-content font-medium">{file.name}</span> {t("spDeleteFileSuffix")}</>}
        </p>
        <p className="text-[11px] text-error">{t("irreversible")}</p>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={deleting}>
            {t("cancel")}
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={deleting} className="bg-rose-600 text-white hover:bg-rose-700">
            {deleting ? <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : t("spDeleteBtn")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Preview modal ─────────────────────────────────────────────────────────────

function PreviewModal({
  preview,
  onClose,
  t,
}: {
  preview: Exclude<PreviewState, { kind: "none" }>;
  onClose: () => void;
  t: (k: import("@/lib/i18n").TranslationKey) => string;
}) {
  const file = preview.file;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-base-content/20 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-lg border border-slate-100 w-full flex flex-col overflow-hidden"
        style={{ maxWidth: 960, maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileTypeBadge mime={mimeOf(file)} />
            <span className="text-xs md:text-sm font-semibold text-neutral truncate">{file.name}</span>
            {file.size > 0 && (
              <span className="text-[11px] md:text-xs text-neutral shrink-0">{formatBytes(file.size)}</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" asChild className="gap-1 text-neutral px-2 h-7 text-xs">
              <a href={file.webUrl} target="_blank" rel="noopener noreferrer" title={t("spOpenSP")}>
                <ExternalLink className="w-3.5 h-3.5" />
                SharePoint
              </a>
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onClose} aria-label={t("close")}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center"
          style={{ minHeight: 420 }}
        >
          {preview.kind === "loading" && (
            <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          )}

          {preview.kind === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.proxyUrl}
              alt={file.name}
              className="max-w-full max-h-full object-contain"
            />
          )}

          {preview.kind === "pdf" && (
            <object
              data={preview.blobUrl}
              type="application/pdf"
              className="w-full border-0"
              style={{ height: "70vh" }}
            >
              <p className="text-[14px] text-neutral p-8">
                {t("spNoPreview")} —{" "}
                <a href={preview.blobUrl} download={file.name} className="text-primary underline">
                  {t("spPdfFallback")}
                </a>
              </p>
            </object>
          )}

          {preview.kind === "office" && (
            <iframe
              src={preview.embedUrl}
              className="w-full border-0"
              style={{ height: "70vh" }}
              title={file.name}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          )}

          {preview.kind === "download" && (
            <div className="flex flex-col items-center gap-4 p-10 text-center">
              <FileTypeBadge mime={mimeOf(file)} />
              <p className="text-[14px] text-neutral">{t("spNoPreview")}</p>
              <Button asChild size="sm">
                <a href={file.webUrl} target="_blank" rel="noopener noreferrer">
                  {t("spOpenSP")}
                </a>
              </Button>
            </div>
          )}

          {preview.kind === "error" && (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <span className="text-error text-[14px]">{preview.message}</span>
              <Button variant="ghost" size="sm" asChild>
                <a href={file.webUrl} target="_blank" rel="noopener noreferrer">
                  {t("spOpenSP")}
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SharePointBrowserPage() {
  const t = useT();
  const [listPath, setListPath] = useState<string>("");
  const [files, setFiles] = useState<SpFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState>({ kind: "none" });
  const [confirmDelete, setConfirmDelete] = useState<SpFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Track blob URLs created for PDF previews so we can revoke them on close
  const pdfBlobRef = useRef<string | null>(null);

  useEffect(() => {
    document.title = "SharePoint Files — QMS System";
  }, []);

  const loadFolder = useCallback(async (path: string) => {
    setLoading(true);
    setListError(null);
    try {
      const res = await fetch(`/api/sharepoint/list-files?folderPath=${encodeURIComponent(path || "root")}`);
      const json = await res.json();
      if (!res.ok || json.error) { setListError(json.error?.message ?? json.error ?? t("spLoadFail")); return; }
      setFiles((json.data as SpFile[]).sort((a, b) => {
        // folders first, then alphabetical
        const aFolder = a.folder ? 0 : 1;
        const bFolder = b.folder ? 0 : 1;
        if (aFolder !== bFolder) return aFolder - bFolder;
        return a.name.localeCompare(b.name, "th");
      }));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadFolder(listPath); }, [listPath, loadFolder]);

  function navigateTo(path: string) {
    setListPath(path);
    closePreview();
  }

  function closePreview() {
    if (pdfBlobRef.current) {
      URL.revokeObjectURL(pdfBlobRef.current);
      pdfBlobRef.current = null;
    }
    setPreview({ kind: "none" });
  }

  async function openPreview(file: SpFile) {
    if (file.folder) {
      // navigate into folder
      const newPath = listPath ? `${listPath}/${file.name}` : file.name;
      navigateTo(newPath);
      return;
    }

    const mime = mimeOf(file);
    setPreview({ kind: "loading", file });

    try {
      if (isImage(mime)) {
        // proxy URL — browser fetches through Next.js, no CORS
        const proxyUrl = `/api/sharepoint/preview-proxy?itemId=${encodeURIComponent(file.id)}`;
        setPreview({ kind: "image", file, proxyUrl });
        return;
      }

      if (isPdf(mime)) {
        // fetch through proxy → blob URL for reliable inline rendering
        const res = await fetch(`/api/sharepoint/preview-proxy?itemId=${encodeURIComponent(file.id)}`);
        if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
        const buffer = await res.arrayBuffer();
        const blob = new Blob([buffer], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(blob);
        pdfBlobRef.current = blobUrl;
        setPreview({ kind: "pdf", file, blobUrl });
        return;
      }

      if (isOffice(mime)) {
        // fetch Graph /preview embed URL via get-file endpoint
        const res = await fetch(`/api/sharepoint/get-file?itemId=${encodeURIComponent(file.id)}`);
        const json = await res.json();
        if (!res.ok || json.error) throw new Error(json.error ?? "ดึง embed URL ล้มเหลว");
        const embedUrl: string = json.data?.officeEmbedUrl;
        if (!embedUrl) throw new Error("ไม่พบ embed URL");
        setPreview({ kind: "office", file, embedUrl });
        return;
      }

      setPreview({ kind: "download", file });
    } catch (err) {
      const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      setPreview({ kind: "error", file, message });
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/sharepoint/delete-item?itemId=${encodeURIComponent(confirmDelete.id)}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!res.ok || json.error) {
        alert(json.error?.message ?? json.error ?? t("spDeleteFail"));
        return;
      }
      setFiles((prev) => prev.filter((f) => f.id !== confirmDelete.id));
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const hasPreview = preview.kind !== "none";

  return (
    <div className="max-w-350 mx-auto px-4 md:px-8 flex flex-col gap-4">
      {/* Page header */}
      <div className="card-premium border border-slate-100 rounded-xl shadow-sm px-5 py-4 mb-6 flex items-center justify-between gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-primary">{t("spTitle")}</h1>
      </div>

      {/* Toolbar */}
      <div className="card-premium px-5 py-4 border border-slate-100 rounded-xl shadow-sm flex items-center gap-3">
        {/* Back button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          disabled={!listPath}
          onClick={() => {
            const parts = listPath.split("/");
            parts.pop();
            navigateTo(parts.join("/"));
          }}
          title={t("spGoBack")}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex-1 min-w-0">
          <Breadcrumb path={listPath} onNavigate={navigateTo} />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => loadFolder(listPath)}
          disabled={loading}
          title={t("spRefresh")}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* File list */}
      <div className="card-premium overflow-hidden border border-slate-100 rounded-xl shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </div>
        ) : listError ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <p className="text-error text-[14px]">{listError}</p>
            <Button variant="ghost" size="sm" onClick={() => loadFolder(listPath)}>{t("retry")}</Button>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16">
            <p className="text-neutral text-[14px]">{t("spEmpty")}</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="table w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="th-pro w-12"></th>
                    <th className="th-pro">{t("spColName")}</th>
                    <th className="th-pro w-24">{t("spColType")}</th>
                    <th className="th-pro w-28">{t("spColSize")}</th>
                    <th className="th-pro w-36">{t("spColModified")}</th>
                    <th className="th-pro w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => {
                    const mime = mimeOf(file);
                    const isDir = !!file.folder;
                    return (
                      <tr key={file.id} className="border-b border-slate-100 hover:bg-slate-100 transition-colors duration-100">
                        <td className="py-3.5 px-4">
                          {isDir ? <FolderIcon /> : <FileDocIcon />}
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            className="text-xs md:text-sm text-neutral hover:text-primary font-semibold text-left truncate max-w-xs block"
                            onClick={() => openPreview(file)}
                          >
                            {file.name}
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          {isDir
                            ? <span className="text-[11px] md:text-xs text-neutral">{file.folder?.childCount ?? 0} {t("spItems")}</span>
                            : <FileTypeBadge mime={mime} />}
                        </td>
                        <td className="py-3 px-4 text-[11px] md:text-xs text-neutral">
                          {isDir ? "—" : formatBytes(file.size)}
                        </td>
                        <td className="py-3 px-4 text-[11px] md:text-xs text-neutral">
                          {formatDate(file.lastModifiedDateTime)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 justify-end">
                            {!isDir && (
                              <ActionIconButton
                                tone="view"
                                label={t("spPreview")}
                                onClick={() => openPreview(file)}
                              />
                            )}
                            <Button variant="ghost" size="sm" asChild className="h-7 w-7 p-0 text-neutral" title={t("spOpenSP")}>
                              <a href={file.webUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </Button>
                            <ActionIconButton
                              tone="delete"
                              label={t("spDeleteBtn")}
                              onClick={() => setConfirmDelete(file)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="flex flex-col divide-y divide-slate-100 md:hidden">
              {files.map((file) => {
                const mime = mimeOf(file);
                const isDir = !!file.folder;
                return (
                  <div key={file.id} className="flex items-center gap-2 p-4">
                    {isDir ? <FolderIcon /> : <FileDocIcon />}
                    <div className="flex-1 min-w-0">
                      <button
                        type="button"
                        className="text-xs md:text-sm font-semibold text-neutral hover:text-primary text-left truncate w-full block"
                        onClick={() => openPreview(file)}
                      >
                        {file.name}
                      </button>
                      <p className="text-[11px] md:text-xs text-neutral">
                        {isDir
                          ? `${file.folder?.childCount ?? 0} ${t("spItems")}`
                          : `${formatBytes(file.size)} · ${formatDate(file.lastModifiedDateTime)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!isDir && <FileTypeBadge mime={mime} />}
                      <ActionIconButton
                        tone="delete"
                        label={t("spDeleteBtn")}
                        onClick={() => setConfirmDelete(file)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Preview modal */}
      {hasPreview && (
        <PreviewModal
          preview={preview as Exclude<PreviewState, { kind: "none" }>}
          onClose={closePreview}
          t={t}
        />
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <DeleteModal
          file={confirmDelete}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
          deleting={deleting}
          t={t}
        />
      )}
    </div>
  );
}
