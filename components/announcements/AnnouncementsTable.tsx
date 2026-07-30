"use client";

import { useT } from "@/lib/i18n";
import type { AnnouncementRow } from "@/services/announcementService";
import AnnouncementTableRow from "@/components/announcements/AnnouncementTableRow";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  rows: AnnouncementRow[];
  onView: (row: AnnouncementRow) => void;
  onEdit: (row: AnnouncementRow) => void;
  onDelete: (row: AnnouncementRow) => void;
  onToggle: (row: AnnouncementRow, active: boolean) => Promise<void>;
};

export default function AnnouncementsTable({ rows, onView, onEdit, onDelete, onToggle }: Props) {
  const t = useT();

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        </div>
        <p className="text-slate-800 font-semibold text-base mb-1">{t("announcement.empty")}</p>
        <p className="text-slate-400 text-sm">{t("announcement.emptyDesc")}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("announcement.colTitle")}</TableHead>
            <TableHead>{t("announcement.colSystem")}</TableHead>
            <TableHead>{t("announcement.colType")}</TableHead>
            <TableHead className="text-center">{t("announcement.colDateRange")}</TableHead>
            <TableHead>{t("announcement.colAttachment")}</TableHead>
            <TableHead>{t("announcement.colCreatedBy")}</TableHead>
            <TableHead>{t("announcement.colStatus")}</TableHead>
            <TableHead className="text-right">{t("announcement.colActions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <AnnouncementTableRow
              key={row.id}
              row={row}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggle={onToggle}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
