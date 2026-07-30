"use client";

import { Plus, Download } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";

type Props = {
  onNewRequest: () => void;
  onExport: () => void;
};

export default function DarListHeader({ onNewRequest, onExport }: Props) {
  const locale = useLocale();

  const t = {
    title:      locale === "th" ? "คำขอเอกสาร (DAR)" : "Document Requests (DAR)",
    subtitle:   locale === "th" ? "จัดการและติดตามคำขอเอกสารของคุณ" : "Manage and track your document requests",
    newRequest: locale === "th" ? "สร้างคำขอใหม่" : "New Request",
    export:     locale === "th" ? "ส่งออกรายงาน" : "Export Report",
  };

  return (
    <PageHeader
      title={t.title}
      subtitle={t.subtitle}
      className="mb-6"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onExport} className="gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-[#0F1059] h-9">
            <Download className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{t.export}</span>
          </Button>
          <Button onClick={onNewRequest} size="sm" className="gap-1.5 bg-[#0F1059] hover:bg-[#161875] text-white h-9">
            <Plus className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{t.newRequest}</span>
          </Button>
        </div>
      }
    />
  );
}
