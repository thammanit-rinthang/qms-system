"use client";

import { toast } from "sonner";
import type { DarDetail } from "@/types/dar";

export default function DarPrintTemplate({ dar }: { dar: DarDetail }) {
  const distRowsCount = Math.max(4, Math.ceil(dar.distributions.length / 2));
  const leftDistributions = Array.from({ length: distRowsCount }).map((_, i) => dar.distributions[i]);
  const rightDistributions = Array.from({ length: distRowsCount }).map((_, i) => dar.distributions[i + distRowsCount]);

  const renderItems = dar.items.length > 0 ? dar.items : [{ docName: "", docNumber: "", revision: "" }, { docName: "", docNumber: "", revision: "" }];

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @page {
          size: A4;
          margin: 10mm 8mm 8mm 8mm;
        }
        
        body {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 9.5px;
          color: #000;
          line-height: 1.2;
          background-color: #f8fafc;
        }

        .print-container {
          width: 100%;
          max-width: 194mm;
          margin: 0 auto;
          background-color: #fff;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          padding: 10mm 8mm;
        }

        /* Common Borders & Grid styles */
        .print-container table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 4px;
        }

        .print-container td, .print-container th {
          border: 1px solid #000;
          padding: 3px 4px;
          vertical-align: middle;
        }

        .print-container .no-border-table td {
          border: none;
          padding: 1px 2px;
        }

        .print-container .text-center {
          text-align: center;
        }

        .print-container .text-left {
          text-align: left;
        }

        .print-container .text-right {
          text-align: right;
        }

        .print-container .font-bold {
          font-weight: bold;
        }

        .print-container .bg-gray {
          background-color: #f3f4f6;
        }

        /* Section Headers */
        .print-container .section-title {
          font-weight: bold;
          text-align: center;
          background-color: #fff;
          border: 1px solid #000;
          border-bottom: none;
          padding: 2px;
          font-size: 10px;
        }

        /* Checkbox list styles */
        .print-container .checkbox-container {
          border: 1px solid #000;
          padding: 4px 6px;
          margin-bottom: 4px;
          display: grid;
          grid-gap: 2px;
        }

        .print-container .grid-3-col {
          grid-template-columns: 1fr 1fr 1fr;
        }

        .print-container .grid-4-col {
          grid-template-columns: 1.2fr 1.2fr 1.2fr 0.9fr;
        }

        .print-container .grid-5-col {
          grid-template-columns: 1fr 1fr 1fr 1fr 0.8fr;
          padding: 3px 6px;
        }

        .print-container .checkbox-item {
          display: flex;
          align-items: center;
        }

        .print-container .checkbox-box {
          width: 9px;
          height: 9px;
          border: 1px solid #000;
          margin-right: 4px;
          display: inline-block;
          text-align: center;
          line-height: 9px;
          font-size: 8px;
          font-weight: bold;
        }

        .print-container .checkbox-box.checked::after {
          content: "✓";
        }

        /* Header Logo Styles */
        .print-container .logo-container {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          padding: 2px;
        }

        .print-container .logo-block {
          background-color: #0f172a;
          color: #fff;
          font-size: 16px;
          font-weight: 900;
          padding: 2px 6px;
          letter-spacing: -0.5px;
          border-radius: 2px;
        }

        .print-container .logo-text {
          color: #1e3a8a;
          font-size: 6px;
          font-weight: bold;
          margin-left: 4px;
          line-height: 1;
          letter-spacing: 0.5px;
        }

        /* Blue Remark Box */
        .print-container .remark-box {
          border: 1.5px solid #2563eb;
          color: #1e40af;
          padding: 4px 6px;
          margin-bottom: 4px;
          font-size: 8px;
          line-height: 1.3;
        }

        .print-container .remark-box span {
          font-weight: bold;
          text-decoration: underline;
        }

        /* Blank lines helper */
        .print-container .dotted-line {
          border-bottom: 1px dotted #000;
          display: inline-block;
          width: 100px;
        }

        .print-container .line-container {
          padding: 4px;
          border: 1px solid #000;
          margin-bottom: 4px;
          min-height: 42px;
        }

        /* Footer styling */
        .print-container .footer-note {
          font-size: 8px;
          text-align: right;
          margin-top: 4px;
          font-family: Arial, sans-serif;
        }

        /* Double tables layout for document delivery */
        .print-container .double-table-container {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .print-container .half-table {
          width: 49.3%;
        }

        .print-container .half-table th {
          font-size: 8px;
          padding: 2px;
        }

        .print-container .half-table td {
          height: 12px;
          padding: 1px 2px;
        }

        .print-container .dcc-grid {
          display: grid;
          grid-template-columns: 1.5fr 1.3fr 1fr 1.2fr;
          border: 1px solid #000;
          margin-bottom: 4px;
        }

        .print-container .dcc-col {
          border-right: 1px solid #000;
          padding: 4px;
        }

        .print-container .dcc-col:last-child {
          border-right: none;
        }

        .print-container .signature-area {
          height: 48px;
          border: 1px dashed #9ca3af;
          margin: 2px 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9ca3af;
          font-size: 8px;
        }

        /* Print media overrides */
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
        <div className="max-w-[194mm] mx-auto mb-4 flex justify-end gap-3 no-print">
          <button 
            onClick={() => {
              // Note: Using native print dialog for PDF saving is standard without external heavy libraries
              toast.info("สำหรับการ Download ให้เลือกปลายทาง (Destination) เป็น 'Save as PDF' ในหน้าต่าง Print นะครับ", { duration: 4000 });
              window.print();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white text-[#0F1059] border border-[#0F1059] rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download PDF
          </button>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-[#0F1059] text-white rounded-lg text-sm font-medium hover:bg-[#161875] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            Print
          </button>
        </div>

        <div className="print-container">
          {/* 1. Header (Logo & Form Name) */}
          <table style={{ marginBottom: "2px" }}>
            <tbody>
              <tr>
                <td style={{ width: "25%", textAlign: "left", padding: "2px 4px" }}>
                  <div className="logo-container">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo/logo.webp" alt="NDC Industrial Logo" style={{ height: "28px", objectFit: "contain", marginLeft: "4px" }} />
                  </div>
                </td>
                <td style={{ width: "50%", textAlign: "center" }}>
                  <div className="font-bold" style={{ fontSize: "13px", letterSpacing: "0.5px" }}>(Document Action Request)</div>
                  <div className="font-bold" style={{ fontSize: "12px" }}>ใบคำขอดำเนินการเรื่องเอกสาร (DAR)</div>
                </td>
                <td style={{ width: "25%", padding: 0, verticalAlign: "top" }}>
                  <table style={{ width: "100%", height: "100%", border: "none", margin: 0 }}>
                    <tbody>
                      <tr>
                        <td className="font-bold text-center bg-gray" style={{ padding: "2px", fontSize: "9px", borderTop: "none", borderLeft: "none", borderRight: "none" }}>For DCC</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "2px 4px", borderLeft: "none", borderRight: "none", fontSize: "9px" }}><strong>DAR No. :</strong> {dar.darNo || ""}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: "2px 4px", borderBottom: "none", borderLeft: "none", borderRight: "none", fontSize: "9px" }}>
                          <strong>Date :</strong> {dar.requestDate ? new Date(dar.requestDate).toLocaleDateString('th-TH') : ""}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {/* 2. Requester Info Grid */}
          <table style={{ marginBottom: "4px" }}>
            <tbody>
              <tr className="text-center font-bold bg-gray" style={{ fontSize: "8.5px" }}>
                <td style={{ width: "12%" }}>รหัส ID</td>
                <td style={{ width: "32%" }}>ชื่อ Name</td>
                <td style={{ width: "20%" }}>ตำแหน่ง Position</td>
                <td style={{ width: "20%" }}>แผนก Department</td>
                <td style={{ width: "16%" }}>วันที่ขอ Date</td>
              </tr>
              <tr className="text-center" style={{ fontSize: "9px", height: "16px" }}>
                <td>{dar.requester.employeeId || "-"}</td>
                <td className="text-left" style={{ paddingLeft: "8px" }}>{dar.requester.name || "-"}</td>
                {/* position is missing in DarRequester type, mapped department for now or handle later */}
                <td>{dar.requester.department?.name || "-"}</td>
                <td>{dar.requester.department?.name || "-"}</td>
                <td>{dar.requestDate ? new Date(dar.requestDate).toLocaleDateString('th-TH') : "-"}</td>
              </tr>
            </tbody>
          </table>

          {/* 3. Objective Section */}
          <div className="section-title">Objective / วัตถุประสงค์</div>
          <div className="checkbox-container grid-3-col">
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.objective === 'PREPARE_NEW' ? 'checked' : ''}`}></div>
              <div>
                <strong>จัดทำเอกสารใหม่</strong><br />
                <span style={{ fontSize: "8px" }}>Prepare new document</span>
              </div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.objective === 'REQUEST_COPY_CONTROLLED' ? 'checked' : ''}`}></div>
              <div>
                <strong>ขอสำเนาควบคุม</strong><br />
                <span style={{ fontSize: "8px" }}>Request a controlled copy</span>
              </div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.objective === 'CANCEL' ? 'checked' : ''}`}></div>
              <div>
                <strong>ยกเลิกเอกสาร</strong><br />
                <span style={{ fontSize: "8px" }}>Cancel the document</span>
              </div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.objective === 'REVISE' ? 'checked' : ''}`}></div>
              <div>
                <strong>แก้ไขเอกสาร</strong><br />
                <span style={{ fontSize: "8px" }}>Revise documents</span>
              </div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.objective === 'REQUEST_COPY_UNCONTROLLED' ? 'checked' : ''}`}></div>
              <div>
                <strong>ขอสำเนาไม่ควบคุม</strong><br />
                <span style={{ fontSize: "8px" }}>Request an uncontrolled copy</span>
              </div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${!['PREPARE_NEW','REQUEST_COPY_CONTROLLED','CANCEL','REVISE','REQUEST_COPY_UNCONTROLLED'].includes(dar.objective) ? 'checked' : ''}`}></div>
              <div style={{ width: "100%" }}>
                <strong>Other</strong> <span style={{ borderBottom: "1px dotted #000", display: "inline-block", width: "70%", height: "10px", paddingLeft: "4px" }}>
                  {!['PREPARE_NEW','REQUEST_COPY_CONTROLLED','CANCEL','REVISE','REQUEST_COPY_UNCONTROLLED'].includes(dar.objective) ? dar.objective : ""}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Types of Documents Section */}
          <div className="section-title">Types of documents / ประเภทของเอกสาร</div>
          <div className="checkbox-container grid-4-col">
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.docType === 'MANUAL' ? 'checked' : ''}`}></div>
              <div>Manual/M</div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.docType === 'PROCEDURE' ? 'checked' : ''}`}></div>
              <div>Procedure/P</div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.docType === 'SOP' ? 'checked' : ''}`}></div>
              <div style={{ fontSize: "8.5px" }}>Standard Operating Procedures (SOP)</div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.docType === 'OTHER' && dar.docTypeOther === 'Incoming Inspection Sheet' ? 'checked' : ''}`}></div>
              <div style={{ fontSize: "8.5px" }}>Incoming Inspection Sheet</div>
            </div>
            
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.docType === 'FORMAT' ? 'checked' : ''}`}></div>
              <div>Format/FM</div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.docType === 'OTHER' && dar.docTypeOther === 'External Support Document' ? 'checked' : ''}`}></div>
              <div>External Support Document</div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.docType === 'SIP' ? 'checked' : ''}`}></div>
              <div style={{ fontSize: "8.5px" }}>Standard Inspection Procedures (SIP)</div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.docType === 'OTHER' && dar.docTypeOther !== 'Incoming Inspection Sheet' && dar.docTypeOther !== 'External Support Document' && dar.docTypeOther !== 'Support Document/SD' ? 'checked' : ''}`}></div>
              <div style={{ width: "100%" }}>Other <span style={{ borderBottom: "1px dotted #000", display: "inline-block", width: "60%", height: "10px", paddingLeft: "4px" }}>
                {dar.docType === 'OTHER' && dar.docTypeOther !== 'Incoming Inspection Sheet' && dar.docTypeOther !== 'External Support Document' && dar.docTypeOther !== 'Support Document/SD' ? dar.docTypeOther : ""}
              </span></div>
            </div>

            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.docType === 'DRAWING' ? 'checked' : ''}`}></div>
              <div>Drawing</div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.docType === 'OTHER' && dar.docTypeOther === 'Support Document/SD' ? 'checked' : ''}`}></div>
              <div>Support Document/SD</div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.docType === 'IPQC' ? 'checked' : ''}`}></div>
              <div style={{ fontSize: "8.5px" }}>In-Process Quality Control (IPQC)</div>
            </div>
            <div className="checkbox-item"></div>
          </div>

          {/* 5. List Table */}
          <table style={{ marginBottom: "4px" }}>
            <thead>
              <tr className="text-center font-bold bg-gray" style={{ fontSize: "9px" }}>
                <td style={{ width: "6%" }}>No.</td>
                <td style={{ width: "50%" }}>List</td>
                <td style={{ width: "18%" }}>Document Number</td>
                <td style={{ width: "11%" }}>Revision No.</td>
                <td style={{ width: "15%" }}>Effective Date</td>
              </tr>
            </thead>
            <tbody>
              {dar.items.map((item, index) => (
                <tr key={index} className="text-center" style={{ fontSize: "9px", height: "16px" }}>
                  <td>{index + 1}</td>
                  <td className="text-left" style={{ paddingLeft: "6px" }}>{item.docName}</td>
                  <td className="font-bold" style={{ fontFamily: "monospace", fontSize: "9.5px" }}>{item.docNumber}</td>
                  <td>{item.revision}</td>
                  {/* effectiveDate is missing in DarItemInput so defaults to dash */}
                  <td>-</td>
                </tr>
              ))}
              {/* Fill remaining rows to always have 5 */}
              {Array.from({ length: Math.max(0, 5 - dar.items.length) }).map((_, i) => (
                <tr key={`empty-${i}`} style={{ height: "16px" }}>
                  <td>&nbsp;</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 6. Reason Section */}
          <div className="section-title">เหตุผลในการขึ้นทะเบียนเอกสาร (Reason for Registration of Documents)</div>
          <div className="line-container">
            <div style={{ fontSize: "9.5px", padding: "4px", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
              {dar.reason || "ไม่มีเหตุผลระบุไว้"}
            </div>
          </div>

          {/* 7. Distributions Section */}
          <div className="section-title">แจกจ่ายให้กับหน่วยงานที่เกี่ยวข้อง (Distributed to relevant agencies)</div>
          <div className="checkbox-container grid-5-col">
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.distributions.some(d => d.department.name === 'QMS') ? 'checked' : ''}`}></div>
              <div style={{ fontSize: "8px" }}>Quality Management System (QMS)</div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.distributions.some(d => d.department.name === 'HR') ? 'checked' : ''}`}></div>
              <div style={{ fontSize: "8px" }}>Human resource (HR)</div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.distributions.some(d => d.department.name === 'PU') ? 'checked' : ''}`}></div>
              <div style={{ fontSize: "8px" }}>Purchasing (PU)</div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.distributions.some(d => d.department.name === 'WH') ? 'checked' : ''}`}></div>
              <div style={{ fontSize: "8px" }}>Warehouse (WH)</div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.distributions.some(d => !['QMS','HR','PU','WH','ACC','EN','Translator','SM','IT','GA','Mold','Production','QA','QC','LAB','Maintenance','MN','Planning','PN','Safety'].includes(d.department.name)) ? 'checked' : ''}`}></div>
              <div style={{ fontSize: "8px" }}>Others <span style={{ borderBottom: "1px dotted #000", display: "inline-block", width: "45%", height: "8px" }}></span></div>
            </div>

            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.distributions.some(d => d.department.name === 'ACC') ? 'checked' : ''}`}></div>
              <div style={{ fontSize: "8px" }}>Accounting (ACC)</div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.distributions.some(d => d.department.name === 'EN') ? 'checked' : ''}`}></div>
              <div style={{ fontSize: "8px" }}>Engineering (EN)</div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.distributions.some(d => d.department.name === 'Translator') ? 'checked' : ''}`}></div>
              <div style={{ fontSize: "8px" }}>Translator</div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.distributions.some(d => d.department.name === 'SM') ? 'checked' : ''}`}></div>
              <div style={{ fontSize: "8px" }}>Sales (SM)</div>
            </div>
            <div className="checkbox-item">
              <div className="checkbox-box"></div>
              <div style={{ fontSize: "8px" }}>Others <span style={{ borderBottom: "1px dotted #000", display: "inline-block", width: "45%", height: "8px" }}></span></div>
            </div>

            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.distributions.some(d => d.department.name === 'IT') ? 'checked' : ''}`}></div>
              <div style={{ fontSize: "8px" }}>Information Technology (IT)</div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.distributions.some(d => d.department.name === 'GA') ? 'checked' : ''}`}></div>
              <div style={{ fontSize: "8px" }}>General Affair (GA)</div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.distributions.some(d => d.department.name === 'Mold') ? 'checked' : ''}`}></div>
              <div style={{ fontSize: "8px" }}>Mold (Mo)</div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.distributions.some(d => d.department.name === 'Production') ? 'checked' : ''}`}></div>
              <div style={{ fontSize: "8px" }}>Production (PD)</div>
            </div>
            <div className="checkbox-item"></div>

            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.distributions.some(d => ['QA','QC','LAB'].includes(d.department.name)) ? 'checked' : ''}`}></div>
              <div style={{ fontSize: "8px" }}>Quality Assurance (QA,QC,LAB)</div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.distributions.some(d => ['Maintenance','MN'].includes(d.department.name)) ? 'checked' : ''}`}></div>
              <div style={{ fontSize: "8px" }}>Maintenance (MN)</div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.distributions.some(d => ['Planning','PN'].includes(d.department.name)) ? 'checked' : ''}`}></div>
              <div style={{ fontSize: "8px" }}>Planning (PN)</div>
            </div>
            <div className="checkbox-item">
              <div className={`checkbox-box ${dar.distributions.some(d => d.department.name === 'Safety') ? 'checked' : ''}`}></div>
              <div style={{ fontSize: "8px" }}>Safety Health and Environment</div>
            </div>
            <div className="checkbox-item"></div>
          </div>

          {/* 8. Remark Blue Box */}
          <div className="remark-box">
            <div><span>หมายเหตุ</span> 1. ใน DAR 1 ฉบับ สามารถยื่นทะเบียนเอกสารได้หลายฉบับ และต้องเป็นเอกสารที่ใช้เพื่อจุดประสงค์เดียวกัน และต่อเอกสารประเภทเดียวกันเท่านั้น เช่น การขอขึ้นทะเบียน SOP ใหม่</div>
            <div><span>Remark</span> 1. One DAR can register multiple documents, but only the documents for the same purpose and the same type of documents are required, such as applying for a new SOP document.</div>
            <div style={{ marginTop: "1px" }}>2. การดำเนินการขึ้นทะเบียนรวมถึงการแจกจ่ายเอกสารใช้ระยะเวลาภายใน 5 วันทำการ (ไม่รวมวันหยุด)</div>
            <div>2. Registration process including document distribution takes within 5 working days (excluding holidays).</div>
          </div>

          {/* 9. Signatures Block */}
          <table style={{ marginBottom: "4px", tableLayout: "fixed", textAlign: "center" }}>
            <thead>
              <tr className="font-bold bg-gray" style={{ fontSize: "8.5px" }}>
                <td style={{ width: "33.33%" }}>PREPARED</td>
                <td style={{ width: "33.33%" }}>CHECKED</td>
                <td style={{ width: "33.33%" }}>APPROVED</td>
              </tr>
            </thead>
            <tbody>
              <tr style={{ height: "48px" }}>
                {/* 9.1. ผู้จัดทำ (PREPARER) */}
                <td style={{ padding: "2px", verticalAlign: "middle" }}>
                  {(() => {
                    const p = dar.approvals.find(a => a.stepRole === "PREPARER" && a.action === "APPROVED");
                    return p?.signatureUsedUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={p.signatureUsedUrl} alt="Preparer Signature" style={{ maxHeight: "44px", maxWidth: "100%", objectFit: "contain" }} />
                    ) : (
                      <div style={{ fontSize: "8px", color: "#bbb" }}>(ยังไม่ได้ลงชื่อ)</div>
                    );
                  })()}
                </td>
                {/* 9.2. ผู้ตรวจสอบ (REVIEWER) */}
                <td style={{ padding: "2px", verticalAlign: "middle" }}>
                  {(() => {
                    const r = dar.approvals.find(a => a.stepRole === "REVIEWER" && a.action === "APPROVED");
                    return r?.signatureUsedUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={r.signatureUsedUrl} alt="Reviewer Signature" style={{ maxHeight: "44px", maxWidth: "100%", objectFit: "contain" }} />
                    ) : (
                      <div style={{ fontSize: "8px", color: "#bbb" }}>(ยังไม่ได้ตรวจสอบ)</div>
                    );
                  })()}
                </td>
                {/* 9.3. ผู้อนุมัติ / MR (APPROVER_MR) */}
                <td style={{ padding: "2px", verticalAlign: "middle" }}>
                  {(() => {
                    const a = dar.approvals.find(a => a.stepRole === "APPROVER_MR" && a.action === "APPROVED");
                    return a?.signatureUsedUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={a.signatureUsedUrl} alt="MR Signature" style={{ maxHeight: "44px", maxWidth: "100%", objectFit: "contain" }} />
                    ) : (
                      <div style={{ fontSize: "8px", color: "#bbb" }}>(ยังไม่ได้อนุมัติ)</div>
                    );
                  })()}
                </td>
              </tr>
              <tr style={{ fontSize: "8px", height: "14px" }}>
                {/* วันที่ลงลายมือชื่อ */}
                <td className="text-left" style={{ paddingLeft: "6px" }}>
                  Date : {dar.approvals.find(a => a.stepRole === "PREPARER" && a.action === "APPROVED")?.actionDate ? new Date(dar.approvals.find(a => a.stepRole === "PREPARER")!.actionDate!).toLocaleDateString('th-TH') : ""}
                </td>
                <td className="text-left" style={{ paddingLeft: "6px" }}>
                  Date : {dar.approvals.find(a => a.stepRole === "REVIEWER" && a.action === "APPROVED")?.actionDate ? new Date(dar.approvals.find(a => a.stepRole === "REVIEWER")!.actionDate!).toLocaleDateString('th-TH') : ""}
                </td>
                <td className="text-left" style={{ paddingLeft: "6px" }}>
                  Date : {dar.approvals.find(a => a.stepRole === "APPROVER_MR" && a.action === "APPROVED")?.actionDate ? new Date(dar.approvals.find(a => a.stepRole === "APPROVER_MR")!.actionDate!).toLocaleDateString('th-TH') : ""}
                </td>
              </tr>
            </tbody>
          </table>

          {/* 10. For DCC Section Container */}
          <div className="section-title">สำหรับเจ้าหน้าที่ DCC</div>
          <div className="dcc-grid">
            {/* Col 1 */}
            <div className="dcc-col" style={{ fontSize: "8px" }}>
              <div className="checkbox-item" style={{ marginBottom: "2px" }}>
                <div className={`checkbox-box ${dar.qmsProcessing?.chkHasAttachment ? 'checked' : ''}`}></div>
                <div>มีเอกสารแนบท้าย<br /><span style={{ fontSize: "7px", color: "#555" }}>There are attached documents.</span></div>
              </div>
              <div className="checkbox-item" style={{ marginBottom: "2px" }}>
                <div className={`checkbox-box ${dar.qmsProcessing?.chkPrintAndValidate ? 'checked' : ''}`}></div>
                <div>จัดพิมพ์เอกสารและตรวจสอบความถูกต้อง<br /><span style={{ fontSize: "7px", color: "#555" }}>Print documents and validate them</span></div>
              </div>
              <div className="checkbox-item">
                <div className={`checkbox-box ${dar.qmsProcessing?.chkImpactInvestigated ? 'checked' : ''}`}></div>
                <div>ตรวจสอบผลกระทบต่อเอกสารหรืองานที่เกี่ยวข้องแล้ว<br /><span style={{ fontSize: "7px", color: "#555" }}>The impact on related documents or work has been investigated.</span></div>
              </div>
              <div className="checkbox-item" style={{ marginTop: "2px" }}>
                <div className={`checkbox-box ${dar.qmsProcessing?.chkGetBackProcess ? 'checked' : ''}`}></div>
                <div>รับเอกสารคืนเพื่อดำเนินการ<br /><span style={{ fontSize: "7px", color: "#555" }}>Get the documents back for processing</span></div>
              </div>
            </div>
            
            {/* Col 2 */}
            <div className="dcc-col" style={{ fontSize: "8px" }}>
              <div className="checkbox-item" style={{ marginBottom: "2px" }}>
                <div className={`checkbox-box ${dar.qmsProcessing && !dar.qmsProcessing.chkHasAttachment ? 'checked' : ''}`}></div>
                <div>ไม่มีเอกสารแนบท้าย<br /><span style={{ fontSize: "7px", color: "#555" }}>No attached documents.</span></div>
              </div>
              <div className="checkbox-item" style={{ marginBottom: "2px" }}>
                <div className={`checkbox-box ${dar.qmsProcessing?.chkRenumber ? 'checked' : ''}`}></div>
                <div>กำหนดหมายเลขเอกสารใหม่<br /><span style={{ fontSize: "7px", color: "#555" }}>Renumber documents</span></div>
              </div>
              <div className="checkbox-item">
                <div className={`checkbox-box ${dar.qmsProcessing?.chkSubmitVerification ? 'checked' : ''}`}></div>
                <div>ส่งเอกสารให้หน่วยงานตรวจสอบความถูกต้อง<br /><span style={{ fontSize: "7px", color: "#555" }}>Submit the documents to the verification agency</span></div>
              </div>
              <div className="checkbox-item" style={{ marginTop: "2px" }}>
                <div className={`checkbox-box ${dar.qmsProcessing?.chkCopyDistribute ? 'checked' : ''}`}></div>
                <div>สำเนาเอกสารเพื่อแจกจ่าย<br /><span style={{ fontSize: "7px", color: "#555" }}>Copy of document for distribution</span></div>
              </div>
            </div>
            
            {/* Col 3 */}
            <div className="dcc-col text-center" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div className="font-bold bg-gray" style={{ border: "1px solid #000", padding: "2px", fontSize: "8px" }}>DCC</div>
              <div className="signature-area" style={{ height: "48px", border: "1px dashed #9ca3af", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {(() => {
                  const qmsSig = dar.approvals.find(a => a.stepRole === "QMS_PROCESSOR" && a.action === "APPROVED");
                  return qmsSig?.signatureUsedUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={qmsSig.signatureUsedUrl} alt="DCC Signature" style={{ maxHeight: "44px", maxWidth: "100%", objectFit: "contain" }} />
                  ) : (
                    <div style={{ fontSize: "8px", color: "#bbb" }}>(รอเจ้าหน้าที่)</div>
                  );
                })()}
              </div>
              <div className="text-left font-bold" style={{ fontSize: "8px" }}>
                Date : {dar.qmsProcessing?.processDate ? new Date(dar.qmsProcessing.processDate).toLocaleDateString('th-TH') : ""}
              </div>
            </div>
            
            {/* Col 4 */}
            <div className="dcc-col" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
              <div className="font-bold" style={{ fontSize: "8.5px" }}>Remark :</div>
              <div style={{ fontSize: "8px", marginTop: "3px", lineHeight: 1.3, whiteSpace: "pre-wrap" }}>
                {dar.qmsProcessing?.comments || ""}
              </div>
            </div>
          </div>

          {/* 11. Document Delivery or Document Recall */}
          <div className="font-bold text-center bg-gray" style={{ border: "1px solid #000", borderBottom: "none", padding: "2px", fontSize: "8.5px" }}>
            ส่วนการนำจ่ายเอกสาร หรือการเรียกคืนเอกสาร (As for document delivery or document recall)
          </div>
          <div style={{ border: "1px solid #000", padding: "4px", fontSize: "8.5px", borderBottom: "none" }}>
            {renderItems.map((item, index) => (
              <div key={index} style={{ marginBottom: index === renderItems.length - 1 ? "0" : "3px", display: "flex", alignItems: "center" }}>
                <span>No.</span> 
                <span className="dotted-line" style={{ width: "60px", textAlign: "center" }}>{item.docName ? index + 1 : ""}</span>
                <span style={{ marginLeft: "8px" }}>Document Name</span> 
                <span className="dotted-line" style={{ width: "250px", paddingLeft: "4px" }}>{item.docName || ""}</span>
                <span style={{ marginLeft: "8px" }}>Document Number</span> 
                <span className="dotted-line" style={{ width: "120px", paddingLeft: "4px" }}>{item.docNumber || ""}</span>
                <span style={{ marginLeft: "8px" }}>Rev.</span> 
                <span className="dotted-line" style={{ width: "30px", textAlign: "center" }}>{item.revision || ""}</span>
              </div>
            ))}
          </div>

          <div className="double-table-container">
            <table className="half-table">
              <thead>
                <tr className="text-center font-bold bg-gray" style={{ fontSize: "7.5px" }}>
                  <th style={{ width: "15%" }}>แผนก</th>
                  <th style={{ width: "35%" }}>ผู้รับเอกสาร-คืน</th>
                  <th style={{ width: "20%" }}>วันที่รับเอกสาร</th>
                  <th style={{ width: "30%" }}>ผู้คืนเอกสาร (DC)</th>
                </tr>
                <tr className="text-center" style={{ fontSize: "7px", color: "#555" }}>
                  <th>Department</th>
                  <th>Document recipient-return</th>
                  <th>Date of receipt</th>
                  <th>Document Return Receiver (DC)</th>
                </tr>
              </thead>
              <tbody>
                {leftDistributions.map((dist, i) => (
                  <tr key={`left-${i}`}>
                    <td className="text-center">{dist?.department?.name || "\u00A0"}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <table className="half-table">
              <thead>
                <tr className="text-center font-bold bg-gray" style={{ fontSize: "7.5px" }}>
                  <th style={{ width: "15%" }}>แผนก</th>
                  <th style={{ width: "35%" }}>ผู้รับเอกสาร-คืน</th>
                  <th style={{ width: "20%" }}>วันที่รับเอกสาร</th>
                  <th style={{ width: "30%" }}>ผู้คืนเอกสาร (DC)</th>
                </tr>
                <tr className="text-center" style={{ fontSize: "7px", color: "#555" }}>
                  <th>Department</th>
                  <th>Document recipient-return</th>
                  <th>Date of receipt</th>
                  <th>Document Return Receiver (DC)</th>
                </tr>
              </thead>
              <tbody>
                {rightDistributions.map((dist, i) => (
                  <tr key={`right-${i}`}>
                    <td className="text-center">{dist?.department?.name || "\u00A0"}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="footer-note">
            FM-DC-01 : Rev.02 : 18-07-2025
          </div>

        </div>
      </div>
    </>
  );
}
