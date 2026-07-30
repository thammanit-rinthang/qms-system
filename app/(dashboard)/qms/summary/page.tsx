import { requireRole } from "@/lib/auth";
import { QmsSummaryService } from "@/services/qmsSummaryService";
import QmsSummaryClient from "@/components/summary/QmsSummaryClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "สรุปผลภาพรวม QMS - Dashboard",
};

export default async function QmsSummaryPage() {
  // Restrict access to QMS, MR, and IT roles
  await requireRole("QMS", "MR", "IT");

  const summaryService = new QmsSummaryService();
  const summaryData = await summaryService.getSummaryData();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <QmsSummaryClient initialData={summaryData} />
    </div>
  );
}
