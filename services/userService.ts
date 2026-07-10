import { listAuthCenterUsers, listAuthCenterAppMembers, listAuthCenterRoleGrants } from "@/lib/auth-center-admin-client";
import type { UserWithDept } from "@/types/user";
import type { UserRole } from "@/generated/prisma/client";
import { pickHighestQmsRole } from "@/lib/qms-roles";

export class UserService {
  /**
   * Return all users from Auth Center.
   * IT role: uses /consumer/users (full data including roles per user).
   * QMS/MR role: uses /consumer/app-members + /consumer/role-grants (no IT permission needed).
   */
  async getAllUsers(accessToken?: string | null): Promise<UserWithDept[]> {
    // Try IT-only endpoint first; fall back to app-members + role-grants for QMS/MR callers
    try {
      const authUsers = await listAuthCenterUsers({ accessToken });
      return authUsers
        .filter((u) => u.id)
        .map((u) => ({
          id: u.id,
          authUserId: u.id,
          name: u.displayName ?? null,
          email: u.email ?? null,
          employeeId: u.employeeId ?? null,
          position: u.jobTitle ?? null,
          role: pickHighestQmsRole(u.roles) as UserRole,
          msUserId: null,
          department: u.department
            ? { id: u.department, name: u.department, authDepartmentId: u.department }
            : null,
          createdAt: new Date().toISOString(),
        }));
    } catch {
      // QMS/MR callers: merge app-members (identity) with role-grants (roles).
      // role-grants may require higher privilege (IT/admin) — handle gracefully.
      let members: Awaited<ReturnType<typeof listAuthCenterAppMembers>> = [];
      let grants: Awaited<ReturnType<typeof listAuthCenterRoleGrants>> = [];

      try {
        [members, grants] = await Promise.all([
          listAuthCenterAppMembers({ accessToken }),
          listAuthCenterRoleGrants({ accessToken }),
        ]);
      } catch {
        // If role-grants is forbidden (403), try fetching members-only without roles
        try {
          members = await listAuthCenterAppMembers({ accessToken });
        } catch {
          // Both endpoints failed — return empty list instead of crashing the page
          return [];
        }
      }

      const rolesByUser = new Map<string, string[]>();
      for (const g of grants) {
        const list = rolesByUser.get(g.userId) ?? [];
        list.push(g.role);
        rolesByUser.set(g.userId, list);
      }
      return members
        .filter((m) => m.id)
        .map((m) => ({
          id: m.id,
          authUserId: m.id,
          name: m.displayName ?? null,
          email: m.email ?? null,
          employeeId: m.employeeId ?? null,
          position: null,
          role: pickHighestQmsRole(rolesByUser.get(m.id) ?? []) as UserRole,
          msUserId: null,
          department: null,
          createdAt: new Date().toISOString(),
        }));
    }
  }

  /**
   * Verify a user exists — now a no-op since identity is Auth Center's responsibility.
   * Kept for API compatibility (block-session route calls it).
   */
  async verifyUserExists(_id: string): Promise<void> {
    // Auth Center is authoritative — we cannot verify locally.
    // Callers should use Auth Center APIs if verification is needed.
  }

  /**
   * Update local user attributes — no-op now that the User table is removed.
   * Identity fields should be updated through Auth Center.
   */
  async updateUserAttributes(
    _id: string,
    _data: { departmentId?: string | null; employeeId?: string | null },
  ): Promise<{ id: string; role: string }> {
    // No local User table — return a placeholder.
    // Attribute updates should go through Auth Center M2M APIs.
    return { id: _id, role: "USER" };
  }

  /**
   * Push user to M365 — no longer possible without local User table.
   * This should be handled by Auth Center directly.
   */
  async pushUserToM365(_id: string): Promise<void> {
    throw new Error("M365 push is now handled by Auth Center. Local User table has been removed.");
  }
}
