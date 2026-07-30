
import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { listFiles } from "@/lib/sharepoint";
import { handleApiError } from "@/lib/apiErrorHandler";
import { z } from "zod";

export async function GET(req: NextRequest) {
  try {
    await requireRole("QMS", "MR", "IT");

    const querySchema = z.object({
      folderPath: z.string().max(500).optional().default("root"),
    });
    const { folderPath } = querySchema.parse({
      folderPath: req.nextUrl.searchParams.get("folderPath") ?? undefined,
    });

    const files = await listFiles(folderPath);

    return NextResponse.json({ data: files, error: null, meta: { total: files.length } });
  } catch (err) {
    return handleApiError(err);
  }
}
