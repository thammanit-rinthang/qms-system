import { requireAuth } from "@/lib/auth";
import { isApprovalConfigModuleKey, type ApprovalConfigRole, getApprovalConfigLookupKeys } from "@/lib/approval-config";
import { db } from "@/lib/db";
import { getUserSnapshot } from "@/lib/userSnapshotCache";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { type NextRequest } from "next/server";
import { listAuthCenterAppMembers, listAuthCenterUsers } from "@/lib/auth-center-admin-client";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const role = req.nextUrl.searchParams.get("role"); // "MR" or "QMS"
    if (role !== "MR" && role !== "QMS") return sendSuccess([], "OK");

    const grantRole = role === "MR" ? "QMS_MR" : "QMS_QMS";
    const configKey = role === "MR" ? "CURRENT_MR_AUTH_USER_ID" : "CURRENT_QMS_AUTH_USER_ID";
    const moduleParam = req.nextUrl.searchParams.get("module");

    const { SystemConfigRepository } = await import("@/repositories/systemConfigRepository");
    const configRepo = new SystemConfigRepository();
    let defaultAuthUserId: string | null = null;

    const approvalRole = role as ApprovalConfigRole;
    if (moduleParam && isApprovalConfigModuleKey(moduleParam)) {
      for (const key of getApprovalConfigLookupKeys(moduleParam, approvalRole, "AUTH_USER_ID")) {
        defaultAuthUserId = await configRepo.findValueByKey(key);
        if (defaultAuthUserId) break;
      }
    } else {
      defaultAuthUserId = await configRepo.findValueByKey(configKey);
    }

    let grants = await db.localRoleGrant.findMany({ where: { role: grantRole } });

    // Ensure the configured module signer is available for the picker and can
    // be selected automatically, even when LocalRoleGrant has not been seeded.
    if (defaultAuthUserId && !grants.some((grant) => grant.authUserId === defaultAuthUserId)) {
      await db.localRoleGrant.upsert({
        where: { authUserId_role: { authUserId: defaultAuthUserId, role: grantRole } },
        update: {},
        create: { authUserId: defaultAuthUserId, role: grantRole },
      });
      grants = await db.localRoleGrant.findMany({ where: { role: grantRole } });
    }

    // Keep the legacy first-run fallback for deployments without a
    // module-specific or global configured signer.
    if (grants.length === 0) {
      const config = await db.systemConfig.findUnique({ where: { configKey } });
      if (config?.configValue) {
        await db.localRoleGrant.upsert({
          where: { authUserId_role: { authUserId: config.configValue, role: grantRole } },
          update: {},
          create: { authUserId: config.configValue, role: grantRole },
        });
        grants = await db.localRoleGrant.findMany({ where: { role: grantRole } });
      }
    }

    let authCenterUsers: Array<{
      id: string;
      employeeId: string | null;
      email: string | null;
      displayName: string | null;
      department: string | null;
      jobTitle: string | null;
    }> = [];

    if (session.user.accessToken) {
      const [appUsers, appMembers] = await Promise.all([
        listAuthCenterUsers({ accessToken: session.user.accessToken }).catch(() => []),
        listAuthCenterAppMembers({ accessToken: session.user.accessToken }).catch(() => []),
      ]);

      const appUserMap = new Map(appUsers.map((user) => [user.id, user]));
      authCenterUsers = appMembers.map((member) => {
        const appUser = appUserMap.get(member.id);
        return {
          id: member.id,
          employeeId: appUser?.employeeId ?? member.employeeId ?? null,
          email: appUser?.email ?? member.email ?? null,
          displayName: appUser?.displayName ?? member.displayName ?? null,
          department: appUser?.department ?? null,
          jobTitle: appUser?.jobTitle ?? null,
        };
      });
    }

    const authCenterUserMap = new Map(authCenterUsers.map((u) => [u.id, u]));

    const users = await Promise.all(
      grants.map(async (g) => {
        const snap = await getUserSnapshot(g.authUserId).catch(() => null);
        const acUser = authCenterUserMap.get(g.authUserId);
        return {
          authUserId: g.authUserId,
          name: acUser?.displayName ?? snap?.name ?? g.displayName ?? g.authUserId,
          email: acUser?.email ?? snap?.email ?? g.email ?? null,
          isDefault: g.authUserId === defaultAuthUserId,
        };
      }),
    );

    return sendSuccess(users, "OK");
  } catch (err) {
    return handleApiError(err);
  }
}
