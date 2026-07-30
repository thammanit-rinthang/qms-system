"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLocale } from "@/lib/locale-context";

interface Props {
  darNo: string | null;
  isQms?: boolean;
}

export default function DarDetailBreadcrumb({ darNo, isQms = false }: Props) {
  const locale = useLocale();
  const isTh = locale === "th";

  const backLabel = isTh ? "คำขอเอกสาร" : "Document Requests";
  const draftLabel = isTh ? "ฉบับร่าง" : "Draft";

  return (
    <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
      <Link href={isQms ? "/qms/dar" : "/dar"} className="hover:text-slate-600 transition-colors">
        {backLabel}
      </Link>
      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
      <span className="text-slate-600 font-medium truncate">
        {darNo ?? draftLabel}
      </span>
    </nav>
  );
}
