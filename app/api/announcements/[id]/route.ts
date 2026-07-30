import { requireRole } from "@/lib/auth";
import { AnnouncementService } from "@/services/announcementService";
import { updateAnnouncementSchema } from "@/schemas/announcementSchema";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { type NextRequest } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const announcementService = new AnnouncementService();
const toggleSchema = z.object({ active: z.boolean() });
const paramSchema = z.object({ id: z.string().uuid() });

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = paramSchema.parse(await params);
    await requireRole("QMS", "IT", "MR");

    const row = await announcementService.getAnnouncement(id);
    return sendSuccess(row, "Announcement retrieved successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = paramSchema.parse(await params);
    await requireRole("QMS", "IT", "MR");

    const body = await req.json();
    const parsed = updateAnnouncementSchema.parse(body);

    const result = await announcementService.updateAnnouncement(id, {
      title: parsed.title ?? "",
      content: parsed.content ?? "",
      sourceSystem: parsed.sourceSystem ?? "QMS",
      displayType: parsed.displayType ?? "LIST",
      pushToCompanyCenter: parsed.pushToCompanyCenter ?? false,
      startDate: parsed.startDate ? new Date(parsed.startDate) : null,
      endDate: parsed.endDate ? new Date(parsed.endDate) : null,
      bgColor: parsed.bgColor,
      bgImageUrl: parsed.bgImageUrl,
      bgImageSpId: parsed.bgImageSpId,
      textColor: parsed.textColor,
    });

    revalidatePath("/");
    revalidatePath("/announcements");

    return sendSuccess(result, "Announcement updated successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = paramSchema.parse(await params);
    await requireRole("QMS", "IT", "MR");

    const body = await req.json();
    const parsed = toggleSchema.parse(body);

    const result = await announcementService.toggleAnnouncementActive(id, parsed.active);

    revalidatePath("/");
    revalidatePath("/announcements");

    return sendSuccess(result, "Announcement active status toggled successfully");
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = paramSchema.parse(await params);
    await requireRole("QMS", "IT", "MR");

    await announcementService.deleteAnnouncement(id);

    revalidatePath("/");
    revalidatePath("/announcements");

    return sendSuccess({ id }, "Announcement deleted successfully");
  } catch (error) {
    return handleApiError(error);
  }
}
