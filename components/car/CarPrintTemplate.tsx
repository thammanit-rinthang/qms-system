"use client";

import type { CarDetail } from "@/types/car";
import type { FooterConfig } from "@/services/qmsConfigService";
import PrintPageActions from "@/components/shared/PrintPageActions";
import { sanitizeRichTextHtml } from "@/lib/sanitizeRichText";

interface CarPrintTemplateProps {
  car: CarDetail;
  footerConfig?: FooterConfig | null;
}

const isoOptions = ["ISO9001:2015", "ISO14001:2015", "ISO45001:2018"];

function hasHtml(value: string) {
  return /<[a-z][\s\S]*>/i.test(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("th-TH");
}

function RichText({ value, className = "" }: { value: string | null | undefined; className?: string }) {
  if (!value) return <span className="empty-value">-</span>;
  if (hasHtml(value)) {
    return <div className={`rich-text ${className}`} dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(value) }} />;
  }
  return <div className={`rich-text ${className}`}>{value}</div>;
}

function Checkbox({ checked, label }: { checked: boolean; label: string }) {
  return (
    <span className="checkbox-item">
      <span className={`checkbox ${checked ? "checked" : ""}`}>{checked ? "✓" : ""}</span>
      <span>{label}</span>
    </span>
  );
}

function Signature({
  image,
  name,
  label,
  date,
}: {
  image?: string | null;
  name?: string | null;
  label: string;
  date?: string | null;
}) {
  return (
    <div className="signature">
      <div className="signature-space">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={label} />
        ) : (
          <span>{name || ""}</span>
        )}
      </div>
      <div className="signature-line" />
      <div>{label}</div>
      <div>Date / วันที่: {formatDate(date)}</div>
    </div>
  );
}

