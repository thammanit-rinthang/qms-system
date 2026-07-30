"use client";

import PrintPageActions from "@/components/shared/PrintPageActions";

interface SummaryRow {
  departmentId: string;
  departmentName: string;
  newCount: number;
  closedCount: number;
  totalCount: number;
}

interface Props {
  data: SummaryRow[];
  year?: string;
  departmentName?: string;
  status?: string;
}

export default function CarSummaryPrintTemplate({ data, year, departmentName, status }: Props) {
  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @page {
          size: A4 portrait;
          margin: 15mm 10mm 15mm 10mm;
        }
        
        body {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 11px;
          color: #000;
          line-height: 1.3;
          background-color: #f8fafc;
        }

        .print-container {
          width: 100%;
          max-width: 190mm;
          margin: 0 auto;
          background-color: #fff;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          padding: 15mm 10mm;
        }

        .print-container table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8px;
        }

        .print-container td, .print-container th {
          border: 1px solid #000;
          padding: 6px 8px;
          vertical-align: middle;
        }

        .print-container th {
          background-color: #f3f4f6;
          font-weight: bold;
          font-size: 11px;
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
          font-size: 9px;
          text-align: right;
          margin-top: 16px;
          font-family: Arial, sans-serif;
          color: #666;
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

      <div className="py-8 bg-slate-100 min-h-screen">
        <PrintPageActions />

        <div className="print-container">
          {/* Header */}
          <table style={{ marginBottom: "16px", border: "none" }}>
            <tbody>
              <tr style={{ border: "none" }}>
                <td style={{ width: "25%", textAlign: "left", padding: "0", border: "none" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo/logo.webp" alt="Logo" style={{ height: "35px", objectFit: "contain" }} />
                </td>
                <td style={{ width: "75%", textAlign: "right", padding: "0", border: "none" }}>
                  <div className="font-bold" style={{ fontSize: "16px", color: "#0F1059" }}>รายงานสรุปผล CAR (CAR Summary Report)</div>
                  <div style={{ fontSize: "10px", color: "#666", marginTop: "4px" }}>
                    {year ? `ประจำปี: ${year}` : ""}
                    {departmentName ? ` | แผนก: ${departmentName}` : ""}
                    {status ? ` | สถานะ: ${status}` : ""}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Table */}
          <table style={{ marginTop: "12px" }}>
            <thead>
              <tr>
                <th style={{ width: "50%" }} className="text-left">แผนก (Department)</th>
                <th style={{ width: "16%" }} className="text-center">CAR ใหม่ (New CAR)</th>
                <th style={{ width: "16%" }} className="text-center">ปิดแล้ว (Closed)</th>
                <th style={{ width: "18%" }} className="text-center">รวมแผนก (Total)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.departmentId}>
                  <td className="text-left font-medium">{row.departmentName}</td>
                  <td className="text-center font-mono">{row.newCount}</td>
                  <td className="text-center font-mono">{row.closedCount}</td>
                  <td className="text-center font-mono font-semibold">{row.totalCount}</td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-slate-400 py-8">
                    ไม่พบข้อมูลที่ตรงกับตัวกรอง
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Footer */}
          <div className="footer-note">
            QMS-CAR-SUMFM / รายงานสรุปผลคำร้องขอแก้ไข CAR
          </div>
        </div>
      </div>
    </>
  );
}
