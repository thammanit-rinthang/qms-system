import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { ForbiddenError } from "@/errors/customErrors";
import { redirect } from "next/navigation";
import ApprovalConfigClient from "@/components/qms/ApprovalConfigClient";

export const metadata: Metadata = { title: "Automated Approval Configuration" };

export default async function ApprovalConfigPage() {
  try {
    await requireRole("QMS", "IT", "MR");
  } catch (e) {
    if (e instanceof ForbiddenError) redirect("/unauthorized?reason=insufficient_role");
    throw e;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <ApprovalConfigClient />
    </div>
  );
}
