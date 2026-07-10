import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import type { NextAuthConfig } from "next-auth";
import { normalizeQmsRole, type LegacyQmsRole } from "@/lib/qms-roles";

const isProduction = process.env.NODE_ENV === "production";

export const authConfig: NextAuthConfig = {
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0`,
      authorization: {
        params: {
          scope: "openid profile email offline_access https://graph.microsoft.com/User.Read https://graph.microsoft.com/Mail.Send",
        },
      },
    }),
  ],
  session: { strategy: "jwt" },
  // Unique cookie name prevents collision with other Next.js/Auth.js apps on the same domain.
  cookies: {
    sessionToken: {
      name: isProduction ? "__Secure-qms.session-token" : "qms.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: isProduction,
      },
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  callbacks: {
    // Always return true so NextAuth does not auto-redirect to /auth/login.
    // Middleware handles all auth redirects itself (including Auth Center in auth_center mode).
    authorized() {
      return true;
    },
    // Edge-safe: maps JWT token fields → session.user (no DB access)
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.authUserId = token.authUserId as string | undefined;
        session.user.role = normalizeQmsRole(token.role);
        session.user.msUserId = token.msUserId as string | undefined;
        session.user.m365Verified = token.m365Verified as boolean | undefined;
        session.user.employeeId = token.employeeId as string | undefined;
        session.user.departmentId = token.departmentId as string | undefined;
        session.user.authDepartmentId = token.authDepartmentId as string | undefined;
        session.user.accessToken = token.accessToken as string | undefined;
        session.user.jobTitle = token.jobTitle as string | undefined;
        session.user.jti = token.jti as string | undefined;
        session.user.name = (token.name as string | null | undefined) ?? session.user.name;
      }
      return session;
    },
  },
};

type UserRole = LegacyQmsRole;

declare module "next-auth" {
  interface Session {
    user: {
      /** Auth Center userId — primary stable identity key */
      id: string;
      /** Alias for id — kept for backward compat during transition (id IS the authUserId now) */
      authUserId?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: UserRole;
      msUserId?: string;
      m365Verified?: boolean;
      employeeId?: string;
      departmentId?: string;
      accessToken?: string;
      jobTitle?: string;
      /** Auth Center department code — stable external department key */
      authDepartmentId?: string;
      /** Unique session ID used for JWT blocklist (force logout) */
      jti?: string;
    };
  }
}
