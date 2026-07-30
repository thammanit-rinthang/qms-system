import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ValidationError } from "@/lib/errors";
import { DarService } from "@/services/darService";
import { z } from "zod";

const querySchema = z.object({
  itemId: z.string().min(1).max(200),
});

const darService = new DarService();

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();

    const parsed = querySchema.safeParse({ itemId: req.nextUrl.searchParams.get("itemId") });
    if (!parsed.success) {
      throw new ValidationError("itemId is required and must be a valid identifier");
    }

    const info = await darService.getPreviewFileInfo(
      parsed.data.itemId,
      session.user.id,
      session.user.role
    );

    const upstream = await fetch(info.downloadUrl, { headers: { Accept: "*/*" } });
    if (!upstream.ok) {
      return NextResponse.json({ data: null, error: "Failed to retrieve file" }, { status: 502 });
    }

    const buffer = await upstream.arrayBuffer();

    return new Response(buffer, {
      headers: {
        "Content-Type": info.mimeType || upstream.headers.get("content-type") || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(info.name)}"`,
        "Content-Length": buffer.byteLength.toString(),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
