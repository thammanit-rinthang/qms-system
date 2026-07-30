"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GraphUserPicker, { type GraphUserResult } from "@/components/shared/GraphUserPicker";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialReviewerAuthUserId?: string;
  initialApproverAuthUserId?: string;
  onConfirm: (reviewer: GraphUserResult, approver: GraphUserResult) => Promise<void>;
}

export default function AuditPlanAssignDialog({
  open,
  onOpenChange,
  initialReviewerAuthUserId,
  initialApproverAuthUserId,
  onConfirm,
}: Props) {
  const [reviewer, setReviewer] = useState<GraphUserResult | null>(null);
  const [approver, setApprover] = useState<GraphUserResult | null>(null);
  const [saving, setSaving] = useState(false);
  const prefilled = useRef(false);

  useEffect(() => {
    if (!open) {
      prefilled.current = false;
      return;
    }
    if (prefilled.current || (!initialReviewerAuthUserId && !initialApproverAuthUserId)) return;
    prefilled.current = true;

    async function prefill() {
      try {
        const fetchUser = async (id: string): Promise<GraphUserResult | null> => {
          const res = await fetch(`/api/ms-graph/users/search?q=${encodeURIComponent(id)}`);
          const json: { data: GraphUserResult[] } = await res.json();
          return json.data?.find((u) => u.id === id) ?? null;
        };
        const [r, a] = await Promise.all([
          initialReviewerAuthUserId ? fetchUser(initialReviewerAuthUserId) : Promise.resolve(null),
          initialApproverAuthUserId ? fetchUser(initialApproverAuthUserId) : Promise.resolve(null),
        ]);
        if (r) setReviewer(r);
        if (a) setApprover(a);
      } catch {
        // ignore prefill failures
      }
    }

    void prefill();
  }, [open, initialReviewerAuthUserId, initialApproverAuthUserId]);

  const handleClose = useCallback((next: boolean) => {
    if (!next) {
      setReviewer(null);
      setApprover(null);
    }
    onOpenChange(next);
  }, [onOpenChange]);

  async function submit() {
    if (!reviewer || !approver) return;
    setSaving(true);
    try {
      await onConfirm(reviewer, approver);
      handleClose(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md overflow-visible rounded-2xl" onPointerDownOutside={(e) => e.preventDefault()} onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>มอบหมายผู้ตรวจสอบและผู้อนุมัติ</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <GraphUserPicker
            label="ผู้ตรวจสอบ (Reviewer)"
            value={reviewer}
            onChange={setReviewer}
            placeholder="ค้นหาผู้ตรวจสอบ..."
            required
          />
          <GraphUserPicker
            label="ผู้อนุมัติ (Approver)"
            value={approver}
            onChange={setApprover}
            placeholder="ค้นหาผู้อนุมัติ..."
            required
          />
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => handleClose(false)} disabled={saving}>
            ยกเลิก
          </Button>
          <Button
            className="rounded-xl bg-[#0F1059] hover:bg-[#161875]"
            onClick={submit}
            disabled={saving || !reviewer || !approver}
          >
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            ส่งเพื่ออนุมัติ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
