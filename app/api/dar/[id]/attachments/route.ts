import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ValidationError } from "@/lib/errors";
import { DarService } from "@/services/darService";
import type { DarAttachmentRow } from "@/types/dar";
import { z } from "zod";

const paramSchema = z.object({ id: z.string().uuid() });

type Params = { params: Promise<{ id: string }> };

const darService = new DarService();

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id: darId } = paramSchema.parse(await params);

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new ValidationError("ไม่พบไฟล์ในคำขอ");

    const row: DarAttachmentRow = await darService.uploadAttachment(
      darId,
      file,
      session.user.id,
      session.user.role
    );

    return NextResponse.json({ data: row, error: null }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
