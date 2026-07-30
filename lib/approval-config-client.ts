import type { ApprovalConfigModuleKey, ApprovalConfigRole } from "@/lib/approval-config";

export type ApprovalConfigDefaultUser = {
  id: string;
  name: string;
  email: string | null;
  employeeId: string | null;
  department: string | null;
  jobTitle: string | null;
};

type RoleUserRow = {
  authUserId: string;
  name: string;
  email: string | null;
  isDefault: boolean;
};

export async function fetchApprovalConfigDefaultUser(
  moduleKey: ApprovalConfigModuleKey,
  role: ApprovalConfigRole,
): Promise<ApprovalConfigDefaultUser | null> {
  const res = await fetch(`/api/dar/role-users?role=${role}&module=${moduleKey}`);
  if (!res.ok) {
    return null;
  }

  const json = await res.json().catch(() => null) as { data?: RoleUserRow[] } | null;
  const defaultUser = json?.data?.find((user) => user.isDefault);
  if (!defaultUser) {
    return null;
  }

  return {
    id: defaultUser.authUserId,
    name: defaultUser.name,
    email: defaultUser.email,
    employeeId: null,
    department: null,
    jobTitle: null,
  };
}
