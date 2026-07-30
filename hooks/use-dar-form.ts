"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { DarObjective, DarDocType, DarDetail, TempAttachmentInput, SignatureType } from "@/types/dar";
import type { ReviewerUser } from "@/components/dar/DarReviewerSelectModal";
import { getErrorMessage } from "@/lib/error-message";

type ItemRow = { docNumber: string; docName: string; revision: string; effectiveDate?: string };

type FormState = {
  objective: DarObjective | "";
  docType: DarDocType | "";
  docTypeOther: string;
  reason: string;
  items: ItemRow[];
  distributionDepartmentIds: string[];
};

type FormKey = keyof FormState;

type ItemError = {
  docNumber?: { message?: string };
  docName?: { message?: string };
  revision?: { message?: string };
  effectiveDate?: { message?: string };
};

const formSchema = z.object({
  objective: z.union([
    z.enum(["PREPARE_NEW", "REQUEST_COPY_CONTROLLED", "REQUEST_COPY_UNCONTROLLED", "REVISE", "CANCEL"]),
    z.literal(""),
  ]).refine((val) => val !== "", { message: "กรุณาเลือกวัตถุประสงค์" }),
  docType: z.union([
    z.enum(["MANUAL", "FORMAT", "DRAWING", "PROCEDURE", "SOP", "SIP", "IPQC", "OTHER"]),
    z.literal(""),
  ]).refine((val) => val !== "", { message: "กรุณาเลือกประเภทเอกสาร" }),
  docTypeOther: z.string().max(100),
  reason: z.string().min(1, "กรุณาระบุเหตุผล").max(2000),
  items: z.array(
    z.object({
      docNumber: z.string().min(1, "กรุณาระบุเลขที่เอกสาร").max(100),
      docName: z.string().min(1, "กรุณาระบุชื่อเอกสาร").max(255),
      revision: z.string().min(1, "กรุณาระบุ Revision").max(50),
      effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง").optional().or(z.literal("")),
    })
  ).min(1, "ต้องมีเอกสารอย่างน้อย 1 รายการ"),
  distributionDepartmentIds: z.array(z.string()),
}).refine((data) => {
  if (data.docType === "OTHER" && (!data.docTypeOther || !data.docTypeOther.trim())) {
    return false;
  }
  return true;
}, {
  message: "กรุณาระบุประเภทเอกสาร",
  path: ["docTypeOther"],
});

