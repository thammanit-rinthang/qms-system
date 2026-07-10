"use client";

import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { AnnouncementRow } from "@/services/announcementService";

type Props = {
  item: AnnouncementRow | null;
  open: boolean;
  onClose: () => void;
  onDeleted: (success: boolean, errorMessage?: string) => void;
};

export default function AnnouncementDeleteModal({ item, open, onClose, onDeleted }: Props) {
  const t = useT();
  const { mutate: deleteItem, isPending: loading } = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" });
      const json = await res.json() as { data: unknown; error: string | null };
      if (!res.ok || json.error) throw new Error(json.error || "Failed to delete");
      return json.data;
    },
    onSuccess: () => onDeleted(true),
    onError: (err) => onDeleted(false, err.message),
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  function handleDelete() {
    if (!item) return;
    deleteItem(item.id);
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={t("announcement.deleteTitle")}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/30"
        onClick={() => !loading && onClose()}
      />

      <div className="relative z-10 bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full max-w-md">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
            <Trash2 className="h-5 w-5 text-rose-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-800">{t("announcement.deleteTitle")}</h3>
            {item && (
              <p className="text-xs text-slate-400 mt-0.5 truncate">{item.title}</p>
            )}
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          {t("announcement.deleteConfirm")} {t("announcement.deleteWarning")}
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="h-11 min-w-[44px] bg-white text-slate-700 border border-slate-200 rounded-xl px-4 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1059] focus-visible:ring-offset-2"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="h-11 min-w-[44px] bg-rose-600 text-white rounded-xl px-4 text-sm font-medium hover:bg-rose-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
          >
            {loading && <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
            {t("common.delete")}
          </button>
        </div>
      </div>
    </div>
  );
}
