import { requireAuth } from "@/lib/auth";
import { DarService } from "@/services/darService";
import { updateDarSchema } from "@/schemas/darSchema";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { type NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { isPrivilegedQmsRole } from "@/lib/qms-roles";

const darService = new DarService();
const paramSchema = z.object({ id: z.string().uuid() });

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = paramSchema.parse(await params);
    const isPrivileged = isPrivilegedQmsRole(session.user.role);
    
    const dar = await darService.getDarById(
      id,
      { userId: session.user.id, authUserId: session.user.authUserId ?? null },
      isPrivileged,
    );
    return sendSuccess(dar, "DAR retrieved successfully");
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = paramSchema.parse(await params);
    const isPrivileged = isPrivilegedQmsRole(session.user.role);

    await darService.deleteDar(id, { userId: session.user.id, authUserId: session.user.authUserId }, isPrivileged);
    revalidateTag("dar-list");
    
    return sendSuccess(null, "DAR deleted successfully");
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = paramSchema.parse(await params);
    const isPrivileged = isPrivilegedQmsRole(session.user.role);

    const body = await req.json();
    const parsed = updateDarSchema.parse(body);

    const dar = await darService.updateDarDraft(id, session.user.id, parsed, isPrivileged);

    revalidateTag(`dar-${id}`);
    revalidateTag("dar-list");

    return sendSuccess(dar, "DAR draft updated successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
