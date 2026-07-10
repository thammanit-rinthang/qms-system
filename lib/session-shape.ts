import type { AuthCenterTokenClaims } from "@/lib/auth-center-token";
import { pickRole } from "@/lib/auth-center-token";
import type { LegacyQmsRole } from "@/lib/qms-roles";

/**
 * The QMS session user shape — identical structure regardless of auth mode.
 * Auth Center mode fills role from token; legacy mode fills it from local DB.
 */
export type QmsSessionUser = {
  id: string;                   // local QMS User.id (resolved at login time)
  authUserId?: string | null;   // Auth Center userId — stable external identity key
  email: string | null;
  name: string | null;
  employeeId: string | null;
  departmentId: string | null;      // local QMS Department.id (resolved from DB mirror)
  authDepartmentId?: string | null; // Auth Center department code (e.g. "IT", "ENGINEERING")
  role: LegacyQmsRole;
  jti: string;          // sessionId from Auth Center, or random UUID in legacy mode
  msUserId?: string | null;
  m365Linked?: boolean;
};

/**
 * Map Auth Center JWT claims into the QMS session user shape.
 * `localUserId` and `localDepartmentId` must be resolved from the local DB
 * before calling this — they are not taken from the token directly.
 */
export function mapClaimsToSessionUser(
  claims: AuthCenterTokenClaims,
  resolved: {
    localUserId: string;
    localDepartmentId: string | null;
    email: string | null;
    name: string | null;
  },
): QmsSessionUser {
  return {
    id: resolved.localUserId,
    authUserId: claims.userId,
    email: resolved.email,
    name: resolved.name,
    employeeId: claims.employeeId,
    departmentId: resolved.localDepartmentId,
    authDepartmentId: claims.departmentId ?? null,
    role: pickRole(claims.appRoles),
    jti: claims.sessionId,
    msUserId: null,
    m365Linked: claims.m365Linked,
  };
}
