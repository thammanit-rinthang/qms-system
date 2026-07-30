"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import RichTextView from "@/components/shared/RichTextView";
import { ActionPillButton } from "@/components/common/ActionButtons";
import { Button } from "@/components/ui/button";
import { Send, ClipboardCheck, BellRing, FileText, Download, Eye, CheckCircle2, ShieldCheck, ChevronRight, Printer, Paperclip, ClipboardList, History, AlertTriangle } from "lucide-react";
import CarStatusBadge from "./CarStatusBadge";
import CarTimeline from "./CarTimeline";
import CarIssueDialog from "./CarIssueDialog";
import CarVerifyForm from "./CarVerifyForm";
import CarRespondForm from "./CarRespondForm";
import CarAttachmentUpload from "./CarAttachmentUpload";
import CarFormModal from "./CarFormModal";
import CarMrResponseReviewPanel from "./CarMrResponseReviewPanel";
import CarMrSignDialog from "./CarMrSignDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CarDetail, CarAttachmentRow } from "@/types/car";
import { CAR_SOURCE_LABELS } from "@/types/car";
import { FilePreviewModal } from "@/components/common/FilePreviewModal";
import { fmtDate } from "@/lib/format";
import { parseComment } from "@/lib/utils";

interface Props {
  car: CarDetail;
  userRole: string;
  userId: string;
  userDepartmentId: string | null;
  isPrivileged: boolean;
  userJobTitle?: string | null;
  listPath?: string;
}

async function fetchCar(id: string): Promise<CarDetail> {
  const res = await fetch(`/api/car/${id}`);
  if (!res.ok) throw new Error("Failed to fetch CAR");
  const json = await res.json();
  return json.data;
}

async function createReCar(carId: string): Promise<{ newCarId: string; newCarNo: string }> {
  const res = await fetch(`/api/car/${carId}/re-car`, { method: "POST" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? "Failed to create Re-CAR");
  }
  const json = await res.json();
  return json.data;
}

async function setVerify2DueDate(carId: string, nextDueDate: string, fallbackErrorMsg?: string): Promise<void> {
  const res = await fetch(`/api/car/${carId}/verify2-due-date`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nextDueDate }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message ?? fallbackErrorMsg ?? "Failed to save verification round 2 date");
  }
}

function InfoField({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</p>
      <div className="mt-1.5 text-sm font-medium leading-6 text-slate-900">{children}</div>
    </div>
  );
}

