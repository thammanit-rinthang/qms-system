import type { DarStatus } from "@/generated/prisma/client";
import { DAR_STATUS_LABELS } from "@/types/dar";

const STATUS_CLASS: Record<DarStatus, string> = {
  DRAFT:            "bg-slate-100 text-slate-500 border border-slate-200",
  PENDING_REVIEW:   "bg-sky-50 text-sky-600 border border-sky-200",
  PENDING_APPROVE:  "bg-sky-50 text-sky-600 border border-sky-200",
  QMS_PROCESSING:   "bg-amber-50 text-amber-600 border border-amber-200",
  COMPLETED:        "bg-emerald-50 text-emerald-600 border border-emerald-200",
  CANCELLED:        "bg-slate-50 text-slate-400 border border-slate-200",
};

export default function DarStatusBadge({ status }: { status: DarStatus }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full ${STATUS_CLASS[status]}`}>
      {DAR_STATUS_LABELS[status]}
    </span>
  );
}
