
import { requireRole } from "@/lib/auth";
import { DarService } from "@/services/darService";
import QmsDarListClient from "@/components/dar/QmsDarListClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage DAR",
};

const darService = new DarService();

export default async function QmsDarPage() {
  await requireRole("QMS", "MR", "IT");
  const dars = await darService.getAllDars();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <QmsDarListClient dars={dars} />
    </div>
  );
}
