import { type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/apiErrorHandler";
import { sendSuccess } from "@/lib/apiResponse";
import { searchEntraUsers, fetchAllEntraUsers } from "@/services/ms-graph";
import { listAuthCenterAppMembers, listAuthCenterUsers } from "@/lib/auth-center-admin-client";
import { z } from "zod";

export interface ReviewerCandidate {
  id: string;
  name: string;
  email: string | null;
  employeeId: string | null;
  department: string | null;
  jobTitle: string | null;
}

const querySchema = z.object({
  q: z.string().max(100).optional().default(""),
});

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();

    const { q } = querySchema.parse({ q: req.nextUrl.searchParams.get("q")?.trim() ?? undefined });

    let authCenterUsers: Array<{
      id: string;
      employeeId: string | null;
      email: string | null;
      displayName: string | null;
      department: string | null;
      jobTitle: string | null;
      m365Linked: boolean;
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
          m365Linked: member.m365Linked,
        };
      }).filter((user) => {
        if (!q) return true;
        if (user.id.toLowerCase() === q.toLowerCase()) return true;
        const haystack = [
          user.displayName ?? "",
          user.email ?? "",
          user.employeeId ?? "",
          user.department ?? "",
          user.jobTitle ?? "",
        ].join(" ").toLowerCase();
        return haystack.includes(q.toLowerCase());
      }).slice(0, q.length === 0 ? 100 : 25);
    }

    // Also search Entra for M365-linked users
    const graphUsers = q.length === 0
      ? (await fetchAllEntraUsers().catch(() => [])).slice(0, 100)
      : await searchEntraUsers(q).catch(() => []);

    const resultMap = new Map<string, ReviewerCandidate>();

    // Auth Center users take priority
    for (const user of authCenterUsers) {
      if (!user.id) continue;
      resultMap.set(user.id, {
        id: user.id,
        name: user.displayName ?? user.employeeId ?? user.email ?? "",
        email: user.email,
        employeeId: user.employeeId,
        department: user.department ?? null,
        jobTitle: user.jobTitle ?? null,
      });
    }

    // Supplement with Graph users (keyed by employeeId to avoid duplicates)
    for (const user of graphUsers) {
      const email = user.mail ?? user.userPrincipalName;
      if (!email) continue;
      // Skip if already mapped via Auth Center
      const existing = Array.from(resultMap.values()).some(
        (r) => r.email?.toLowerCase() === email.toLowerCase()
      );
      if (existing) continue;

      resultMap.set(user.id, {
        id: user.id,
        name: user.displayName ?? "",
        email,
        employeeId: user.employeeId ?? null,
        department: user.department ?? null,
        jobTitle: user.jobTitle ?? null,
      });
    }

    const results = Array.from(resultMap.values()).sort((a, b) => a.name.localeCompare(b.name, "th"));

    return sendSuccess(results, "Users retrieved successfully");
  } catch (err) {
    return handleApiError(err);
  }
}
