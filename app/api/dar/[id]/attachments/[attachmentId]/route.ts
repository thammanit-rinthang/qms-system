import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { DarService } from "@/services/darService";
import { z } from "zod";

const paramSchema = z.object({
  id: z.string().uuid(),
  attachmentId: z.string().uuid(),
});

type Params = { params: Promise<{ id: string; attachmentId: string }> };

const darService = new DarService();

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: darId, attachmentId } = paramSchema.parse(await params);

    await darService.deleteAttachment(darId, attachmentId, session.user.id, session.user.role);

    return NextResponse.json({ data: null, error: null });
  } catch (err) {
    return handleApiError(err);
  }
}
