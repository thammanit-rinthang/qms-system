"use client";

import type { KpiObjectiveRevisionSnapshot } from "@/types/kpi";
import type { FooterConfig } from "@/services/qmsConfigService";
import PrintPageActions from "@/components/shared/PrintPageActions";

interface KPIObjective {
  id: string;
  target: number;
  unit: string | null;
  objective: string;
  frequency: string;
  calculationFormula: string;
  actionPlanGuidelines: string;
  referenceDocuments: string | null;
  responsibleNameSnapshot?: string | null;
  responsibleEmployeeId?: string | null;
  responsibleEmailSnapshot?: string | null;
  originalObjective?: KpiObjectiveRevisionSnapshot | null;
  revisionChangeType?: string | null;
}

interface ApprovalSignature {
  step: string;
  signerUserId: string | null;
  signerAuthUserId?: string | null;
  action: string;
  actionDate?: Date | string | null;
  signaturePath?: string | null;
  signerUser?: {
    name: string | null;
    email: string | null;
    department?: {
      name: string;
    } | null;
  } | null;
}

interface KpiPrintTemplateProps {
  kpi: {
    id: string;
    yearly: number;
    department: string;
    prepare: string;
    reviewer: string;
    approver: string;
    status: string;
    documentName?: string | null;
    submittedAt?: Date | string | null;
    objectives: KPIObjective[];
    approvalSignatures?: ApprovalSignature[];
  };
  footerConfig?: FooterConfig | null;
}

