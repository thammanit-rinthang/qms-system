import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserSnapshot } from "@/lib/userSnapshotCache";
import { sendSuccess } from "@/lib/apiResponse";
import { handleApiError } from "@/lib/apiErrorHandler";
import { type NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const role = req.nextUrl.searchParams.get("role"); // "MR" or "QMS"
    if (role !== "MR" && role !== "QMS") return sendSuccess([], "OK");

    const grantRole = role === "MR" ? "QMS_MR" : "QMS_QMS";
    const configKey = role === "MR" ? "CURRENT_MR_AUTH_USER_ID" : "CURRENT_QMS_AUTH_USER_ID";

    let grants = await db.localRoleGrant.findMany({ where: { role: grantRole } });

    // Seed from SystemConfig if table is empty (first-run migration)
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

    const users = await Promise.all(
      grants.map(async (g) => {
        const snap = await getUserSnapshot(g.authUserId).catch(() => null);
        return {
          authUserId: g.authUserId,
          name: snap?.name ?? g.displayName ?? g.authUserId,
          email: snap?.email ?? g.email ?? null,
        };
      }),
    );

    return sendSuccess(users, "OK");
  } catch (err) {
    return handleApiError(err);
  }
}
