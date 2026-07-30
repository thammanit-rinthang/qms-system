/* eslint-disable @next/next/no-page-custom-font */
/* eslint-disable @next/next/no-img-element */
import PrintPageActions from "@/components/shared/PrintPageActions";
import type { AuditAppointmentRow } from "@/types/audit";
import type { FooterConfig } from "@/services/qmsConfigService";
import { resolvePrintLabel } from "./AuditPrintShared";

type AuditAppointmentPrintTemplateProps = {
  appointment: AuditAppointmentRow;
  appointmentConfig?: FooterConfig | null;
  auditorConfig?: FooterConfig | null;
};



// Translate department names into bilingual form
function getDeptLabel(dept: string): { th: string; en: string } {
  const d = dept.trim().toLowerCase();
  if (d.includes("qms") || d.includes("quality")) {
    return { th: "แผนกระบบมาตรฐานคุณภาพ", en: "Quality Management System Section" };
  }
  if (d.includes("safety") || d.includes("she") || d.includes("environment")) {
    return { th: "แผนกระบบมาตรฐานความปลอดภัย อาชีวอนามัยและสิ่งแวดล้อม", en: "Safety, Health, and Environment Section" };
  }
  if (d.includes("hr") || d.includes("human") || d.includes("resource")) {
    return { th: "แผนกทรัพยากรบุคคล", en: "Human Resources Section" };
  }
  if (d.includes("sales") || d.includes("marketing") || d.includes("sale")) {
    return { th: "แผนกขายและการตลาด", en: "Sales and Marketing Section" };
  }
  if (d.includes("purchase") || d.includes("purchasing") || d.includes("procurement")) {
    return { th: "แผนกจัดซื้อ", en: "Purchasing Section" };
  }
  if (d.includes("production") || d.includes("manufacture")) {
    return { th: "แผนกผลิต", en: "Production Section" };
  }
  if (d.includes("engineer") || d.includes("engineering")) {
    return { th: "แผนกวิศวกรรม", en: "Engineering Section" };
  }
  if (d.includes("warehouse") || d.includes("store") || d.includes("logistics")) {
    return { th: "แผนกคลังสินค้า", en: "Warehouse Section" };
  }
  if (d.includes("it") || d.includes("information")) {
    return { th: "แผนกเทคโนโลยีสารสนเทศ", en: "IT Section" };
  }
  // Fallback
  const cleanDept = dept.trim();
  return { th: `แผนก${cleanDept}`, en: `${cleanDept} Section` };
}

// Determine role title in bilingual form
function getMemberRoleTitle(role: string, department: string, nameTh: string): { th: string; en: string } {
  const dept = department.toLowerCase();
  const name = nameTh.toLowerCase();
  
  if (dept.includes("qms") || dept.includes("quality")) {
    return { th: "เจ้าหน้าที่แผนกระบบบริหารงานคุณภาพ", en: "Quality Management System Officer" };
  }
  if (dept.includes("safety") || dept.includes("she") || dept.includes("environment")) {
    if (name.includes("วิหวัส") || name.includes("wittawat")) {
      return { th: "เจ้าหน้าที่ความปลอดภัย", en: "Safety Officer" };
    }
    return { th: "เจ้าหน้าที่สิ่งแวดล้อม", en: "Environmental Officer" };
  }
  if (dept.includes("hr") || dept.includes("human") || dept.includes("resource")) {
    if (name.includes("แสงสุรีย์") || name.includes("saengsuree")) {
      return { th: "เจ้าหน้าที่ค่าจ้างและสวัสดิการ", en: "HR Payroll and benefits officer" };
    }
    return { th: "เจ้าหน้าที่สรรหาบุคลากร", en: "Human Resources Officer" };
  }
  if (dept.includes("sales") || dept.includes("marketing") || dept.includes("sale")) {
    return { th: "เจ้าหน้าที่แผนกขายและการตลาด", en: "Sales and Marketing Officer" };
  }
  if (dept.includes("purchase") || dept.includes("purchasing") || dept.includes("procurement")) {
    return { th: "เจ้าหน้าที่จัดซื้อ", en: "Purchasing Officer" };
  }
  if (dept.includes("production")) {
    return { th: "เจ้าหน้าที่ผลิต", en: "Production Officer" };
  }
  if (dept.includes("engineer") || dept.includes("engineering")) {
    return { th: "เจ้าหน้าที่วิศวกรรม", en: "Engineering Officer" };
  }
  if (dept.includes("warehouse")) {
    return { th: "เจ้าหน้าที่คลังสินค้า", en: "Warehouse Officer" };
  }
  if (dept.includes("it")) {
    return { th: "เจ้าหน้าที่เทคโนโลยีสารสนเทศ", en: "IT Officer" };
  }
  
  // Fallbacks based on audit role
  if (role === "LEAD_AUDITOR") {
    return { th: "หัวหน้าผู้ตรวจติดตามภายใน", en: "Lead Auditor" };
  }
  if (role === "AUDITOR") {
    return { th: "ผู้ตรวจติดตามภายใน", en: "Internal Auditor" };
  }
  return { th: "คณะทำงาน", en: "Committee Member" };
}

