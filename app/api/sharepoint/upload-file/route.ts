
import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { uploadFile } from "@/lib/sharepoint";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    await requireRole("QMS", "MR", "IT");
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folderPath = (formData.get("folderPath") as string | null) ?? "root";

    if (!file) {
      return NextResponse.json({ data: null, error: "No file provided" }, { status: 400 });
    }

    const buffer = new Uint8Array(await file.arrayBuffer());

    const uploaded = await uploadFile(file.name, buffer, folderPath);

    return NextResponse.json({ data: uploaded, error: null });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    logger.error("[POST /api/sharepoint/upload-file]", err);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
