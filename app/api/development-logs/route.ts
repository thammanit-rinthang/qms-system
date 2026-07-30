import { NextResponse, type NextRequest } from "next/server";
import { requireRoleEdge } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Restrict access to QMS_IT (role "IT")
    await requireRoleEdge(req, "IT");

    const filePath = path.join(process.cwd(), "data", "changelog.json");
    if (!fs.existsSync(filePath)) {
      return NextResponse.json([]);
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const logs = JSON.parse(fileContent);
    return NextResponse.json(logs);
  } catch (err) {
    return handleApiError(err);
  }
}
