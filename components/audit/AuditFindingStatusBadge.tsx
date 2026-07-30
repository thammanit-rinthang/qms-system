import { cn } from "@/lib/utils";
import type { FindingStatus } from "@/types/audit";
import { FINDING_STATUS_LABELS, FINDING_STATUS_COLORS } from "@/types/audit";

interface Props {
  status: FindingStatus;
  className?: string;
}

export default function AuditFindingStatusBadge({ status, className }: Props) {
  const colorClass = FINDING_STATUS_COLORS[status] ?? "bg-slate-50 text-slate-500 border-slate-200";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        colorClass,
        className,
      )}
    >
      {FINDING_STATUS_LABELS[status] ?? status}
    </span>
  );
}
