"use client";

import Link from "next/link";
import { fmtDate } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowDownUp, ArrowUp } from "lucide-react";
import { ActionIconButton } from "@/components/common/ActionButtons";
import type { DarSummary } from "@/types/dar";
import { OBJECTIVE_LABELS, DOC_TYPE_LABELS } from "@/types/dar";
import DarStatusBadge from "./DarStatusBadge";
import { useLocale } from "@/lib/locale-context";
import { useT } from "@/lib/i18n";

const OBJECTIVE_LABELS_EN: Record<string, string> = {
  PREPARE_NEW: "Prepare New Doc",
  REQUEST_COPY_CONTROLLED: "Copy (Controlled)",
  REQUEST_COPY_UNCONTROLLED: "Copy (Uncontrolled)",
  REVISE: "Revise",
  CANCEL: "Cancel Doc",
};

const DOC_TYPE_LABELS_EN: Record<string, string> = {
  MANUAL: "Manual (M)",
  FORMAT: "Format (FM)",
  DRAWING: "Drawing",
  PROCEDURE: "Procedure (P)",
  SOP: "SOP",
  SIP: "SIP",
  IPQC: "IPQC",
  OTHER: "Other",
};

type SortKey = "requestDate" | "darNo" | "status";
type SortDir = "asc" | "desc";

type Props = {
  dars: DarSummary[];
  onSort?: (key: SortKey) => void;
  sortKey?: SortKey;
  sortDir?: SortDir;
  onEdit?: (id: string) => void;
  onDelete?: (id: string, darNo: string | null) => void;
};

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active)
    return <ArrowDownUp className="h-3.5 w-3.5 text-slate-300" />;
  return dir === "asc" ? (
    <ArrowUp className="h-3.5 w-3.5 text-[#0F1059]" />
  ) : (
    <ArrowDownUp className="h-3.5 w-3.5 text-[#0F1059]" />
  );
}

export default function DarTable({ dars, onSort, sortKey, sortDir = "desc", onEdit, onDelete }: Props) {
  const locale = useLocale();
  const t = useT();

  function objectiveLabel(key: string) {
    return locale === "th" ? (OBJECTIVE_LABELS as Record<string, string>)[key] ?? key : OBJECTIVE_LABELS_EN[key] ?? key;
  }

  function docTypeLabel(key: string) {
    return locale === "th" ? (DOC_TYPE_LABELS as Record<string, string>)[key] ?? key : DOC_TYPE_LABELS_EN[key] ?? key;
  }

  return (
    <div className="hidden lg:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button onClick={() => onSort?.("darNo")} className="inline-flex items-center gap-1.5 hover:text-[#0F1059] transition-colors">
                {t("dar.field.darNo")}
                <SortIcon active={sortKey === "darNo"} dir={sortDir} />
              </button>
            </TableHead>
            <TableHead className="text-center">
              <button onClick={() => onSort?.("requestDate")} className="inline-flex items-center gap-1.5 hover:text-[#0F1059] transition-colors">
                {t("dar.field.date")}
                <SortIcon active={sortKey === "requestDate"} dir={sortDir} />
              </button>
            </TableHead>
            <TableHead>{t("dar.field.objective")}</TableHead>
            <TableHead>{t("dar.field.docType")}</TableHead>
            <TableHead className="text-center">{t("documentControl.pagination.items")}</TableHead>
            <TableHead>
              <button onClick={() => onSort?.("status")} className="inline-flex items-center gap-1.5 hover:text-[#0F1059] transition-colors">
                {t("dar.field.status")}
                <SortIcon active={sortKey === "status"} dir={sortDir} />
              </button>
            </TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {dars.map((dar) => (
            <TableRow key={dar.id}>
              <TableCell>{dar.darNo ? <span className="text-sm font-semibold text-[#0F1059]">{dar.darNo}</span> : <Badge variant="draft">{t("dar.status.DRAFT")}</Badge>}</TableCell>

              <TableCell className="text-center">
                <span className="text-sm font-mono text-slate-600 whitespace-nowrap">{fmtDate(dar.requestDate, locale)}</span>
              </TableCell>

              <TableCell>
                <span className="text-sm text-slate-600">{objectiveLabel(dar.objective)}</span>
              </TableCell>

              <TableCell>
                <span className="text-sm text-slate-600">{docTypeLabel(dar.docType)}</span>
              </TableCell>

              <TableCell className="text-center">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-xs font-semibold text-slate-500">{dar.itemCount}</span>
              </TableCell>

              <TableCell>
                <DarStatusBadge status={dar.status} />
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-1.5 justify-end">
                  <ActionIconButton tone="view" label={t("common.view")} asChild>
                    <Link href={`/dar/${dar.id}`} />
                  </ActionIconButton>

                  {dar.status === "DRAFT" && onEdit && (
                    <ActionIconButton tone="edit" label={t("common.edit")} onClick={() => onEdit(dar.id)} />
                  )}

                  {onDelete && (
                    <ActionIconButton tone="delete" label={t("common.delete")} onClick={() => onDelete(dar.id, dar.darNo)} />
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
