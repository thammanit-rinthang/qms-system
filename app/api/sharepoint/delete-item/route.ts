import { type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { deleteItem } from "@/lib/sharepoint";
import { z } from "zod";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { ValidationError } from "@/lib/errors";

const Schema = z.object({
  itemId: z.string().min(1),
});

export async function DELETE(req: NextRequest) {
  try {
    await requireRole("QMS", "MR", "IT");
    const parsed = Schema.safeParse({ itemId: req.nextUrl.searchParams.get("itemId") });

    if (!parsed.success) {
      throw new ValidationError("itemId is required");
    }

    await deleteItem(parsed.data.itemId);

    return sendSuccess({ deleted: true }, "Item deleted successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
