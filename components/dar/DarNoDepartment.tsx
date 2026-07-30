"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

export default function DarNoDepartment() {
  const t = useT();

  return (
    <div className="max-w-lg mx-auto mt-12 card-premium px-5 py-4 border border-slate-100 rounded-xl shadow-sm text-center">
      <p className="text-sm md:text-base font-bold text-primary">{t("dar.noDepartmentTitle")}</p>
      <p className="text-xs md:text-sm text-gray-500 mt-2">{t("dar.noDepartmentDesc")}</p>
      <Button variant="ghost" size="sm" asChild className="mt-4">
        <Link href="/dar">{t("common.back")}</Link>
      </Button>
    </div>
  );
}
