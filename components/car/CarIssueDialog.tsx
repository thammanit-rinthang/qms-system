"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, MailX } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send } from "lucide-react";
import SignaturePad from "@/components/shared/SignaturePad";
import type { SignatureType } from "@/types/dar";

interface Props {
  carId: string;
  carNo: string;
  onSuccess?: () => void;
}

interface IssueResult {
  carNo: string;
  emailQueued: boolean;
  emailSkipReason?: string;
}

async function issueCar(carId: string, issuerSignaturePath: string): Promise<IssueResult> {
  const res = await fetch(`/api/car/${carId}/issue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ issuerSignaturePath }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message ?? "Failed to issue CAR");
  return json.data as IssueResult;
}

// ponytail: two-step dialog — step 1: sign, step 2: confirm
type Step = "sign" | "confirm";

export default function CarIssueDialog({ carId, carNo, onSuccess }: Props) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("sign");
  const [signaturePath, setSignaturePath] = useState<string | null>(null);
  const qc = useQueryClient();

  function handleOpen() {
    setStep("sign");
    setSignaturePath(null);
    setOpen(true);
  }

  function handleSignConfirm(dataUrl: string, _type: SignatureType, _save: boolean) {
    setSignaturePath(dataUrl);
    setStep("confirm");
  }

  const mutation = useMutation({
    mutationFn: () => issueCar(carId, signaturePath!),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["cars"] });
      qc.invalidateQueries({ queryKey: ["car", carId] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      setOpen(false);
      onSuccess?.();

      if (result.emailQueued) {
        toast.success(`ออก CAR ${result.carNo} แล้ว — ส่งอีเมลแจ้งเตือนแล้ว`, {
          icon: <Mail className="h-4 w-4 text-green-600" />,
          duration: 5000,
        });
      } else {
        toast.warning(
          `ออก CAR ${result.carNo} แล้ว — ไม่ได้ส่งอีเมล: ${result.emailSkipReason ?? "ไม่ทราบสาเหตุ"}`,
          { icon: <MailX className="h-4 w-4 text-amber-500" />, duration: 8000 }
        );
      }
    },
    onError: (err) => {
      toast.error((err as Error).message, { duration: Infinity });
    },
  });

  return (
    <>
      <Button onClick={handleOpen}>
        <Send className="w-3.5 h-3.5 mr-1.5" />
        {t("car.issue.btnIssue")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {step === "sign" ? "เซ็นลายเซ็นผู้ออก CAR" : t("car.issue.confirmTitle")}
            </DialogTitle>
          </DialogHeader>

          {step === "sign" && (
            <div className="mt-2">
              <p className="text-sm text-slate-600 mb-4">กรุณาเซ็นลายเซ็นเพื่อยืนยันการออก CAR <strong>{carNo}</strong></p>
              <SignaturePad
                onCancel={() => setOpen(false)}
                onConfirm={handleSignConfirm}
              />
            </div>
          )}

          {step === "confirm" && (
            <>
              {signaturePath && (
                <div className="mt-2 mb-3 rounded-xl border border-slate-100 bg-slate-50 p-3 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={signaturePath} alt="ลายเซ็น" className="h-10 object-contain" />
                  <button
                    type="button"
                    onClick={() => setStep("sign")}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    เปลี่ยนลายเซ็น
                  </button>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm text-slate-600">
                  {t("car.issue.confirmMsg", { carNo })}{" "}
                </p>
                <p className="text-xs text-slate-400">{t("car.issue.confirmEmailNote")}</p>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={mutation.isPending}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending && <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />}
                  {mutation.isPending ? t("car.issue.btnConfirming") : t("car.issue.btnConfirm")}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
