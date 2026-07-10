import { requireRole } from "@/lib/auth";
import { AnnouncementService } from "@/services/announcementService";
import AnnouncementsTableClient from "@/components/announcements/AnnouncementsTableClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Announcements",
};

const announceService = new AnnouncementService();

export default async function ManageAnnouncementsPage() {
  await requireRole("QMS", "IT", "MR");
  const rows = await announceService.listAnnouncements();
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <AnnouncementsTableClient rows={rows} />
    </div>
  );
}
