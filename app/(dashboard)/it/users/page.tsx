import { requireRole } from "@/lib/auth";
import { DepartmentService } from "@/services/departmentService";
import { listAuthCenterAppMembers, listAuthCenterUsers, listAuthCenterRoleGrants } from "@/lib/auth-center-admin-client";
import { normalizeQmsRole } from "@/lib/qms-roles";
import ItUserTable, { type AuthCenterUserRow } from "@/components/it/ItUserTable";
import SyncActions from "@/components/it/SyncActions";
import LocalizedEmptyState from "@/components/common/LocalizedEmptyState";
import PageHeader from "@/components/common/PageHeader";
import type { Metadata } from "next";
import en from "@/messages/en.json";

export const metadata: Metadata = {
  title: en.it.users.title,
};

const deptService = new DepartmentService();

export default async function ItUsersPage() {
  const session = await requireRole("IT");

  const departments = await deptService.getActiveDepartments(session.user.accessToken);

  const [acUsers, appMembers, grants] = await Promise.all([
    listAuthCenterUsers({ accessToken: session.user.accessToken }),
    listAuthCenterAppMembers({ accessToken: session.user.accessToken }),
    listAuthCenterRoleGrants({ accessToken: session.user.accessToken }),
  ]);

  const roleMap = new Map<string, { role: string; grantId: string }>();
  const duplicateAuthUserIds = new Set<string>();
  for (const grant of grants) {
    if (roleMap.has(grant.userId)) duplicateAuthUserIds.add(grant.userId);
    roleMap.set(grant.userId, { role: grant.role, grantId: grant.id });
  }

  const deptByName = new Map(departments.map((d) => [d.name.toLowerCase(), d]));
  const memberById = new Map(appMembers.map((member) => [member.id, member]));

  const users: AuthCenterUserRow[] = acUsers.map((u) => {
    const grantEntry = roleMap.get(u.id);
    const hasConflict = duplicateAuthUserIds.has(u.id);
    const member = memberById.get(u.id);
    const resolvedDepartment = u.department
      ? deptByName.get(u.department.toLowerCase()) ?? null
      : null;
    return {
      authUserId: u.id,
      localUserId: null,
      name: u.displayName,
      email: u.email ?? "",
      employeeId: u.employeeId,
      role: hasConflict ? "CONFLICT" : normalizeQmsRole(grantEntry?.role ?? "USER"),
      roleConflict: hasConflict,
      grantId: grantEntry?.grantId ?? null,
      department: u.department
        ? { id: resolvedDepartment?.id ?? null, name: u.department }
        : null,
      localDepartmentId: resolvedDepartment?.id ?? null,
      jobTitle: u.jobTitle ?? null,
      m365Linked: member?.m365Linked ?? false,
      source: "auth_center" as const,
    };
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        titleKey="it.users.title"
        subtitleKey="it.users.subtitle"
        subtitleParams={{ count: users.length }}
        actions={<SyncActions />}
      />

      {users.length === 0 ? (
        <LocalizedEmptyState
          titleKey="emptyUsers"
          descriptionKey="emptyUsersDesc"
        />
      ) : (
        <ItUserTable
          users={users}
          departments={departments}
          authCenterMode={true}
        />
      )}
    </div>
  );
}