// Split name to Thai and English parts
function parseBilingualName(nameStr: string): { th: string; en: string } {
  if (nameStr.includes("/")) {
    const parts = nameStr.split("/").map((p) => p.trim());
    return { th: parts[0] || "", en: parts[1] || "" };
  }
  if (nameStr.includes("(")) {
    const parts = nameStr.split("(").map((p) => p.trim().replace(")", ""));
    return { th: parts[0] || "", en: parts[1] || "" };
  }
  return { th: nameStr.trim(), en: "" };
}

// Format date into 26-Feb-26 format
function formatDateEn(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = String(date.getFullYear()).substring(2);
  return `${day}-${month}-${year}`;
}

// Format date into 26 FEB 2026 format
function formatDateSign(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export default function AuditAppointmentPrintTemplate({
  appointment,
  appointmentConfig,
}: AuditAppointmentPrintTemplateProps) {
  const appointmentMeta = resolvePrintLabel(
    appointmentConfig,
    "Announcement of the Appointment of the ISO Management System Working Group | ประกาศแต่งตั้งคณะทำงานระบบบริหารงาน ISO",
    "FM-DC-06",
  );

  const reviewerSignoff = appointment.signoffs.find((s) => s.signedRole === "REVIEWER");
  const approverSignoff = appointment.signoffs.find((s) => s.signedRole === "APPROVER");

  // Construct bilingual standards text dynamically
  const has9001 = appointment.standards.some((s) => s.includes("9001"));
  const has14001 = appointment.standards.some((s) => s.includes("14001"));
  const has45001 = appointment.standards.some((s) => s.includes("45001"));

  const textThParts: string[] = [];
  const textEnParts: string[] = [];

  if (has9001) {
    textThParts.push("ระบบบริหารงานคุณภาพ ISO 9001:2015");
    textEnParts.push("the Quality Management System (ISO 9001:2015)");
  }
  if (has14001) {
    textThParts.push("ระบบการจัดการสิ่งแวดล้อม ISO 14001:2015");
    textEnParts.push("the Environmental Management System (ISO 14001:2015)");
  }
  if (has45001) {
    textThParts.push("ระบบการจัดการอาชีวอนามัยและความปลอดภัย ISO 45001:2018");
    textEnParts.push("the Occupational Health and Safety Management System (ISO 45001:2018)");
  }

  let thStandardsText = "";
  if (textThParts.length === 1) {
    thStandardsText = textThParts[0];
  } else if (textThParts.length === 2) {
    thStandardsText = textThParts.join(" และ");
  } else if (textThParts.length > 2) {
    const last = textThParts.pop();
    thStandardsText = textThParts.join(", ") + " และ" + last;
  } else {
    thStandardsText = appointment.standards.join(", ");
  }

  let enStandardsText = "";
  if (textEnParts.length === 1) {
    enStandardsText = textEnParts[0];
  } else if (textEnParts.length === 2) {
    enStandardsText = textEnParts.join(" and ");
  } else if (textEnParts.length > 2) {
    const last = textEnParts.pop();
    enStandardsText = textEnParts.join(", ") + ", and " + last;
  } else {
    enStandardsText = appointment.standards.join(", ");
  }

  // Group members by department to match template format
  const groupedDepts: Array<{ department: string; members: typeof appointment.members }> = [];
  appointment.members.forEach((m) => {
    const dept = m.department || "General";
    let g = groupedDepts.find((x) => x.department === dept);
    if (!g) {
      g = { department: dept, members: [] };
      groupedDepts.push(g);
    }
    g.members.push(m);
  });

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 font-sarabun">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800&display=swap" rel="stylesheet" />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page { size: A4; margin: 10mm; }
            @media print {
              body { background: #fff; padding: 0; margin: 0; }
              .print-shell { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; }
              .no-print { display: none !important; }
            }
            .font-sarabun { font-family: 'Sarabun', 'Helvetica Neue', Arial, sans-serif; }
          `,
        }}
      />
      <PrintPageActions />

      <div className="print-shell mx-auto max-w-[210mm] min-h-[297mm] bg-white p-6 shadow-sm border border-slate-300 font-sarabun">
        {/* Outer Border Box wrapper to make it look exactly like the PDF template */}
        <div style={{ border: "2px solid #000", padding: "15px 20px", minHeight: "270mm", display: "flex", flexDirection: "column", justifyContent: "space-between", boxSizing: "border-box" }}>
          
          <div>
            {/* 1. Header Box Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", border: "2px solid #000", marginBottom: "0", color: "#000" }}>
              <tbody>
                <tr>
                  {/* Left Column: Logo & Company Name */}
                  <td style={{ width: "25%", textAlign: "center", verticalAlign: "middle", border: "2px solid #000", padding: "8px 5px" }}>
                    <img src="/logo/logo.webp" alt="NDC INDUSTRIAL" style={{ maxHeight: "32px", objectFit: "contain", display: "block", margin: "0 auto 4px" }} />
                    <div style={{ fontSize: "8.5px", fontWeight: "900", letterSpacing: "1.2px", color: "#000", fontFamily: "sans-serif" }}>INDUSTRIAL</div>
                  </td>
                  
                  {/* Middle Column: Subject block */}
                  <td style={{ width: "50%", border: "2px solid #000", padding: "8px 10px", textAlign: "center", verticalAlign: "middle" }}>
                    <div style={{ fontSize: "12.5px", fontWeight: "bold", color: "#000", marginBottom: "3px" }}>
                      เรื่อง : ประกาศแต่งตั้งคณะทำงานระบบบริหารงาน ISO
                    </div>
                    <div style={{ fontSize: "11px", fontWeight: "bold", color: "#000", lineHeight: "1.2" }}>
                      Subject: Announcement of the Appointment of the ISO Management System Working Group
                    </div>
                  </td>
                  
                  {/* Right Column: Doc details */}
                  <td style={{ width: "25%", border: "2px solid #000", padding: 0, verticalAlign: "top" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", border: "none", height: "100%", margin: 0, fontSize: "10px", color: "#000" }}>
                      <tbody>
                        <tr>
                          <td style={{ borderTop: "none", borderLeft: "none", borderBottom: "1px solid #000", width: "40px", fontWeight: "bold", padding: "4px 5px" }}>No.</td>
                          <td style={{ borderTop: "none", borderLeft: "1px solid #000", borderBottom: "1px solid #000", padding: "4px 5px", fontWeight: "bold", textAlign: "center", fontSize: "9.5px" }}>{appointment.appointmentNo}</td>
                          <td style={{ borderTop: "none", borderLeft: "1px solid #000", borderBottom: "1px solid #000", borderRight: "none", width: "35px", textAlign: "center", padding: "4px 5px", fontWeight: "bold" }}>R.00</td>
                        </tr>
                        <tr>
                          <td style={{ borderLeft: "none", borderBottom: "1px solid #000", fontWeight: "bold", padding: "4px 5px" }}>Date.</td>
                          <td colSpan={2} style={{ borderLeft: "1px solid #000", borderBottom: "1px solid #000", borderRight: "none", padding: "4px 5px", textAlign: "center", fontWeight: "bold" }}>{formatDateEn(appointment.publishedAt || appointment.updatedAt)}</td>
                        </tr>
                        <tr>
                          <td style={{ borderBottom: "none", borderLeft: "none", fontWeight: "bold", padding: "4px 5px" }}>Pages.</td>
                          <td colSpan={2} style={{ borderBottom: "none", borderLeft: "1px solid #000", borderRight: "none", padding: "4px 5px", textAlign: "center", fontWeight: "bold" }}>1/1</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 2. Signatures Grid Box */}
            <table style={{ width: "100%", borderCollapse: "collapse", border: "2px solid #000", borderTop: "none", marginBottom: "15px", color: "#000" }}>
              <tbody>
                <tr style={{ textAlign: "center", fontWeight: "bold", fontSize: "10px" }}>
                  <td style={{ border: "2px solid #000", borderTop: "none", borderLeft: "none", width: "33.33%", padding: "4px", backgroundColor: "#f8fafc" }}>Issued By</td>
                  <td style={{ border: "2px solid #000", borderTop: "none", width: "33.33%", padding: "4px", backgroundColor: "#f8fafc" }}>Checked By</td>
                  <td style={{ border: "2px solid #000", borderTop: "none", borderRight: "none", width: "33.33%", padding: "4px", backgroundColor: "#f8fafc" }}>Approved By</td>
                </tr>
                <tr style={{ height: "55px", textAlign: "center", verticalAlign: "middle" }}>
                  {/* Issued By (Prepared by Owner) */}
                  <td style={{ border: "2px solid #000", borderLeft: "none", padding: "4px 5px", position: "relative" }}>
                    {appointment.ownerSignaturePath ? (
                      <img src={appointment.ownerSignaturePath} alt="Owner Signature" style={{ maxHeight: "35px", maxWidth: "90%", display: "block", margin: "0 auto" }} />
                    ) : (
                      <div style={{ height: "35px" }} />
                    )}
                    <div style={{ fontSize: "9.5px", fontWeight: "500", marginTop: "2px", color: "#0F1059" }}>{appointment.ownerNameSnapshot}</div>
                  </td>
                  {/* Checked By (Reviewer) */}
                  <td style={{ border: "2px solid #000", padding: "4px 5px" }}>
                    {reviewerSignoff?.signaturePath ? (
                      <img src={reviewerSignoff.signaturePath} alt="Reviewer Signature" style={{ maxHeight: "35px", maxWidth: "90%", display: "block", margin: "0 auto" }} />
                    ) : (
                      <div style={{ height: "35px" }} />
                    )}
                    <div style={{ fontSize: "9.5px", fontWeight: "500", marginTop: "2px", color: "#0F1059" }}>{reviewerSignoff?.signerNameSnapshot || (appointment.reviewerNameSnapshot ?? "")}</div>
                  </td>
                  {/* Approved By (Approver) */}
                  <td style={{ border: "2px solid #000", borderRight: "none", padding: "4px 5px" }}>
                    {approverSignoff?.signaturePath ? (
                      <img src={approverSignoff.signaturePath} alt="Approver Signature" style={{ maxHeight: "35px", maxWidth: "90%", display: "block", margin: "0 auto" }} />
                    ) : (
                      <div style={{ height: "35px" }} />
                    )}
                    <div style={{ fontSize: "9.5px", fontWeight: "500", marginTop: "2px", color: "#0F1059" }}>{approverSignoff?.signerNameSnapshot || (appointment.approverNameSnapshot ?? "")}</div>
                  </td>
                </tr>
                <tr style={{ fontSize: "9px", color: "#000" }}>
                  <td style={{ border: "2px solid #000", borderBottom: "none", borderLeft: "none", padding: "4px 5px" }}>
                    Date: <span style={{ color: "#0F1059", fontWeight: "bold", fontFamily: "monospace" }}>{formatDateSign(appointment.createdAt)}</span>
                  </td>
                  <td style={{ border: "2px solid #000", borderBottom: "none", padding: "4px 5px" }}>
                    Date: <span style={{ color: "#0F1059", fontWeight: "bold", fontFamily: "monospace" }}>{formatDateSign(reviewerSignoff?.signedAt)}</span>
                  </td>
                  <td style={{ border: "2px solid #000", borderBottom: "none", borderRight: "none", padding: "4px 5px" }}>
                    Date: <span style={{ color: "#0F1059", fontWeight: "bold", fontFamily: "monospace" }}>{formatDateSign(approverSignoff?.signedAt)}</span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 3. Introduction Paragraphs */}
            <div style={{ fontSize: "10.5px", textAlign: "justify", lineHeight: "1.45", color: "#000", marginBottom: "16px" }}>
              <p style={{ textIndent: "2.5em", margin: "0 0 6px 0" }}>
                เพื่อให้การดำเนินงานตามระบบบริหารงานคุณภาพ {thStandardsText} ของบริษัท เอ็นดีซี อินดัสเทรียล จำกัด เป็นไปอย่างมีประสิทธิภาพเพื่อให้สอดคล้องกับข้อกำหนดของมาตรฐาน และสามารถพัฒนาและปรับปรุงได้อย่างต่อเนื่อง บริษัทฯ จึงแต่งตั้งคณะทำงานระบบบริหารงาน ISO โดยมีรายชื่อดังต่อไปนี้:
              </p>
              <p style={{ textIndent: "2.5em", margin: "0" }}>
                In order to ensure the effective implementation of {enStandardsText} of NDC Industrial Co., Ltd., in compliance with the requirements of the standards and to enable continual improvement and development, the Company hereby appoints the ISO Management System Committee, with the following members:
              </p>
            </div>

            {/* 4. Grouped Committee Members List */}
            <div style={{ paddingLeft: "5px" }}>
              {groupedDepts.map((group, groupIdx) => {
                const deptLabel = getDeptLabel(group.department);
                return (
                  <div key={groupIdx} style={{ marginBottom: "12px", fontSize: "11px", color: "#000" }}>
                    <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
                      {groupIdx + 1}. {deptLabel.th} ประกอบด้วยบุคคลดังต่อไปนี้
                      <div style={{ fontWeight: "bold", fontSize: "10px", color: "#444", marginTop: "1px" }}>
                        {deptLabel.en} Following individuals:
                      </div>
                    </div>
                    
                    <div style={{ paddingLeft: "15px" }}>
                      {group.members.map((member, mIdx) => {
                        const nameLabel = parseBilingualName(member.name);
                        const roleLabel = getMemberRoleTitle(member.role, group.department, nameLabel.th);
                        return (
                          <div key={member.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", lineHeight: "1.3" }}>
                            <div style={{ width: "52%" }}>
                              <div style={{ fontWeight: "600" }}>
                                {groupIdx + 1}.{mIdx + 1} {nameLabel.th}
                              </div>
                              {nameLabel.en && (
                                <div style={{ fontSize: "9.5px", color: "#444", paddingLeft: "18px" }}>
                                  {nameLabel.en}
                                </div>
                              )}
                            </div>
                            <div style={{ width: "48%", textAlign: "left", paddingLeft: "10px" }}>
                              <div style={{ fontWeight: "600" }}>
                                {roleLabel.th}
                              </div>
                              <div style={{ fontSize: "9.5px", color: "#555" }}>
                                {roleLabel.en}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Footer Revision Code */}
          <div style={{ textAlign: "right", fontSize: "9.5px", color: "#000", fontFamily: "monospace", borderTop: "1px solid #ddd", paddingTop: "5px", marginTop: "15px" }}>
            {appointmentMeta.prefix || "FM-DC-06:Rev.00:20/11/2024"}
          </div>

        </div>
      </div>
    </div>
  );
}
