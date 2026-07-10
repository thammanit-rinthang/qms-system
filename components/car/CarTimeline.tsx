"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import type { CarDetail } from "@/types/car";

function Comment({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 80;
  return (
    <p className="mt-1 text-xs text-slate-600 italic">
      &quot;{isLong && !expanded ? text.slice(0, 80) + "…" : text}&quot;
      {isLong && (
        <button onClick={() => setExpanded(!expanded)} className="ml-1 text-blue-500 hover:underline not-italic">
          {expanded ? "ย่อ" : "ดูเพิ่ม"}
        </button>
      )}
    </p>
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
