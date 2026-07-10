import { requireAuth } from "@/lib/auth";
import PageHeader from "@/components/common/PageHeader";
import AnnouncementsClient from "./AnnouncementsClient";
import { AnnouncementRepository } from "@/repositories/announcementRepository";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ประกาศ - QMS" };

export const revalidate = 60; // ISR: revalidate every 60 seconds

type PublicAnnouncement = {
  id: string;
  title: string;
  content: string;
  sourceSystem: string;
  displayType: string;
  startDate: string | null;
  endDate: string | null;
  fileName: string | null;
  spWebUrl: string | null;
  bgColor: string | null;
  textColor: string | null;
  createdAt: string;
  createdByName: string | null;
};

export default async function AnnouncementsPage() {
  await requireAuth();

  let initialData: PublicAnnouncement[] = [];
  try {
    const repo = new AnnouncementRepository();
    const rows = await repo.findActivePublic(new Date());
    initialData = rows.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      sourceSystem: r.sourceSystem,
      displayType: r.displayType,
      startDate: r.startDate ? r.startDate.toISOString() : null,
      endDate: r.endDate ? r.endDate.toISOString() : null,
      fileName: r.fileName,
      spWebUrl: r.spWebUrl,
      bgColor: r.bgColor,
      textColor: r.textColor,
      createdAt: r.createdAt.toISOString(),
      createdByName: r.createdByName ?? null,
    }));
  } catch {
    // fail silently — client will fetch on mount
  }

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 pb-10 pt-6 px-4 sm:px-6 lg:px-8">
      <PageHeader title="ประกาศ" subtitle="Announcements" />
      <AnnouncementsClient initialData={initialData} />
    </div>
  );
}
