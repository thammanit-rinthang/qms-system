import { listAuthCenterAppMembers, listAuthCenterRoleGrants, listAuthCenterUsers } from "@/lib/auth-center-admin-client";
import {
  APPROVAL_CONFIG_MODULES,
  type ApprovalConfigModuleKey,
  type ApprovalConfigRole,
  getApprovalConfigKey,
  getApprovalConfigLookupKeys,
} from "@/lib/approval-config";
import { pickRole } from "@/lib/auth-center-token";
import { db } from "@/lib/db";
import { SystemConfigRepository } from "@/repositories/systemConfigRepository";

type ModuleConfigInput = {
  moduleKey: ApprovalConfigModuleKey;
  mrAuthUserId?: string | null;
  qmsAuthUserId?: string | null;
  mrEmail?: string | null;
  qmsEmail?: string | null;
};

type ModuleConfigResponse = {
  moduleKey: ApprovalConfigModuleKey;
  label: string;
  description: string;
  mrAuthUserId: string | null;
  qmsAuthUserId: string | null;
  mrEmail: string | null;
  qmsEmail: string | null;
};

export class ApprovalConfigService {
  private configRepo = new SystemConfigRepository();

  private async getEffectiveConfigValue(
    rows: Map<string, string>,
    moduleKey: ApprovalConfigModuleKey,
    role: ApprovalConfigRole,
    field: "AUTH_USER_ID" | "EMAIL",
  ) {
    for (const key of getApprovalConfigLookupKeys(moduleKey, role, field)) {
      const value = rows.get(key);
      if (value) {
        return value;
      }
    }
    return null;
  }

  async getConfig(accessToken?: string | null) {
    const configKeys = APPROVAL_CONFIG_MODULES.flatMap((module) => [
      getApprovalConfigKey(module.key, "MR", "AUTH_USER_ID"),
      getApprovalConfigKey(module.key, "MR", "EMAIL"),
      getApprovalConfigKey(module.key, "QMS", "AUTH_USER_ID"),
      getApprovalConfigKey(module.key, "QMS", "EMAIL"),
    ]);

    let appMembers: Awaited<ReturnType<typeof listAuthCenterAppMembers>> = [];
    try {
      appMembers = await listAuthCenterAppMembers({ accessToken });
    } catch {
      // If app members fetch fails (e.g., session revoked), continue with empty list
    }

    const [configRows] = await Promise.all([
      this.configRepo.findManyByKeys([
        ...configKeys,
        "CURRENT_MR_AUTH_USER_ID",
        "CURRENT_MR_EMAIL",
        "CURRENT_QMS_AUTH_USER_ID",
        "CURRENT_QMS_EMAIL",
      ]),
    ]);

    const configMap = new Map(configRows.map((row) => [row.configKey, row.configValue]));

    const rolesByUser = new Map<string, string[]>();
    try {
      const authUsers = await listAuthCenterUsers({ accessToken });
      for (const user of authUsers) {
        rolesByUser.set(user.id, user.roles);
      }
    } catch {
      try {
        const grants = await listAuthCenterRoleGrants({ accessToken });
        for (const grant of grants) {
          const list = rolesByUser.get(grant.userId) ?? [];
          list.push(grant.role);
          rolesByUser.set(grant.userId, list);
        }
      } catch {
        // If all Auth Center calls fail, continue without role info
      }
    }

    const users = appMembers
      .filter((member) => Boolean(member.id))
      .map((member) => ({
        id: member.id,
        authUserId: member.id,
        name: member.displayName ?? null,
        email: member.email ?? null,
        role: pickRole(rolesByUser.get(member.id) ?? []),
        department: null,
      }));

    const moduleConfigs = await Promise.all(
      APPROVAL_CONFIG_MODULES.map(async (module): Promise<ModuleConfigResponse> => ({
        moduleKey: module.key,
        label: module.label,
        description: module.description,
        mrAuthUserId: await this.getEffectiveConfigValue(configMap, module.key, "MR", "AUTH_USER_ID"),
        qmsAuthUserId: await this.getEffectiveConfigValue(configMap, module.key, "QMS", "AUTH_USER_ID"),
        mrEmail: await this.getEffectiveConfigValue(configMap, module.key, "MR", "EMAIL"),
        qmsEmail: await this.getEffectiveConfigValue(configMap, module.key, "QMS", "EMAIL"),
      })),
    );

    return { users, modules: moduleConfigs };
  }

  async updateConfig(modules: ModuleConfigInput[]) {
    await db.$transaction(async (tx) => {
      for (const moduleConfig of modules) {
        const entries = [
          {
            key: getApprovalConfigKey(moduleConfig.moduleKey, "MR", "AUTH_USER_ID"),
            value: moduleConfig.mrAuthUserId ?? null,
            description: `${moduleConfig.moduleKey} MR auth user id`,
          },
          {
            key: getApprovalConfigKey(moduleConfig.moduleKey, "MR", "EMAIL"),
            value: moduleConfig.mrEmail ?? null,
            description: `${moduleConfig.moduleKey} MR email`,
          },
          {
            key: getApprovalConfigKey(moduleConfig.moduleKey, "QMS", "AUTH_USER_ID"),
            value: moduleConfig.qmsAuthUserId ?? null,
            description: `${moduleConfig.moduleKey} QMS auth user id`,
          },
          {
            key: getApprovalConfigKey(moduleConfig.moduleKey, "QMS", "EMAIL"),
            value: moduleConfig.qmsEmail ?? null,
            description: `${moduleConfig.moduleKey} QMS email`,
          },
        ];

        for (const entry of entries) {
          if (entry.value) {
            await this.configRepo.upsertConfigWithDescription(entry.key, entry.value, entry.description, tx);
          } else {
            await this.configRepo.deleteByKey(entry.key, tx);
          }
        }
      }
    });
  }
}
