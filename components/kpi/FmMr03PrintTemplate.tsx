"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { useRouter } from "next/navigation";
import type {
  AchievedStatus,
  KPI,
  KPIObjective,
  KPIMonthlyReport,
  KPIMonthlyDetail,
  KPICorrectiveAction,
} from "@/generated/prisma/client";

interface DetailRow extends KPIMonthlyDetail {
  kpiObjective: KPIObjective;
  correctiveActions?: KPICorrectiveAction[];
}

interface MonthlyReport extends KPIMonthlyReport {
  kpi: KPI & {
    objectives: KPIObjective[];
  };
  details: DetailRow[];
}

interface Props {
  report: MonthlyReport;
  allYearReports: {
    month: string;
    year: number;
    details: {
      actualResult: number | null;
      achievedStatus: AchievedStatus;
      kpiObjectiveId: string;
    }[];
  }[];
  preparerSig?: { signaturePath: string | null; actionDate: Date | null } | null;
  reviewerSig?: { signaturePath: string | null; actionDate: Date | null } | null;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export default function FmMr03PrintTemplate({
  report,
  allYearReports,
  preparerSig,
  reviewerSig,
}: Props) {
  const router = useRouter();

  const formatDate = (dateVal: string | Date | null | undefined) => {
    if (!dateVal) return "";
    const d = new Date(dateVal);
    return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
  };

  // Collect corrective actions from the current report's details
  const correctiveActions = report.details.flatMap((d) => {
    return (d.correctiveActions ?? []).map((ca) => ({
      times: ca.times,
      month: report.month,
      rootCause: ca.rootCause,
      guidelines: ca.guidelines,
      responsiblePerson: ca.responsiblePerson,
      dueDate: ca.dueDate ? new Date(ca.dueDate).toLocaleDateString("en-GB") : "",
    }));
  });

  // Pad corrective actions to at least 4 rows for aesthetic matching
  const emptyRowsCount = Math.max(0, 4 - correctiveActions.length);
  const emptyRows = Array.from({ length: emptyRowsCount });

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sarabun:wght@400;500;600;700&display=swap');

        @page {
            size: A4 portrait;
            margin: 10mm;
        }

        body {
            font-family: 'Sarabun', 'Inter', sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f5f5f7;
            color: #000000;
            font-size: 11px;
            line-height: 1.3;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        /* Container for browser preview */
        .page-container {
            width: 210mm;
            min-height: 275mm;
            padding: 12mm;
            margin: 10mm auto;
            background: #ffffff;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
            box-sizing: border-box;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        @media print {
            body {
                background-color: #ffffff;
                margin: 0;
                padding: 0;
            }
            .page-container {
                width: 100%;
                min-height: auto;
                margin: 0;
                padding: 0;
                box-shadow: none;
            }
            .no-print {
                display: none !important;
            }
        }

        /* Header Table Style */
        .header-table {
            width: 100%;
            border-collapse: collapse;
            border: 1.5px solid #000000;
            margin-bottom: 8px;
        }

        .header-table td {
            border: 1.5px solid #000000;
            padding: 8px;
            vertical-align: middle;
        }

        .logo-cell {
            width: 22%;
            text-align: center;
        }

        .logo-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        .logo-icon {
            width: 48px;
            height: 24px;
            background-color: #0a2540;
            color: #ffffff;
            font-family: 'Inter', sans-serif;
            font-weight: 800;
            font-size: 16px;
            letter-spacing: 0.5px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 2px;
        }

        .logo-subtext {
            font-family: 'Inter', sans-serif;
            font-weight: 700;
            font-size: 7.5px;
            color: #0a2540;
            margin-top: 2px;
            letter-spacing: 0.8px;
        }

        .title-cell {
            width: 78%;
            text-align: center;
        }

        .title-cell h1 {
            margin: 0;
            font-size: 14px;
            font-weight: 700;
            color: #000000;
            font-family: 'Sarabun', sans-serif;
        }

        /* Meta Information Table */
        .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }

        .meta-table td {
            padding: 4px 6px;
            vertical-align: middle;
        }

        .meta-label {
            font-weight: bold;
            white-space: nowrap;
            width: 1%; /* Shrink to fit content */
        }

        .meta-value {
            border-bottom: 1px solid #000000;
            text-align: center;
            padding-left: 10px;
            padding-right: 10px;
        }

        .meta-value.left-align {
            text-align: left;
        }

        /* Section Header */
        .section-header {
            background-color: #8faadc;
            border: 1px solid #000000;
            padding: 4px 8px;
            font-weight: bold;
            font-size: 11px;
            margin-bottom: 8px;
        }

        /* KPI Performance Table */
        .kpi-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }

        .kpi-table th, .kpi-table td {
            border: 1px solid #000000;
            padding: 3px 4px;
            text-align: center;
            font-size: 10.5px;
        }

        .kpi-table th {
            background-color: #1f4e78;
            color: #ffffff;
            font-weight: 500;
        }

        .kpi-table th.details-header {
            width: 35%;
            text-align: left;
            padding-left: 8px;
        }

        .kpi-month-col {
            width: 5.4%;
        }

        .kpi-details-cell {
            text-align: left !important;
            padding-left: 8px !important;
            font-weight: bold;
            vertical-align: middle;
        }

        .kpi-target-cell {
            text-align: left !important;
            padding-left: 8px !important;
            vertical-align: middle;
        }

        .target-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            box-sizing: border-box;
        }

