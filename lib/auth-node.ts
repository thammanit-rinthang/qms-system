import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { verifyAuthCenterToken, pickRole } from "@/lib/auth-center-token";
import type { LegacyQmsRole } from "@/lib/qms-roles";

/**
 * Fetch richer profile from Auth Center /api/auth/me using the access token.
 * Returns email, displayName, and department name.
 * Failure is non-fatal and login still proceeds.
 */
async function fetchAuthCenterProfile(
  accessToken: string,
  appId: string,
): Promise<{ email: string | null; displayName: string | null; department: string | null; jobTitle: string | null }> {
  const base = (process.env.AUTH_CENTER_URL ?? "").replace(/\/$/, "");
  if (!base) return { email: null, displayName: null, department: null, jobTitle: null };

  try {
    const res = await fetch(
      `${base}/api/auth/me?appId=${encodeURIComponent(appId)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) return { email: null, displayName: null, department: null, jobTitle: null };

    const json = await res.json() as {
      data?: {
        email?: string | null;
        displayName?: string | null;
        department?: string | null;
        jobTitle?: string | null;
      };
    };
    const data = json.data ?? {};
    return {
      email: data.email ?? null,
      displayName: data.displayName ?? null,
      department: data.department ?? null,
      jobTitle: data.jobTitle ?? null,
    };
  } catch {
    return { email: null, displayName: null, department: null, jobTitle: null };
  }
}

/**
 * Auth Center callback: verify JWT, cache snapshot, return identity.
 * Called from /api/auth/center/callback.
 */
export async function handleAuthCenterCallback(rawToken: string): Promise<{
  id: string;
  authUserId: string;
  email: string | null;
  name: string | null;
  jobTitle: string | null;
  employeeId: string | null;
  departmentId: string | null;
  authDepartmentId: string | null;
  appRoles: string[];
  role: LegacyQmsRole;
  jti: string;
  m365Linked: boolean;
  expiresAt: string;
}> {
  const appId = process.env.AUTH_CENTER_APP_ID ?? "qms";
  const claims = await verifyAuthCenterToken(rawToken, appId);
  const profile = await fetchAuthCenterProfile(rawToken, appId);

  // Cache user snapshot in Redis for services that need identity data
  const { setUserSnapshot } = await import("@/lib/userSnapshotCache");
  await setUserSnapshot(claims.userId, {
    authUserId: claims.userId,
    name: profile.displayName ?? null,
    email: profile.email ?? null,
    employeeId: claims.employeeId,
    departmentId: claims.departmentId ?? null,
    departmentName: profile.department ?? null,
    m365Linked: claims.m365Linked ?? false,
  }).catch(() => {});

  return {
    id: claims.userId,
    authUserId: claims.userId,
    email: profile.email ?? null,
    name: profile.displayName ?? null,
    jobTitle: profile.jobTitle ?? null,
    employeeId: claims.employeeId,
    departmentId: claims.departmentId ?? null,
    authDepartmentId: claims.departmentId ?? null,
    appRoles: claims.appRoles,
    role: pickRole(claims.appRoles),
    jti: claims.sessionId,
    m365Linked: claims.m365Linked ?? false,
    expiresAt: new Date(claims.exp * 1000).toISOString(),
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token }) {
      if (token.authCenterVerified) {
        return token;
      }
      return token;
    },
  },
});
