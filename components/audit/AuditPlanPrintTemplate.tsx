import PrintPageActions from "@/components/shared/PrintPageActions";
import type { AuditPlanDetail } from "@/types/audit";
import type { FooterConfig } from "@/services/qmsConfigService";
import {
  AUDIT_MODE_LABELS,
  AUDIT_PLAN_STATUS_LABELS,
  AUDIT_TYPE_LABELS,
  AUDITOR_ROLE_LABELS,
} from "@/types/audit";
import { formatThaiDate, formatThaiDateTime, joinOrDash, resolvePrintLabel } from "./AuditPrintShared";

type AuditPlanPrintTemplateProps = {
  plan: AuditPlanDetail;
  planConfig?: FooterConfig | null;
  auditorConfig?: FooterConfig | null;
};

export default function AuditPlanPrintTemplate({
  plan,
  planConfig,
  auditorConfig,
}: AuditPlanPrintTemplateProps) {
  const planMeta = resolvePrintLabel(
    planConfig,
    "Audit Plan | แผนการตรวจติดตาม",
    "FM-AUD-PLAN",
  );
  const auditorMeta = resolvePrintLabel(
    auditorConfig,
    "Auditor | ผู้ตรวจติดตาม",
    "FM-AUD-AUDITOR",
  );
  const [titleEn, titleTh] = planMeta.titles;
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
        <header className="border-b border-slate-200 pb-6">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">QMS Audit Workflow</p>
              <h1 className="text-2xl font-bold text-slate-900">{titleEn}</h1>
              <p className="text-sm font-medium text-slate-600">{titleTh}</p>
              <p className="pt-2 text-lg font-semibold text-[#0F1059]">{plan.auditNo}</p>
            </div>
            <div className="min-w-[220px] rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="text-slate-600">Status: {AUDIT_PLAN_STATUS_LABELS[plan.status] ?? plan.status}</p>
              <p className="text-slate-600">Type: {AUDIT_TYPE_LABELS[plan.auditType] ?? plan.auditType}</p>
              <p className="text-slate-600">Mode: {AUDIT_MODE_LABELS[plan.mode] ?? plan.mode}</p>
              <p className="mt-3 text-xs text-slate-500">{planMeta.prefix}</p>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <InfoCard label="Title" value={plan.title} />
          <InfoCard label="Standards" value={joinOrDash(plan.standards)} />
          <InfoCard label="Audit Period" value={`${formatThaiDate(plan.startDate)} - ${formatThaiDate(plan.endDate)}`} />
          <InfoCard label="Prepare (ผู้จัดทำ)" value={plan.ownerNameSnapshot ?? plan.ownerEmail ?? "-"} />
          <InfoCard label="Scope" value={plan.scope ?? "-"} />
          <InfoCard label="Appointment Link" value={plan.appointmentId ?? "-"} mono />
          <InfoCard label="Reviewer" value={plan.reviewerNameSnapshot ?? plan.reviewerEmail ?? "-"} />
          <InfoCard label="Approver" value={plan.approverNameSnapshot ?? plan.approverEmail ?? "-"} />
        </section>

        {(plan.objective || plan.summary || plan.sourceOrganization) && (
          <section className="mt-8 grid gap-4">
            {plan.objective && <LongCard label="Objective" value={plan.objective} />}
            {plan.summary && <LongCard label="Summary" value={plan.summary} />}
            {plan.sourceOrganization && <LongCard label="Source Organization" value={plan.sourceOrganization} />}
          </section>
        )}

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <SectionHeader title="Departments" subtitle="หน่วยงานที่เกี่ยวข้อง" />
            <div className="mt-4 space-y-2">
              {plan.departments.length > 0 ? plan.departments.map((department, index) => (
                <div key={department.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <p className="font-medium text-slate-800">
                    {index + 1}. {department.departmentName ?? department.departmentId}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{department.departmentCode ?? "-"}</p>
                </div>
              )) : (
                <EmptyCard />
              )}
            </div>
          </div>

          <div>
            <SectionHeader title={auditorTitleEn} subtitle={auditorTitleTh} hint={auditorMeta.prefix} />
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.auditors.length > 0 ? (
                    plan.auditors.map((auditor, index) => (
                      <tr key={auditor.id} className="border-t border-slate-200 align-top">
                        <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{auditor.assigneeNameSnapshot ?? "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{AUDITOR_ROLE_LABELS[auditor.role] ?? auditor.role}</td>
                        <td className="px-4 py-3 text-slate-600">{auditor.assigneeEmailSnapshot ?? "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-4 py-6 text-center text-slate-400" colSpan={4}>
                        No auditors assigned
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <SectionHeader title="Schedules" subtitle="กำหนดการตรวจสอบ" />
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Session</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Start</th>
                  <th className="px-4 py-3">End</th>
                  <th className="px-4 py-3">Lead</th>
                </tr>
              </thead>
              <tbody>
                {plan.schedules.length > 0 ? (
                  plan.schedules.map((schedule) => (
                    <tr key={schedule.id} className="border-t border-slate-200 align-top">
                      <td className="px-4 py-3 font-medium text-slate-800">{schedule.sessionTitle}</td>
                      <td className="px-4 py-3 text-slate-600">{schedule.departmentName ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{formatThaiDateTime(schedule.startAt)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatThaiDateTime(schedule.endAt)}</td>
                      <td className="px-4 py-3 text-slate-600">{schedule.leadAuditorNameSnapshot ?? "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-center text-slate-400" colSpan={5}>
                      No schedule planned
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {(plan.report || plan.signoffs.length > 0) && (
          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <div>
              <SectionHeader title="Report" subtitle="ผลสรุปการตรวจ" />
              <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Generated At</p>
                <p className="mt-2 text-sm text-slate-800">{formatThaiDateTime(plan.report?.generatedAt)}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{plan.report?.summary ?? "-"}</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">Conclusion</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{plan.report?.conclusion ?? "-"}</p>
              </div>
            </div>

            <div>
              <SectionHeader title="Signoffs" subtitle="ประวัติการลงนาม" />
              <div className="mt-4 space-y-3">
                {plan.signoffs.length > 0 ? plan.signoffs.map((signoff) => (
                  <div key={signoff.id} className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-medium text-slate-800">{signoff.signerNameSnapshot ?? signoff.signerAuthUserId}</p>
                    <p className="mt-1 text-sm text-slate-600">{signoff.signedRole}</p>
                    <p className="mt-3 text-xs text-slate-500">{formatThaiDateTime(signoff.signedAt)}</p>
                  </div>
                )) : (
                  <EmptyCard />
                )}
              </div>
            </div>
          </section>
        )}

        <footer className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">
          <div className="flex items-center justify-between gap-4">
            <p>Created: {formatThaiDateTime(plan.createdAt)}</p>
            <p>{planMeta.prefix}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  hint,
}: {
  title: string;
  subtitle: string;
  hint?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-3">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function InfoCard({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-sm font-medium text-slate-800 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function LongCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{value}</p>
    </div>
  );
}

function EmptyCard() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
      No data available
    </div>
  );
}
