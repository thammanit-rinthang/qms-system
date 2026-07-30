"use client";

import type { UserWithDept } from "@/types/user";
import type { UserRole } from "@/generated/prisma/client";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

type Props = {
  user: UserWithDept;
  onToggle: (userId: string, newRole: "MR" | "USER") => void;
  loading: boolean;
};

const ROLE_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  USER: "secondary",
  MR:   "default",
  QMS:  "outline",
  IT:   "default",
};

export default function MrUserRow({ user, onToggle, loading }: Props) {
  const t = useT();
  const canToggle = user.role === "USER" || user.role === "MR";
  const isMr = user.role === "MR";
  const roleLabel = t(`roles.${user.role as UserRole}`);

  return (
    <TableRow>
      <TableCell className="font-semibold text-neutral">
        {user.name ?? "—"}
        {isMr && (
          <Badge variant="default" className="ml-2 px-1.5 py-0.5 text-[9px] uppercase tracking-wide bg-amber-500 hover:bg-amber-600">
            MR
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-gray-500 hidden md:table-cell">{user.email}</TableCell>
      <TableCell className="text-gray-500 hidden md:table-cell">{user.department?.name ?? "—"}</TableCell>
      <TableCell>
        <Badge variant={ROLE_BADGE[user.role] ?? "secondary"}>{roleLabel}</Badge>
      </TableCell>
      <TableCell className="text-right">
        {canToggle ? (
          <Button
            size="sm"
            variant={isMr ? "outline" : "default"}
            disabled={loading}
            onClick={() => onToggle(user.id, isMr ? "USER" : "MR")}
            className={isMr ? "text-amber-600 border-amber-200 hover:bg-amber-50" : ""}
          >
            {loading && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />}
            {isMr ? t("qms.mr.removeLabel") : t("qms.mr.setLabel")}
          </Button>
        ) : (
          <span className="text-[11px] text-gray-400 italic">{t("qms.mr.protected")}</span>
        )}
      </TableCell>
    </TableRow>
  );
}
