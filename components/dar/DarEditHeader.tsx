"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

type Props = {
  darNo: string | null;
  darId: string;
};

export default function DarEditHeader({ darNo, darId }: Props) {
  const t = useT();

  return (
    <>
      <div className="flex items-center gap-2 text-[11px] md:text-xs text-neutral mb-4">
        <Link href="/dar" className="hover:text-neutral transition-colors">
          {t("dar.title")}
        </Link>
        <span>/</span>
        <Link href={`/dar/${darId}`} className="hover:text-neutral transition-colors">
          {darNo ?? t("dar.field.darNoDraft")}
        </Link>
        <span>/</span>
        <span className="text-neutral font-medium">{t("common.edit")}</span>
      </div>
      <h1 className="text-xl md:text-2xl font-bold text-primary mb-6">
        {t("dar.editTitle")}
      </h1>
    </>
  );
}
