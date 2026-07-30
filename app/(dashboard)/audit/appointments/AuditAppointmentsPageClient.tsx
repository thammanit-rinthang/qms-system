"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PenLine } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SignaturePad from "@/components/shared/SignaturePad";
import { AuditAppointmentListClient } from "@/components/audit/AuditAppointmentListClient";
import { AuditAppointmentFormModal } from "@/components/audit/AuditAppointmentFormModal";
import { useSubmitAuditAppointment } from "@/hooks/api/use-audit-appointments";
import type { AuditAppointmentRow } from "@/types/audit";

type Props = {
  initialData: AuditAppointmentRow[];
  canCreate: boolean;
  canCrud?: boolean;
};

export default function AuditAppointmentsPageClient({ initialData, canCreate, canCrud = false }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AuditAppointmentRow | null>(null);
  const [sigPadOpen, setSigPadOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const submitMutation = useSubmitAuditAppointment();

  function handleCreated(id: string) {
    setPendingId(id);
    setSigPadOpen(true);
  }

  async function handleSignConfirm(dataUrl: string, _type?: unknown, _save?: unknown) {
    if (!pendingId) return;
    try {
      await submitMutation.mutateAsync({ id: pendingId, ownerSignatureDataUrl: dataUrl });
      toast.success("ส่งรีวิวเรียบร้อยแล้ว — แจ้งเตือนผู้ตรวจสอบแล้ว");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSigPadOpen(false);
      setPendingId(null);
    }
  }

  function handleSignSkip() {
    toast.success("บันทึกร่างประกาศแล้ว — ยังไม่ได้ส่งรีวิว");
    setSigPadOpen(false);
    setPendingId(null);
  }

  return (
    <>
      <AuditAppointmentListClient
        initialData={initialData}
        canCreate={canCreate}
        canCrud={canCrud}
        onCreateClick={() => setModalOpen(true)}
        onEditClick={(appt) => setEditTarget(appt)}
      />

      {/* Create modal */}
      <AuditAppointmentFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onCreated={handleCreated}
      />

      {/* Edit modal */}
      <AuditAppointmentFormModal
        open={!!editTarget}
        onOpenChange={(o) => { if (!o) setEditTarget(null); }}
        initialData={editTarget ?? undefined}
        onUpdated={() => setEditTarget(null)}
      />

      {/* Owner signature after create */}
      <Dialog open={sigPadOpen} onOpenChange={(o) => { if (!submitMutation.isPending && !o) handleSignSkip(); }}>
        <DialogContent
          className="max-w-2xl rounded-2xl"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <PenLine className="h-4 w-4 text-primary" />
              ลงลายมือชื่อผู้จัดทำ
            </DialogTitle>
            <p className="text-sm text-slate-500 mt-1">
              ลงนามก่อนส่งรีวิว — อีเมลและการแจ้งเตือนจะถูกส่งทันที
            </p>
          </DialogHeader>
          <SignaturePad
            onConfirm={handleSignConfirm}
            onCancel={handleSignSkip}
            isLoading={submitMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
