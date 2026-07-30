import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { sendSuccess } from "@/lib/apiResponse";
import { ValidationError } from "@/lib/errors";
import { grantAuthCenterRole } from "@/lib/auth-center-admin-client";
import { AuditService } from "@/services/auditService";
import { toRenamedQmsRole, normalizeQmsRole } from "@/lib/qms-roles";
import { db } from "@/lib/db";

const bodySchema = z.object({
  role: z.enum(["MR", "USER"]),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireRole("QMS", "IT", "MR");
    const { id: authUserId } = await params;

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid body");

    const normalizedRole = normalizeQmsRole(parsed.data.role);
    const renamedRole = toRenamedQmsRole(normalizedRole);

    await grantAuthCenterRole(authUserId, renamedRole, { accessToken: session.user.accessToken });

    // Sync LocalRoleGrant so role-users API can query without IT token
    await db.$transaction(async (tx) => {
      if (normalizedRole === "MR") {
        await tx.localRoleGrant.upsert({
          where: { authUserId_role: { authUserId, role: "QMS_MR" } },
          update: { grantedAt: new Date() },
          create: { authUserId, role: "QMS_MR" },
        });
      } else {
        await tx.localRoleGrant.deleteMany({ where: { authUserId, role: "QMS_MR" } });
      }

      await AuditService.record({
        actorUserId: session.user.id,
        actorAuthUserId: session.user.authUserId,
        actorRole: session.user.role,
        action: "ROLE_CHANGE",
        resourceType: "USER",
        resourceId: authUserId,
        after: { role: normalizedRole, source: "qms_mr_management" },
      }, tx);
    });

    return sendSuccess({ authUserId, role: normalizedRole }, "Role updated successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
