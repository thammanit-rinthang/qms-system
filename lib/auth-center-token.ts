import { createRemoteJWKSet, jwtVerify } from "jose";
import { pickHighestQmsRole, type LegacyQmsRole } from "@/lib/qms-roles";

const ISSUER = "auth-center";

export type AuthCenterAuthMethod = "ENTRA" | "LOCAL_PASSWORD" | "LOCAL_OTP";

/** JWT claims issued by Auth Center to QMS. */
export interface AuthCenterTokenClaims {
  sub: string;
  userId: string;
  employeeId: string;
  authMethod: AuthCenterAuthMethod;
  m365Linked: boolean;
  canSendDelegatedMail: boolean;
  departmentId: string | null;
  appRoles: string[];
  roleVersion: string;
  sessionId: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks(): ReturnType<typeof createRemoteJWKSet> {
  if (!_jwks) {
    const url = process.env.AUTH_CENTER_JWKS_URL;
    if (!url) throw new Error("AUTH_CENTER_JWKS_URL is not configured");
    _jwks = createRemoteJWKSet(new URL(url));
  }
  return _jwks;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_CENTER_SECRET;
  if (!secret) throw new Error("AUTH_CENTER_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

/**
 * Verify an Auth Center access token and return its claims.
 * Uses JWKS (production) if AUTH_CENTER_JWKS_URL is set,
 * falls back to HS256 secret (dev) via AUTH_CENTER_SECRET.
 */
export async function verifyAuthCenterToken(
  token: string,
  appId: string,
): Promise<AuthCenterTokenClaims> {
  const verifyOpts = { issuer: ISSUER, audience: appId };

  const { payload } = process.env.AUTH_CENTER_JWKS_URL
    ? await jwtVerify(token, getJwks(), verifyOpts)
    : await jwtVerify(token, getSecret(), verifyOpts);

  return payload as unknown as AuthCenterTokenClaims;
}

/** Pick the highest-privilege role from appRoles array, matching QMS UserRole type. */
export function pickRole(
  appRoles: string[],
): LegacyQmsRole {
  return pickHighestQmsRole(appRoles);
}