export function useDarForm(
  mode: "create" | "edit",
  initialData: DarDetail | undefined,
  onSuccess: (message: string) => void,
  onError: (message: string) => void,
) {
  const router = useRouter();

  const defaultValues: FormState = initialData ? {
    objective: initialData.objective,
    docType: initialData.docType,
    docTypeOther: initialData.docTypeOther ?? "",
    reason: initialData.reason,
    items: initialData.items.map(({ docNumber, docName, revision, effectiveDate }) => ({
      docNumber,
      docName,
      revision,
      effectiveDate: effectiveDate ? effectiveDate.slice(0, 10) : "",
    })),
    distributionDepartmentIds: initialData.distributions.map((d) => d.departmentId),
  } : {
    objective: "",
    docType: "",
    docTypeOther: "",
    reason: "",
    items: [{ docNumber: "", docName: "", revision: "", effectiveDate: "" }],
    distributionDepartmentIds: [],
  };

  const {
    setValue,
    getValues,
    watch,
    trigger,
    formState,
  } = useForm<FormState>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const state = watch();

  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedDarId, setSavedDarId] = useState<string | null>(initialData?.id ?? null);
  const [tempAttachments, setTempAttachments] = useState<TempAttachmentInput[]>([]);

  const setField = useCallback(<K extends FormKey>(key: K, value: FormState[K]) => {
    (setValue as (name: FormKey, value: FormState[FormKey], opts?: object) => void)(key, value, { shouldValidate: true });
  }, [setValue]);

  const flatErrors: Record<string, string> = {};

  if (formState.errors.objective?.message) flatErrors.objective = formState.errors.objective.message;
  if (formState.errors.docType?.message) flatErrors.docType = formState.errors.docType.message;
  if (formState.errors.docTypeOther?.message) flatErrors.docTypeOther = formState.errors.docTypeOther.message;
  if (formState.errors.reason?.message) flatErrors.reason = formState.errors.reason.message;

  if (formState.errors.items) {
    if (Array.isArray(formState.errors.items)) {
      formState.errors.items.forEach((itemError, idx: number) => {
        const typedItemError = itemError as ItemError | undefined;
        if (typedItemError) {
          if (typedItemError.docNumber?.message) flatErrors[`items.${idx}.docNumber`] = typedItemError.docNumber.message;
          if (typedItemError.docName?.message) flatErrors[`items.${idx}.docName`] = typedItemError.docName.message;
          if (typedItemError.revision?.message) flatErrors[`items.${idx}.revision`] = typedItemError.revision.message;
          if (typedItemError.effectiveDate?.message) flatErrors[`items.${idx}.effectiveDate`] = typedItemError.effectiveDate.message;
        }
      });
    } else if (formState.errors.items.message) {
      flatErrors.items = formState.errors.items.message;
    }
  }

  function buildBody(formData: FormState, action: "DRAFT" | "SUBMIT") {
    return {
      objective: formData.objective,
      docType: formData.docType,
      docTypeOther: formData.docTypeOther || undefined,
      reason: formData.reason,
      items: formData.items,
      distributionDepartmentIds: formData.distributionDepartmentIds,
      action,
    };
  }

  async function callApi(action: "DRAFT" | "SUBMIT") {
    const isValid = await trigger();
    if (!isValid) return;

    const values = getValues();
    const isSubmit = action === "SUBMIT";
    if (isSubmit) setIsSubmitting(true); else setIsSaving(true);

    try {
      let res: Response;

      if (mode === "create" && !savedDarId) {
        res = await fetch("/api/dar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...buildBody(values, action), tempAttachments }),
        });
      } else {
        const darId = savedDarId ?? initialData!.id;
        if (isSubmit) {
          await fetch(`/api/dar/${darId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildBody(values, "DRAFT")),
          });
          res = await fetch(`/api/dar/${darId}/submit`, { method: "POST" });
        } else {
          res = await fetch(`/api/dar/${darId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildBody(values, "DRAFT")),
          });
        }
      }

      const json = await res.json();
      if (!res.ok || json.error) {
        onError(getErrorMessage(json.error, "เกิดข้อผิดพลาด"));
        return;
      }

      const darId = json.data.id as string;
      if (isSubmit) {
        onSuccess("ส่งคำขอสำเร็จ");
        router.push(`/dar/${darId}`);
        router.refresh();
      } else {
        setSavedDarId(darId);
        onSuccess("บันทึกฉบับร่างสำเร็จ");
        if (mode === "edit") {
          router.push(`/dar/${darId}`);
          router.refresh();
        }
      }
    } catch {
      onError("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setIsSaving(false);
      setIsSubmitting(false);
    }
  }

  async function validateAndStart(): Promise<boolean> {
    const isValid = await trigger();
    return isValid;
  }

  async function submitWithReviewer(
    signatureDataUrl: string,
    signatureType: SignatureType,
    saveSignature: boolean,
    reviewer: ReviewerUser,
  ): Promise<boolean> {
    setIsSubmitting(true);
    try {
      const values = getValues();
      let darId: string;

      if (mode === "create" && !savedDarId) {
        const res = await fetch("/api/dar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...buildBody(values, "SUBMIT"), tempAttachments }),
        });
        const json = await res.json();
        if (!res.ok || json.error) {
          onError(getErrorMessage(json.error, "เกิดข้อผิดพลาด"));
          return false;
        }
        darId = json.data.id as string;
      } else {
        const id = savedDarId ?? initialData!.id;
        await fetch(`/api/dar/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildBody(values, "DRAFT")),
        });
        const res = await fetch(`/api/dar/${id}/submit`, { method: "POST" });
        const json = await res.json();
        if (!res.ok || json.error) {
          onError(getErrorMessage(json.error, "เกิดข้อผิดพลาด"));
          return false;
        }
        darId = id;
      }

      const approveRes = await fetch(`/api/dar/${darId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureDataUrl, signatureType, saveSignature }),
      });
      const approveJson = await approveRes.json();
      if (!approveRes.ok || approveJson.error) {
        onError(getErrorMessage(approveJson.error, "เกิดข้อผิดพลาดในการลงลายมือชื่อ"));
        return false;
      }

      const assignRes = await fetch(`/api/dar/${darId}/assign-reviewer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewerUserId: reviewer.id }),
      });
      const assignJson = await assignRes.json();
      if (!assignRes.ok || assignJson.error) {
        onError(getErrorMessage(assignJson.error, "เกิดข้อผิดพลาดในการกำหนดผู้ตรวจสอบ"));
        return false;
      }

      onSuccess("ส่งคำขอสำเร็จ");
      router.refresh();
      router.push(`/dar/${darId}`);
      return true;
    } catch {
      onError("เกิดข้อผิดพลาด กรุณาลองใหม่");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    state,
    errors: flatErrors,
    isSaving,
    isSubmitting,
    savedDarId,
    tempAttachments,
    setTempAttachments,
    setField,
    saveDraft: () => callApi("DRAFT"),
    submitForm: () => callApi("SUBMIT"),
    validateAndStart,
    submitWithReviewer,
  };
}
