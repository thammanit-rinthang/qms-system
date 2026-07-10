import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { ForbiddenError } from "@/errors/customErrors";
import { redirect } from "next/navigation";
import { getDocNoFormat } from "@/lib/docNoConfig";
import DocNoConfigClient from "@/components/qms/DocNoConfigClient";

export const metadata: Metadata = { title: "Document Number Configuration" };

export default async function DocNoConfigPage() {
  try {
    await requireRole("QMS", "IT", "MR");
  } catch (e) {
    if (e instanceof ForbiddenError) redirect("/unauthorized?reason=insufficient_role");
    throw e;
  }

  const [dar, car, auditAppt, auditPlan] = await Promise.all([
    getDocNoFormat("DAR"),
    getDocNoFormat("CAR"),
    getDocNoFormat("AUDIT_APPT"),
    getDocNoFormat("AUDIT_PLAN"),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <DocNoConfigClient
        initial={[
          { module: "DAR",        label: "DAR (Document Action Request)",   format: dar },
          { module: "CAR",        label: "CAR (Corrective Action Request)",  format: car },
          { module: "AUDIT_APPT", label: "Audit Appointment Letter",         format: auditAppt },
          { module: "AUDIT_PLAN", label: "Audit Plan",                       format: auditPlan },
        ]}
      />
    </div>
  );
}