export default function KpiPrintTemplate({ kpi, footerConfig }: KpiPrintTemplateProps) {
  const formLabel = kpi.documentName?.trim() || footerConfig?.label?.trim() || "KPI Annual Objective | Annual Quality Objectives";
  const footerLabel = footerConfig?.label?.trim() || formLabel;
  const footerPrefix = footerConfig?.prefix?.trim() || "FM-KPI-01";
  const [primaryTitle, secondaryTitle] = splitBilingualLabel(formLabel);

  const preparerSig = kpi.approvalSignatures?.find((s) => s.step === "PREPARER" && s.action === "APPROVED");
  const reviewerSig = kpi.approvalSignatures?.find((s) => s.step === "REVIEWER" && s.action === "APPROVED");
  const approverSig = kpi.approvalSignatures?.find((s) => s.step === "APPROVER" && s.action === "APPROVED");

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @page {
          size: A4 landscape;
          margin: 10mm 8mm 8mm 8mm;
        }

        body {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 10px;
          color: #000;
          line-height: 1.25;
          background-color: #f8fafc;
        }

        .print-container {
          width: 100%;
          max-width: 280mm;
          margin: 0 auto;
          background-color: #fff;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          padding: 10mm 8mm;
        }

        .print-container table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 6px;
        }

        .print-container td, .print-container th {
          border: 1px solid #000;
          padding: 4px 5px;
          vertical-align: top;
          color: #000;
        }

        .print-container th {
          background-color: #f3f4f6;
          font-weight: bold;
        }

        .print-container .text-center { text-align: center; }
        .print-container .text-left { text-align: left; }
        .print-container .text-right { text-align: right; }
        .print-container .font-bold { font-weight: bold; }
        .print-container .bg-gray { background-color: #f3f4f6; }
        .print-container .logo-container {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          padding: 2px;
        }

        .print-container .footer-note {
          font-size: 8px;
          text-align: right;
          margin-top: 6px;
          font-family: Arial, sans-serif;
        }

        .print-container .revision-row td {
          background-color: #ffffff;
          font-weight: bold;
          font-style: italic;
        }

        .print-container .revision-tag {
          display: inline-block;
          margin-top: 3px;
          padding: 1px 6px;
          border: 1px solid #6b7280;
          border-radius: 999px;
          background-color: #ffffff;
          color: #000;
          font-size: 8px;
          font-weight: 700;
        }

        @media print {
          body {
            background-color: #fff;
          }

          .print-container {
            width: 100%;
            max-width: 100%;
            box-shadow: none;
            padding: 0;
          }

          .no-print {
            display: none !important;
          }
        }
        `,
        }}
      />

      <div className="min-h-screen bg-slate-100 py-8">
        <PrintPageActions />

        <div className="print-container">
          <table style={{ marginBottom: "8px" }}>
            <tbody>
              <tr>
                <td style={{ width: "20%", textAlign: "left", padding: "4px" }}>
                  <div className="logo-container">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo/logo.webp" alt="Logo" style={{ height: "30px", objectFit: "contain" }} />
                  </div>
                </td>
                <td style={{ width: "60%", textAlign: "center" }}>
                  <div className="font-bold" style={{ fontSize: "14px", color: "#0F1059" }}>{primaryTitle}</div>
                  <div className="font-bold" style={{ fontSize: "12px", color: "#0F1059" }}>{secondaryTitle}</div>
                </td>
                <td style={{ width: "20%", padding: "4px", fontSize: "9px" }}>
                  <div><strong>Department:</strong> {kpi.department}</div>
                  <div><strong>Year:</strong> {kpi.yearly}</div>
                  <div><strong>Status:</strong> {kpi.status}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <table style={{ marginBottom: "12px" }}>
            <thead>
              <tr style={{ fontSize: "9.5px" }}>
                <th style={{ width: "5%" }} className="text-center">No.</th>
                <th style={{ width: "25%" }}>Objective</th>
                <th style={{ width: "10%" }} className="text-center">Target</th>
                <th style={{ width: "10%" }} className="text-center">Unit</th>
                <th style={{ width: "10%" }} className="text-center">Frequency</th>
                <th style={{ width: "20%" }}>Formula</th>
                <th style={{ width: "20%" }}>Guidelines</th>
              </tr>
            </thead>
            <tbody>
              {kpi.objectives.map((obj, idx) => (
                <tr key={obj.id} className={obj.revisionChangeType ? "revision-row" : ""} style={{ fontSize: "9px" }}>
                  <td className="text-center">{idx + 1}</td>
                  <td>
                    <div><strong>{obj.objective}</strong></div>
                    {obj.revisionChangeType && (
                      <div className="revision-tag">
                        {getChangeLabel(obj.revisionChangeType)}
                      </div>
                    )}
                    {(obj.responsibleNameSnapshot || obj.responsibleEmailSnapshot) && (
                      <div style={{ fontSize: "8px", marginTop: "2px" }}>
                        Responsible: {formatResponsiblePerson(obj)}
                      </div>
                    )}
                    {obj.referenceDocuments && (
                      <div style={{ fontSize: "8px", marginTop: "2px" }}>
                        Ref: {obj.referenceDocuments}
                      </div>
                    )}
                  </td>
                  <td className="text-center font-bold">{obj.target}</td>
                  <td className="text-center">{obj.unit || "-"}</td>
                  <td className="text-center">{obj.frequency}</td>
                  <td style={{ whiteSpace: "pre-line" }}>{obj.calculationFormula}</td>
                  <td style={{ whiteSpace: "pre-line" }}>{obj.actionPlanGuidelines}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <table style={{ marginBottom: "8px", tableLayout: "fixed", textAlign: "center" }}>
            <thead>
              <tr className="font-bold bg-gray" style={{ fontSize: "9px" }}>
                <td style={{ width: "33.33%" }}>PREPARED BY</td>
                <td style={{ width: "33.33%" }}>REVIEWED BY</td>
                <td style={{ width: "33.33%" }}>APPROVED BY</td>
              </tr>
            </thead>
            <tbody>
              <tr style={{ height: "55px" }}>
                <td style={{ padding: "4px", verticalAlign: "middle" }}>
                  {preparerSig?.signaturePath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preparerSig.signaturePath} alt="Preparer Signature" style={{ maxHeight: "48px", maxWidth: "100%", objectFit: "contain" }} />
                  ) : (
                    <div style={{ fontSize: "8.5px", color: "#666" }}>{kpi.prepare || "(not signed)"}</div>
                  )}
                </td>
                <td style={{ padding: "4px", verticalAlign: "middle" }}>
                  {reviewerSig?.signaturePath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={reviewerSig.signaturePath} alt="Reviewer Signature" style={{ maxHeight: "48px", maxWidth: "100%", objectFit: "contain" }} />
                  ) : (
                    <div style={{ fontSize: "8.5px", color: "#666" }}>{kpi.reviewer || "(not signed)"}</div>
                  )}
                </td>
                <td style={{ padding: "4px", verticalAlign: "middle" }}>
                  {approverSig?.signaturePath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={approverSig.signaturePath} alt="Approver Signature" style={{ maxHeight: "48px", maxWidth: "100%", objectFit: "contain" }} />
                  ) : (
                    <div style={{ fontSize: "8.5px", color: "#666" }}>{kpi.approver || "(not signed)"}</div>
                  )}
                </td>
              </tr>
              <tr style={{ fontSize: "8.5px", height: "18px" }}>
                <td className="text-left" style={{ paddingLeft: "8px" }}>
                  Date: {formatSignatureDate(preparerSig?.actionDate)}
                </td>
                <td className="text-left" style={{ paddingLeft: "8px" }}>
                  Date: {formatSignatureDate(reviewerSig?.actionDate)}
                </td>
                <td className="text-left" style={{ paddingLeft: "8px" }}>
                  Date: {formatSignatureDate(approverSig?.actionDate)}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="footer-note">
            {footerPrefix} / {footerLabel}
          </div>
        </div>
      </div>
    </>
  );
}

function getChangeLabel(changeType: string) {
  if (changeType === "ADDED") {
    return "ADDED";
  }

  if (changeType === "REMOVED") {
    return "REMOVED";
  }

  return "REVISED";
}

function splitBilingualLabel(label: string): [string, string] {
  const parts = label
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return [parts[0], parts[1]];
  }

  const single = parts[0] || label.trim() || "KPI Annual Objective";
  return [single, single];
}

function formatResponsiblePerson(objective: {
  responsibleNameSnapshot?: string | null;
  responsibleEmployeeId?: string | null;
  responsibleEmailSnapshot?: string | null;
}) {
  const primary = objective.responsibleNameSnapshot?.trim()
    || objective.responsibleEmailSnapshot?.trim()
    || "-";
  const suffix = objective.responsibleEmployeeId?.trim()
    ? ` (#${objective.responsibleEmployeeId.trim()})`
    : "";
  return `${primary}${suffix}`;
}

function formatSignatureDate(value?: Date | string | null) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("th-TH");
}
