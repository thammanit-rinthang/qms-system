import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { AnnouncementRepository } from "@/repositories/announcementRepository";

const announcementRepo = new AnnouncementRepository();

export async function GET() {
  try {
    await requireAuth();
    const rows = await announcementRepo.findActiveTicker(new Date(), 20);
    return NextResponse.json({ data: rows, error: null });
  } catch (err) {
    return handleApiError(err);
  }
}
