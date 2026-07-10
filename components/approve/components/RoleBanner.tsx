import { useT } from "@/lib/i18n";
import type { UserRole } from "@/generated/prisma/client";
import { ShieldCheck, Info } from "lucide-react";
import { isPrivilegedRole } from "@/lib/permissions";

export function RoleBanner({ role }: { role: UserRole }) {
  const t = useT();
  if (isPrivilegedRole(role)) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <p className="text-sm text-emerald-700">
          <span className="font-semibold">{role}</span>
          {" — "}
          {t("approve.rolePrivilegedDesc")}
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
      <p className="text-sm text-sky-700">{t("approve.roleUserDesc")}</p>
    </div>
  );
}
