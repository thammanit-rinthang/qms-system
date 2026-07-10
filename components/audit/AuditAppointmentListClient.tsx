"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { FileText, Plus, Search, ChevronRight, Pencil, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuditAppointments, useDeleteAuditAppointment, useResendAuditNotification } from "@/hooks/api/use-audit-appointments";
import { AuditAppointmentStatusBadge } from "./AuditAppointmentStatusBadge";
import type { AuditAppointmentRow } from "@/types/audit";
import { fmtDate } from "@/lib/format";

const MEMBER_ROLE_LABELS: Record<string, string> = {
  LEAD_AUDITOR: "Lead Auditor",
  AUDITOR: "Auditor",
  COMMITTEE: "Committee",
  SECRETARY: "Secretary",
  ADVISOR: "Advisor",
};

type CardProps = {
  appt: AuditAppointmentRow;
  canCrud: boolean;
  onEdit: (appt: AuditAppointmentRow) => void;
  onDelete: (appt: AuditAppointmentRow) => void;
};

const RESEND_STATUSES = new Set(["PENDING_REVIEW", "PENDING_APPROVAL", "PUBLISHED"]);

function AppointmentCard({ appt, canCrud, onEdit, onDelete }: CardProps) {
  const resendMutation = useResendAuditNotification();
  const canEdit = canCrud && appt.status === "DRAFT";
  const canResend = canCrud && RESEND_STATUSES.has(appt.status);

  return (
    <div className="rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden group hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all">
      <Link href={`/audit/appointments/${appt.id}`} className="block p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-semibold text-slate-400">{appt.appointmentNo}</span>
              <span className="text-xs text-slate-300">·</span>
              <span className="text-xs text-slate-400">ปี {appt.year}</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">{appt.title}</h3>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-2">
            <AuditAppointmentStatusBadge status={appt.status} />
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
          </div>
        </div>
        {appt.standards.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {appt.standards.map((s) => (
              <span key={s} className="inline-flex items-center rounded-md bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                {s}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{appt.members.length} คน</span>
          <span>{fmtDate(appt.createdAt)}</span>
        </div>
        {appt.rejectReason && (
          <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
            ถูกส่งกลับ: {appt.rejectReason}
          </div>
        )}
      </Link>

      {canCrud && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-2.5 flex items-center gap-2 justify-end">
          {canResend && (
            <button
              type="button"
              disabled={resendMutation.isPending}
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const msg = await resendMutation.mutateAsync(appt.id);
                  toast.success(msg);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "ส่งซ้ำไม่สำเร็จ");
                }
              }}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-indigo-200 text-xs font-medium text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-3 h-3" />
              {resendMutation.isPending ? "กำลังส่ง..." : "Resend Mail"}
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(appt); }}
              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-white hover:border-slate-300 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              แก้ไข
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(appt); }}
            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            ลบ
          </button>
        </div>
      )}
    </div>
  );
}

type Props = {
  initialData?: AuditAppointmentRow[];
  canCreate: boolean;
  canCrud?: boolean;
  onCreateClick: () => void;
  onEditClick?: (appt: AuditAppointmentRow) => void;
};

export function AuditAppointmentListClient({ initialData, canCreate, canCrud = false, onCreateClick, onEditClick }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AuditAppointmentRow | null>(null);
  const { data: items = [] } = useAuditAppointments(initialData);
  const deleteMutation = useDeleteAuditAppointment();

  const filtered = items.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.appointmentNo.toLowerCase().includes(q) ||
      String(a.year).includes(q)
    );
  });

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("ลบประกาศเรียบร้อยแล้ว");
      setDeleteTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาประกาศ..."
              className="pl-9 rounded-xl border-slate-200"
            />
          </div>
          {canCreate && (
            <Button
              onClick={onCreateClick}
              className="rounded-xl bg-primary hover:bg-[#161875] shrink-0"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              สร้างประกาศ
            </Button>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-white p-6 py-16 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
              <FileText className="h-5 w-5 text-slate-400" />
            </div>
            <p className="mb-1 text-base font-semibold text-slate-800">ยังไม่มีประกาศแต่งตั้ง</p>
            <p className="text-sm text-slate-400">No appointment letters found</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 w-full">
            {filtered.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                canCrud={canCrud}
                onEdit={(a) => onEditClick?.(a)}
                onDelete={(a) => setDeleteTarget(a)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-500" />
              ยืนยันการลบประกาศ
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              ประกาศ <strong>{deleteTarget?.appointmentNo}</strong> จะถูกลบถาวรและไม่สามารถกู้คืนได้
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              className="rounded-xl"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={deleteMutation.isPending}
              onClick={handleDelete}
            >
              {deleteMutation.isPending ? "กำลังลบ..." : "ยืนยันลบ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export { MEMBER_ROLE_LABELS };
