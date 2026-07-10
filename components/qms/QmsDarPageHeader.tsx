"use client";

import { useLocale } from "@/lib/locale-context";
import PageHeader from "@/components/common/PageHeader";

export default function QmsDarPageHeader() {
  const locale = useLocale();

  return (
    <PageHeader
      title={locale === "th" ? "จัดการคำขอเอกสาร (DAR)" : "Manage Document Requests (DAR)"}
      subtitle={locale === "th" ? "ภาพรวมคำขอเอกสารทั้งหมดในระบบ" : "Overview of all document requests"}
    />
  );
}
