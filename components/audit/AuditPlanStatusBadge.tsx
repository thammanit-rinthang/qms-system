import { cn } from "@/lib/utils";
import type { AuditPlanStatus } from "@/types/audit";
import { AUDIT_PLAN_STATUS_LABELS, AUDIT_PLAN_STATUS_COLORS } from "@/types/audit";

interface Props {
  status: AuditPlanStatus;
  className?: string;
}

export default function AuditPlanStatusBadge({ status, className }: Props) {
  const colorClass = AUDIT_PLAN_STATUS_COLORS[status] ?? "bg-slate-50 text-slate-500 border-slate-200";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        colorClass,
        className,
      )}
    >
      {AUDIT_PLAN_STATUS_LABELS[status] ?? status}
    </span>
  );
}
