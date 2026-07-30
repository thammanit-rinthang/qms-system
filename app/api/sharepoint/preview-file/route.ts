import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getFileInfo } from "@/lib/sharepoint";
import { assertSpItemTracked } from "@/lib/spItemAccess";
import { handleApiError } from "@/lib/apiErrorHandler";
import { z } from "zod";

const querySchema = z.object({
  itemId: z.string().min(1).max(200),
});

function encodeFilename(name: string) {
  return encodeURIComponent(name);
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();

    const parsed = querySchema.safeParse({
      itemId: req.nextUrl.searchParams.get("itemId"),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    await assertSpItemTracked(parsed.data.itemId, session.user.role);

    const info = await getFileInfo(parsed.data.itemId);
    if (!info.downloadUrl) {
      return NextResponse.json({ error: "No download URL returned" }, { status: 404 });
    }

    const upstream = await fetch(info.downloadUrl, {
      headers: { Accept: req.headers.get("accept") ?? "*/*" },
    });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Failed to retrieve file" }, { status: 502 });
    }

    const headers = new Headers();
    headers.set("Content-Type", info.mimeType || upstream.headers.get("content-type") || "application/octet-stream");
    headers.set("Content-Disposition", `inline; filename*=UTF-8''${encodeFilename(info.name)}`);
    headers.set("Cache-Control", "private, max-age=300");
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);

    return new Response(upstream.body, { headers });
  } catch (error) {
    return handleApiError(error);
  }
}
