"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { carVerifySchema, type CarVerifyInput } from "@/lib/validations/car";
import { INPUT_CLASS } from "@/lib/styles";
import SignaturePad from "@/components/shared/SignaturePad";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CarStatus } from "@/types/car";
import type { SignatureType } from "@/types/dar";

interface RoleUser { authUserId: string; name: string; email: string | null }

async function fetchMrUsers(): Promise<RoleUser[]> {
  const res = await fetch("/api/dar/role-users?role=MR");
  const json = await res.json();
  return (json.data ?? []) as RoleUser[];
}

interface Props {
  carId: string;
  currentStatus: CarStatus;
  defaultPosition?: string;
  onSuccess?: () => void;
}

function getRound(status: CarStatus): 1 | 2 {
  return status === "VERIFY_2" ? 2 : 1;
}

async function submitVerification(carId: string, data: CarVerifyInput): Promise<void> {
  const res = await fetch(`/api/car/${carId}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? "Failed to submit verification");
  }
}

export default function CarVerifyForm({ carId, currentStatus, defaultPosition = "", onSuccess }: Props) {
  const t = useT();
  const round = getRound(currentStatus);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [showSignDialog, setShowSignDialog] = useState(false);

  const { register, watch, handleSubmit, setValue, formState: { errors } } = useForm<CarVerifyInput>({
    resolver: zodResolver(carVerifySchema),
    defaultValues: { round, result: undefined as unknown as "PASSED", verifierSignaturePath: "", verifierPosition: defaultPosition, targetMrAuthUserId: "" },
  });

  const resultValue = watch("result");

  const { data: mrUsers = [], isLoading: mrUsersLoading } = useQuery({
    queryKey: ["car-mr-users"],
    queryFn: fetchMrUsers,
    enabled: resultValue === "PASSED",
    staleTime: 60_000,
  });

  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CarVerifyInput) => submitVerification(carId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["car", carId] });
      qc.invalidateQueries({ queryKey: ["cars"] });
      toast.success(t("car.verify.successMsg"), { duration: 3000 });
      onSuccess?.();
    },
    onError: (err) => {
      toast.error((err as Error).message, { duration: Infinity });
    },
  });

  function handleSignConfirm(dataUrl: string, type: SignatureType, save: boolean) {
    setValue("verifierSignaturePath", dataUrl, { shouldValidate: true });
    setValue("verifierSignatureType", type);
    setValue("saveToProfile", save);
    setSignaturePreview(dataUrl);
    setShowSignDialog(false);
  }

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
      <input type="hidden" {...register("round", { valueAsNumber: true })} />

      {/* Result — card-style pick */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">
          ผลการตรวจสอบรอบที่ {round} <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {/* PASSED */}
          <label className={cn(
            "flex flex-col gap-1.5 rounded-xl border-2 px-4 py-3.5 cursor-pointer transition-all",
            resultValue === "PASSED"
              ? "border-emerald-500 bg-emerald-50"
              : "border-slate-200 hover:border-emerald-300 bg-white"
          )}>
            <input type="radio" {...register("result")} value="PASSED" className="sr-only" />
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                resultValue === "PASSED" ? "border-emerald-500" : "border-slate-300"
              )}>
                {resultValue === "PASSED" && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
              </div>
              <span className={cn("text-sm font-bold", resultValue === "PASSED" ? "text-emerald-700" : "text-slate-600")}>
                ✓ ผ่าน
              </span>
            </div>
            <p className="text-xs text-slate-500 pl-6">
              {round === 1 ? "ดำเนินการแก้ไขครบถ้วน → แจ้ง MR ลงนามปิด CAR" : "ดำเนินการแก้ไขครบถ้วน → แจ้ง MR ลงนามปิด CAR"}
            </p>
          </label>

          {/* FAILED */}
          <label className={cn(
            "flex flex-col gap-1.5 rounded-xl border-2 px-4 py-3.5 cursor-pointer transition-all",
            resultValue === "FAILED"
              ? "border-rose-400 bg-rose-50"
              : "border-slate-200 hover:border-rose-300 bg-white"
          )}>
            <input type="radio" {...register("result")} value="FAILED" className="sr-only" />
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                resultValue === "FAILED" ? "border-rose-400" : "border-slate-300"
              )}>
                {resultValue === "FAILED" && <div className="w-2 h-2 rounded-full bg-rose-400" />}
              </div>
              <span className={cn("text-sm font-bold", resultValue === "FAILED" ? "text-rose-700" : "text-slate-600")}>
                ✗ ไม่ผ่าน
              </span>
            </div>
            <p className="text-xs text-slate-500 pl-6">
              {round === 1
                ? "ยังแก้ไขไม่ครบ → แจ้งแผนก + นัดติดตามรอบ 2"
                : "แก้ไขไม่ผ่านซ้ำ → ออก Re-CAR ใหม่"}
            </p>
          </label>
        </div>
        {errors.result && <p className="text-xs text-rose-500">{errors.result.message}</p>}
      </div>

      {/* Findings */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {t("car.verify.findingsLabel")}
        </label>
        <textarea
          {...register("findings")}
          rows={4}
          placeholder={t("car.verify.findingsPlaceholder")}
          className={cn(INPUT_CLASS, "resize-none")}
        />
        {errors.findings && <p className="mt-1 text-xs text-rose-500">{errors.findings.message}</p>}
      </div>

      {/* FAILED round 1 — next due date */}
      {resultValue === "FAILED" && round === 1 && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {t("car.verify.nextDueDateLabel")}
          </label>
          <input
            type="date"
            {...register("nextDueDate")}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition-colors"
          />
          {errors.nextDueDate && <p className="mt-1 text-xs text-rose-500">{errors.nextDueDate.message}</p>}
          <p className="mt-1.5 text-xs text-slate-500">
            ระบบจะแจ้งเตือนแผนกผู้รับผิดชอบให้เตรียมแก้ไขและตรวจติดตามรอบที่ 2 ตามวันที่กำหนด
          </p>
        </div>
      )}

      {/* FAILED round 2 — re-CAR warning */}
      {resultValue === "FAILED" && round === 2 && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mt-0.5 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-rose-800">{t("car.verify.reCarWarning")}</p>
            <p className="text-xs text-rose-700 mt-0.5">ระบบจะแจ้งเตือนแผนกและ QMS ให้ดำเนินการออก Re-CAR</p>
          </div>
        </div>
      )}

      {/* PASSED — MR picker */}
      {resultValue === "PASSED" && (
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-slate-700">
            เลือก MR เพื่อลงนามปิด CAR <span className="text-rose-500">*</span>
          </label>
          {mrUsersLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-3 h-3 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
              กำลังโหลด...
            </div>
          ) : (
            <select
              {...register("targetMrAuthUserId")}
              className={cn(
                "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition-colors",
                errors.targetMrAuthUserId && "border-rose-300 focus:ring-rose-300/50 focus:border-rose-300"
              )}
            >
              <option value="">-- เลือก MR ที่จะรับแจ้งให้ลงนามปิด CAR --</option>
              {mrUsers.map((u) => (
                <option key={u.authUserId} value={u.authUserId}>
                  {u.name}{u.email ? ` (${u.email})` : ""}
                </option>
              ))}
            </select>
          )}
          {errors.targetMrAuthUserId && (
            <p className="text-xs text-rose-500">{errors.targetMrAuthUserId.message}</p>
          )}
          <p className="text-xs text-slate-500">
            ระบบจะส่งลิงก์ให้ MR ลงนามปิด CAR ผ่านอีเมลและแจ้งเตือนในระบบ
          </p>
        </div>
      )}

      {/* Position */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t("car.verify.verifierPositionLabel")}</label>
        <input
          {...register("verifierPosition")}
          type="text"
          placeholder={t("car.verify.verifierPositionPlaceholder")}
          className={INPUT_CLASS}
        />
        {errors.verifierPosition && <p className="mt-1 text-xs text-rose-500">{errors.verifierPosition.message}</p>}
      </div>

      {/* Signature */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          ลายเซ็นผู้ตรวจติดตาม <span className="text-rose-500">*</span>
        </label>
        {signaturePreview ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={signaturePreview} alt="ลายเซ็น" className="h-10 object-contain" />
            <button type="button" onClick={() => setShowSignDialog(true)} className="text-xs text-slate-400 hover:text-slate-600">เปลี่ยน</button>
          </div>
        ) : (
          <button type="button" onClick={() => setShowSignDialog(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-4 text-sm text-slate-500 hover:border-primary/40 hover:text-primary transition-colors">
            คลิกเพื่อเซ็นลายเซ็น
          </button>
        )}
        {errors.verifierSignaturePath && (
          <p className="mt-1 text-xs text-rose-500">{errors.verifierSignaturePath.message}</p>
        )}
      </div>

      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>ลายเซ็นผู้ตรวจติดตาม</DialogTitle></DialogHeader>
          <SignaturePad onConfirm={handleSignConfirm} onCancel={() => setShowSignDialog(false)} />
        </DialogContent>
      </Dialog>

      <div className="flex justify-end">
        <Button type="submit" disabled={mutation.isPending || !resultValue}>
          {mutation.isPending && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />}
          {mutation.isPending ? t("car.verify.btnSaving") : t("car.verify.btnSave", { round: String(round) })}
        </Button>
      </div>
    </form>
  );
}
