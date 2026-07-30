"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { CarDetail, CarAttachmentRow } from "@/types/car";

import { parseComment } from "@/lib/utils";

function Attachments({ files }: { files: CarAttachmentRow[] }) {
  if (!files?.length) return null;
  return (
    <div className="flex flex-col gap-1 mt-0.5 pl-2 border-l-2 border-slate-200">
      {files.map((file) => (
        <a
          key={file.id}
          href={`/api/sharepoint/get-file?itemId=${file.spItemId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1 not-italic font-medium"
        >
          <Paperclip className="w-3 h-3" />
          {file.fileName}
        </a>
      ))}
    </div>
  );
}

function Comment({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const parsed = parseComment(text);
  const commentText = parsed.text;
  const isLong = commentText.length > 80;
  return (
    <div className="mt-1 flex flex-col gap-1">
      <p className="text-xs text-slate-600 italic">
        &quot;{isLong && !expanded ? commentText.slice(0, 80) + "…" : commentText}&quot;
        {isLong && (
          <button onClick={() => setExpanded(!expanded)} className="ml-1 text-blue-500 hover:underline not-italic">
            {expanded ? "ย่อ" : "ดูเพิ่ม"}
          </button>
        )}
      </p>
      {parsed.attachments && parsed.attachments.length > 0 && (
        <div className="flex flex-col gap-1 mt-0.5 pl-2 border-l-2 border-slate-200">
          {parsed.attachments.map((file, idx) => (
            <a
              key={idx}
              href={`/api/sharepoint/get-file?itemId=${file.spItemId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1 not-italic font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {file.fileName}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  car: CarDetail;
}

function Step({ done, label, meta }: { done: boolean; label: string; meta?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">
        {done ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Circle className="w-5 h-5 text-slate-300" />}
      </div>
      <div>
        <p className={cn("text-sm font-semibold", done ? "text-slate-800" : "text-slate-400")}>{label}</p>
        {done && meta ? <div className="mt-0.5 text-xs text-slate-500">{meta}</div> : null}
      </div>
    </div>
  );
}

export default function CarTimeline({ car }: Props) {
  const t = useT();
  const fmt = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" }) : null;

  const verify1 = car.verifications.find((v) => v.round === 1);
  const verify2 = car.verifications.find((v) => v.round === 2);
  const hasVerify2 = verify1?.result === "FAILED";
  const hasReCar = car.status === "RE_CAR" || car.reCarChildren.length > 0;

  return (
    <div className="space-y-4 py-2">
      <Step
        done={!!car.issuedAt}
        label={t("car.timeline.stepIssued")}
        meta={
          <>
            {t("car.timeline.labelNo")} {car.carNo} · {fmt(car.issuedAt)} · {t("car.timeline.labelIssuedBy")} {car.issuer.name}
            {car.issuerSignaturePath && (
              <>
                {" · "}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={car.issuerSignaturePath} alt="ลายเซ็น" className="inline-block h-5 object-contain align-middle ml-1" />
              </>
            )}
          </>
        }
      />
      <Step
        done={!!car.response}
        label={t("car.timeline.stepResponded")}
        meta={
          car.response ? (
            <>
              {fmt(car.response.respondedAt)} · {car.response.responder.name} ({car.response.responderPosition})
              <br />
              {t("car.timeline.labelPlannedDate")} {fmt(car.response.plannedCompletionDate)}
              {" · "}{car.response.responseType === "FIVE_WHY" ? "5 Whys" : "อื่นๆ"}
              {car.response.responderSignaturePath && (
                <>
                  {" · "}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={car.response.responderSignaturePath} alt="ลายเซ็น" className="inline-block h-5 object-contain align-middle ml-1" />
                </>
              )}
            </>
          ) : undefined
        }
      />
      <Step
        done={!!car.mrResponseReview}
        label={t("car.timeline.stepMrReview")}
        meta={
          car.mrResponseReview ? (
            <>
              {fmt(car.mrResponseReview.reviewedAt)} · {car.mrResponseReview.mrUser.name}
              {" · "}
              <span className={car.mrResponseReview.action === "APPROVED" ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
                {car.mrResponseReview.action === "APPROVED" ? "อนุมัติ" : "ปฏิเสธ"}
              </span>
              {car.mrResponseReview.comment ? <Comment text={car.mrResponseReview.comment} /> : null}
            </>
          ) : undefined
        }
      />
      <Step
        done={!!verify1}
        label={t("car.timeline.stepVerify1")}
        meta={
          verify1 ? (
            <>
              {fmt(verify1.verifiedAt)} · {verify1.verifier.name}
              <br />
              {t("car.timeline.labelResult")}{" "}
              <span className={verify1.result === "PASSED" ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
                {verify1.result === "PASSED" ? t("car.timeline.labelPassed") : t("car.timeline.labelFailed")}
              </span>
              {verify1.nextDueDate ? (
                <>
                  {" "}· {t("car.timeline.labelNextDue")} {fmt(verify1.nextDueDate)}
                </>
              ) : null}
              {verify1.verifierSignaturePath && (
                <>
                  {" · "}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={verify1.verifierSignaturePath} alt="ลายเซ็น" className="inline-block h-5 object-contain align-middle ml-1" />
                </>
              )}
              <Comment text={verify1.findings} />
              <Attachments files={verify1.attachments} />
            </>
          ) : undefined
        }
      />
      {hasVerify2 ? (
        <Step
          done={!!verify2}
          label={t("car.timeline.stepVerify2")}
          meta={
            verify2 ? (
              <>
                {fmt(verify2.verifiedAt)} · {verify2.verifier.name}
                <br />
                {t("car.timeline.labelResult")}{" "}
                <span className={verify2.result === "PASSED" ? "text-emerald-600 font-semibold" : "text-rose-600 font-semibold"}>
                  {verify2.result === "PASSED" ? t("car.timeline.labelPassed") : t("car.timeline.labelFailed")}
                </span>
                {verify2.verifierSignaturePath && (
                  <>
                    {" · "}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={verify2.verifierSignaturePath} alt="ลายเซ็น" className="inline-block h-5 object-contain align-middle ml-1" />
                  </>
                )}
                <Comment text={verify2.findings} />
                <Attachments files={verify2.attachments} />
              </>
            ) : undefined
          }
        />
      ) : null}
      {car.status === "CLOSED" || car.mrSignature ? (
        <Step
          done={!!car.mrSignature}
          label={t("car.timeline.stepMrSigned")}
          meta={
            car.mrSignature ? (
              <>
                {fmt(car.mrSignature.signedAt)} · {car.mrSignature.mrUser.name}
                {car.mrSignature.comment ? <Comment text={car.mrSignature.comment} /> : null}
                <Attachments files={car.mrSignature.attachments} />
              </>
            ) : undefined
          }
        />
      ) : null}
      {hasReCar ? (
        <div className="ml-8 space-y-1">
          <p className="text-xs font-semibold text-rose-600">{t("car.timeline.reCarTitle")}</p>
          {car.reCarChildren.map((child) => (
            <Link key={child.id} href={`/qms/car/${child.id}`} className="block text-xs text-blue-600 hover:underline font-mono">
              {child.carNo} ({child.status})
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
