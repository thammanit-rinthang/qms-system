"use client";

import { Plus } from "lucide-react";
import { useLocale } from "@/lib/locale-context";
import PageHeader from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";

type Props = {
  onNewRequest: () => void;
};

export default function DarListHeader({ onNewRequest }: Props) {
  const locale = useLocale();

  const t = {
    title:      locale === "th" ? "คำขอเอกสาร (DAR)" : "Document Requests (DAR)",
    subtitle:   locale === "th" ? "จัดการและติดตามคำขอเอกสารของคุณ" : "Manage and track your document requests",
    newRequest: locale === "th" ? "สร้างคำขอใหม่" : "New Request",
  };

  return (
    <PageHeader
      title={t.title}
      subtitle={t.subtitle}
      className="mb-6"
      actions={
        <Button onClick={onNewRequest} className="gap-1.5">
          <Plus className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">{t.newRequest}</span>
        </Button>
      }
    />
  );
}
