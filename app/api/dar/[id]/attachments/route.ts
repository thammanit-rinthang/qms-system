import { NextResponse, type NextRequest } from "next/server";
import { requireAuthEdge } from "@/lib/auth";
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
    const session = await requireAuthEdge(req);
    const formData = await req.formData();
    const { id: darId } = paramSchema.parse(await params);
    const file = formData.get("file");
    if (!(file instanceof File)) throw new ValidationError("ไม่พบไฟล์ในคำขอ");

    const rawFilename = (formData.get("filename") as string | null) || file.name;
    let fileName = rawFilename;
    try {
      if (rawFilename.includes("%")) {
        fileName = decodeURIComponent(rawFilename);
      }
    } catch {
      // ignore
    }

    const safeFile = new File([file], fileName, { type: file.type });
    const remark = (formData.get("remark") as string | null) || null;

    const row: DarAttachmentRow = await darService.uploadAttachment(
      darId,
      safeFile,
      session.user.id,
      session.user.role,
      remark
    );

    return NextResponse.json({ data: row, error: null }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
