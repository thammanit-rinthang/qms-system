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
import { UnauthorizedError } from "@/lib/errors";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: en.it.users.title,
};

const deptService = new DepartmentService();

export default async function ItUsersPage() {
  const session = await requireRole("IT");

  try {
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

    const deptByName = new Map(departments.map((d) => [d.name?.toLowerCase() ?? "", d]));
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
  } catch (e) {
    if (e instanceof UnauthorizedError) {
      redirect("/api/auth/signout?callbackUrl=/it/users");
    }
    console.error("IT Users Page Error:", e);
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="p-8 text-rose-600 bg-rose-50 border border-rose-200 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold mb-2">Error Loading IT Users Page</h2>
          <p className="text-sm mb-4">Please report this error to your administrator or check the server logs.</p>
          <pre className="text-xs font-mono bg-white p-4 border border-rose-100 rounded-xl overflow-x-auto whitespace-pre-wrap">
            {e instanceof Error ? `${e.name}: ${e.message}` : String(e)}
          </pre>
          {e instanceof Error && e.stack && (
            <pre className="text-xs font-mono bg-white p-4 border border-rose-100 rounded-xl overflow-x-auto whitespace-pre-wrap mt-4 opacity-75">
              {e.stack}
            </pre>
          )}
        </div>
      </div>
    );
  }
}

