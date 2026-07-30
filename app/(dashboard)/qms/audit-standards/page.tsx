import { requireRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ForbiddenError } from "@/errors/customErrors";
import PageHeader from "@/components/common/PageHeader";
import AuditStandardsManager from "@/components/audit/AuditStandardsManager";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "จัดการมาตรฐาน ISO - QMS" };

export default async function AuditStandardsPage() {
  try {
    await requireRole("QMS", "IT", "MR");
  } catch (e) {
    if (e instanceof ForbiddenError) redirect("/unauthorized?reason=insufficient_role");
    throw e;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="จัดการมาตรฐาน ISO" subtitle="เพิ่ม/ลบมาตรฐานที่ใช้ในระบบ Audit" />
      <div className="mt-6">
        <AuditStandardsManager />
      </div>
    </div>
  );
}
