
import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { createFolder } from "@/lib/sharepoint";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { z } from "zod";

const Schema = z.object({
  folderName: z.string().min(1).max(255),
  parentPath: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireRole("QMS", "MR", "IT");
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
      return NextResponse.json({ data: null, error: message }, { status: 400 });
    }

    const folder = await createFolder(
      parsed.data.folderName,
      parsed.data.parentPath ?? "root"
    );

    return NextResponse.json({ data: folder, error: null });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    logger.error("[POST /api/sharepoint/create-folder]", err);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
