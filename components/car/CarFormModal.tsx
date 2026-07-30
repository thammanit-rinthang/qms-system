"use client";

import { useEffect, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDepartments } from "@/hooks/api/use-departments";
import { useEmailGroups } from "@/hooks/api/use-email-groups";
import { useAuditStandards } from "@/hooks/api/use-audit-standards";
import { toast } from "sonner";
import { Mail, MailX, Send } from "lucide-react";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { INPUT_CLASS } from "@/lib/styles";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { carCreateSchema, type CarCreateInput } from "@/lib/validations/car";
import { CAR_SOURCE_LABELS } from "@/types/car";
import type { CarDetail, CarSourceType } from "@/types/car";
import type { FooterConfig } from "@/services/qmsConfigService";
import SignaturePad from "@/components/shared/SignaturePad";
import type { SignatureType } from "@/types/dar";
import RichTextEditor from "@/components/shared/RichTextEditor";

interface Props {
  open: boolean;
  onClose: () => void;
  editCar?: CarDetail;
  onSuccess?: (car: CarDetail) => void;
  issuerName?: string | null;
  defaultIssuerPosition?: string | null;
  footerConfig?: FooterConfig;
}

async function saveCar(data: CarCreateInput, editId?: string): Promise<CarDetail> {
  const url = editId ? `/api/car/${editId}` : "/api/car";
  const method = editId ? "PATCH" : "POST";
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? "Failed to save CAR");
  }
  const json = await res.json();
  return json.data;
}

const SOURCE_TYPES: CarSourceType[] = ["I", "C", "N", "O"];

function groupShortName(mail: string) {
  return mail.split("@")[0];
}

