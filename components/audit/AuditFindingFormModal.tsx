"use client";

import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { auditFindingCreateSchema, type AuditFindingCreateInput } from "@/lib/validations/audit";
import { INPUT_CLASS } from "@/lib/styles";
import { useCreateFinding, useUpdateFinding } from "@/hooks/api/use-audit-findings";
import {
  FINDING_CATEGORY_LABELS,
  FINDING_SEVERITY_LABELS,
  type AuditFindingRow,
  type FindingCategory,
  type FindingSeverity,
} from "@/types/audit";

interface Props {
  open: boolean;
  onClose: () => void;
  planId: string;
  editFinding?: AuditFindingRow;
  onSuccess?: () => void;
}

const CATEGORIES: FindingCategory[] = ["NC", "OBSERVATION", "OFI"];
const SEVERITIES: FindingSeverity[] = ["MINOR", "MAJOR", "CRITICAL"];

export default function AuditFindingFormModal({ open, onClose, planId, editFinding, onSuccess }: Props) {
  const [isMobile, setIsMobile] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AuditFindingCreateInput>({
    resolver: zodResolver(auditFindingCreateSchema) as Resolver<AuditFindingCreateInput>,
    defaultValues: { category: "NC", severity: "MINOR" },
  });

  const createMutation = useCreateFinding(planId);
  const updateMutation = useUpdateFinding(planId);
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (editFinding) {
      reset({
        category: editFinding.category,
        severity: editFinding.severity,
        clause: editFinding.clause ?? undefined,
        title: editFinding.title,
        detail: editFinding.detail,
        evidenceSummary: editFinding.evidenceSummary ?? undefined,
        ownerAuthUserId: editFinding.ownerAuthUserId ?? undefined,
        ownerNameSnapshot: editFinding.ownerNameSnapshot ?? undefined,
        dueAt: editFinding.dueAt ? new Date(editFinding.dueAt) : undefined,
      });
    } else {
      reset({ category: "NC", severity: "MINOR" });
    }
  }, [editFinding, open, reset]);

  function onSubmit(data: AuditFindingCreateInput) {
    if (editFinding) {
      updateMutation.mutate(
        { id: editFinding.id, input: data },
        {
          onSuccess: () => {
            toast.success("อัปเดตข้อค้นพบสำเร็จ");
            onSuccess?.();
            onClose();
          },
          onError: (err) => toast.error(err.message, { duration: Infinity }),
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success("สร้างข้อค้นพบสำเร็จ");
          onSuccess?.();
          onClose();
        },
        onError: (err) => toast.error(err.message, { duration: Infinity }),
      });
    }
  }

  const formContent = (
    <form
      id="audit-finding-form"
      onSubmit={handleSubmit(onSubmit)}
      className="flex-1 overflow-y-auto p-5 space-y-5"
    >
      {/* Finding No (read-only in edit) */}
      {editFinding && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">เลขที่ข้อค้นพบ</label>
          <div className={cn(INPUT_CLASS, "cursor-not-allowed bg-slate-50 text-slate-500 font-mono")}>
            {editFinding.findingNo}
          </div>
        </div>
      )}

      {/* Category */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">ประเภท</p>
        <div className="flex gap-4 flex-wrap">
          {CATEGORIES.map((cat) => (
            <label key={cat} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                {...register("category")}
                value={cat}
                className="h-4 w-4 border-slate-300 text-primary"
              />
              <span className="text-sm text-slate-700">{FINDING_CATEGORY_LABELS[cat]}</span>
            </label>
          ))}
        </div>
        {errors.category && (
          <p className="mt-1 text-xs text-rose-500">{errors.category.message}</p>
        )}
      </div>

      {/* Severity */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">ความรุนแรง</p>
        <div className="flex gap-4 flex-wrap">
          {SEVERITIES.map((sev) => (
            <label key={sev} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                {...register("severity")}
                value={sev}
                className="h-4 w-4 border-slate-300 text-primary"
              />
              <span className="text-sm text-slate-700">{FINDING_SEVERITY_LABELS[sev]}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Clause */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">ข้อกำหนด / Clause</label>
        <input
          {...register("clause")}
          type="text"
          placeholder="เช่น 8.4.1"
          className={INPUT_CLASS}
        />
      </div>

      {/* Title */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          หัวข้อข้อค้นพบ <span className="text-rose-500">*</span>
        </label>
        <input
          {...register("title")}
          type="text"
          placeholder="ระบุหัวข้อ..."
          className={INPUT_CLASS}
        />
        {errors.title && (
          <p className="mt-1 text-xs text-rose-500">{errors.title.message}</p>
        )}
      </div>

      {/* Detail */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          รายละเอียด <span className="text-rose-500">*</span>
        </label>
        <textarea
          {...register("detail")}
          rows={4}
          placeholder="ระบุรายละเอียดข้อค้นพบ..."
          className={cn(INPUT_CLASS, "resize-none")}
        />
        {errors.detail && (
          <p className="mt-1 text-xs text-rose-500">{errors.detail.message}</p>
        )}
      </div>

      {/* Evidence Summary */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">หลักฐานสนับสนุน</label>
        <textarea
          {...register("evidenceSummary")}
          rows={3}
          placeholder="ระบุหลักฐาน..."
          className={cn(INPUT_CLASS, "resize-none")}
        />
      </div>

      {/* Owner Name Snapshot */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">ผู้รับผิดชอบ (ชื่อ)</label>
        <input
          {...register("ownerNameSnapshot")}
          type="text"
          placeholder="ชื่อผู้รับผิดชอบ..."
          className={INPUT_CLASS}
        />
      </div>

      {/* Due Date */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">วันครบกำหนด</label>
        <input {...register("dueAt")} type="date" className={INPUT_CLASS} />
      </div>
    </form>
  );

  const footerButtons = (
    <>
      <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
        ยกเลิก
      </Button>
      <Button type="submit" form="audit-finding-form" disabled={isPending}>
        {isPending && (
          <span className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {isPending ? "กำลังบันทึก..." : editFinding ? "บันทึก" : "สร้างข้อค้นพบ"}
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="flex h-[92vh] flex-col gap-0 rounded-t-3xl p-0">
          <SheetHeader className="border-b border-slate-100 px-4 pb-4 pt-2 text-left">
            <SheetTitle className="pr-10 text-lg font-bold text-slate-900">
              {editFinding ? "แก้ไขข้อค้นพบ" : "สร้างข้อค้นพบใหม่"}
            </SheetTitle>
          </SheetHeader>
          {formContent}
          <SheetFooter className="border-t border-slate-100 bg-white px-4 py-4">
            {footerButtons}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-[min(96vw,42rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-100 px-6 py-4">
          <DialogTitle className="text-lg font-bold text-slate-900">
            {editFinding ? "แก้ไขข้อค้นพบ" : "สร้างข้อค้นพบใหม่"}
          </DialogTitle>
        </DialogHeader>
        {formContent}
        <DialogFooter className="border-t border-slate-100 bg-white px-6 py-4">
          {footerButtons}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
