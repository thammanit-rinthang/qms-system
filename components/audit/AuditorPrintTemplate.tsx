import PrintPageActions from "@/components/shared/PrintPageActions";
import type { AuditAppointmentRow } from "@/types/audit";
import type { FooterConfig } from "@/services/qmsConfigService";
import { formatThaiDate, formatThaiDateTime, joinOrDash, resolvePrintLabel } from "./AuditPrintShared";

type AuditorPrintTemplateProps = {
  appointment: AuditAppointmentRow;
  auditorConfig?: FooterConfig | null;
};

const MEMBER_ROLE_LABELS: Record<string, string> = {
  LEAD_AUDITOR: "Lead Auditor / หัวหน้าทีมผู้ตรวจ",
  AUDITOR: "Internal Auditor / ผู้ตรวจติดตาม",
  COMMITTEE: "Committee / คณะทำงาน",
  SECRETARY: "Secretary / เลขานุการ",
  ADVISOR: "Advisor / ที่ปรึกษา",
};

const SIGNOFF_ROLE_LABELS: Record<string, { th: string; en: string }> = {
  REVIEWER: { th: "ผู้ตรวจสอบ", en: "Reviewer" },
  APPROVER: { th: "ผู้อนุมัติ", en: "Approver" },
};

export default function AuditorPrintTemplate({
  appointment,
  auditorConfig,
}: AuditorPrintTemplateProps) {
  const auditorMeta = resolvePrintLabel(
    auditorConfig,
    "Auditor | ผู้ตรวจติดตาม",
    "FM-AUD-AUDITOR",
  );

  const [auditorTitleEn, auditorTitleTh] = auditorMeta.titles;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page { size: A4; margin: 14mm 12mm; }
            @media print {
              body { background: #fff; }
              .print-shell { box-shadow: none !important; }
              .no-print { display: none !important; }
            }
          `,
        }}
      />
      <PrintPageActions />

      <div className="print-shell mx-auto max-w-[194mm] rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
        {/* Header */}
        <header className="border-b border-slate-200 pb-6">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#0F1059]">
                QMS Internal Audit
              </p>
              <h1 className="text-2xl font-bold text-slate-900">{auditorTitleEn}</h1>
              <p className="text-sm font-medium text-slate-600">{auditorTitleTh}</p>
            </div>
            <div className="min-w-[220px] rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="font-mono text-base font-semibold text-[#0F1059]">
                {appointment.appointmentNo || "-"}
              </p>
              <p className="mt-1 text-slate-600">Issue Year: {appointment.year}</p>
              <p className="text-slate-600">Status: {appointment.status}</p>
              <p className="mt-3 text-xs text-slate-500">{auditorMeta.prefix}</p>
            </div>
          </div>
        </header>

        {/* Section Info */}
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <InfoCard label="Title" value={appointment.title} />
          <InfoCard label="Standards" value={joinOrDash(appointment.standards)} />
          <InfoCard
            label="Prepared By"
            value={appointment.ownerNameSnapshot ?? appointment.ownerEmail ?? "-"}
          />
          <InfoCard label="Published At" value={formatThaiDate(appointment.publishedAt)} />
        </section>

        {/* Section Member Table */}
        <section className="mt-8">
          <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-lg font-semibold text-[#0F1059]">Internal Auditors List</h2>
              <p className="text-sm text-slate-500">รายชื่อคณะทำงานผู้ตรวจติดตามภายใน</p>
            </div>
            <p className="text-xs text-slate-500">{auditorMeta.prefix}</p>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Standards</th>
                </tr>
              </thead>
              <tbody>
                {appointment.members.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      ไม่พบข้อมูลผู้ตรวจ / No members found
                    </td>
                  </tr>
                ) : (
                  appointment.members.map((member, index) => (
                    <tr key={member.id} className="border-t border-slate-200 align-top hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{member.name}</td>
                      <td className="px-4 py-3 text-slate-600">{member.department ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {MEMBER_ROLE_LABELS[member.role] ?? member.role}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{joinOrDash(member.standards)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section Signoffs */}
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <SignatureCard
            role="Reviewer"
            signer={appointment.signoffs.find((item) => item.signedRole === "REVIEWER")}
          />
          <SignatureCard
            role="Approver"
            signer={appointment.signoffs.find((item) => item.signedRole === "APPROVER")}
          />
        </section>

        {/* Footer */}
        <footer className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
          <div className="flex items-center justify-between gap-4">
            <p>Created Date: {formatThaiDateTime(appointment.createdAt)}</p>
            <p>Status: {appointment.status}</p>
            <p>{auditorMeta.prefix}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function SignatureCard({
  role,
  signer,
}: {
  role: string;
  signer: AuditAppointmentRow["signoffs"][number] | undefined;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{role}</p>
      <p className="mt-3 text-sm font-medium text-slate-800">
        {signer?.signerNameSnapshot ?? "-"}
      </p>
      <p className="mt-1 text-sm text-slate-600">
        {signer ? SIGNOFF_ROLE_LABELS[signer.signedRole]?.en ?? signer.signedRole : "-"}
      </p>
      <div className="mt-6 border-t border-dashed border-slate-300 pt-3 text-xs text-slate-500">
        Signed At: {formatThaiDateTime(signer?.signedAt)}
      </div>
    </div>
  );
}
