import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { hasQmsRole, type AnyQmsRole } from "@/lib/qms-roles";

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
  return session;
}

export async function requireRole(...roles: AnyQmsRole[]) {
  const session = await requireAuth();
  if (!hasQmsRole(session.user.role, ...roles)) {
    throw new ForbiddenError("Insufficient permissions");
  }
  return session;
}
