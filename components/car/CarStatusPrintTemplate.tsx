"use client";

import PrintPageActions from "@/components/shared/PrintPageActions";
import { CAR_STATUS_LABELS, type CarStatus } from "@/types/car";
import { sanitizeRichTextHtml } from "@/lib/sanitizeRichText";

interface StatusRow {
  id: string;
  carNo: string;
  issuedAt: string | null;
  defectDetail: string;
  targetDepartmentName: string;
  responseDueAt: string | null;
  followUp: string;
  closingDate: string | null;
  status: string;
  remark: string;
}

interface Props {
  data: StatusRow[];
  dueFilter?: string;
  status?: string;
}

function isHtmlContent(content: string) {
  return /<[a-z][\s\S]*>/i.test(content);
}

function PrintRichText({ content }: { content: string }) {
  if (!content) return <span>-</span>;

  if (isHtmlContent(content)) {
    return <div className="print-rich-text" dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(content) }} />;
  }

  return <>{content}</>;
}

export default function CarStatusPrintTemplate({ data, dueFilter, status }: Props) {
  const dueFilterLabel =
    dueFilter === "near-due"
      ? "ใกล้กำหนด (Near Due)"
      : dueFilter === "overdue"
        ? "เกินกำหนด (Overdue)"
        : "ทั้งหมด (All)";

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @page {
          size: A4 landscape;
          margin: 10mm 8mm 10mm 8mm;
        }
        
        body {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 9.5px;
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
          margin-bottom: 8px;
        }

        .print-container td, .print-container th {
          border: 1px solid #000;
          padding: 5px 6px;
          vertical-align: top;
        }

        .print-container th {
          background-color: #f3f4f6;
          font-weight: bold;
          text-align: center;
        }

        .print-container .text-center {
          text-align: center;
        }

        .print-container .text-left {
          text-align: left;
        }

        .print-container .font-bold {
          font-weight: bold;
        }

        .print-container .footer-note {
          font-size: 8px;
          text-align: right;
          margin-top: 12px;
          font-family: Arial, sans-serif;
          color: #666;
        }

        .print-container .print-rich-text p {
          margin: 0 0 2px 0;
        }

        .print-container .print-rich-text ul,
        .print-container .print-rich-text ol {
          margin: 2px 0 2px 14px;
          padding-left: 10px;
        }

        .print-container .print-rich-text li {
          margin: 0 0 1px 0;
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
        `
      }} />

      <div className="py-6 bg-slate-100 min-h-screen">
        <PrintPageActions />

        <div className="print-container">
          {/* Header */}
          <table style={{ marginBottom: "12px", border: "none" }}>
            <tbody>
              <tr style={{ border: "none" }}>
                <td style={{ width: "20%", textAlign: "left", padding: "0", border: "none" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo/logo.webp" alt="Logo" style={{ height: "30px", objectFit: "contain" }} />
                </td>
                <td style={{ width: "80%", textAlign: "right", padding: "0", border: "none" }}>
                  <div className="font-bold" style={{ fontSize: "15px", color: "#0F1059" }}>รายงานติดตามสถานะ CAR (CAR Status Report)</div>
                  <div style={{ fontSize: "9px", color: "#666", marginTop: "3px" }}>
                    ตัวกรองกำหนดเวลา: {dueFilterLabel}
                    {status && status !== "all" ? ` | สถานะ: ${CAR_STATUS_LABELS[status as CarStatus] ?? status}` : ""}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Table */}
          <table style={{ marginTop: "8px" }}>
            <thead>
              <tr>
                <th style={{ width: "11%" }}>CAR Number</th>
                <th style={{ width: "9%" }}>Issue Date</th>
                <th style={{ width: "24%" }}>Detail</th>
                <th style={{ width: "11%" }}>Operator</th>
                <th style={{ width: "9%" }}>Due Date</th>
                <th style={{ width: "14%" }}>Follow-up</th>
                <th style={{ width: "9%" }}>Closing Date</th>
                <th style={{ width: "7%" }}>Status</th>
                <th style={{ width: "6%" }}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id}>
                  <td className="font-mono font-semibold text-blue-600 text-center">{row.carNo}</td>
                  <td className="text-center font-mono">{row.issuedAt ? new Date(row.issuedAt).toLocaleDateString("th-TH") : "-"}</td>
                  <td className="text-left" style={{ wordBreak: "break-word" }}>
                    <PrintRichText content={row.defectDetail} />
                  </td>
                  <td className="text-left">{row.targetDepartmentName}</td>
                  <td className="text-center font-mono">{row.responseDueAt ? new Date(row.responseDueAt).toLocaleDateString("th-TH") : "-"}</td>
                  <td className="text-left" style={{ wordBreak: "break-word" }}>{row.followUp}</td>
                  <td className="text-center font-mono">{row.closingDate ? new Date(row.closingDate).toLocaleDateString("th-TH") : "-"}</td>
                  <td className="text-center font-semibold">{CAR_STATUS_LABELS[row.status as CarStatus] ?? row.status}</td>
                  <td className="text-left" style={{ wordBreak: "break-word" }}>{row.remark || "-"}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-slate-400 py-8">
                    ไม่พบข้อมูลที่ตรงกับตัวกรอง
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Footer */}
          <div className="footer-note">
            QMS-CAR-STATFM / ทะเบียนรายงานและติดตามสถานะ CAR
          </div>
        </div>
      </div>
    </>
  );
}
