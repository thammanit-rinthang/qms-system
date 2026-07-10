import { SystemConfigRepository } from "@/repositories/systemConfigRepository";
import { listAuthCenterAppMembers, listAuthCenterUsers, listAuthCenterRoleGrants } from "@/lib/auth-center-admin-client";
import { pickRole } from "@/lib/auth-center-token";
import { db } from "@/lib/db";

const MR_AUTH_CONFIG_KEY  = "CURRENT_MR_AUTH_USER_ID";
const MR_EMAIL_CONFIG_KEY = "CURRENT_MR_EMAIL";
const QMS_AUTH_CONFIG_KEY  = "CURRENT_QMS_AUTH_USER_ID";
const QMS_EMAIL_CONFIG_KEY = "CURRENT_QMS_EMAIL";

export class ApprovalConfigService {
  private configRepo = new SystemConfigRepository();

  async getConfig(accessToken?: string | null) {
    const [appMembers, mrConfig, qmsConfig] = await Promise.all([
      listAuthCenterAppMembers({ accessToken }),
      this.configRepo.findValueByKey(MR_AUTH_CONFIG_KEY),
      this.configRepo.findValueByKey(QMS_AUTH_CONFIG_KEY),
    ]);

    // IT: full roles per user; QMS/MR: merge role-grants
    const rolesByUser = new Map<string, string[]>();
    try {
      const authUsers = await listAuthCenterUsers({ accessToken });
      for (const u of authUsers) rolesByUser.set(u.id, u.roles);
    } catch {
      const grants = await listAuthCenterRoleGrants({ accessToken });
      for (const g of grants) {
        const list = rolesByUser.get(g.userId) ?? [];
        list.push(g.role);
        rolesByUser.set(g.userId, list);
      }
    }

    const users = appMembers
      .filter((u) => Boolean(u.id))
      .map((member) => ({
        id: member.id,
        authUserId: member.id,
        name: member.displayName ?? null,
        email: member.email ?? null,
        role: pickRole(rolesByUser.get(member.id) ?? []),
        department: null,
      }));

    const [mrEmail, qmsEmail] = await Promise.all([
      this.configRepo.findValueByKey(MR_EMAIL_CONFIG_KEY),
      this.configRepo.findValueByKey(QMS_EMAIL_CONFIG_KEY),
    ]);

    return { users, currentMrUserId: mrConfig, currentQmsUserId: qmsConfig, currentMrEmail: mrEmail, currentQmsEmail: qmsEmail };
  }

  async updateConfig(
    mrAuthUserId: string | null,
    qmsAuthUserId: string | null,
    emails?: { mrEmail?: string | null; qmsEmail?: string | null },
  ) {
    await db.$transaction(async (tx) => {
      if (mrAuthUserId) {
        await this.configRepo.upsertConfigWithDescription(MR_AUTH_CONFIG_KEY, mrAuthUserId, "Auth Center stable key of MR user", tx);
      } else {
        await this.configRepo.deleteByKey(MR_AUTH_CONFIG_KEY, tx);
        await this.configRepo.deleteByKey(MR_EMAIL_CONFIG_KEY, tx);
      }
      if (emails?.mrEmail) {
        await this.configRepo.upsertConfigWithDescription(MR_EMAIL_CONFIG_KEY, emails.mrEmail, "Email address of current MR user", tx);
      }
      if (qmsAuthUserId) {
        await this.configRepo.upsertConfigWithDescription(QMS_AUTH_CONFIG_KEY, qmsAuthUserId, "Auth Center stable key of QMS user", tx);
      } else {
        await this.configRepo.deleteByKey(QMS_AUTH_CONFIG_KEY, tx);
        await this.configRepo.deleteByKey(QMS_EMAIL_CONFIG_KEY, tx);
      }
      if (emails?.qmsEmail) {
        await this.configRepo.upsertConfigWithDescription(QMS_EMAIL_CONFIG_KEY, emails.qmsEmail, "Email address of current QMS user", tx);
      }
    });
  }
}
