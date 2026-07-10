import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { sendSuccess } from "@/lib/apiResponse";
import { AuditLogRepository } from "@/repositories/auditLogRepository";

const querySchema = z.object({
  page:         z.coerce.number().int().min(1).default(1),
  limit:        z.coerce.number().int().min(1).max(100).default(50),
  action:       z.string().optional(),
  resourceType: z.string().optional(),
  actorUserId:  z.string().optional(),
  search:       z.string().max(100).optional(),
  from:         z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  to:           z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
});

const repo = new AuditLogRepository();

export async function GET(req: NextRequest) {
  try {
    await requireRole("IT");

    const sp = req.nextUrl.searchParams;
    const parsed = querySchema.parse({
      page:         sp.get("page") ?? undefined,
      limit:        sp.get("limit") ?? undefined,
      action:       sp.get("action") ?? undefined,
      resourceType: sp.get("resourceType") ?? undefined,
      actorUserId:  sp.get("actorUserId") ?? undefined,
      search:       sp.get("search") ?? undefined,
      from:         sp.get("from") ?? undefined,
      to:           sp.get("to") ?? undefined,
    });

    const { page, limit, ...filter } = parsed;
    const { data, total } = await repo.findMany(filter, page, limit);

    return sendSuccess(data, "Audit logs retrieved", 200, {
      page,
      limit,
      total,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
