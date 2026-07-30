
import { requireRole } from "@/lib/auth";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";

/**
 * POST /api/it/sync-users
 *
 * Previously pulled M365 users into local User table.
 * Now that User table is removed (Phase D), sync is handled by Auth Center.
 */
export async function POST() {
  try {
    await requireRole("IT");

    return sendSuccess(
      { total: 0, created: 0, updated: 0, skipped: 0, errors: [], message: "User sync is now handled by Auth Center. Local User table has been removed." },
      "Sync not needed — identity managed by Auth Center",
    );
  } catch (err) {
    return handleApiError(err);
  }
}
