
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { fetchAllEntraGroups, type GraphGroup } from "@/services/ms-graph";
import type { ApiResponse } from "@/types/api";

/**
 * GET /api/it/ms365-groups
 *
 * Returns all mail-enabled M365 groups from Entra ID.
 * Restricted to IT role. Results are cached for 5 minutes.
 */
export async function GET(): Promise<NextResponse<ApiResponse<GraphGroup[]>>> {
  try {
    await requireRole("IT");
    const groups = await fetchAllEntraGroups();
    return NextResponse.json(
      { data: groups, error: null },
      { headers: { "Cache-Control": "private, max-age=300" } },
    );
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ data: null, error: err.message }, { status: err.statusCode });
    }
    logger.error("[ms365-groups]", err);
    return NextResponse.json({ data: null, error: "Internal server error" }, { status: 500 });
  }
}
