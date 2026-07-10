"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { ActionPillButton } from "@/components/common/ActionButtons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  darId: string;
  darNo: string | null;
}

export default function QmsDarActions({ darId, darNo }: Props) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { mutate: deleteDar, isPending: deleting } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/dar/${darId}`, { method: "DELETE" });
      const json = await res.json() as { error: string | null };
      if (!res.ok || json.error) throw new Error(json.error || "เกิดข้อผิดพลาด");
    },
    onSuccess: () => {
      router.push("/dar");
      router.refresh();
    },
    onError: (err) => setError(err.message || "เกิดข้อผิดพลาด กรุณาลองใหม่"),
  });

  function handleDelete() {
    setError(null);
    deleteDar();
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <ActionPillButton
          tone="edit"
          label="แก้ไข"
          asChild
        >
          <Link href={`/dar/${darId}/edit`} />
        </ActionPillButton>

        <ActionPillButton
          tone="delete"
          label="ลบ"
          onClick={() => setShowConfirm(true)}
        />
      </div>

      <Dialog open={showConfirm} onOpenChange={(open) => !deleting && setShowConfirm(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5 text-rose-600" />
              </div>
              <DialogTitle className="text-base">
                ลบคำขอ {darNo ?? ""}?
              </DialogTitle>
            </div>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            การลบคำขอเอกสารนี้จะลบข้อมูลทั้งหมดรวมถึงไฟล์แนบ และไม่สามารถกู้คืนได้
          </p>
          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleting}
              onClick={() => { setShowConfirm(false); setError(null); }}
            >
              ยกเลิก
            </Button>
            <Button
              disabled={deleting}
              onClick={handleDelete}
              className="bg-rose-600 text-white hover:bg-rose-700 gap-2"
            >
              {deleting && <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
              ยืนยันลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
