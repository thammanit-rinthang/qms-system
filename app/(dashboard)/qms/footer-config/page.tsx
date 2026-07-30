import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { ForbiddenError } from "@/errors/customErrors";
import { redirect } from "next/navigation";
import FooterConfigClient from "@/components/qms/FooterConfigClient";

export const metadata: Metadata = { title: "Document Footer Configuration" };

export default async function FooterConfigPage() {
  try {
    await requireRole("QMS", "IT", "MR");
  } catch (e) {
    if (e instanceof ForbiddenError) redirect("/unauthorized?reason=insufficient_role");
    throw e;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <FooterConfigClient />
    </div>
  );
}
