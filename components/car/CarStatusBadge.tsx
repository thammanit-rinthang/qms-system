import { cn } from "@/lib/utils";
import type { CarStatus } from "@/types/car";
import { CAR_STATUS_LABELS, CAR_STATUS_COLORS } from "@/types/car";

interface Props {
  status: CarStatus;
  className?: string;
}

export default function CarStatusBadge({ status, className }: Props) {
  const colorClass = CAR_STATUS_COLORS[status] ?? "bg-slate-50 text-slate-500 border-slate-200";
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border", colorClass, className)}>
      {CAR_STATUS_LABELS[status] ?? status}
    </span>
  );
}
