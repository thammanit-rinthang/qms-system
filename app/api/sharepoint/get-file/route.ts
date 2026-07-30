
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getFileInfo, getOfficePreviewUrl } from "@/lib/sharepoint";
import { assertSpItemTracked } from "@/lib/spItemAccess";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { z } from "zod";

import { redis } from "@/lib/redis";

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
    const session = await requireAuth();
    const parsed = Schema.safeParse({ itemId: req.nextUrl.searchParams.get("itemId") });

    if (!parsed.success) {
      return NextResponse.json({ data: null, error: "itemId is required" }, { status: 400 });
    }

    const itemId = parsed.data.itemId;
    // Authorize before the cache short-circuit — the cache key is per-item (shared across users).
    await assertSpItemTracked(itemId, session.user.role);
    const cacheKey = `sp:file-info:${itemId}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        const cachedData = JSON.parse(cached) as { downloadUrl?: string };
        return NextResponse.json({
          data: {
            ...cachedData,
            previewUrl: `/api/sharepoint/preview-file?itemId=${encodeURIComponent(itemId)}`,
          },
          error: null,
        });
      }
    } catch (err) {
      logger.warn("[GET /api/sharepoint/get-file] Redis cache get failed", err instanceof Error ? { message: err.message } : undefined);
    }

    const info = await getFileInfo(itemId);

    let officeEmbedUrl: string | null = null;
    if (OFFICE_MIMES.has(info.mimeType)) {
      officeEmbedUrl = await getOfficePreviewUrl(itemId);
    }

    const responseData = {
      ...info,
      officeEmbedUrl,
      previewUrl: `/api/sharepoint/preview-file?itemId=${encodeURIComponent(itemId)}`,
    };

    try {
      // Cache for 45 minutes (2700 seconds) since pre-signed URL expires after 60 minutes
      await redis.set(cacheKey, JSON.stringify(responseData), "EX", 2700);
    } catch (err) {
      logger.warn("[GET /api/sharepoint/get-file] Redis cache set failed", err instanceof Error ? { message: err.message } : undefined);
    }

    return NextResponse.json({
      data: responseData,
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
