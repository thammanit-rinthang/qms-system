/* eslint-disable @next/next/no-img-element */
// Print-style header/session-table/signature block shared between audit/plans/[id] and the
// reviewer/approver pages, mirroring the look of print/audit/plan/[id] (FM-MR-07) as an in-app card.

type Signoff = {
  signedRole: string;
  signerNameSnapshot: string | null;
  signaturePath?: string | null;
  signedAt: string;
};

type SessionTeamMember = {
  role: string;
  name: string | null;
};

type SessionRow = {
  id: string;
  startAt: string;
  endAt: string;
  departmentName: string | null;
  sessionTitle: string;
  remark?: string | null;
  team: SessionTeamMember[];
};

type Props = {
  auditNo: string;
  title: string;
  standards?: string[] | null;
  standard?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  ownerNameSnapshot: string | null;
  reviewerNameSnapshot: string | null;
  approverNameSnapshot: string | null;
  signoffs: Signoff[];
  sessions?: SessionRow[];
};

function formatDateSign(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${String(date.getDate()).padStart(2, "0")} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start && !end) return "-";
  const fmt = (v: string) => new Date(v).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt((start || end)!);
}

function formatBilingualDate(value: string): { th: string; en: string } {
  const d = new Date(value);
  if (isNaN(d.getTime())) return { th: "-", en: "-" };
  const monthsTh = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const monthsEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return {
    th: `${d.getDate()} ${monthsTh[d.getMonth()]} ${d.getFullYear() + 543}`,
    en: `${d.getDate()}-${monthsEn[d.getMonth()]}-${d.getFullYear()}`,
  };
}

