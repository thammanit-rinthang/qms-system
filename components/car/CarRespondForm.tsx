"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, FormProvider, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { carRespondSchema, type CarRespondInput } from "@/lib/validations/car";
import { INPUT_CLASS } from "@/lib/styles";
import CarRootCauseCheckbox from "./CarRootCauseCheckbox";
import SignaturePad from "@/components/shared/SignaturePad";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CarDetail } from "@/types/car";
import type { SignatureType } from "@/types/dar";

interface RoleUser { authUserId: string; name: string; email: string | null; isDefault?: boolean }

async function fetchMrUsers(): Promise<RoleUser[]> {
  const res = await fetch("/api/dar/role-users?role=MR&module=CAR");
  const json = await res.json();
  return (json.data ?? []) as RoleUser[];
}

interface Props {
  carId: string;
  defaultPosition?: string;
  onSuccess?: () => void;
}

async function submitResponse(carId: string, data: CarRespondInput): Promise<CarDetail> {
  const res = await fetch(`/api/car/${carId}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message ?? "Failed to submit response");
  return json.data as CarDetail;
}

async function uploadFile(responseId: string, file: File): Promise<void> {
  const fd = new FormData();
  // Use URL-encoded filename to bypass Next.js/Undici multipart non-ASCII body parsing bugs
  const safeName = encodeURIComponent(file.name);
  fd.append("file", file, safeName);
  fd.append("filename", file.name);
  const res = await fetch(`/api/car/response/${responseId}/attachments`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? "อัปโหลดไฟล์ไม่สำเร็จ");
  }
}

const DEFAULT_FIVE_WHYS = [
  { question: "Why 1", answer: "" },
  { question: "Why 2", answer: "" },
  { question: "Why 3", answer: "" },
  { question: "Why 4", answer: "" },
  { question: "Why 5", answer: "" },
];

export default function CarRespondForm({ carId, defaultPosition = "", onSuccess }: Props) {
  const t = useT();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [showSignDialog, setShowSignDialog] = useState(false);

  const { data: mrUsers = [], isLoading: mrUsersLoading } = useQuery({
    queryKey: ["car-mr-users"],
    queryFn: fetchMrUsers,
    staleTime: 60_000,
  });

  const methods = useForm<CarRespondInput>({
    resolver: zodResolver(carRespondSchema) as Resolver<CarRespondInput>,
    defaultValues: {
      responderPosition: defaultPosition,
      responseType: "FIVE_WHY",
      fiveWhys: DEFAULT_FIVE_WHYS,
      rootCausePerson: false,
      rootCauseMaterial: false,
      rootCauseMachine: false,
      rootCauseMethod: false,
      rootCauseOther: false,
      responderSignaturePath: "",
      targetMrAuthUserId: "",
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = methods;
  const responseType = watch("responseType");
  const targetMrAuthUserIdValue = watch("targetMrAuthUserId");

  useEffect(() => {
    if (mrUsers.length > 0 && !targetMrAuthUserIdValue) {
      const defaultUser = mrUsers.find((u) => u.isDefault);
      if (defaultUser) {
        setValue("targetMrAuthUserId", defaultUser.authUserId, { shouldValidate: true });
      }
    }
  }, [mrUsers, targetMrAuthUserIdValue, setValue]);

  const { fields } = useFieldArray({ control: methods.control, name: "fiveWhys" });

  const mutation = useMutation({
    mutationFn: async (data: CarRespondInput) => {
      const car = await submitResponse(carId, data);
      const responseId = car.response?.id;
      if (responseId && selectedFiles.length > 0) {
        const results = await Promise.allSettled(
          selectedFiles.map((f) => uploadFile(responseId, f)),
        );
        const failed = results.filter((r) => r.status === "rejected");
        if (failed.length > 0) {
          const msg = (failed[0] as PromiseRejectedResult).reason?.message ?? "อัปโหลดบางไฟล์ไม่สำเร็จ";
          throw new Error(msg);
        }
      }
      return car;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["car", carId] });
      qc.invalidateQueries({ queryKey: ["cars"] });
      toast.success(t("car.respond.successMsg"), { duration: 3000 });
      onSuccess?.();
    },
    onError: (err) => {
      toast.error((err as Error).message, { duration: Infinity });
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setSelectedFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSignConfirm(dataUrl: string, type: SignatureType, save: boolean) {
    setValue("responderSignaturePath", dataUrl, { shouldValidate: true });
    setValue("responderSignatureType", type);
    setValue("saveToProfile", save);
    setSignaturePreview(dataUrl);
    setShowSignDialog(false);
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">

        {/* วิธีวิเคราะห์สาเหตุ — toggle */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">วิธีวิเคราะห์สาเหตุปัญหา</h3>
          <div className="flex gap-2">
            {(["FIVE_WHY", "OTHER"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setValue("responseType", type)}
                className={cn(
                  "flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors",
                  responseType === type
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50"
                )}
              >
                {type === "FIVE_WHY" ? "5 Whys" : "อื่นๆ (แนบไฟล์)"}
              </button>
            ))}
          </div>
        </section>

        {/* 5 Whys section */}
        {responseType === "FIVE_WHY" && (
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">5 Whys Analysis</h3>
            <div className="space-y-3">
              {fields.map((field, i) => (
                <div key={field.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Why {i + 1} — คำถาม
                    </label>
                    <input
                      {...register(`fiveWhys.${i}.question`)}
                      type="text"
                      placeholder={`ทำไมจึง...`}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      สาเหตุ / คำตอบ
                    </label>
                    <textarea
                      {...register(`fiveWhys.${i}.answer`)}
                      rows={2}
                      placeholder="เพราะ..."
                      className={cn(INPUT_CLASS, "resize-none")}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Other — file upload */}
        {responseType === "OTHER" && (
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">แนบเอกสารวิเคราะห์สาเหตุ</h3>
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                + เพิ่มไฟล์
              </button>
              <p className="mt-1 text-xs text-slate-400">PDF, Word, Excel, PNG, JPG (สูงสุด 20 MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </section>
        )}

        {/* Shared file upload (for both types) */}
        {(selectedFiles.length > 0 || responseType === "FIVE_WHY") && (
          <section className="space-y-2">
            {responseType === "FIVE_WHY" && (
              <>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">เอกสารแนบเพิ่มเติม (ถ้ามี)</h3>
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    + เพิ่มไฟล์
                  </button>
                  <p className="mt-1 text-xs text-slate-400">PDF, Word, Excel, PNG, JPG (สูงสุด 20 MB)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </>
            )}
            {selectedFiles.length > 0 && (
              <ul className="space-y-1">
                {selectedFiles.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="truncate max-w-xs">{f.name}</span>
                    <span className="text-xs text-slate-400">({Math.round(f.size / 1024)} KB)</span>
                    <button type="button" onClick={() => removeFile(i)} className="text-rose-400 hover:text-rose-600 text-xs">ลบ</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* Root cause */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("car.respond.sectionRootCause")}</h3>
          <CarRootCauseCheckbox />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("car.respond.rootCauseSummaryLabel")}</label>
            <textarea
              {...register("rootCauseSummary")}
              rows={3}
              className={cn(INPUT_CLASS, "resize-none")}
            />
            {errors.rootCauseSummary && <p className="mt-1 text-xs text-rose-500">{errors.rootCauseSummary.message}</p>}
          </div>
        </section>

        {/* Actions */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("car.respond.sectionActions")}</h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("car.respond.immediateLabel")}</label>
            <textarea
              {...register("immediateAction")}
              rows={3}
              className={cn(INPUT_CLASS, "resize-none")}
            />
            {errors.immediateAction && <p className="mt-1 text-xs text-rose-500">{errors.immediateAction.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("car.respond.preventiveLabel")}</label>
            <textarea
              {...register("preventiveAction")}
              rows={3}
              className={cn(INPUT_CLASS, "resize-none")}
            />
            {errors.preventiveAction && <p className="mt-1 text-xs text-rose-500">{errors.preventiveAction.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("car.respond.plannedDateLabel")}</label>
            <input
              type="date"
              {...register("plannedCompletionDate")}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition-colors"
            />
            {errors.plannedCompletionDate && <p className="mt-1 text-xs text-rose-500">{errors.plannedCompletionDate.message}</p>}
          </div>
        </section>

        {/* Responder info + signature */}
        <section className="space-y-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("car.respond.sectionResponder")}</h3>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("car.respond.positionLabel")}</label>
            <input
              {...register("responderPosition")}
              type="text"
              className={INPUT_CLASS}
            />
            {errors.responderPosition && <p className="mt-1 text-xs text-rose-500">{errors.responderPosition.message}</p>}
          </div>

          {/* Signature */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">ลายเซ็นผู้ตอบกลับ</label>
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
            {errors.responderSignaturePath && (
              <p className="mt-1 text-xs text-rose-500">{errors.responderSignaturePath.message}</p>
            )}
          </div>
          <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>ลายเซ็นผู้ตอบกลับ</DialogTitle></DialogHeader>
              <SignaturePad onConfirm={handleSignConfirm} onCancel={() => setShowSignDialog(false)} />
            </DialogContent>
          </Dialog>
        </section>

        {/* MR Approver picker */}
        <section className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">ผู้อนุมัติ MR</h3>
          {mrUsersLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-3 h-3 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
              กำลังโหลด...
            </div>
          ) : (
            <select
              {...register("targetMrAuthUserId")}
              className={cn(INPUT_CLASS, errors.targetMrAuthUserId && "border-rose-300 focus:ring-rose-300/50 focus:border-rose-300")}
            >
              <option value="">-- เลือกผู้อนุมัติ MR --</option>
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
        </section>

        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />}
            {mutation.isPending ? t("car.respond.btnSubmitting") : t("car.respond.btnSubmit")}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