export default function CarPrintTemplate({ car, footerConfig }: CarPrintTemplateProps) {
  const response = car.response;
  const whys = response?.fiveWhys || [];
  const footerPrefix = footerConfig?.prefix?.trim() || "FM-MR-10 Rev.02";
  const sourceLabels = { I: "Internal Audit", C: "Customer Complaint", N: "Non-conforming Product", O: "Others" };
  const statusLabel = car.status === "CLOSED" ? "CLOSED / ปิดแล้ว" : `${car.status} / อยู่ระหว่างดำเนินการ`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A4 portrait; margin: 8mm; }
        * { box-sizing: border-box; }
        body { margin: 0; background: #eef1f4; color: #000; font-family: Arial, "Tahoma", sans-serif; font-size: 8.5px; line-height: 1.18; }
        .print-shell { padding: 24px 0; }
        .print-actions { margin: 0 auto 12px; max-width: 194mm; }
        .car-form { width: 194mm; min-height: 274mm; margin: 0 auto; padding: 4mm; background: #fff; box-shadow: 0 2px 8px #0002; }
        .car-form table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .car-form td, .car-form th { border: 1px solid #000; padding: 3px 4px; vertical-align: top; word-break: break-word; }
        .car-form th, .shade { background: #e7e7e7; }
        .center { text-align: center; } .right { text-align: right; } .bold { font-weight: 700; }
        .title { font-size: 14px; font-weight: 700; text-align: center; }
        .subtitle { font-size: 10px; font-weight: 700; text-align: center; }
        .logo { width: 27mm; height: 14mm; object-fit: contain; }
        .section-title { margin-top: 4px; padding: 3px 5px; border: 1px solid #000; background: #d9e2f3; font-weight: 700; }
        .section-title .number { font-size: 11px; margin-right: 4px; }
        .row-label { font-weight: 700; }
        .checkbox-item { display: inline-flex; align-items: center; gap: 3px; margin: 1px 8px 1px 0; white-space: nowrap; }
        .checkbox { display: inline-flex; width: 10px; height: 10px; border: 1px solid #000; align-items: center; justify-content: center; font-size: 9px; line-height: 9px; }
        .checkbox.checked { font-weight: 700; }
        .rich-text { white-space: pre-wrap; min-height: 18px; margin-top: 3px; }
        .rich-text p { margin: 0 0 2px; } .rich-text ul, .rich-text ol { margin: 2px 0 2px 16px; padding: 0; }
        .empty-value { color: #777; }
        .why-cell { height: 19mm; } .problem-cell { min-height: 28mm; }
        .action-cell { min-height: 27mm; }
        .signature { text-align: center; min-height: 22mm; font-size: 7.5px; }
        .signature-space { height: 12mm; display: flex; align-items: center; justify-content: center; }
        .signature-space img { max-width: 38mm; max-height: 11mm; object-fit: contain; }
        .signature-line { border-top: 1px solid #000; margin: 1px auto 2px; width: 80%; }
        .process-flow { display: grid; grid-template-columns: repeat(5, 1fr); gap: 3px; text-align: center; align-items: center; }
        .flow-step { border: 1px solid #000; min-height: 13mm; padding: 3px; display: flex; align-items: center; justify-content: center; font-weight: 700; }
        .flow-arrow { font-size: 13px; }
        .footer-note { margin-top: 3px; font-size: 7px; display: flex; justify-content: space-between; }
        .page-break { break-before: page; }
        @media print { body { background: #fff; } .print-shell { padding: 0; } .print-actions { display: none; } .car-form { width: 100%; min-height: auto; padding: 0; box-shadow: none; } }
      ` }} />

      <div className="print-shell">
        <div className="print-actions"><PrintPageActions /></div>
        <main className="car-form">
          <table>
            <tbody>
              <tr>
                <td rowSpan={2} style={{ width: "22%", verticalAlign: "middle" }} className="center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="logo" src="/logo/logo.webp" alt="NDC Industrial" />
                </td>
                <td rowSpan={2} style={{ width: "48%", verticalAlign: "middle" }}>
                  <div className="title">(CAR) Corrective Action Notice</div>
                  <div className="subtitle">ใบแจ้งดำเนินการแก้ไข CAR</div>
                </td>
                <td className="bold">CAR NO :</td><td className="bold center">{car.carNo}</td>
              </tr>
              <tr><td className="bold">Date / วันที่ :</td><td className="center">{formatDate(car.issuedAt)}</td></tr>
            </tbody>
          </table>

          <section className="section-title"><span className="number">1 /</span> (Description of Problem) รายละเอียดปัญหา</section>
          <table>
            <tbody>
              <tr>
                <td colSpan={2}><span className="row-label">Source of CAR / แหล่งที่มา :</span><br />
                  <Checkbox checked={car.sourceType === "I"} label={`(I) ${sourceLabels.I}`} />
                  <Checkbox checked={car.sourceType === "C"} label={`(C) ${sourceLabels.C}`} />
                  <Checkbox checked={car.sourceType === "N"} label={`(N) ${sourceLabels.N}`} />
                  <Checkbox checked={car.sourceType === "O"} label={`(O) ${sourceLabels.O}${car.sourceDetail ? `: ${car.sourceDetail}` : ""}`} />
                </td>
              </tr>
              <tr><td style={{ width: "50%" }}><span className="row-label">Issued by / ผู้ออก CAR :</span> {car.issuer.name || "-"}<br />Position: {car.issuerPosition || "-"}</td>
                <td><span className="row-label">Department / แผนก :</span> {car.issuer.department?.name || "-"}<br /><span className="row-label">To / ถึง :</span> {car.targetDepartment.name}</td></tr>
              <tr><td><span className="row-label">ISO requirements / ข้อกำหนด :</span><br />{isoOptions.map((iso) => <Checkbox key={iso} checked={car.isoStandards.includes(iso)} label={iso} />)}</td>
                <td><span className="row-label">Response due date / กำหนดส่งคืน :</span> {formatDate(car.responseDueAt)}<br /><span className="row-label">Re-CAR :</span> {car.reCar ? `Yes (${car.reCarRef?.carNo || "-"})` : "No"}</td></tr>
              <tr><td colSpan={2} className="problem-cell"><span className="row-label">Description of Problem / รายละเอียดปัญหา :</span><RichText value={car.defectDetail} /></td></tr>
              <tr><td colSpan={2}><span className="row-label">Reference / เอกสารอ้างอิง :</span><RichText value={car.nonConformanceRef} /></td></tr>
              <tr><td colSpan={2}><Signature image={car.issuerSignaturePath} name={car.issuer.name} label="Issued by / ผู้ออก CAR" date={car.issuedAt} /></td></tr>
            </tbody>
          </table>

          <section className="section-title"><span className="number">2 /</span> (Investigation Root Cause) การสอบสวนหาสาเหตุรากเหง้า <span> (กรุณาตอบกลับภายใน 7 วัน)</span></section>
          <table>
            <tbody>
              <tr><td colSpan={2}><span className="row-label">Why? / คำถาม:</span> {response?.whyAnalysis || "-"}</td></tr>
              {Array.from({ length: 5 }).map((_, index) => <tr key={index}><td style={{ width: "16%" }} className="bold">Why {index + 1} :</td><td className="why-cell">{whys[index]?.answer || ""}</td></tr>)}
              <tr><td colSpan={2}><span className="row-label">Root Cause / สาเหตุรากเหง้า :</span><RichText value={response?.rootCauseSummary} /></td></tr>
              <tr><td colSpan={2}><span className="row-label">Classification / ประเภทสาเหตุ :</span><br />
                <Checkbox checked={Boolean(response?.rootCausePerson)} label="Person / คน" /><Checkbox checked={Boolean(response?.rootCauseMaterial)} label="Material / วัตถุดิบ" /><Checkbox checked={Boolean(response?.rootCauseMachine)} label="Machine / เครื่องจักร" /><Checkbox checked={Boolean(response?.rootCauseMethod)} label="Method / วิธีการ" /><Checkbox checked={Boolean(response?.rootCauseOther)} label={`Other / อื่นๆ${response?.rootCauseOtherDetail ? `: ${response.rootCauseOtherDetail}` : ""}`} />
              </td></tr>
              <tr><td colSpan={2} className="center"><Signature image={response?.responderSignaturePath} name={response?.responder.name} label="Investigator / ผู้สอบสวน" date={response?.respondedAt} /></td></tr>
            </tbody>
          </table>

          <section className="section-title"><span className="number">3 / 1</span> (Corrective Preventive Action #1) มาตรการแก้ไขและป้องกันข้อที่ 1</section>
          <table><tbody>
            <tr><td className="action-cell"><span className="row-label">Immediate corrective action / การแก้ไขทันที :</span><RichText value={response?.immediateAction} /></td><td style={{ width: "28%" }}><span className="row-label">Due date :</span> {formatDate(response?.plannedCompletionDate)}</td></tr>
            <tr><td className="action-cell"><span className="row-label">Preventive action / การป้องกันการเกิดซ้ำ :</span><RichText value={response?.preventiveAction} /></td><td><span className="row-label">CAR status :</span><br />{statusLabel}</td></tr>
          </tbody></table>

          <section className="section-title"><span className="number">4 / 2</span> (Corrective Preventive Action #2) มาตรการแก้ไขและป้องกันข้อที่ 2</section>
          <table><tbody>
            <tr><td className="action-cell"><span className="row-label">Additional action / มาตรการเพิ่มเติม :</span><RichText value={response?.additionalToolDetail} /></td><td style={{ width: "28%" }}><span className="row-label">Response date :</span> {formatDate(response?.respondedAt)}</td></tr>
            <tr><td className="action-cell"><span className="row-label">Action evidence / หลักฐานการดำเนินการ :</span><RichText value={response?.rootCauseSummary} /></td><td><Signature image={response?.responderSignaturePath} name={response?.responder.name} label="Responsible / ผู้รับผิดชอบ" date={response?.respondedAt} /></td></tr>
          </tbody></table>

          <div className="page-break" />
          <section className="section-title">CAR No. {car.carNo} / MR Review and Follow-up</section>
          <table><tbody>
            <tr><td style={{ width: "55%" }}><span className="row-label">MR CAR :</span> {car.mrResponseReview?.action === "APPROVED" ? "Approved / อนุมัติ" : car.mrResponseReview?.action === "REJECTED" ? "Rejected / ส่งกลับแก้ไข" : "Pending / รอตรวจสอบ"}<br />{car.mrResponseReview?.comment || "-"}</td><td><Signature name={car.mrResponseReview?.mrUser.name} label="MR Review / ผู้ตรวจสอบ MR" date={car.mrResponseReview?.reviewedAt} /></td></tr>
          </tbody></table>

          <section className="section-title">Follow-up / การติดตามผล</section>
          <table><thead><tr><th style={{ width: "9%" }}>Round</th><th>Finding / ผลการติดตาม</th><th style={{ width: "18%" }}>Result</th><th style={{ width: "27%" }}>Verifier</th></tr></thead><tbody>
            {[1, 2].map((round) => { const verification = car.verifications.find((item) => item.round === round); return <tr key={round}><td className="center bold">{round}</td><td>{verification?.findings || ""}</td><td className="center">{verification ? `${verification.result} / ${verification.result === "PASSED" ? "ผ่าน" : "ไม่ผ่าน"}` : ""}</td><td>{verification ? <Signature image={verification.verifierSignaturePath} name={verification.verifier.name} label={`Verifier round ${round}`} date={verification.verifiedAt} /> : null}</td></tr>; })}
          </tbody></table>

          <table style={{ marginTop: 4 }}><tbody><tr><td style={{ width: "65%" }}><span className="bold">Final status / สถานะสุดท้าย :</span> {statusLabel}<br />{car.mrSignature?.comment || "-"}</td><td><Signature name={car.mrSignature?.mrUser.name} label="MR Final Sign-off / ผู้อนุมัติปิด CAR" date={car.mrSignature?.signedAt} /></td></tr></tbody></table>
          <div className="footer-note"><span>{footerPrefix}</span><span>CAR No. {car.carNo}</span></div>
        </main>
      </div>
    </>
  );
}
