"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { ActionPillButton } from "@/components/common/ActionButtons";
import { Button } from "@/components/ui/button";
import { Send, ClipboardCheck, BellRing, FileText, Download, Eye, CheckCircle2, ShieldCheck, ChevronRight } from "lucide-react";
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

  const canRespond =
    car.status === "ISSUED" &&
    userDepartmentId === car.targetDepartment.id;

  const canVerify =
    (car.status === "VERIFY_1" || car.status === "VERIFY_2") &&
    (userRole === "QMS" || userRole === "IT");

  const canIssue =
    car.status === "DRAFT" &&
    (userRole === "QMS" || userRole === "IT");

  const canEdit =
    car.status === "DRAFT" &&
    (userRole === "QMS" || userRole === "IT");

  const canReCar =
    car.status === "RE_CAR" &&
    (userRole === "QMS" || userRole === "IT");

  const canRemind =
    car.status === "ISSUED" &&
    (userRole === "QMS" || userRole === "IT");

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
        </div>
      </div>

      {/* 2-column body */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Left — main content */}
        <div className="lg:col-span-2 space-y-5">

          {/* Details card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-5">
            <div>
              <p className="text-xs text-slate-500">{t("car.detail.labelType")}</p>
              <p className="text-sm font-medium text-slate-900">{CAR_SOURCE_LABELS[car.sourceType] ?? car.sourceType}</p>
              {car.sourceDetail && <p className="text-xs text-slate-500 mt-0.5">{car.sourceDetail}</p>}
            </div>
            <div>
              <p className="text-xs text-slate-500">{t("car.detail.labelTargetDept")}</p>
              <p className="text-sm font-medium text-slate-900">{car.targetDepartment.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">{t("car.detail.labelIssuer")}</p>
              <p className="text-sm font-medium text-slate-900">{car.issuer.name} ({car.issuerPosition})</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">{t("car.detail.labelIso")}</p>
              <p className="text-sm font-medium text-slate-900">{car.isoStandards.join(", ") || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">{t("car.detail.labelIssuedAt")}</p>
              <p className="text-sm font-medium">{fmtDate(car.issuedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">{t("car.detail.labelDueAt")}</p>
              <p className={`text-sm font-medium ${car.responseDueAt && new Date(car.responseDueAt) < new Date() && car.status === "ISSUED" ? "text-rose-600" : ""}`}>
                {fmtDate(car.responseDueAt)}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500">{t("car.detail.labelDefect")}</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{car.defectDetail}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500">{t("car.detail.labelNonConformance")}</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{car.nonConformanceRef}</p>
            </div>
          </div>

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
            <div className="rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-5">
              <h2 className="text-base font-semibold text-slate-800 mb-4">{t("car.detail.respondFormTitle")}</h2>
              <CarRespondForm carId={car.id} defaultPosition={userJobTitle ?? ""} onSuccess={() => setShowRespond(false)} />
            </div>
          )}

          {/* Verify form (QMS) */}
          {showVerify && (
            <div className="rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-5">
              <h2 className="text-base font-semibold text-slate-800 mb-4">
                {t("car.detail.verifyTitle", { round: String(car.status === "VERIFY_2" ? 2 : 1) })}
              </h2>
              <CarVerifyForm
                carId={car.id}
                currentStatus={car.status}
                defaultPosition={userJobTitle ?? ""}
                onSuccess={() => setShowVerify(false)}
              />
            </div>
          )}

          {/* Response detail */}
          {car.response && (
            <div className="rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-5 space-y-3">
              <h2 className="text-base font-semibold text-slate-800">{t("car.detail.responseTitle")}</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">{t("car.detail.labelResponder")}</dt>
                  <dd className="text-slate-800">{car.response.responder.name} ({car.response.responderPosition})</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">{t("car.detail.labelRespondedAt")}</dt>
                  <dd className="text-slate-800">{fmtDate(car.response.respondedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">{t("car.detail.labelPlannedDate")}</dt>
                  <dd className="text-slate-800">{fmtDate(car.response.plannedCompletionDate)}</dd>
                </div>
                {car.response.responseType === "FIVE_WHY" && car.response.fiveWhys && car.response.fiveWhys.length > 0 && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-slate-500 mb-2">5 Whys Analysis</dt>
                    <dd className="space-y-2">
                      {car.response.fiveWhys.map((w, i) => (
                        <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
                          <p className="font-medium text-slate-600 text-xs mb-1">Why {i + 1}: {w.question}</p>
                          <p className="text-slate-800">{w.answer || <span className="text-slate-400">—</span>}</p>
                        </div>
                      ))}
                    </dd>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">{t("car.detail.labelRootCause")}</dt>
                  <dd className="text-slate-800">{car.response.rootCauseSummary}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">{t("car.detail.labelImmediateAction")}</dt>
                  <dd className="text-slate-800 whitespace-pre-wrap">{car.response.immediateAction}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-slate-500">{t("car.detail.labelPreventiveAction")}</dt>
                  <dd className="text-slate-800 whitespace-pre-wrap">{car.response.preventiveAction}</dd>
                </div>
                {car.response.responderSignaturePath && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-slate-500 mb-1">ลายเซ็นผู้ตอบกลับ</dt>
                    <dd>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={car.response.responderSignaturePath} alt="ลายเซ็น" className="h-12 object-contain border border-slate-100 rounded-lg p-1 bg-white" />
                    </dd>
                  </div>
                )}
              </dl>

              {/* Attachments */}
              {car.response.attachments.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-2">ไฟล์แนบ</p>
                  <ul className="space-y-1">
                    {car.response.attachments.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                        <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="flex-1 truncate text-sm text-slate-700">{a.fileName}</span>
                        <span className="shrink-0 text-xs text-slate-400">{Math.round(a.fileSize / 1024)} KB</span>
                        <button
                          onClick={() => setPreviewFile(a)}
                          className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <a href={a.spDownloadUrl} target="_blank" rel="noopener noreferrer"
                          className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600">
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
                  <div className="pt-2 border-t border-slate-100">
                    <CarAttachmentUpload
                      carResponseId={car.response.id}
                      onUploaded={() => qc.invalidateQueries({ queryKey: ["car", car.id] })}
                    />
                  </div>
                )}
            </div>
          )}
        </div>

        {/* Right — timeline (sticky) */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white p-5">
            <h2 className="text-base font-semibold text-slate-800 mb-4">{t("car.detail.timelineTitle")}</h2>
            <CarTimeline car={car} />
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
