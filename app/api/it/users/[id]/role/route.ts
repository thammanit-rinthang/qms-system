import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { sendSuccess } from "@/lib/apiResponse";
import { UserService } from "@/services/userService";
import { AuditService } from "@/services/auditService";
import { ValidationError } from "@/lib/errors";
import { ALL_QMS_ROLES, normalizeQmsRole, toRenamedQmsRole } from "@/lib/qms-roles";
import { grantAuthCenterRole, updateAuthCenterUserProfileM2M } from "@/lib/auth-center-admin-client";
import { db } from "@/lib/db";

const bodySchema = z.object({
  role: z.enum(ALL_QMS_ROLES).optional(),
  departmentId: z.string().nullable().optional(),
  departmentName: z.string().nullable().optional(), // auth_center mode: displayName to store in Auth Center profile
  employeeId: z.string().max(16).nullable().optional(),
  // auth_center mode must supply these explicitly — never infer from URL param
  authUserId: z.string().optional(),   // Auth Center userId (for role grant)
  localUserId: z.string().optional(),  // QMS local User.id (for local attribute update)
});

type Params = { params: Promise<{ id: string }> };

const userService = new UserService();

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requireRole("IT");
    const { id } = await params;

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "Invalid body");
    }

    const { role, departmentId, departmentName, employeeId, authUserId, localUserId } = parsed.data;
    const normalizedRole = role ? normalizeQmsRole(role) : undefined;

    // Resolve identifiers:
    // - authUserId: from body (preferred) or URL id if it looks like Auth Center id
    // - localUserId: from body only — do NOT use URL id as local user id
    const resolvedAuthUserId = authUserId ?? id;
    const resolvedLocalUserId = localUserId; // intentionally undefined if not provided

    if (normalizedRole !== undefined) {
      if (!resolvedAuthUserId) throw new ValidationError("authUserId required for role changes");
      const renamedRole = toRenamedQmsRole(normalizedRole);
      await grantAuthCenterRole(resolvedAuthUserId, renamedRole, { accessToken: session.user.accessToken });

      // Sync LocalRoleGrant atomically so role-users API can query without IT token
      await db.$transaction(async (tx) => {
        if (normalizedRole === "QMS") {
          await tx.localRoleGrant.upsert({
            where: { authUserId_role: { authUserId: resolvedAuthUserId, role: "QMS_QMS" } },
            update: { grantedAt: new Date() },
            create: { authUserId: resolvedAuthUserId, role: "QMS_QMS" },
          });
          await tx.localRoleGrant.deleteMany({ where: { authUserId: resolvedAuthUserId, role: { in: ["QMS_MR", "QMS_IT"] } } });
        } else if (normalizedRole === "MR") {
          await tx.localRoleGrant.upsert({
            where: { authUserId_role: { authUserId: resolvedAuthUserId, role: "QMS_MR" } },
            update: { grantedAt: new Date() },
            create: { authUserId: resolvedAuthUserId, role: "QMS_MR" },
          });
          await tx.localRoleGrant.deleteMany({ where: { authUserId: resolvedAuthUserId, role: { in: ["QMS_QMS", "QMS_IT"] } } });
        } else if (normalizedRole === "IT") {
          await tx.localRoleGrant.upsert({
            where: { authUserId_role: { authUserId: resolvedAuthUserId, role: "QMS_IT" } },
            update: { grantedAt: new Date() },
            create: { authUserId: resolvedAuthUserId, role: "QMS_IT" },
          });
          await tx.localRoleGrant.deleteMany({ where: { authUserId: resolvedAuthUserId, role: { in: ["QMS_MR", "QMS_QMS"] } } });
        } else if (normalizedRole === "USER") {
          await tx.localRoleGrant.deleteMany({ where: { authUserId: resolvedAuthUserId } });
        }

        await AuditService.record({
          actorUserId: session.user.id,
          actorAuthUserId: session.user.authUserId,
          actorRole: session.user.role,
          action: "ROLE_CHANGE",
          resourceType: "USER",
          resourceId: resolvedAuthUserId,
          after: { role: normalizedRole, renamedRole, source: "auth_center", targetAuthUserId: resolvedAuthUserId },
        }, tx);
      });
    }

    // Auth Center department update — when departmentName is provided, write to Auth Center profile
    if (departmentName !== undefined && resolvedAuthUserId) {
      await updateAuthCenterUserProfileM2M(
        resolvedAuthUserId,
        { department: departmentName ?? undefined },
        { accessToken: session.user.accessToken },
      );
    }

    // Local-only QMS fields — only update if localUserId is explicitly provided
    if (resolvedLocalUserId && (departmentId !== undefined || employeeId !== undefined)) {
      await userService.updateUserAttributes(resolvedLocalUserId, {
        ...(departmentId !== undefined ? { departmentId } : {}),
        ...(employeeId !== undefined ? { employeeId: employeeId || null } : {}),
      });
    }

    return sendSuccess(
      { authUserId: resolvedAuthUserId, localUserId: resolvedLocalUserId ?? null, role: normalizedRole },
      "User updated successfully",
    );
  } catch (err) {
    return handleApiError(err);
  }
}
