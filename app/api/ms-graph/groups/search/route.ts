import { type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { sendSuccess } from "@/lib/apiResponse";
import { searchEntraGroups, fetchAllEntraGroups } from "@/services/ms-graph";
import { z } from "zod";

const querySchema = z.object({
  q: z.string().max(100).optional().default(""),
});

export async function GET(req: NextRequest) {
  try {
    await requireRole('QMS', 'IT', 'MR');
    const { q } = querySchema.parse({ q: req.nextUrl.searchParams.get("q")?.trim() ?? undefined });

    const groups = await (q ? searchEntraGroups(q) : fetchAllEntraGroups());

    const results = groups
      .map((g) => ({ id: g.id, displayName: g.displayName, mail: g.mail, description: g.description }));

    return sendSuccess(results, "Groups retrieved successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