function formatTimeRange(start: string, end: string): string {
  const fmt = (v: string) => {
    const d = new Date(v);
    if (isNaN(d.getTime())) return "-";
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  return `${fmt(start)} - ${fmt(end)} น.`;
}

function formatShortName(fullName: string): string {
  if (!fullName) return "-";
  let name = fullName.trim();
  if (name.includes("/")) name = name.split("/")[1]?.trim() || name.split("/")[0]?.trim();
  let prefix = "";
  let rest = name;
  for (const pf of ["mr.", "ms.", "mrs.", "นาย", "นางสาว", "นาง"]) {
    if (name.toLowerCase().startsWith(pf)) {
      prefix = pf.toUpperCase().replace("นาย", "MR.").replace("นางสาว", "MS.").replace("นาง", "MRS.");
      if (!prefix.endsWith(".")) prefix += ".";
      rest = name.substring(pf.length).trim();
      break;
    }
  }
  const parts = rest.split(/\s+/);
  if (parts.length >= 2) {
    return `${prefix ? prefix + " " : ""}${parts[0].toUpperCase()} ${parts[parts.length - 1].substring(0, 1).toUpperCase()}.`;
  }
  return name.toUpperCase();
}

export default function AuditPlanPrintHeaderCard({
  auditNo,
  title,
  standards,
  standard,
  startDate,
  endDate,
  ownerNameSnapshot,
  reviewerNameSnapshot,
  approverNameSnapshot,
  signoffs,
  sessions = [],
}: Props) {
  const reviewerSignoff = signoffs.find((s) => s.signedRole === "REVIEWER");
  const approverSignoff = signoffs.find((s) => s.signedRole === "APPROVER");
  const standardsLabel = standards?.length ? standards.join(", ") : (standard ?? "-");

  const signatureBlocks: Array<{ label: string; name: string | null; signaturePath?: string | null; date: string | null }> = [
    { label: "Prepared by", name: ownerNameSnapshot, signaturePath: null, date: null },
    { label: "Reviewed by", name: reviewerSignoff?.signerNameSnapshot ?? reviewerNameSnapshot, signaturePath: reviewerSignoff?.signaturePath, date: reviewerSignoff?.signedAt ?? null },
    { label: "Approved by", name: approverSignoff?.signerNameSnapshot ?? approverNameSnapshot, signaturePath: approverSignoff?.signaturePath, date: approverSignoff?.signedAt ?? null },
  ];

  const leadAuditors = Array.from(
    new Set(sessions.flatMap((s) => s.team.filter((m) => m.role === "LEAD_AUDITOR" && m.name).map((m) => m.name as string)))
  ).sort();
  const teamLetters: Record<string, string> = {};
  leadAuditors.forEach((name, idx) => { teamLetters[name] = String.fromCharCode(65 + idx); });

  const compiledTeams = leadAuditors.map((leadName, idx) => {
    const teamSessions = sessions.filter((s) => s.team.some((m) => m.role === "LEAD_AUDITOR" && m.name === leadName));
    const auditors = Array.from(new Set(teamSessions.flatMap((s) => s.team.filter((m) => m.role === "AUDITOR" && m.name).map((m) => m.name as string))));
    const observers = Array.from(new Set(teamSessions.flatMap((s) => s.team.filter((m) => m.role === "OBSERVER" && m.name).map((m) => m.name as string))));
    return { letter: String.fromCharCode(65 + idx), leader: leadName, auditors, observers };
  });

  return (
    <div className="rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      {/* Header document table */}
      <table className="w-full border-collapse border-2 border-slate-900 text-slate-900">
        <tbody>
          <tr>
            <td className="w-[18%] border-2 border-slate-900 p-2 text-center align-middle">
              <img src="/logo/logo.webp" alt="NDC INDUSTRIAL" className="mx-auto mb-0.5 h-7 object-contain" />
              <div className="text-[8px] font-black tracking-wider">INDUSTRIAL</div>
            </td>
            <td className="border-2 border-slate-900 p-2 text-center align-middle">
              <div className="text-sm font-bold leading-snug">แผนการตรวจติดตามภายใน / Internal Audit Plan</div>
              <div className="mt-0.5 text-xs text-slate-600">{auditNo} · {title}</div>
            </td>
            <td className="w-[22%] border-2 border-slate-900 p-2 align-middle text-[10px]">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-500">มาตรฐาน / Standard</span>
                <span className="font-semibold">{standardsLabel}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="font-semibold text-slate-500">ช่วงเวลา / Period</span>
                <span className="font-semibold">{formatDateRange(startDate, endDate)}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Session table */}
      {sessions.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse border border-slate-900 text-[11px] text-slate-900">
            <thead>
              <tr className="bg-slate-100 text-center font-bold">
                <th className="border border-slate-900 p-1.5 w-[4%]">ลำดับ<br />No.</th>
                <th className="border border-slate-900 p-1.5 w-[13%]">วันที่<br />Audit Date</th>
                <th className="border border-slate-900 p-1.5 w-[12%]">เวลา<br />Audit Time</th>
                <th className="border border-slate-900 p-1.5 w-[18%]">หน่วยงานที่ถูกตรวจ<br />Agencies Inspected</th>
                <th className="border border-slate-900 p-1.5 w-[25%]">ทีมตรวจติดตาม<br />Auditor Team</th>
                <th className="border border-slate-900 p-1.5 w-[13%]">ผู้รับการตรวจ<br />Auditee</th>
                <th className="border border-slate-900 p-1.5 w-[8%]">หมายเหตุ<br />Remark</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s, idx) => {
                const dateInfo = formatBilingualDate(s.startAt);
                const leads = s.team.filter((m) => m.role === "LEAD_AUDITOR" && m.name).map((m) => m.name as string);
                const auditors = s.team.filter((m) => m.role === "AUDITOR" && m.name).map((m) => m.name as string);
                const observers = s.team.filter((m) => m.role === "OBSERVER" && m.name).map((m) => m.name as string);
                const auditees = s.team.filter((m) => m.role === "AUDITEE" && m.name).map((m) => m.name as string);
                const leadLetter = leads[0] ? teamLetters[leads[0]] : "";
                const teamParts = [
                  leads.length ? `${leadLetter ? leadLetter + " " : ""}${leads.map(formatShortName).join(", ")}` : "",
                  auditors.length ? auditors.map(formatShortName).join(", ") : "",
                  observers.length ? `(Obs: ${observers.map(formatShortName).join(", ")})` : "",
                ].filter(Boolean);
                return (
                  <tr key={s.id}>
                    <td className="border border-slate-900 p-1.5 text-center font-bold">{idx + 1}</td>
                    <td className="border border-slate-900 p-1.5">
                      <div className="font-semibold">{dateInfo.th}</div>
                      <div className="text-[9px] text-slate-500">{dateInfo.en}</div>
                    </td>
                    <td className="border border-slate-900 p-1.5 text-center">{formatTimeRange(s.startAt, s.endAt)}</td>
                    <td className="border border-slate-900 p-1.5 font-semibold">{s.departmentName || s.sessionTitle}</td>
                    <td className="border border-slate-900 p-1.5">{teamParts.join(", ") || "-"}</td>
                    <td className="border border-slate-900 p-1.5">{auditees.length ? auditees.map(formatShortName).join(", ") : (s.departmentName || s.sessionTitle)}</td>
                    <td className="border border-slate-900 p-1.5 text-[10px] text-slate-500">{s.remark || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Internal auditor team name list */}
      {compiledTeams.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[11px] font-bold">รายชื่อคณะทำงานผู้ตรวจติดตามภายใน / Internal Auditor Name List</div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-900 text-[10px] text-slate-900">
              <thead>
                <tr className="bg-slate-100 text-center font-bold">
                  <th className="border border-slate-900 p-1">Team</th>
                  <th className="border border-slate-900 p-1 text-primary">Leader Auditor</th>
                  <th className="border border-slate-900 p-1">Auditors</th>
                  <th className="border border-slate-900 p-1 text-amber-600">Observers</th>
                </tr>
              </thead>
              <tbody>
                {compiledTeams.map((t) => (
                  <tr key={t.letter} className="text-center">
                    <td className="border border-slate-900 p-1 font-bold bg-slate-50">Team {t.letter}</td>
                    <td className="border border-slate-900 p-1 text-left font-semibold text-primary">{formatShortName(t.leader)}</td>
                    <td className="border border-slate-900 p-1 text-left">{t.auditors.length ? t.auditors.map(formatShortName).join(", ") : "-"}</td>
                    <td className="border border-slate-900 p-1 text-left text-amber-600">{t.observers.length ? t.observers.map(formatShortName).join(", ") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Signature table */}
      <table className="mt-3 w-full border-collapse border-2 border-slate-900 text-slate-900">
        <tbody>
          <tr className="bg-slate-50 text-center text-[10px] font-bold">
            {signatureBlocks.map((b) => (
              <td key={b.label} className="border-2 border-slate-900 p-1.5">{b.label}</td>
            ))}
          </tr>
          <tr className="text-center align-middle">
            {signatureBlocks.map((b) => (
              <td key={b.label} className="border-2 border-slate-900 p-2" style={{ height: 60 }}>
                {b.signaturePath ? (
                  <img src={b.signaturePath} alt={b.label} className="mx-auto max-h-8 max-w-[90%] object-contain" />
                ) : (
                  <div className="h-8" />
                )}
                <div className="mt-1 text-[10px] font-bold text-primary">{b.name || "-"}</div>
              </td>
            ))}
          </tr>
          <tr className="text-[9px] text-slate-600">
            {signatureBlocks.map((b) => (
              <td key={b.label} className="border-2 border-slate-900 p-1.5">
                Date: <span className="font-mono font-bold text-primary">{formatDateSign(b.date)}</span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
