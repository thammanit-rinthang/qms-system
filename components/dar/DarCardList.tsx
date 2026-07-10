"use client";

import Link from "next/link";
import { fmtDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { ActionPillButton } from "@/components/common/ActionButtons";
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

export default function DarCardList({ dars, onEdit }: { dars: DarSummary[]; onEdit?: (id: string) => void }) {
  const locale = useLocale();
  const t = useT();

  function objectiveLabel(key: string) {
    return locale === "th" ? (OBJECTIVE_LABELS as Record<string, string>)[key] ?? key : OBJECTIVE_LABELS_EN[key] ?? key;
  }

  function docTypeLabel(key: string) {
    return locale === "th" ? (DOC_TYPE_LABELS as Record<string, string>)[key] ?? key : DOC_TYPE_LABELS_EN[key] ?? key;
  }

  return (
    <div className="lg:hidden space-y-3">
      {dars.map((dar) => (
        <Card key={dar.id} className="p-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              {dar.darNo ? (
                <p className="text-slate-800 font-semibold text-sm">{dar.darNo}</p>
              ) : (
                <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-500 font-medium">{t("dar.status.DRAFT")}</span>
              )}
              <p className="text-xs font-mono text-slate-400 mt-0.5">{fmtDate(dar.requestDate, locale)}</p>
            </div>
            <DarStatusBadge status={dar.status} />
          </div>

          <div className="flex flex-col gap-1.5 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-24 shrink-0">{t("dar.field.objective")}</span>
              <span className="text-xs text-slate-600 font-medium">{objectiveLabel(dar.objective)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-24 shrink-0">{t("dar.field.docType")}</span>
              <span className="text-xs text-slate-600 font-medium">{docTypeLabel(dar.docType)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-24 shrink-0">{t("documentControl.pagination.items")}</span>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-xs font-semibold text-slate-500">{dar.itemCount}</span>
            </div>
          </div>

          <div className="flex gap-2 mt-4 justify-end">
            <ActionPillButton tone="view" label={t("common.view")} asChild>
              <Link href={`/dar/${dar.id}`} />
            </ActionPillButton>

            {dar.status === "DRAFT" && (
              <ActionPillButton tone="edit" label={t("common.edit")} onClick={() => onEdit?.(dar.id)} />
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
