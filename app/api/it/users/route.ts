import { requireRole } from "@/lib/auth";
import { listAuthCenterAppMembers, listAuthCenterUsers, listAuthCenterRoleGrants, createAuthCenterUser } from "@/lib/auth-center-admin-client";
import { normalizeQmsRole, toRenamedQmsRole } from "@/lib/qms-roles";
import { grantAuthCenterRole } from "@/lib/auth-center-admin-client";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { type NextRequest } from "next/server";
import { z } from "zod";

/**
 * GET /api/it/users
 *
 * Fetches users from Auth Center. No local User table.
 */
export async function GET() {
  try {
    const session = await requireRole("IT");

    const [users, appMembers, grants] = await Promise.all([
      listAuthCenterUsers({ accessToken: session.user.accessToken }),
      listAuthCenterAppMembers({ accessToken: session.user.accessToken }),
      listAuthCenterRoleGrants({ accessToken: session.user.accessToken }),
    ]);

    // Build maps for fast lookup
    const roleMap = new Map<string, { role: string; grantId: string }>();
    const duplicateAuthUserIds = new Set<string>();
    for (const grant of grants) {
      if (roleMap.has(grant.userId)) {
        duplicateAuthUserIds.add(grant.userId);
      }
      roleMap.set(grant.userId, { role: grant.role, grantId: grant.id });
    }

    const memberById = new Map(appMembers.map((member) => [member.id, member]));

    const result = users.map((u) => {
      const grantEntry = roleMap.get(u.id);
      const hasConflict = duplicateAuthUserIds.has(u.id);
      const member = memberById.get(u.id);

      return {
        authUserId: u.id,
        localUserId: null,
        name: u.displayName,
        email: u.email,
        employeeId: u.employeeId,
        role: hasConflict ? "CONFLICT" : normalizeQmsRole(grantEntry?.role ?? "USER"),
        roleConflict: hasConflict,
        grantId: grantEntry?.grantId ?? null,
        department: u.department
          ? { id: u.department, name: u.department }
          : null,
        localDepartmentId: null,
        jobTitle: u.jobTitle ?? null,
        m365Linked: member?.m365Linked ?? false,
        source: "auth_center" as const,
      };
    });

    return sendSuccess(result, "Users retrieved successfully");
  } catch (err) {
    return handleApiError(err);
  }
}

const createUserSchema = z.object({
  employeeId: z.string().min(1).max(50),
  displayName: z.string().max(200).optional(),
  email: z.string().email().optional(),
  departmentCode: z.string().max(100).optional(),
  department: z.string().max(200).optional(),
  jobTitle: z.string().max(200).optional(),
  initialPassword: z.string().min(8).max(128).optional(),
  initialRole: z.enum(["USER", "QMS", "MR", "IT", "QMS_USER", "QMS_QMS", "QMS_MR", "QMS_IT"]).optional(),
});

/**
 * POST /api/it/users
 *
 * In auth_center mode: creates user in Auth Center, then optionally assigns initial QMS role.
 * In legacy mode: not supported via this endpoint (use sync instead).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole("IT");

    const body = await req.json();
    const parsed = createUserSchema.parse(body);

    // Create user in Auth Center
    const created = await createAuthCenterUser({
      employeeId: parsed.employeeId,
      displayName: parsed.displayName,
      email: parsed.email,
      departmentCode: parsed.departmentCode,
      department: parsed.department,
      jobTitle: parsed.jobTitle,
      initialPassword: parsed.initialPassword,
    }, { accessToken: session.user.accessToken });

    // Optionally assign initial QMS role (best-effort; user is already created)
    if (parsed.initialRole) {
      const renamedRole = toRenamedQmsRole(normalizeQmsRole(parsed.initialRole));
      await grantAuthCenterRole(created.id, renamedRole, { accessToken: session.user.accessToken })
        .catch((e) => {
          console.error(`[POST /api/it/users] Failed to grant role for ${created.id}:`, e);
        });
    }

    return sendSuccess(
      {
        authUserId: created.id,
        employeeId: created.employeeId,
        email: created.email,
        displayName: created.displayName,
        role: parsed.initialRole ?? "USER",
      },
      "User created in Auth Center",
      201,
    );
  } catch (err) {
    return handleApiError(err);
  }
}
