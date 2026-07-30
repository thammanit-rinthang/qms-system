"use client";

import { useState } from "react";
import { Home, Link as LinkIcon, List, Zap } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { AnnouncementRow } from "@/services/announcementService";
import { TableCell, TableRow } from "@/components/ui/table";
import { ActionIconButton } from "@/components/common/ActionButtons";

type Props = {
  row: AnnouncementRow;
  onView: (row: AnnouncementRow) => void;
  onEdit: (row: AnnouncementRow) => void;
  onDelete: (row: AnnouncementRow) => void;
  onToggle: (row: AnnouncementRow, active: boolean) => Promise<void>;
};

const SYSTEM_COLORS: Record<string, string> = {
  QMS: "bg-[#0F1059]/10 text-[#0F1059]",
  IT: "bg-sky-50 text-sky-600",
  HR: "bg-emerald-50 text-emerald-600",
  GA: "bg-amber-50 text-amber-600",
  SAFETY: "bg-rose-50 text-rose-600",
};

export default function AnnouncementTableRow({ row: a, onView, onEdit, onDelete, onToggle }: Props) {
  const t = useT();
  const isActive = a.status === "ACTIVE";
  const [toggling, setToggling] = useState(false);

  async function handleToggle(e: React.ChangeEvent<HTMLInputElement>) {
    e.stopPropagation();
    setToggling(true);
    try {
      await onToggle(a, e.target.checked);
    } finally {
      setToggling(false);
    }
  }

  const systemColor = SYSTEM_COLORS[a.sourceSystem] ?? "bg-slate-100 text-slate-500";

  function formatDate(d: Date | null) {
    if (!d) return null;
    return new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" });
  }

  return (
    <TableRow className="cursor-pointer group" onClick={() => onView(a)}>
      <TableCell className="max-w-56">
        <div className="flex items-start gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: a.bgColor ?? "#0F1059" }} />
          <div>
            <p className="text-sm font-medium text-[#0F1059] leading-snug line-clamp-2 group-hover:text-[#161875] transition-colors">
              {a.title}
            </p>
            {a.pushToCompanyCenter && (
              <span className="inline-flex items-center gap-1 mt-1 text-xs text-sky-600">
                <Home className="w-3 h-3" />
                หน้าหลัก
              </span>
            )}
          </div>
        </div>
      </TableCell>

      <TableCell>
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${systemColor}`}>
          {a.sourceSystem}
        </span>
      </TableCell>

      <TableCell>
        {a.displayType === "SCROLLING" ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-600">
            <Zap className="w-3 h-3" />
            Scrolling
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
            <List className="w-3 h-3" />
            List
          </span>
        )}
      </TableCell>

      <TableCell className="text-center">
        <div className="flex flex-col gap-0.5 items-center">
          <span className="text-xs font-mono text-slate-600">
            {formatDate(a.startDate) ?? <span className="text-slate-400 not-italic">{t("announcement.dateAlways")}</span>}
          </span>
          <span className="text-xs font-mono text-slate-400">
            {formatDate(a.endDate) ?? <span className="italic text-slate-400">{t("announcement.dateNoEnd")}</span>}
          </span>
        </div>
      </TableCell>

      <TableCell>
        {a.fileName && a.spWebUrl ? (
          <a
            href={a.spWebUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-sky-700 hover:underline text-xs font-medium"
          >
            <LinkIcon className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-20">{a.fileName}</span>
          </a>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )}
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#0F1059]/10 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-[#0F1059]">
              {(a.createdByName ?? "?").charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-sm text-slate-600 truncate max-w-24">{a.createdByName}</span>
        </div>
      </TableCell>

      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          {toggling ? (
            <div className="w-4 h-4 rounded-full border-2 border-slate-200 border-t-[#0F1059] animate-spin" />
          ) : (
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={isActive}
                onChange={handleToggle}
                aria-label={isActive ? t("announcement.statusActive") : t("announcement.statusInactive")}
              />
              <div className="w-9 h-5 bg-slate-200 peer-checked:bg-emerald-500 rounded-full relative transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:bg-white after:rounded-full after:transition-transform peer-checked:after:translate-x-4" />
            </label>
          )}
          <span className={`text-xs font-medium ${isActive ? "text-emerald-600" : "text-slate-400"}`}>
            {isActive ? t("announcement.statusActive") : t("announcement.statusInactive")}
          </span>
        </div>
      </TableCell>

      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          <ActionIconButton tone="view" label={t("common.view")} onClick={() => onView(a)} />
          <ActionIconButton tone="edit" label={t("common.edit")} onClick={() => onEdit(a)} />
          <ActionIconButton tone="delete" label={t("common.delete")} onClick={() => onDelete(a)} />
        </div>
      </TableCell>
    </TableRow>
  );
}
