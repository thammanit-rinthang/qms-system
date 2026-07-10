
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getFileInfo, getOfficePreviewUrl } from "@/lib/sharepoint";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { z } from "zod";

const OFFICE_MIMES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
]);

const Schema = z.object({
  itemId: z.string().min(1),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const parsed = Schema.safeParse({ itemId: req.nextUrl.searchParams.get("itemId") });

    if (!parsed.success) {
      return NextResponse.json({ data: null, error: "itemId is required" }, { status: 400 });
    }

    const info = await getFileInfo(parsed.data.itemId);

    let officeEmbedUrl: string | null = null;
    if (OFFICE_MIMES.has(info.mimeType)) {
      officeEmbedUrl = await getOfficePreviewUrl(parsed.data.itemId);
    }

    return NextResponse.json({
      data: { ...info, officeEmbedUrl },
      error: null,
    });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    logger.error("[GET /api/sharepoint/get-file]", err);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