function LongField({ label, children, tone = "slate", className = "" }: { label: string; children: React.ReactNode; tone?: "slate" | "blue"; className?: string }) {
  return (
    <section className={`rounded-xl border px-4 py-3.5 ${tone === "blue" ? "border-blue-100 bg-blue-50/45" : "border-slate-100 bg-slate-50/75"} ${className}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">{label}</p>
      <div className="rich-view mt-2 max-w-[72ch] text-sm leading-7 text-slate-700">{children}</div>
    </section>
  );
}

function CardHeader({ icon: Icon, title, extra }: { icon: React.ElementType; title: string; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-bold text-slate-700">{title}</h2>
      </div>
      {extra}
    </div>
  );
}

function MrRejectReviewCard({ review }: { review: NonNullable<CarDetail["mrResponseReview"]> }) {
  if (review.action !== "REJECTED" || !review.comment) return null;
  const parsed = parseComment(review.comment);

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
      <h2 className="text-base font-semibold text-rose-800">MR Reject Detail</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm text-rose-900">{parsed.text || "-"}</p>
      {parsed.attachments?.length ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold text-rose-700">Attachments</p>
          {parsed.attachments.map((file, index) => (
            <a
              key={`${file.spItemId}-${index}`}
              href={`/api/sharepoint/get-file?itemId=${file.spItemId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm text-rose-700 hover:bg-rose-100"
            >
              <Paperclip className="h-4 w-4 shrink-0" />
              <span className="truncate">{file.fileName}</span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function CarDetailClient({
  car: initialCar,
  userRole,
  userId: _userId,
  userDepartmentId,
  isPrivileged: _isPrivileged,
  userJobTitle,
  listPath = "/car",
}: Props) {
  const t = useT();
  const qc = useQueryClient();
  const router = useRouter();
  void _userId;
  void _isPrivileged;
  const [showRespond, setShowRespond] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showMrReview, setShowMrReview] = useState(false);
  const [showMrClose, setShowMrClose] = useState(false);
  const [previewFile, setPreviewFile] = useState<CarAttachmentRow | null>(null);
  const [verify2DueDate, setVerify2DueDateValue] = useState("");

  const { data: car = initialCar } = useQuery({
    queryKey: ["car", initialCar.id],
    queryFn: () => fetchCar(initialCar.id),
    initialData: initialCar,
  });

  const reminderMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/car/${car.id}/remind`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message ?? "Failed to send reminder");
      }
    },
    onSuccess: () => toast.success("ส่ง reminder แล้ว"),
    onError: (err) => toast.error((err as Error).message),
  });

  const reCarMutation = useMutation({
    mutationFn: () => createReCar(car.id),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["cars"] });
      qc.invalidateQueries({ queryKey: ["car", car.id] });
      router.push(`${listPath}/${result.newCarId}`);
    },
    onError: (err) => {
      toast.error((err as Error).message, { duration: Infinity });
    },
  });

  const verify2DueDateMutation = useMutation({
    mutationFn: () => setVerify2DueDate(car.id, verify2DueDate, t("car.detail.verify2DateError")),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["car", car.id] });
      qc.invalidateQueries({ queryKey: ["cars"] });
      setVerify2DueDateValue("");
      toast.success(t("car.detail.verify2DateSuccess"));
    },
    onError: (err) => toast.error((err as Error).message, { duration: Infinity }),
  });

  const verify1 = car.verifications.find((v) => v.round === 1);

  const canRespond =
    car.status === "ISSUED" &&
    userDepartmentId === car.targetDepartment.id;

  const canSetVerify2DueDate =
    car.status === "VERIFY_2" &&
    verify1?.result === "FAILED" &&
    !verify1.nextDueDate &&
    (!!userDepartmentId &&
      (userDepartmentId === car.targetDepartment.id ||
        userDepartmentId === car.targetAuthDepartmentId));

  const canVerify =
    (car.status === "VERIFY_1" || car.status === "VERIFY_2") &&
    (userRole === "QMS" || userRole === "IT" || userRole === "MR");

  const canIssue =
    car.status === "DRAFT" &&
    (userRole === "QMS" || userRole === "IT" || userRole === "MR");

  const canEdit =
    car.status === "DRAFT" &&
    (userRole === "QMS" || userRole === "IT" || userRole === "MR");

  const canReCar =
    car.status === "RE_CAR" &&
    (userRole === "QMS" || userRole === "IT" || userRole === "MR");

  const canRemind =
    car.status === "ISSUED" &&
    (userRole === "QMS" || userRole === "IT" || userRole === "MR");

  const canMrReview =
    car.status === "RESPONDED" &&
    userRole === "MR";

  const canMrClose =
    car.status === "CLOSED" &&
    !car.mrSignature &&
    userRole === "MR";

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-400">
        <Link href={listPath} className="hover:text-slate-600 transition-colors">CAR</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="font-mono font-medium text-slate-600">{car.carNo}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 font-mono">{car.carNo}</h1>
            <CarStatusBadge status={car.status} />
            {car.reCar && (
              <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 rounded-full px-2 py-0.5 font-semibold">
                {t("car.detail.reCarBadge")}
              </span>
            )}
          </div>
          {car.reCarRef && (
            <p className="mt-1 text-sm text-slate-500">
              {t("car.detail.refLabel")}{" "}
              <Link href={`/qms/car/${car.reCarRef.id}`} className="text-blue-600 hover:underline font-mono">
                {car.reCarRef.carNo}
              </Link>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <ActionPillButton
              tone="edit"
              label={t("car.detail.btnEdit")}
              onClick={() => setShowEdit(true)}
            />
          )}
          {canIssue && <CarIssueDialog carId={car.id} carNo={car.carNo} />}
          {canRemind && (
            <Button
              variant="outline"
              onClick={() => reminderMutation.mutate()}
              disabled={reminderMutation.isPending}
            >
              <BellRing className="w-3.5 h-3.5 mr-1.5" />
              {reminderMutation.isPending ? "กำลังส่ง..." : "ส่ง Reminder"}
            </Button>
          )}
          {canVerify && !showVerify && (
            <Button onClick={() => setShowVerify(true)} className="bg-orange-500 hover:bg-orange-600">
              <ClipboardCheck className="w-3.5 h-3.5 mr-1.5" />
              {t("car.detail.btnVerify")}
            </Button>
          )}
          {canMrReview && (
            <>
              <Button onClick={() => { setShowMrReview(true); }} className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                อนุมัติ / ส่งคืน
              </Button>
            </>
          )}
          {canMrClose && (
            <Button onClick={() => setShowMrClose(true)} className="bg-emerald-600 hover:bg-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
              ลงนามปิด CAR
            </Button>
          )}
          {canReCar && (
            <Button
              onClick={() => reCarMutation.mutate()}
              disabled={reCarMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {reCarMutation.isPending ? t("car.detail.btnCreatingReCar") : t("car.detail.btnCreateReCar")}
            </Button>
          )}
          <Link href={`/print/qms/car/${car.id}`} target="_blank" rel="noreferrer">
            <Button variant="outline">
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              พิมพ์เอกสาร CAR
            </Button>
          </Link>
        </div>
      </div>

      {/* 2-column body */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_21rem]">

        {/* Left — main content */}
        <div className="min-w-0 space-y-5">

          {/* Details card */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgb(15,16,89,0.045)]">
            <CardHeader
              icon={FileText}
              title="รายละเอียด CAR"
              extra={
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {car.targetDepartment.name}
                </span>
              }
            />
            <div className="grid grid-cols-1 gap-x-8 gap-y-5 p-5 sm:grid-cols-2 lg:p-6">
              <InfoField label={t("car.detail.labelType")}>
                {CAR_SOURCE_LABELS[car.sourceType] ?? car.sourceType}
                {car.sourceDetail && <p className="mt-0.5 text-xs font-normal text-slate-500">{car.sourceDetail}</p>}
              </InfoField>
              <InfoField label={t("car.detail.labelTargetDept")}>{car.targetDepartment.name}</InfoField>
              <InfoField label={t("car.detail.labelIssuer")}>{car.issuer.name} ({car.issuerPosition})</InfoField>
              <InfoField label={t("car.detail.labelIso")}>{car.isoStandards.join(", ") || "—"}</InfoField>
              <InfoField label={t("car.detail.labelIssuedAt")}>{fmtDate(car.issuedAt)}</InfoField>
              <InfoField label={t("car.detail.labelDueAt")}>
                {car.responseDueAt && new Date(car.responseDueAt) < new Date() && car.status === "ISSUED" ? (
                  <span className="inline-flex items-center gap-1.5 text-rose-600">
                    {fmtDate(car.responseDueAt)}
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-semibold">
                      <AlertTriangle className="h-3 w-3" />
                      เกินกำหนด
                    </span>
                  </span>
                ) : (
                  fmtDate(car.responseDueAt)
                )}
              </InfoField>
              <div className="border-t border-slate-100 pt-5 sm:col-span-2">
                <LongField label={t("car.detail.labelDefect")} tone="blue">
                  <RichTextView content={car.defectDetail} />
                </LongField>
              </div>
              <div className="sm:col-span-2">
                <LongField label={t("car.detail.labelNonConformance")}>
                  <RichTextView content={car.nonConformanceRef} />
                </LongField>
              </div>
            </div>
          </div>

          {car.mrResponseReview && <MrRejectReviewCard review={car.mrResponseReview} />}

          {/* Respond prompt (USER) */}
          {canRespond && !showRespond && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-blue-800">{t("car.detail.respondPrompt")}</p>
              <Button onClick={() => setShowRespond(true)} className="shrink-0">
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {t("car.detail.btnRespond")}
              </Button>
            </div>
          )}
          {showRespond && (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgb(15,16,89,0.045)]">
              <CardHeader icon={Send} title={t("car.detail.respondFormTitle")} />
              <div className="p-5">
                <CarRespondForm carId={car.id} defaultPosition={userJobTitle ?? ""} onSuccess={() => setShowRespond(false)} />
              </div>
            </div>
          )}

          {canSetVerify2DueDate && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="text-base font-semibold text-amber-900">{t("car.detail.verify2DateTitle")}</h2>
              <p className="mt-1 text-sm text-amber-800">
                {t("car.detail.verify2DateDesc")}
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-amber-900">{t("car.detail.verify2DateLabel")}</label>
                  <input
                    type="date"
                    value={verify2DueDate}
                    onChange={(event) => setVerify2DueDateValue(event.target.value)}
                    className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm focus:border-[#0F1059] focus:outline-none focus:ring-2 focus:ring-[#0F1059]/20"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => verify2DueDateMutation.mutate()}
                  disabled={!verify2DueDate || verify2DueDateMutation.isPending}
                >
                  {verify2DueDateMutation.isPending ? t("car.detail.verify2DateBtnSaving") : t("car.detail.verify2DateBtnSave")}
                </Button>
              </div>
            </div>
          )}

          {/* Verify form (QMS) */}
          {showVerify && (
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <CardHeader
                icon={ClipboardCheck}
                title={t("car.detail.verifyTitle", { round: String(car.status === "VERIFY_2" ? 2 : 1) })}
              />
              <div className="p-5">
              <CarVerifyForm
                carId={car.id}
                currentStatus={car.status}
                defaultPosition={userJobTitle ?? ""}
                onSuccess={() => setShowVerify(false)}
              />
              </div>
            </div>
          )}

          {/* Response detail */}
          {car.response && (
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <CardHeader icon={ClipboardList} title={t("car.detail.responseTitle")} />
              <div className="space-y-4 p-5">
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  <InfoField label={t("car.detail.labelResponder")}>
                    {car.response.responder.name} ({car.response.responderPosition})
                  </InfoField>
                  <InfoField label={t("car.detail.labelRespondedAt")}>{fmtDate(car.response.respondedAt)}</InfoField>
                  <InfoField label={t("car.detail.labelPlannedDate")}>
                    <span className="text-blue-700">{fmtDate(car.response.plannedCompletionDate)}</span>
                  </InfoField>
                </div>

                {car.response.responseType === "FIVE_WHY" && car.response.fiveWhys && car.response.fiveWhys.length > 0 && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">5 Whys Analysis</p>
                    <div className="relative space-y-3 pl-10">
                      {car.response.fiveWhys.map((w, i) => (
                        <div key={i} className="relative rounded-xl border border-slate-200/80 bg-slate-50/80 p-4 text-sm leading-7">
                          <span className="absolute -left-10 top-4 flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white shadow-sm">{i + 1}</span>
                          <p className="mb-1 text-xs font-semibold text-slate-500">Why {i + 1}</p>
                          <p className="text-slate-500">{w.question}</p>
                          <p className="mt-2 whitespace-pre-wrap text-slate-800">{w.answer || <span className="text-slate-400">—</span>}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-x-6 gap-y-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                  <LongField label={t("car.detail.labelRootCause")} tone="blue" className="sm:col-span-2"><span className="whitespace-pre-wrap">{car.response.rootCauseSummary || "—"}</span></LongField>
                  <LongField label={t("car.detail.labelImmediateAction")}><span className="whitespace-pre-wrap">{car.response.immediateAction || "—"}</span></LongField>
                  <LongField label={t("car.detail.labelPreventiveAction")}><span className="whitespace-pre-wrap">{car.response.preventiveAction || "—"}</span></LongField>
                </div>

                {car.response.responderSignaturePath && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">ลายเซ็นผู้ตอบกลับ</p>
                    <div className="flex w-36 items-center justify-center rounded-xl border border-slate-200 bg-white p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={car.response.responderSignaturePath} alt="ลายเซ็น" className="h-10 w-full object-contain" />
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {car.response.attachments.length > 0 && (
                  <div className="border-t border-slate-100 pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">ไฟล์แนบ</p>
                    <ul className="space-y-1.5">
                      {car.response.attachments.map((a) => (
                        <li key={a.id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                          <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="flex-1 truncate text-sm text-slate-700">{a.fileName}</span>
                          <span className="shrink-0 text-xs text-slate-400">{Math.round(a.fileSize / 1024)} KB</span>
                          <button
                            onClick={() => setPreviewFile(a)}
                            className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <a href={`/api/sharepoint/get-file?itemId=${a.spItemId}`} target="_blank" rel="noopener noreferrer"
                            className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600">
                            <Download className="h-4 w-4" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Upload — target dept while ISSUED (responding), or QMS/MR/IT always */}
                {((userDepartmentId === car.targetDepartment.id && car.status === "ISSUED") ||
                  userRole === "QMS" ||
                  userRole === "MR" ||
                  userRole === "IT") &&
                  car.status !== "CLOSED" &&
                  car.status !== "CANCELLED" && (
                    <div className="border-t border-slate-100 pt-4">
                      <CarAttachmentUpload
                        carResponseId={car.response.id}
                        onUploaded={() => qc.invalidateQueries({ queryKey: ["car", car.id] })}
                      />
                    </div>
                  )}
              </div>
            </div>
          )}

          {car.verifications.length > 0 && (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5 shadow-[0_8px_24px_rgb(16,185,129,0.05)]">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">ผลการตรวจติดตาม</p>
                <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">{car.verifications.length} รอบ</span>
              </div>
              <div className="space-y-3">
                {car.verifications.map((v) => (
                  <div key={v.id} className="rounded-xl border border-emerald-100 bg-white/85 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-800">รอบที่ {v.round}</p>
                        <p className="mt-1 text-xs text-slate-500">{v.verifier.name ?? "-"} · {fmtDate(v.verifiedAt)}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${v.result === "PASSED" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {v.result === "PASSED" ? "ผ่าน" : "ไม่ผ่าน"}
                      </span>
                    </div>
                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">รายละเอียดการตรวจสอบ</p>
                      <RichTextView content={v.findings} className="max-w-[72ch] text-sm leading-7" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — timeline (sticky) */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <CardHeader icon={History} title={t("car.detail.timelineTitle")} />
            <div className="p-5">
              <CarTimeline car={car} />
            </div>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <CarFormModal open={showEdit} onClose={() => setShowEdit(false)} editCar={car} />

      {/* MR — review response modal */}
      <Dialog open={showMrReview} onOpenChange={setShowMrReview}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ตรวจสอบแผนแก้ไข — {car.carNo}</DialogTitle>
          </DialogHeader>
          <CarMrResponseReviewPanel
            carId={car.id}
            car={car}
            onSuccess={() => {
              setShowMrReview(false);
              qc.invalidateQueries({ queryKey: ["car", car.id] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* MR — sign to close modal */}
      <Dialog open={showMrClose} onOpenChange={setShowMrClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ลงนามปิด CAR — {car.carNo}</DialogTitle>
          </DialogHeader>
          <CarMrSignDialog
            carId={car.id}
            car={car}
            onSuccess={() => {
              setShowMrClose(false);
              qc.invalidateQueries({ queryKey: ["car", car.id] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Attachment preview */}
      {previewFile && (
        <FilePreviewModal
          target={{
            fileName: previewFile.fileName,
            mimeType: previewFile.mimeType,
            sharePointItemId: previewFile.spItemId,
            spDownloadUrl: previewFile.spDownloadUrl,
          }}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
