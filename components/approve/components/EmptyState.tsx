"use client";

import { Inbox } from "lucide-react";
import { useT } from "@/lib/i18n";

export function EmptyState({ label }: { label: string }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-6 py-16 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
        <Inbox className="h-5 w-5 text-slate-400" />
      </div>
      <p className="mb-1 text-base font-semibold text-slate-800">{t("common.noItems")}</p>
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}
