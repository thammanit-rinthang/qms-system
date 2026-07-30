"use client";

/* eslint-disable @next/next/no-page-custom-font */
/* eslint-disable @next/next/no-img-element */

import PrintPageActions from "@/components/shared/PrintPageActions";
import type { FooterConfig } from "@/services/qmsConfigService";
import { resolvePrintLabel } from "./AuditPrintShared";

// Format date into Thai Buddhist Era / English format (e.g. 21 เมษายน 2569 / 21-Apr-2026)
function formatBilingualDate(dateStr: string | Date | null | undefined): { th: string; en: string } {
  if (!dateStr) return { th: "-", en: "-" };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { th: "-", en: "-" };

  const monthsTh = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const date = d.getDate();
  const monthTh = monthsTh[d.getMonth()];
  const monthEn = monthsEn[d.getMonth()];
  const yearTh = d.getFullYear() + 543;
  const yearEn = d.getFullYear();

  return {
    th: `${date} ${monthTh} ${yearTh}`,
    en: `${date}-${monthEn}-${yearEn}`
  };
}

// Format time range (e.g. 09:00 น. - 12:00 น. / 09:00 AM - 12:00 PM)
function formatBilingualTime(start: string, end: string): { th: string; en: string } {
  const cleanStart = (start || "").trim();
  const cleanEnd = (end || "").trim();
  if (!cleanStart && !cleanEnd) return { th: "-", en: "-" };

  // Helper to convert HH:MM to 12-hour AM/PM format
  const to12Hr = (timeStr: string) => {
    const parts = timeStr.split(":");
    if (parts.length < 2) return timeStr;
    const hrs = parseInt(parts[0]);
    const mins = parts[1];
    const ampm = hrs >= 12 ? "PM" : "AM";
    const hrs12 = hrs % 12 || 12;
    return `${String(hrs12).padStart(2, "0")}:${parts[0]}:${mins} ${ampm}`.replace(/^\d{2}:\d{2}:\d{2}/, `${String(hrs12).padStart(2, "0")}:${mins}`);
  };

  return {
    th: `${cleanStart} น. - ${cleanEnd} น.`,
    en: `${to12Hr(cleanStart)} - ${to12Hr(cleanEnd)}`
  };
}

// Translate department names dynamically into bilingual form
function getBilingualDept(dept: string): { th: string; en: string } {
  const d = dept.trim().toLowerCase();
  
  if (d.includes("managing director") || d.includes("ผู้บริหารสูงสุด")) {
    return { th: "ผู้บริหารสูงสุด/ผู้บริหารระดับสูง", en: "MD-Managing Director" };
  }
  if (d.includes("document control") || d.includes("mr-management") || d.includes("dc-document")) {
    return { th: "ตัวแทนฝ่ายบริหาร/ควบคุมเอกสาร", en: "MR-Management/DC-Document Control" };
  }
  if (d.includes("human resources") || d.includes("hr-human")) {
    return { th: "ทรัพยากรบุคคล", en: "HR-Human Resources" };
  }
  if (d.includes("general affairs") || d.includes("ga-general")) {
    return { th: "ธุรการทั่วไป", en: "GA-General Affairs" };
  }
  if (d.includes("sales") || d.includes("marketing")) {
    return { th: "ฝ่ายขายและการตลาด", en: "Sales and Marketing" };
  }
  if (d.includes("planning") || d.includes("pn-planning")) {
    return { th: "วางแผนการผลิต", en: "PN-Planning" };
  }
  if (d.includes("engineering") || d.includes("วิศวกรรม")) {
    return { th: "วิศวกรรม (ออกแบบ)", en: "EN-Engineering (Design)" };
  }
  if (d.includes("mold") || d.includes("แม่พิมพ์")) {
    return { th: "แม่พิมพ์", en: "Mold" };
  }
  if (d.includes("production #3") || d.includes("factory #3")) {
    return { th: "ฝ่ายผลิต ( Factory #3 )", en: "PD-Production #3 (Melting and casting aluminum.)" };
  }
  if (d.includes("production #5") || d.includes("factory #5")) {
    return { th: "ฝ่ายผลิต ( Factory #5 )", en: "PD-Production #5 (Aluminum forging.)" };
  }
  if (d.includes("production #2") || d.includes("factory #2")) {
    return { th: "ฝ่ายผลิต ( Factory #2 )", en: "PD-Production #2 (Assemble)" };
  }
  if (d.includes("production #4") || d.includes("factory #4")) {
    return { th: "ฝ่ายผลิต ( Factory #4 )", en: "PD-Production #4 (Machining & UV Print)" };
  }
  if (d.includes("quality assurance") || d.includes("qa-quality") || d.includes("ประกันคุณภาพ")) {
    return { th: "ประกันคุณภาพ", en: "QA-Quality Assurance" };
  }
  if (d.includes("purchasing") || d.includes("pur-purchasing") || d.includes("จัดซื้อ")) {
    return { th: "ฝ่ายจัดซื้อ", en: "PUR-Purchasing" };
  }
  if (d.includes("warehouse") || d.includes("wh-warehouse") || d.includes("คลังสินค้า")) {
    return { th: "คลังสินค้า", en: "WH-warehouse" };
  }
  if (d.includes("accounting") || d.includes("acc-accounting") || d.includes("บัญชี")) {
    return { th: "บัญชี", en: "ACC-Accounting" };
  }
  if (d.includes("information technology") || d.includes("it-information") || d.includes("สารสนเทศ")) {
    return { th: "เทคโนโลยีสารสนเทศ", en: "IT-Information Technology" };
  }
  if (d.includes("safety") || d.includes("she-safety") || d.includes("สิ่งแวดล้อม")) {
    return { th: "สิ่งแวดล้อม อาชีวอนามัยและความปลอดภัย", en: "SHE-Safety Health and environment" };
  }
  if (d.includes("maintenance") || d.includes("mn-maintenance") || d.includes("ซ่อมบำรุง")) {
    return { th: "ซ่อมบำรุง", en: "MN-Maintenance" };
  }
  if (d.includes("management review") || d.includes("ประชุมทบทวน")) {
    return { th: "ประชุมทบทวนโดยฝ่ายบริหาร", en: "Management Review Meeting" };
  }

  // Fallback
  return { th: dept, en: dept };
}

