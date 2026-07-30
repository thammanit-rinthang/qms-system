
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getOfficePreviewUrl } from "@/lib/sharepoint";
import { assertSpItemTracked } from "@/lib/spItemAccess";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ValidationError } from "@/lib/errors";
import { z } from "zod";

const querySchema = z.object({
  itemId: z.string().min(1).max(200),
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await requireAuth();

    const parsed = querySchema.safeParse({ itemId: req.nextUrl.searchParams.get("itemId") });
    if (!parsed.success) {
      throw new ValidationError("itemId is required and must be a valid identifier");
    }

    await assertSpItemTracked(parsed.data.itemId, session.user.role);

    const embedUrl = await getOfficePreviewUrl(parsed.data.itemId);
    return NextResponse.json({ data: embedUrl, error: null });
  } catch (err) {
    return handleApiError(err);
  }
}
