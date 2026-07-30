import NextAuth from "next-auth";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { ForbiddenError, SessionExpiredError, UnauthorizedError } from "@/lib/errors";
import { isAuthCenterAccessTokenExpired } from "@/lib/auth-session";
import { hasQmsRole, normalizeQmsRole, type AnyQmsRole } from "@/lib/qms-roles";

// Edge-safe NextAuth instance — decodes JWT without any DB access.
// DB callbacks (upsert, syncDepartment) live only in lib/auth-node.ts.
const { auth } = NextAuth(authConfig);

export { auth };

export async function getSession() {
  return auth();
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  if (isAuthCenterAccessTokenExpired(session.user.accessTokenExpiresAt, undefined, session.user.accessToken)) {
    throw new SessionExpiredError();
  }
  return session;
}

export async function requireRole(...roles: AnyQmsRole[]) {
  const session = await requireAuth();
  if (!hasQmsRole(session.user.role, ...roles)) {
    throw new ForbiddenError("Insufficient permissions");
  }
  return session;
}

export async function requireAuthEdge(req: NextRequest) {
  const isProduction = process.env.NODE_ENV === "production";
  const cookieName = isProduction ? "__Secure-qms.session-token" : "qms.session-token";
  const token = await getToken({
    req: req as unknown as Parameters<typeof getToken>[0]["req"],
    secret: process.env.AUTH_SECRET!,
    cookieName,
    salt: cookieName,
  });

  if (!token) throw new UnauthorizedError();
  if (isAuthCenterAccessTokenExpired(token.accessTokenExpiresAt as string | undefined, undefined, token.accessToken as string | undefined)) {
    throw new SessionExpiredError();
  }

  return {
    user: {
      id: token.sub as string,
      authUserId: (token.authUserId as string | undefined) ?? (token.sub as string),
      name: token.name as string | null,
      email: token.email as string | null,
      role: normalizeQmsRole(token.role) as "USER" | "QMS" | "MR" | "IT",
      departmentId: token.departmentId as string | undefined,
      authDepartmentId: token.authDepartmentId as string | undefined,
      accessToken: token.accessToken as string | undefined,
      accessTokenExpiresAt: token.accessTokenExpiresAt as string | undefined,
    },
  };
}

export async function requireRoleEdge(req: NextRequest, ...roles: AnyQmsRole[]) {
  const session = await requireAuthEdge(req);
  if (!hasQmsRole(session.user.role, ...roles)) {
    throw new ForbiddenError("Insufficient permissions");
  }
  return session;
}