// Convert name into standardized prefix style
function formatShortName(fullName: string): string {
  if (!fullName) return "";
  const clean = fullName.trim();
  let name = clean;
  if (clean.includes("/")) {
    name = clean.split("/")[1]?.trim() || clean.split("/")[0]?.trim();
  }
  
  let prefix = "";
  let nameWithoutPrefix = name;
  const prefixes = ["mr.", "ms.", "mrs.", "นาย", "นางสาว", "นาง"];
  for (const pf of prefixes) {
    if (name.toLowerCase().startsWith(pf)) {
      prefix = pf.toUpperCase().replace("นาย", "MR.").replace("นางสาว", "MS.").replace("นาง", "MRS.");
      if (!prefix.endsWith(".")) prefix += ".";
      nameWithoutPrefix = name.substring(pf.length).trim();
      break;
    }
  }

  const parts = nameWithoutPrefix.split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0];
    const lastInit = parts[parts.length - 1].substring(0, 1).toUpperCase();
    return `${prefix ? prefix + " " : ""}${first.toUpperCase()} ${lastInit}.`;
  }
  return name.toUpperCase();
}

type TeamMember = {
  id?: string;
  role: string;
  name: string;
  authUserId?: string | null;
};

type SessionRow = {
  id?: string;
  orderIndex: number;
  auditDate: string;
  startTime: string;
  endTime: string;
  department: string;
  remark: string | null;
  teamMembers: TeamMember[];
};

type GanttRow = {
  id?: string;
  orderIndex: number;
  department: string;
  processes: string[];
  planWeeks: string[];
  actualWeeks: string[];
};

type AppointmentMember = {
  id: string;
  authUserId: string;
  name: string;
  department: string | null;
  role: string;
};

type Appointment = {
  id: string;
  appointmentNo: string;
  year: number;
  title: string;
  standards: string[];
  status: string;
  publishedAt?: string | null;
  ownerSignaturePath?: string | null;
  ownerNameSnapshot?: string | null;
  ownerPositionSnapshot?: string | null;
  reviewerNameSnapshot?: string | null;
  reviewerPositionSnapshot?: string | null;
  approverNameSnapshot?: string | null;
  approverPositionSnapshot?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  members: AppointmentMember[];
  sessionPlan: {
    id: string;
    reviseNo: number;
    reviseDate: string | null;
    sessions: SessionRow[];
    ganttRows: GanttRow[];
  } | null;
  signoffs: Array<{
    id: string;
    signedRole: string;
    signedByAuthUserId?: string;
    signerNameSnapshot: string | null;
    signaturePath: string | null;
    signedAt: string;
    position?: string | null;
  }>;
};

type Props = {
  appointment: Appointment;
  type: "gantt" | "session";
  config?: FooterConfig | null;
};

