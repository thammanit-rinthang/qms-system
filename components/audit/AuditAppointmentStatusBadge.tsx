"use client";

import type { AuditAppointmentStatus } from "@/types/audit";
import { AUDIT_APPOINTMENT_STATUS_LABELS, AUDIT_APPOINTMENT_STATUS_COLORS } from "@/types/audit";

export function AuditAppointmentStatusBadge({ status }: { status: AuditAppointmentStatus }) {
  const label = AUDIT_APPOINTMENT_STATUS_LABELS[status] ?? status;
  const color = AUDIT_APPOINTMENT_STATUS_COLORS[status] ?? "bg-slate-50 text-slate-500 border-slate-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}
