
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { uploadFileToTemp } from "@/services/sharepoint";
import type { ApiResponse } from "@/types/api";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

export interface TempAttachmentResponse {
  spItemId: string;
  spWebUrl: string;
  spDownloadUrl: string;
  folderPath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  tempId: string;
}

const querySchema = z.object({ tempId: z.string().uuid() });

export async function POST(req: NextRequest): Promise<NextResponse<ApiResponse<TempAttachmentResponse>>> {
  try {
    await requireAuth();

    const { searchParams } = req.nextUrl;
    const parsed = querySchema.safeParse({ tempId: searchParams.get("tempId") });
    if (!parsed.success) {
      return NextResponse.json({ data: null, error: "tempId (uuid) is required" }, { status: 400 });
    }
    const { tempId } = parsed.data;

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ data: null, error: "ไม่พบไฟล์ในคำขอ" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ data: null, error: "ไฟล์ต้องมีขนาดไม่เกิน 20 MB" }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ data: null, error: "ประเภทไฟล์ไม่รองรับ" }, { status: 400 });
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const sp = await uploadFileToTemp({ fileBuffer: buffer, fileName: file.name, mimeType: file.type, tempId });

    return NextResponse.json({
      data: {
        spItemId: sp.spItemId,
        spWebUrl: sp.spWebUrl,
        spDownloadUrl: sp.spDownloadUrl,
        folderPath: sp.folderPath,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        tempId,
      },
      error: null,
    }, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    logger.error("[POST /api/dar/attachments/temp]", err);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