export default function AuditSessionPlanPrintTemplate({
  appointment,
  type,
  config,
}: Props) {
  const isGantt = type === "gantt";
  const docCode = isGantt ? "FM-MR-06" : "FM-MR-07";
  const docRev = isGantt ? "Rev.01" : "Rev.01";
  const docDate = isGantt ? "01-03-2025" : "01-03-2025";
  
  const printMeta = resolvePrintLabel(
    config,
    isGantt
      ? "Internal Audit Plan and MRW Meeting / แผนตรวจติดตามคุณภาพภายในและประชุม MRW"
      : "Announcement of the Internal Audit Program / ประกาศโปรแกรมการตรวจติดตามคุณภาพภายใน",
    docCode,
  );

  const preparerSignoff = appointment.signoffs.find((s) => s.signedRole === "PREPARER");
  const reviewerSignoff = appointment.signoffs.find((s) => s.signedRole === "REVIEWER");
  const approverSignoff = appointment.signoffs.find((s) => s.signedRole === "APPROVER");

  const yearEn = appointment.year - 543;

  // Format sign dates
  const formatDateSign = (value: string | Date | null | undefined): string => {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const day = String(date.getDate()).padStart(2, "0");
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Define week columns for A4 Landscape (12 columns matching the template)
  const ganttWeeks = [
    { key: `${yearEn}-4-W3`, label: "W3", month: "Apr" },
    { key: `${yearEn}-4-W4`, label: "W4", month: "Apr" },
    { key: `${yearEn}-5-W1`, label: "W1", month: "May" },
    { key: `${yearEn}-5-W2`, label: "W2", month: "May" },
    { key: `${yearEn}-5-W3`, label: "W3", month: "May" },
    { key: `${yearEn}-5-W4`, label: "W4", month: "May" },
    { key: `${yearEn}-6-W1`, label: "W1", month: "Jun" },
    { key: `${yearEn}-6-W2`, label: "W2", month: "Jun" },
    { key: `${yearEn}-6-W3`, label: "W3", month: "Jun" },
    { key: `${yearEn}-6-W4`, label: "W4", month: "Jun" },
    { key: `${yearEn}-7-W1`, label: "W1", month: "Jul" },
    { key: `${yearEn}-7-W2`, label: "W2", month: "Jul" },
  ];

  const monthHeaders = [
    { label: `Apr-${String(yearEn).substring(2)}`, colSpan: 2 },
    { label: `May-${String(yearEn).substring(2)}`, colSpan: 4 },
    { label: `Jun-${String(yearEn).substring(2)}`, colSpan: 4 },
    { label: `Jul-${String(yearEn).substring(2)}`, colSpan: 2 },
  ];

  // Dynamically group lead auditors to define Team Letters (A, B, C... J)
  const leadAuditors = Array.from(
    new Set(
      (appointment.sessionPlan?.sessions || [])
        .flatMap((s) => s.teamMembers.filter((m) => m.role === "LEAD_AUDITOR").map((m) => m.name))
    )
  ).sort();

  const teamLetters: Record<string, string> = {};
  leadAuditors.forEach((leadName, idx) => {
    teamLetters[leadName] = String.fromCharCode(65 + idx); // Team A, B, C...
  });

  // Dynamically compile internal auditor teams list (A-J) for FM-MR-07 page 3
  const compiledTeams = leadAuditors.map((leadName, index) => {
    const letter = String.fromCharCode(65 + index);
    
    // Find all sessions where this lead auditor is leading
    const teamSessions = (appointment.sessionPlan?.sessions || [])
      .filter((s) => s.teamMembers.some((tm) => tm.role === "LEAD_AUDITOR" && tm.name === leadName));

    // Get unique auditors and observers in these sessions
    const auditorsList = Array.from(
      new Set(
        teamSessions.flatMap((s) => s.teamMembers.filter((tm) => tm.role === "AUDITOR").map((tm) => tm.name))
      )
    );

    const observersList = Array.from(
      new Set(
        teamSessions.flatMap((s) => s.teamMembers.filter((tm) => tm.role === "OBSERVER").map((tm) => tm.name))
      )
    );

    return {
      letter,
      leader: leadName,
      auditor2: auditorsList[0] || "-",
      auditor3: auditorsList[1] || "-",
      auditor4: auditorsList[2] || "-",
      observer5: observersList[0] || "-",
      observer6: observersList[1] || "-",
      observer7: observersList[2] || "-",
      observer8: observersList[3] || "-",
      observer9: observersList[4] || "-",
    };
  });

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 font-sarabun print:p-0 print:bg-white print:text-black">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800&display=swap" rel="stylesheet" />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page { size: A4 landscape; margin: 8mm 10mm; }
            @media print {
              body { background: #fff; padding: 0; margin: 0; }
              .print-shell { box-shadow: none !important; border: none !important; padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; }
              .no-print { display: none !important; }
              .page-break-after { page-break-after: always; }
              .page-break-before { page-break-before: always; }
            }
            .font-sarabun { font-family: 'Sarabun', 'Helvetica Neue', Arial, sans-serif; }
            .gantt-plan-cell { border: 2.2px solid #0059a4; width: 22px; height: 12px; margin: 0 auto; background: transparent; }
            .gantt-actual-cell { background: #0059a4; width: 22px; height: 12px; margin: 0 auto; }
          `,
        }}
      />
      <PrintPageActions />

      <div className="print-shell mx-auto max-w-[277mm] bg-white p-6 shadow-sm border border-slate-300 font-sarabun">
        {/* Outer border box wrapper for print template */}
        <div style={{ border: "2px solid #000", padding: "12px 18px", minHeight: "185mm", display: "flex", flexDirection: "column", justifyContent: "space-between", boxSizing: "border-box" }}>
          
          <div>
            {/* Header Document Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", border: "2px solid #000", marginBottom: "15px", color: "#000" }}>
              <tbody>
                <tr>
                  {/* Left logo column */}
                  <td style={{ width: "22%", textAlign: "center", verticalAlign: "middle", border: "2px solid #000", padding: "6px 5px" }}>
                    <img src="/logo/logo.webp" alt="NDC INDUSTRIAL" style={{ maxHeight: "30px", objectFit: "contain", display: "block", margin: "0 auto 2px" }} />
                    <div style={{ fontSize: "8px", fontWeight: "900", letterSpacing: "1px", color: "#000", fontFamily: "sans-serif" }}>INDUSTRIAL</div>
                  </td>
                  
                  {/* Middle Title column */}
                  <td style={{ width: "56%", border: "2px solid #000", padding: "6px 8px", textAlign: "center", verticalAlign: "middle" }}>
                    <div style={{ fontSize: "12px", fontWeight: "bold", color: "#000", marginBottom: "2px", lineHeight: "1.25" }}>
                      {isGantt 
                        ? `แผนการตรวจติดตามภายในและประชุม MRW ประจำปี พ.ศ. ${appointment.year}`
                        : `ประกาศการตรวจติดตามภายในในระบบบริหารจัดการด้านคุณภาพ สิ่งแวดล้อม อาชีวอนามัยและความปลอดภัย ครั้งที่ 1 / ${appointment.year}`
                      }
                    </div>
                    <div style={{ fontSize: "10.5px", fontWeight: "bold", color: "#000", lineHeight: "1.2" }}>
                      {isGantt
                        ? `Internal Audit Plan and MRW Meeting for the year ${yearEn}`
                        : `Announcement of the Internal Audit for the Quality, Environmental, and Occupational Health and Safety Management Systems 1st/${yearEn}`
                      }
                    </div>
                    <div style={{ fontSize: "9px", color: "#444", marginTop: "2px", lineHeight: "1.15" }}>
                      ระบบบริหารจัดการด้านคุณภาพ สิ่งแวดล้อม อาชีวอนามัยและความปลอดภัย/Quality Management System Environment, Occupational Health and Safety
                    </div>
                  </td>
                  
                  {/* Right Revision details column */}
                  <td style={{ width: "22%", border: "2px solid #000", padding: 0, verticalAlign: "top" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", border: "none", height: "100%", margin: 0, fontSize: "9px", color: "#000" }}>
                      <tbody>
                        <tr style={{ borderBottom: "1px solid #000" }}>
                          <td style={{ borderRight: "1px solid #000", width: "50%", fontWeight: "bold", padding: "3px 5px" }}>แก้ไขครั้งที่ / Revise No.</td>
                          <td style={{ padding: "3px 5px", textAlign: "center", fontWeight: "bold" }}>
                            {String(appointment.sessionPlan?.reviseNo ?? 0).padStart(2, "0")}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ borderRight: "1px solid #000", fontWeight: "bold", padding: "3px 5px" }}>วันที่แก้ไข / Revise Date</td>
                          <td style={{ padding: "3px 5px", textAlign: "center", fontWeight: "bold", fontSize: "8.5px" }}>
                            {appointment.sessionPlan?.reviseDate 
                              ? formatBilingualDate(appointment.sessionPlan.reviseDate).en
                              : formatBilingualDate(appointment.publishedAt || appointment.updatedAt).en
                            }
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* ── Render Gantt (FM-MR-06) ─────────────────────────────────── */}
            {isGantt && (
              <div className="overflow-x-auto">
                <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000", color: "#000", fontSize: "10px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f1f5f9", textAlign: "center", fontWeight: "bold" }}>
                      <th rowSpan={2} style={{ border: "1.5px solid #000", width: "4%", padding: "5px 2px" }}>ลำดับ<br/>No.</th>
                      <th rowSpan={2} style={{ border: "1.5px solid #000", width: "16%", padding: "5px 4px" }}>หน่วยงาน<br/>Department</th>
                      <th rowSpan={2} style={{ border: "1.5px solid #000", width: "30%", padding: "5px 6px" }}>กระบวนการตรวจ<br/>Examination process</th>
                      <th rowSpan={2} style={{ border: "1.5px solid #000", width: "8%", padding: "5px 2px" }}>การ<br/>ดำเนินการ<br/>Action</th>
                      {monthHeaders.map((m, idx) => (
                        <th key={idx} colSpan={m.colSpan} style={{ border: "1.5px solid #000", padding: "3px 2px", fontSize: "9.5px" }}>{m.label}</th>
                      ))}
                      <th rowSpan={2} style={{ border: "1.5px solid #000", width: "8%", padding: "5px 4px" }}>หมายเหตุ<br/>Remark</th>
                    </tr>
                    <tr style={{ backgroundColor: "#f8fafc", textAlign: "center", fontSize: "9px" }}>
                      {ganttWeeks.map((w, idx) => (
                        <th key={idx} style={{ border: "1.5px solid #000", width: "3%", padding: "2px 1px" }}>{w.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(!appointment.sessionPlan?.ganttRows || appointment.sessionPlan.ganttRows.length === 0) ? (
                      <tr>
                        <td colSpan={17} style={{ border: "1px solid #000", padding: "20px", textAlign: "center", color: "#666" }}>
                          ไม่พบข้อมูลแผน Gantt / No Gantt rows planned
                        </td>
                      </tr>
                    ) : (
                      appointment.sessionPlan.ganttRows.map((row, rowIdx) => {
                        const deptLabel = getBilingualDept(row.department);
                        return (
                          <tr key={rowIdx} style={{ height: "24px" }}>
                            <td style={{ border: "1.5px solid #000", textAlign: "center", padding: "4px 2px", fontWeight: "bold" }}>
                              {rowIdx + 1}
                            </td>
                            <td style={{ border: "1.5px solid #000", padding: "4px 6px", fontWeight: "600", lineHeight: "1.3" }}>
                              <div style={{ fontSize: "10.5px" }}>{deptLabel.th}</div>
                              <div style={{ fontSize: "9px", color: "#555", fontWeight: "normal" }}>{deptLabel.en}</div>
                            </td>
                            <td style={{ border: "1.5px solid #000", padding: "4px 8px", fontSize: "9px", lineHeight: "1.3" }}>
                              <ul style={{ listStyleType: "none", margin: 0, padding: 0 }}>
                                {row.processes.map((p, pIdx) => (
                                  <li key={pIdx} style={{ paddingLeft: "10px", textIndent: "-10px", marginBottom: "2px" }}>
                                    • {p}
                                  </li>
                                ))}
                              </ul>
                            </td>
                            <td style={{ border: "1.5px solid #000", padding: 0, verticalAlign: "middle" }}>
                              <table style={{ width: "100%", height: "100%", borderCollapse: "collapse", border: "none" }}>
                                <tbody>
                                  <tr style={{ borderBottom: "1px solid #ccc" }}>
                                    <td style={{ textAlign: "center", padding: "2px 4px", fontSize: "9px", fontWeight: "bold", color: "#0059a4" }}>Plan</td>
                                  </tr>
                                  <tr>
                                    <td style={{ textAlign: "center", padding: "2px 4px", fontSize: "9px", fontWeight: "bold", color: "#16a34a" }}>Actual</td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                            {ganttWeeks.map((w, wIdx) => {
                              const planActive = row.planWeeks.includes(w.key);
                              const actualActive = row.actualWeeks.includes(w.key);
                              return (
                                <td key={wIdx} style={{ border: "1.5px solid #000", padding: 0, verticalAlign: "middle" }}>
                                  <table style={{ width: "100%", height: "100%", borderCollapse: "collapse", border: "none" }}>
                                    <tbody>
                                      <tr style={{ borderBottom: "1px solid #ccc", height: "20px" }}>
                                        <td style={{ padding: "2px 0" }}>
                                          {planActive && <div className="gantt-plan-cell" />}
                                        </td>
                                      </tr>
                                      <tr style={{ height: "20px" }}>
                                        <td style={{ padding: "2px 0" }}>
                                          {actualActive && <div className="gantt-actual-cell" />}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              );
                            })}
                            <td style={{ border: "1.5px solid #000", padding: "4px 6px", fontSize: "9px" }}>
                              {/* Remark */}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
                
                {/* Legend & Notes */}
                <div style={{ marginTop: "12px", display: "flex", gap: "25px", alignItems: "center", fontSize: "10px", color: "#000" }}>
                  <div style={{ fontWeight: "bold" }}>หมายเหตุ / Note:</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div className="gantt-plan-cell" style={{ margin: 0 }} />
                    <span>Plan (แผนงาน)</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div className="gantt-actual-cell" style={{ margin: 0 }} />
                    <span>Action (การดำเนินการจริง)</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Render Session (FM-MR-07) ───────────────────────────────── */}
            {!isGantt && (
              <>
                <div className="overflow-x-auto">
                <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000", color: "#000", fontSize: "9.5px", marginBottom: "10px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f1f5f9", textAlign: "center", fontWeight: "bold" }}>
                      <th style={{ border: "1.5px solid #000", width: "4%", padding: "5px 2px" }}>ลำดับ<br/>No.</th>
                      <th style={{ border: "1.5px solid #000", width: "15%", padding: "5px 4px" }}>วันที่<br/>Audit Date</th>
                      <th style={{ border: "1.5px solid #000", width: "13%", padding: "5px 4px" }}>เวลา<br/>Audit Time</th>
                      <th style={{ border: "1.5px solid #000", width: "20%", padding: "5px 6px" }}>หน่วยงานที่ถูกตรวจ<br/>Agencies that have been inspected</th>
                      <th style={{ border: "1.5px solid #000", width: "28%", padding: "5px 6px" }}>ทีมตรวจติดตาม<br/>Auditor Team</th>
                      <th style={{ border: "1.5px solid #000", width: "12%", padding: "5px 4px" }}>ผู้รับการตรวจ<br/>Auditee</th>
                      <th style={{ border: "1.5px solid #000", width: "8%", padding: "5px 4px" }}>หมายเหตุ<br/>Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!appointment.sessionPlan?.sessions || appointment.sessionPlan.sessions.length === 0) ? (
                      <tr>
                        <td colSpan={7} style={{ border: "1px solid #000", padding: "20px", textAlign: "center", color: "#666" }}>
                          ไม่พบตารางตรวจ / No sessions planned
                        </td>
                      </tr>
                    ) : (
                      appointment.sessionPlan.sessions.map((s, idx) => {
                        const dateInfo = formatBilingualDate(s.auditDate);
                        const timeInfo = formatBilingualTime(s.startTime, s.endTime);
                        const deptInfo = getBilingualDept(s.department);

                        const leadNames = s.teamMembers.filter((tm) => tm.role === "LEAD_AUDITOR").map((tm) => tm.name);
                        const otherAuditors = s.teamMembers.filter((tm) => tm.role === "AUDITOR").map((tm) => tm.name);
                        const observers = s.teamMembers.filter((tm) => tm.role === "OBSERVER").map((tm) => tm.name);
                        const auditees = s.teamMembers.filter((tm) => tm.role === "AUDITEE").map((tm) => tm.name);

                        const leadLetter = leadNames[0] ? (teamLetters[leadNames[0]] || "") : "";
                        const teamDisplayParts: string[] = [];

                        if (leadNames.length > 0) {
                          const formattedLeads = leadNames.map(l => formatShortName(l)).join(", ");
                          teamDisplayParts.push(leadLetter ? `${leadLetter} ${formattedLeads}` : formattedLeads);
                        }
                        if (otherAuditors.length > 0) {
                          teamDisplayParts.push(otherAuditors.map(a => formatShortName(a)).join(", "));
                        }
                        if (observers.length > 0) {
                          teamDisplayParts.push(`(Obs: ${observers.map(o => formatShortName(o)).join(", ")})`);
                        }

                        const auditeeDisplay = auditees.length > 0 
                          ? auditees.map(a => formatShortName(a)).join(", ") 
                          : ` ${deptInfo.th}`;

                        return (
                          <tr key={idx} style={{ height: "35px" }}>
                            <td style={{ border: "1.5px solid #000", textAlign: "center", padding: "4px 2px", fontWeight: "bold" }}>
                              {idx + 1}
                            </td>
                            <td style={{ border: "1.5px solid #000", padding: "4px 6px", lineHeight: "1.3" }}>
                              <div style={{ fontWeight: "600" }}>{dateInfo.th}</div>
                              <div style={{ fontSize: "8.5px", color: "#555" }}>{dateInfo.en}</div>
                            </td>
                            <td style={{ border: "1.5px solid #000", padding: "4px 6px", textAlign: "center", lineHeight: "1.3" }}>
                              <div style={{ fontWeight: "600" }}>{timeInfo.th}</div>
                              <div style={{ fontSize: "8.5px", color: "#555" }}>{timeInfo.en}</div>
                            </td>
                            <td style={{ border: "1.5px solid #000", padding: "4px 6px", lineHeight: "1.3" }}>
                              <div style={{ fontWeight: "700" }}>{deptInfo.th}</div>
                              <div style={{ fontSize: "8.5px", color: "#555" }}>{deptInfo.en}</div>
                            </td>
                            <td style={{ border: "1.5px solid #000", padding: "4px 6px", lineHeight: "1.35", fontWeight: "500" }}>
                              {teamDisplayParts.join(", ")}
                            </td>
                            <td style={{ border: "1.5px solid #000", padding: "4px 6px", lineHeight: "1.3", fontSize: "9px" }}>
                              {auditeeDisplay}
                            </td>
                            <td style={{ border: "1.5px solid #000", padding: "4px 4px", fontSize: "8.5px", color: "#444" }}>
                              {s.remark || "-"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

                {/* Legend & Notes */}
                <div style={{ fontSize: "9px", color: "#000", lineHeight: "1.3", marginBottom: "15px" }}>
                  <div><strong>หมายเหตุ (Note) :</strong></div>
                  <div style={{ paddingLeft: "10px" }}>
                    1. หากมีการขอเลื่อน Audit จากเวลาที่กำหนดไว้ จะต้องมีหลักฐานจากผู้ขอเลื่อน ในการเลื่อนการ Audit
                  </div>
                  <div style={{ paddingLeft: "10px" }}>
                    2. รายชื่อ Observer ลำดับที่ 5,6,7,8,9 หมายถึง ผู้สังเกตการณ์ที่จะต้องเข้าร่วม Audit เป็นหลัก
                  </div>
                </div>

                {/* Name List table on new page for print */}
                <div className="page-break-before" style={{ borderTop: "2px solid #000", paddingTop: "15px", marginTop: "15px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "bold", color: "#000", marginBottom: "8px" }}>
                    รายชื่อคณะทำงานผู้ตรวจติดตามภายใน / Internal Auditor Name List
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #000", color: "#000", fontSize: "8.5px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f1f5f9", textAlign: "center", fontWeight: "bold" }}>
                        <th style={{ border: "1.5px solid #000", padding: "4px 2px", width: "7%" }}>Team / No.</th>
                        <th style={{ border: "1.5px solid #000", padding: "4px 2px", width: "13%", color: "#0059a4" }}>1 (Leader Auditor)</th>
                        <th style={{ border: "1.5px solid #000", padding: "4px 2px", width: "10%" }}>2 (Auditor)</th>
                        <th style={{ border: "1.5px solid #000", padding: "4px 2px", width: "10%" }}>3 (Auditor)</th>
                        <th style={{ border: "1.5px solid #000", padding: "4px 2px", width: "10%" }}>4 (Auditor)</th>
                        <th style={{ border: "1.5px solid #000", padding: "4px 2px", width: "10%", color: "#b45309" }}>5 (Observer)</th>
                        <th style={{ border: "1.5px solid #000", padding: "4px 2px", width: "10%" }}>6 (Observer)</th>
                        <th style={{ border: "1.5px solid #000", padding: "4px 2px", width: "10%" }}>7 (Observer)</th>
                        <th style={{ border: "1.5px solid #000", padding: "4px 2px", width: "10%" }}>8 (Observer)</th>
                        <th style={{ border: "1.5px solid #000", padding: "4px 2px", width: "10%" }}>9 (Observer)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compiledTeams.length === 0 ? (
                        <tr>
                          <td colSpan={10} style={{ border: "1px solid #000", padding: "10px", textAlign: "center", color: "#666" }}>
                            ไม่มีรายชื่อทีมผู้ตรวจแอดมิน / No teams compiled
                          </td>
                        </tr>
                      ) : (
                        compiledTeams.map((team, idx) => (
                          <tr key={idx} style={{ height: "22px", textAlign: "center" }}>
                            <td style={{ border: "1.5px solid #000", fontWeight: "bold", backgroundColor: "#f8fafc" }}>
                              Team {team.letter}
                            </td>
                            <td style={{ border: "1.5px solid #000", fontWeight: "bold", color: "#0059a4", textAlign: "left", paddingLeft: "4px" }}>
                              {formatShortName(team.leader)}
                            </td>
                            <td style={{ border: "1.5px solid #000", textAlign: "left", paddingLeft: "4px" }}>{team.auditor2 !== "-" ? formatShortName(team.auditor2) : "-"}</td>
                            <td style={{ border: "1.5px solid #000", textAlign: "left", paddingLeft: "4px" }}>{team.auditor3 !== "-" ? formatShortName(team.auditor3) : "-"}</td>
                            <td style={{ border: "1.5px solid #000", textAlign: "left", paddingLeft: "4px" }}>{team.auditor4 !== "-" ? formatShortName(team.auditor4) : "-"}</td>
                            <td style={{ border: "1.5px solid #000", color: "#b45309", textAlign: "left", paddingLeft: "4px" }}>{team.observer5 !== "-" ? formatShortName(team.observer5) : "-"}</td>
                            <td style={{ border: "1.5px solid #000", textAlign: "left", paddingLeft: "4px" }}>{team.observer6 !== "-" ? formatShortName(team.observer6) : "-"}</td>
                            <td style={{ border: "1.5px solid #000", textAlign: "left", paddingLeft: "4px" }}>{team.observer7 !== "-" ? formatShortName(team.observer7) : "-"}</td>
                            <td style={{ border: "1.5px solid #000", textAlign: "left", paddingLeft: "4px" }}>{team.observer8 !== "-" ? formatShortName(team.observer8) : "-"}</td>
                            <td style={{ border: "1.5px solid #000", textAlign: "left", paddingLeft: "4px" }}>{team.observer9 !== "-" ? formatShortName(team.observer9) : "-"}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            </div>

          {/* Signatures & Footer Box wrapper */}
          <div style={{ marginTop: "20px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", border: "2px solid #000", color: "#000" }}>
              <tbody>
                <tr style={{ textAlign: "center", fontWeight: "bold", fontSize: "9.5px", backgroundColor: "#f8fafc" }}>
                  <td style={{ border: "2px solid #000", borderTop: "none", borderLeft: "none", width: "25%", padding: "3px" }}>Prepared by</td>
                  <td style={{ border: "2px solid #000", borderTop: "none", width: "25%", padding: "3px" }}>Reviewed by</td>
                  <td style={{ border: "2px solid #000", borderTop: "none", width: "25%", padding: "3px" }}>Approved by</td>
                </tr>
                <tr style={{ height: "48px", textAlign: "center", verticalAlign: "middle" }}>
                  {/* Prepared by */}
                  <td style={{ border: "2px solid #000", borderLeft: "none", padding: "3px 4px" }}>
                    {preparerSignoff?.signaturePath ? (
                      <img src={preparerSignoff.signaturePath} alt="Prepared By" style={{ maxHeight: "30px", maxWidth: "90%", display: "block", margin: "0 auto" }} />
                    ) : appointment.ownerSignaturePath ? (
                      <img src={appointment.ownerSignaturePath} alt="Prepared By" style={{ maxHeight: "30px", maxWidth: "90%", display: "block", margin: "0 auto" }} />
                    ) : (
                      <div style={{ height: "30px" }} />
                    )}
                    <div style={{ fontSize: "9px", fontWeight: "bold", marginTop: "1px", color: "#0F1059" }}>
                      {preparerSignoff?.signerNameSnapshot || appointment.ownerNameSnapshot || "-"}
                    </div>
                    <div style={{ fontSize: "7.5px", color: "#555" }}>{preparerSignoff?.position || appointment.ownerPositionSnapshot || "-"}</div>
                  </td>
                  
                  {/* Reviewed by */}
                  <td style={{ border: "2px solid #000", padding: "3px 4px" }}>
                    {reviewerSignoff?.signaturePath ? (
                      <img src={reviewerSignoff.signaturePath} alt="Reviewed By" style={{ maxHeight: "30px", maxWidth: "90%", display: "block", margin: "0 auto" }} />
                    ) : (
                      <div style={{ height: "30px" }} />
                    )}
                    <div style={{ fontSize: "9px", fontWeight: "bold", marginTop: "1px", color: "#0F1059" }}>
                      {reviewerSignoff?.signerNameSnapshot || (appointment.reviewerNameSnapshot ?? "-")}
                    </div>
                    <div style={{ fontSize: "7.5px", color: "#555" }}>{reviewerSignoff?.position || appointment.reviewerPositionSnapshot || "-"}</div>
                  </td>
                  
                  {/* Approved by */}
                  <td style={{ border: "2px solid #000", padding: "3px 4px" }}>
                    {approverSignoff?.signaturePath ? (
                      <img src={approverSignoff.signaturePath} alt="Approved By" style={{ maxHeight: "30px", maxWidth: "90%", display: "block", margin: "0 auto" }} />
                    ) : (
                      <div style={{ height: "30px" }} />
                    )}
                    <div style={{ fontSize: "9px", fontWeight: "bold", marginTop: "1px", color: "#0F1059" }}>
                      {approverSignoff?.signerNameSnapshot || (appointment.approverNameSnapshot ?? "-")}
                    </div>
                    <div style={{ fontSize: "7.5px", color: "#555" }}>{approverSignoff?.position || appointment.approverPositionSnapshot || "-"}</div>
                  </td>
                </tr>
                <tr style={{ fontSize: "8.5px", color: "#000" }}>
                  <td style={{ border: "2px solid #000", borderBottom: "none", borderLeft: "none", padding: "3px 5px" }}>
                    Date: <span style={{ color: "#0F1059", fontWeight: "bold", fontFamily: "monospace" }}>{formatDateSign(preparerSignoff?.signedAt || appointment.publishedAt || appointment.updatedAt)}</span>
                  </td>
                  <td style={{ border: "2px solid #000", borderBottom: "none", padding: "3px 5px" }}>
                    Date: <span style={{ color: "#0F1059", fontWeight: "bold", fontFamily: "monospace" }}>{formatDateSign(reviewerSignoff?.signedAt)}</span>
                  </td>
                  <td style={{ border: "2px solid #000", borderBottom: "none", borderRight: "none", padding: "3px 5px" }}>
                    Date: <span style={{ color: "#0F1059", fontWeight: "bold", fontFamily: "monospace" }}>{formatDateSign(approverSignoff?.signedAt)}</span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Document Control Revision label */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "9px", color: "#000", fontFamily: "monospace", borderTop: "1px solid #ddd", paddingTop: "4px", marginTop: "12px" }}>
              <div style={{ flex: 1 }}>NDC Industrial Co., Ltd.</div>
              <div style={{ textAlign: "right" }}>
                {printMeta.prefix || `${docCode} : ${docRev} : ${docDate}`}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