        .target-label {
            font-size: 10px;
        }

        .target-value {
            font-weight: bold;
            font-size: 11px;
        }

        .target-unit {
            font-size: 10px;
        }

        .kpi-summary-cell {
            text-align: left !important;
            padding-left: 8px !important;
            font-weight: 500;
            background-color: #d9e1f2;
        }

        .kpi-summary-val {
            background-color: #d9e1f2;
            font-weight: bold;
        }

        /* Section 2: Corrective Actions Table */
        .corrective-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }

        .corrective-table th, .corrective-table td {
            border: 1px solid #000000;
            padding: 4px 6px;
            font-size: 10px;
        }

        .corrective-table th {
            background-color: #d9e1f2;
            color: #000000;
            font-weight: bold;
            text-align: center;
        }

        .corrective-table td {
            height: 18px;
        }

        .col-times { width: 6%; text-align: center; }
        .col-month { width: 8%; text-align: center; }
        .col-rootcase { width: 33%; }
        .col-guidelines { width: 33%; }
        .col-owner { width: 10%; text-align: center; }
        .col-due { width: 10%; text-align: center; }

        /* Notes Section */
        .notes-section {
            margin-top: 8px;
            margin-bottom: 16px;
            flex-grow: 1; /* Pushes the signature block to the bottom if there is space */
        }

        .notes-title {
            font-weight: bold;
            display: inline-block;
            vertical-align: top;
            width: 10%;
        }

        .notes-lines {
            display: inline-block;
            width: 89%;
            vertical-align: top;
        }

        .note-line {
            border-bottom: 1px solid #000000;
            min-height: 18px;
            line-height: 18px;
            padding-left: 4px;
            margin-bottom: 4px;
        }

        /* Signatures Block */
        .footer-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: auto; /* Aligns to bottom of flex container */
        }

        .doc-code {
            font-family: 'Inter', sans-serif;
            font-size: 9px;
            font-weight: 500;
            align-self: flex-end;
        }

        .signature-block {
            display: flex;
            gap: 15px;
        }

        .signature-box {
            width: 160px;
            border: 1px solid #000000;
            background-color: #ffffff;
        }

        .sig-upper {
            height: 55px;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .sig-image {
            max-height: 45px;
            max-width: 140px;
            object-fit: contain;
        }

        .sig-lower {
            border-top: 1px solid #000000;
            padding: 4px 6px;
            text-align: center;
            font-size: 9.5px;
        }

        .sig-title {
            font-weight: bold;
            margin-bottom: 4px;
        }

        .sig-date {
            text-align: left;
            font-size: 9px;
        }
        `
      }} />

      {/* Action Toolbar */}
      <div className="no-print bg-white border-b border-slate-200 py-3 px-6 sticky top-0 z-[100] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="max-w-[210mm] mx-auto flex items-center justify-between">
          <Button
            variant="outline"
            className="rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 h-9 font-semibold text-xs gap-1.5"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            ย้อนกลับ / Back
          </Button>

          <Button
            className="bg-[#0F1059] hover:bg-[#161875] text-white h-9 rounded-xl font-medium px-5 gap-1.5"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4" />
            พิมพ์เอกสาร / Print PDF
          </Button>
        </div>
      </div>

      <div className="py-8 bg-slate-100 min-h-screen">
        <div className="page-container">
          <div>
            {/* Document Header */}
            <table className="header-table">
              <tbody>
                <tr>
                  <td className="logo-cell">
                    <div className="logo-container">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/logo/logo.webp" alt="NDC Logo" style={{ height: "30px", objectFit: "contain" }} />
                    </div>
                  </td>
                  <td className="title-cell">
                    <h1>รายงานผลวัตถุประสงค์คุณภาพ/Quality objectives report</h1>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Document Metadata */}
            <table className="meta-table">
              <tbody>
                <tr>
                  <td className="meta-label">แผนก/Department</td>
                  <td className="meta-value" style={{ width: "35%" }}>{report.kpi.department}</td>
                  <td className="meta-label">เดือน/Month</td>
                  <td className="meta-value" style={{ width: "20%" }}>{report.month}</td>
                  <td className="meta-label">ปี/Year</td>
                  <td className="meta-value" style={{ width: "15%" }}>{report.year}</td>
                </tr>
                <tr>
                  <td className="meta-label">ความถี่ในการวัด/Measurement frequency</td>
                  <td className="meta-value left-align" colSpan={5}>
                    {report.kpi.objectives?.[0]?.frequency || "Monthly"}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Section 1 Header */}
            <div className="section-header">
              ส่วนที่ 1 เป้าหมาย และผลการดำเนินงาน/ Objectives and Performance
            </div>

            {/* KPI Items Loop */}
            {report.kpi.objectives?.map((obj) => {
              // Prepare the monthly columns values
              const monthlyActuals = MONTHS_SHORT.map((mShort) => {
                const rep = allYearReports.find((r) => r.month === mShort);
                if (!rep) return "-";
                const det = rep.details.find((d) => d.kpiObjectiveId === obj.id);
                return det && det.actualResult !== null ? String(det.actualResult) : "-";
              });

              const monthlyTargets = MONTHS_SHORT.map((mShort) => {
                const rep = allYearReports.find((r) => r.month === mShort);
                if (!rep) return "-";
                const det = rep.details.find((d) => d.kpiObjectiveId === obj.id);
                return det ? String(obj.target) : "-";
              });

              const monthlyStatuses = MONTHS_SHORT.map((mShort) => {
                const rep = allYearReports.find((r) => r.month === mShort);
                if (!rep) return "-";
                const det = rep.details.find((d) => d.kpiObjectiveId === obj.id);
                if (!det) return "-";
                if (det.achievedStatus === "OK") return "OK";
                if (det.achievedStatus === "NOT_OK") return "NG";
                return "-";
              });

              return (
                <table key={obj.id} className="kpi-table">
                  <thead>
                    <tr>
                      <th className="details-header">รายละเอียด/Details</th>
                      {MONTHS_SHORT.map((m) => (
                        <th key={m} className="kpi-month-col">{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Row 1: Objective name & Actual Results */}
                    <tr>
                      <td className="kpi-details-cell">{obj.objective}</td>
                      {monthlyActuals.map((val, idx) => (
                        <td key={idx}>{val}</td>
                      ))}
                    </tr>
                    {/* Row 2: Target */}
                    <tr>
                      <td className="kpi-target-cell">
                        <div className="target-container">
                          <span className="target-label">Target</span>
                          <span className="target-value">{obj.target}</span>
                          <span className="target-unit">{obj.unit || "Monthly KPI (%)"}</span>
                        </div>
                      </td>
                      {monthlyTargets.map((val, idx) => (
                        <td key={idx}>{val}</td>
                      ))}
                    </tr>
                    {/* Row 3: Achieved Status Summary */}
                    <tr>
                      <td className="kpi-summary-cell">สรุปผล (บรรลุ/ไม่บรรลุ)/Summary of results (achieved/not achieved)</td>
                      {monthlyStatuses.map((val, idx) => (
                        <td key={idx} className="kpi-summary-val">{val}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              );
            })}

            {/* Section 2 Header */}
            <div className="section-header">
              ส่วนที่ 2 การดำเนินการแก้ไข/ปรับปรุง (กรณีที่ไม่บรรลุเป้าหมาย)<br />
              Corrective/Improvement Actions (in the event that the goals are not achieved)
            </div>

            {/* Corrective Actions Table */}
            <table className="corrective-table">
              <thead>
                <tr>
                  <th className="col-times">ครั้งที่<br />Times</th>
                  <th className="col-month">เดือน<br />Month</th>
                  <th className="col-rootcase">การวิเคราะห์หาสาเหตุที่แท้จริงของปัญหา<br />Root cause analysis of the problem</th>
                  <th className="col-guidelines">แนวทางการแก้ไขปรับปรุง และพัฒนาอย่างต่อเนื่อง<br />Guidelines for continuous improvement and development</th>
                  <th className="col-owner">ผู้รับผิดชอบ<br />responsible person</th>
                  <th className="col-due">กำหนดเสร็จ<br />Due date</th>
                </tr>
              </thead>
              <tbody>
                {correctiveActions.map((ca, idx) => (
                  <tr key={idx}>
                    <td className="col-times">{ca.times}</td>
                    <td className="col-month">{ca.month}</td>
                    <td className="col-rootcase">{ca.rootCause}</td>
                    <td className="col-guidelines">{ca.guidelines}</td>
                    <td className="col-owner">{ca.responsiblePerson}</td>
                    <td className="col-due">{ca.dueDate}</td>
                  </tr>
                ))}

                {/* Empty rows placeholder if actual actions are less than 4 */}
                {emptyRows.map((_, idx) => (
                  <tr key={`empty-${idx}`}>
                    <td className="col-times"></td>
                    <td className="col-month"></td>
                    <td className="col-rootcase"></td>
                    <td className="col-guidelines"></td>
                    <td className="col-owner"></td>
                    <td className="col-due"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Notes & Signature Section */}
          <div className="notes-section">
            <div className="notes-title">หมายเหตุ/Note :</div>
            <div className="notes-lines">
              <div className="note-line">{report.remark || ""}</div>
              <div className="note-line"></div>
              <div className="note-line"></div>
            </div>
          </div>

          {/* Footer block containing dynamic signature images and code */}
          <div className="footer-container">
            <div className="doc-code">FM-MR-03 : Rev.01 : 01-03-2025</div>
            <div className="signature-block">
              {/* Prepared By Box */}
              <div className="signature-box">
                <div className="sig-upper">
                  {preparerSig?.signaturePath && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preparerSig.signaturePath} alt="Signature" className="sig-image" />
                  )}
                </div>
                <div className="sig-lower">
                  <div className="sig-title">Prepared By</div>
                  <div className="sig-date font-medium">
                    Date: {preparerSig?.actionDate ? formatDate(preparerSig.actionDate) : "................................."}
                  </div>
                </div>
              </div>

              {/* Reviewed By Box */}
              <div className="signature-box">
                <div className="sig-upper">
                  {reviewerSig?.signaturePath && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={reviewerSig.signaturePath} alt="Signature" className="sig-image" />
                  )}
                </div>
                <div className="sig-lower">
                  <div className="sig-title">Reviewed By</div>
                  <div className="sig-date font-medium">
                    Date: {reviewerSig?.actionDate ? formatDate(reviewerSig.actionDate) : "................................."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