function GroupCheckList({
  label,
  groups,
  selected,
  onToggle,
}: {
  label: string;
  groups: { id: string; mail: string | null; displayName: string }[];
  selected: string[];
  onToggle: (mail: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-slate-600">{label}</p>
      <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {groups.length === 0 && (
          <p className="px-3 py-2 text-center text-xs text-slate-400">ไม่มีกลุ่มอีเมล</p>
        )}
        {groups.map((g) => {
          const mail = g.mail!;
          const checked = selected.includes(mail);
          return (
            <label
              key={mail}
              className={cn(
                "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors",
                checked
                  ? "bg-primary/5 font-medium text-primary"
                  : "text-slate-700 hover:bg-slate-50"
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(mail)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-primary"
              />
              <span className="truncate">{groupShortName(mail)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ponytail: step controls form→sign flow without extra components
type ModalStep = "form" | "sign";

export default function CarFormModal({
  open,
  onClose,
  editCar,
  onSuccess,
  issuerName,
  defaultIssuerPosition,
  footerConfig,
}: Props) {
  const t = useT();
  const qc = useQueryClient();
  const [isMobile, setIsMobile] = useState(false);
  const [step, setStep] = useState<ModalStep>("form");
  const [pendingData, setPendingData] = useState<CarCreateInput | null>(null);

  const {
    data: departmentsData,
    isLoading: departmentsLoading,
    isError: departmentsError,
    refetch: refetchDepartments,
  } = useDepartments();
  const { data: emailGroupsData } = useEmailGroups();
  const { data: standardsData, isLoading: standardsLoading } = useAuditStandards();
  const departments = Array.isArray(departmentsData) ? departmentsData : [];
  const emailGroups = (Array.isArray(emailGroupsData) ? emailGroupsData : []).filter(
    (g) => g.mail
  );
  const auditStandards = (Array.isArray(standardsData) ? standardsData : []).filter(
    (s) => s.active
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CarCreateInput>({
    resolver: zodResolver(carCreateSchema) as Resolver<CarCreateInput>,
    defaultValues: { sourceType: "I", isoStandards: [], reCar: false, relatedDepartmentIds: [] },
  });

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // Reset step whenever the modal opens
  useEffect(() => {
    if (open) { setStep("form"); setPendingData(null); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (editCar) {
      reset({
        sourceType: editCar.sourceType as CarSourceType,
        sourceDetail: editCar.sourceDetail ?? undefined,
        isoStandards: editCar.isoStandards,
        defectDetail: editCar.defectDetail,
        nonConformanceRef: editCar.nonConformanceRef,
        issuerPosition: editCar.issuerPosition,
        targetDepartmentId: editCar.targetDepartment.id,
        relatedDepartmentIds: editCar.relatedDepartmentIds ?? [],
        targetEmailGroups: editCar.targetEmailGroups ?? [],
        targetEmailGroupsCc: editCar.targetEmailGroupsCc ?? [],
        reCar: editCar.reCar,
        reCarRefId: editCar.reCarRefId ?? undefined,
      });
    } else {
      reset({
        sourceType: "I",
        isoStandards: [],
        reCar: false,
        issuerPosition: defaultIssuerPosition ?? undefined,
        targetEmailGroups: [],
        targetEmailGroupsCc: [],
        relatedDepartmentIds: [],
      });
    }
  }, [defaultIssuerPosition, editCar, open, reset]);

  const selectedIso = watch("isoStandards") ?? [];
  const isReCar = watch("reCar");
  const selectedTo = watch("targetEmailGroups") ?? [];
  const selectedCc = watch("targetEmailGroupsCc") ?? [];
  const selectedRelatedDepts = watch("relatedDepartmentIds") ?? [];

  function toggleGroup(field: "targetEmailGroups" | "targetEmailGroupsCc", mail: string) {
    const current = field === "targetEmailGroups" ? selectedTo : selectedCc;
    setValue(
      field,
      current.includes(mail) ? current.filter((m) => m !== mail) : [...current, mail]
    );
  }

  function toggleRelatedDept(deptId: string) {
    setValue(
      "relatedDepartmentIds",
      selectedRelatedDepts.includes(deptId)
        ? selectedRelatedDepts.filter((id) => id !== deptId)
        : [...selectedRelatedDepts, deptId]
    );
  }

  const mutation = useMutation({
    mutationFn: async ({ data, signaturePath }: { data: CarCreateInput; signaturePath: string | null }) => {
      const car = await saveCar(data, editCar?.id);
      if (editCar) return { car, issue: null };
      const res = await fetch(`/api/car/${car.id}/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issuerSignaturePath: signaturePath }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message ?? "Failed to issue CAR");
      return { car, issue: json.data as { emailQueued: boolean; emailSkipReason?: string } };
    },
    onSuccess: ({ car, issue }) => {
      qc.invalidateQueries({ queryKey: ["cars"] });
      if (editCar) qc.invalidateQueries({ queryKey: ["car", editCar.id] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      onSuccess?.(car);
      handleClose();
      if (issue) {
        if (issue.emailQueued) {
          toast.success(`ออก CAR ${car.carNo} แล้ว — ส่งอีเมลแจ้งเตือนแล้ว`, {
            icon: <Mail className="h-4 w-4 text-green-600" />,
          });
        } else {
          toast.warning(`ออก CAR ${car.carNo} แล้ว — ${issue.emailSkipReason ?? "ไม่ได้ส่งอีเมล"}`, {
            icon: <MailX className="h-4 w-4 text-amber-500" />,
            duration: 8000,
          });
        }
      }
    },
    onError: (err) => {
      toast.error((err as Error).message, { duration: Infinity });
    },
  });

  function handleClose() {
    setStep("form");
    setPendingData(null);
    onClose();
  }

  // For edits: save directly. For new CARs: go to sign step first.
  function onSubmit(data: CarCreateInput) {
    if (editCar) {
      mutation.mutate({ data, signaturePath: null });
    } else {
      setPendingData(data);
      setStep("sign");
    }
  }

  function handleSignConfirm(dataUrl: string, _type: SignatureType, _save: boolean) {
    if (!pendingData) return;
    mutation.mutate({ data: pendingData, signaturePath: dataUrl });
  }

  // Sign step — shown after form is valid (new CAR only)
  const signSection = (
    <>
      <div className="flex-1 overflow-y-auto p-5 md:p-7 space-y-4">
        <p className="text-sm text-slate-600">กรุณาเซ็นลายเซ็นผู้ออก CAR เพื่อยืนยันการออก CAR</p>
        <SignaturePad
          onConfirm={handleSignConfirm}
          onCancel={() => setStep("form")}
          isLoading={mutation.isPending}
        />
      </div>
    </>
  );

  const formSections = (
    <>
      <form
        id="car-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex-1 overflow-y-auto p-5 md:p-7 space-y-6"
      >
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("car.form.section1")}
          </h3>
          <div className="space-y-2">
            {SOURCE_TYPES.map((type) => (
              <label key={type} className="flex cursor-pointer items-start gap-2">
                <input
                  type="radio"
                  {...register("sourceType")}
                  value={type}
                  className="mt-0.5 h-4 w-4 border-slate-300 text-primary"
                />
                <span className="text-sm text-slate-700">{CAR_SOURCE_LABELS[type]}</span>
              </label>
            ))}
          </div>
          <input
            {...register("sourceDetail")}
            type="text"
            placeholder={t("car.form.sourceDetailPlaceholder")}
            className={INPUT_CLASS}
          />
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              {...register("reCar")}
              className="h-4 w-4 rounded border-slate-300 text-primary"
            />
            <span className="text-sm font-medium text-slate-700">
              {t("car.form.reCarCheckbox")}
            </span>
          </label>
          {isReCar && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                {t("car.form.reCarRefLabel")}
              </label>
              <input
                {...register("reCarRefId")}
                type="text"
                placeholder={t("car.form.reCarRefPlaceholder")}
                className={INPUT_CLASS}
              />
            </div>
          )}
        </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("car.form.section2")}
              </h3>
              {errors.isoStandards && (
                <p className="text-xs text-rose-500">{errors.isoStandards.message}</p>
              )}
              {standardsLoading ? (
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-10 rounded-xl border border-slate-200 bg-white" />
                  ))}
                </div>
              ) : auditStandards.length > 0 ? (
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {auditStandards.map((std) => (
                    <label
                      key={std.id}
                      className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        value={std.name}
                        checked={selectedIso.includes(std.name)}
                        onChange={(e) => {
                          setValue(
                            "isoStandards",
                            e.target.checked
                              ? [...selectedIso, std.name]
                              : selectedIso.filter((s) => s !== std.name)
                          );
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-primary"
                      />
                      <span className="text-sm text-slate-700">{std.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">ไม่มีมาตรฐาน ISO ในระบบ</p>
              )}
            </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("car.form.section3")}
            </h3>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t("car.form.defectLabel")}
              </label>
              <RichTextEditor
                value={watch("defectDetail") ?? ""}
                onChange={(html) => setValue("defectDetail", html, { shouldValidate: true, shouldDirty: true })}
                placeholder="ระบุรายละเอียดข้อบกพร่อง / Describe the defect detail..."
                minHeight={140}
                error={!!errors.defectDetail}
              />
              {errors.defectDetail && (
                <p className="mt-1 text-xs text-rose-500">{errors.defectDetail.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t("car.form.nonConformanceLabel")}
              </label>
              <RichTextEditor
                value={watch("nonConformanceRef") ?? ""}
                onChange={(html) => setValue("nonConformanceRef", html, { shouldValidate: true, shouldDirty: true })}
                placeholder="อ้างอิงข้อกำหนดที่ไม่เป็นไปตาม / Reference the non-conformance clause..."
                minHeight={120}
                error={!!errors.nonConformanceRef}
              />
              {errors.nonConformanceRef && (
                <p className="mt-1 text-xs text-rose-500">
                  {errors.nonConformanceRef.message}
                </p>
              )}
            </div>
          </section>

          <div className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("car.form.section4")}
              </h3>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {t("car.form.issuerPickerLabel")}
                </label>
                <div className={cn(INPUT_CLASS, "cursor-not-allowed bg-slate-50 text-slate-500")}>
                  {issuerName ?? "-"}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {t("car.form.issuerPositionLabel")}
                </label>
                {defaultIssuerPosition && !editCar ? (
                  <>
                    <div
                      className={cn(
                        INPUT_CLASS,
                        "cursor-not-allowed bg-slate-50 text-slate-500"
                      )}
                    >
                      {defaultIssuerPosition}
                    </div>
                    <input type="hidden" {...register("issuerPosition")} />
                  </>
                ) : (
                  <>
                    <input
                      {...register("issuerPosition")}
                      type="text"
                      placeholder={t("car.form.issuerPositionPlaceholder")}
                      className={INPUT_CLASS}
                    />
                    {errors.issuerPosition && (
                      <p className="mt-1 text-xs text-rose-500">
                        {errors.issuerPosition.message}
                      </p>
                    )}
                  </>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("car.form.section5")}
              </h3>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {t("car.form.deptLabel")}
                </label>
                {departmentsLoading ? (
                  <div className={cn(INPUT_CLASS, "bg-slate-50 text-slate-400")}>
                    {t("common.loading")}
                  </div>
                ) : departmentsError ? (
                  <div className="space-y-2">
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      โหลดรายการแผนกไม่สำเร็จ
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => refetchDepartments()}
                    >
                      {t("common.retry")}
                    </Button>
                  </div>
                ) : (
                  <>
                    <select {...register("targetDepartmentId")} className={INPUT_CLASS}>
                      <option value="">{t("car.form.deptPlaceholder")}</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    {departments.length === 0 ? (
                      <p className="mt-1 text-xs text-slate-500">
                        ไม่พบรายการแผนกจาก Auth Center
                      </p>
                    ) : null}
                  </>
                )}
                {errors.targetDepartmentId && (
                  <p className="mt-1 text-xs text-rose-500">
                    {errors.targetDepartmentId.message}
                  </p>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">
                  {t("car.form.relatedDeptLabel")}
                </p>
                {!departmentsLoading && !departmentsError && departments.length > 0 ? (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                    {departments.map((d) => {
                      const checked = selectedRelatedDepts.includes(d.id);
                      return (
                        <label
                          key={d.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors",
                            checked
                              ? "bg-primary/5 font-medium text-primary"
                              : "text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRelatedDept(d.id)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-primary"
                          />
                          <span className="truncate">{d.name}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : departmentsLoading ? (
                  <div className={cn(INPUT_CLASS, "bg-slate-50 text-slate-400")}>
                    {t("common.loading")}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    {t("car.form.relatedDeptPlaceholder")}
                  </p>
                )}
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">
                  เลือกกลุ่มที่ต้องการส่งอีเมล
                </p>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <GroupCheckList
                    label="To – กลุ่มที่ต้องการส่ง"
                    groups={emailGroups}
                    selected={selectedTo}
                    onToggle={(mail) => toggleGroup("targetEmailGroups", mail)}
                  />
                  <GroupCheckList
                    label="CC – กลุ่มที่ต้องการให้รับรู้"
                    groups={emailGroups}
                    selected={selectedCc}
                    onToggle={(mail) => toggleGroup("targetEmailGroupsCc", mail)}
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </form>

      {isMobile ? (
        <SheetFooter className="border-t border-slate-100 bg-white px-4 py-4">
          <div className="flex w-full items-center justify-between">
            <span className="text-[10px] leading-tight text-slate-400">
              {footerConfig?.prefix ? `${footerConfig.prefix} / ${footerConfig.label || ""}` : ""}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={mutation.isPending}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" form="car-form" disabled={mutation.isPending}>
                {mutation.isPending && (
                  <span className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                {mutation.isPending ? (
                  editCar ? t("car.form.btnSaving") : "กำลังออก CAR..."
                ) : editCar ? (
                  t("car.form.btnSave")
                ) : (
                  <><Send className="mr-1.5 h-3.5 w-3.5" />ออก CAR</>
                )}
              </Button>
            </div>
          </div>
        </SheetFooter>
      ) : (
        <DialogFooter className="border-t border-slate-100 bg-white px-6 py-4">
          <div className="flex w-full items-center justify-between">
            <span className="text-[10px] leading-tight text-slate-400">
              {footerConfig?.prefix ? `${footerConfig.prefix}  ${footerConfig.label || ""}` : ""}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={mutation.isPending}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" form="car-form" disabled={mutation.isPending}>
                {mutation.isPending && (
                  <span className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                )}
                {mutation.isPending ? (
                  editCar ? t("car.form.btnSaving") : "กำลังออก CAR..."
                ) : editCar ? (
                  t("car.form.btnSave")
                ) : (
                  <><Send className="mr-1.5 h-3.5 w-3.5" />ออก CAR</>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      )}
    </>
  );

  const titleLabel = step === "sign"
    ? "เซ็นลายเซ็นผู้ออก CAR"
    : editCar ? t("car.form.editTitle", { carNo: editCar.carNo }) : t("car.form.createTitle");

  const content = step === "sign" ? signSection : formSections;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(value) => !value && handleClose()}>
        <SheetContent
          side="bottom"
          className="flex h-[92vh] flex-col gap-0 rounded-t-3xl p-0"
        >
          <SheetHeader className="border-b border-slate-100 px-4 pb-4 pt-2 text-left">
            <SheetTitle className="pr-10 text-lg font-bold text-slate-900">{titleLabel}</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && handleClose()}>
      <DialogContent className="flex max-h-[94vh] w-[min(96vw,80rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-100 px-6 py-4">
          <DialogTitle className="text-lg font-bold text-slate-900">{titleLabel}</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
