import { LEGACY_PRIVILEGED_QMS_ROLES, isPrivilegedQmsRole, type AnyQmsRole } from "@/lib/qms-roles";

export const PRIVILEGED_ROLES = [...LEGACY_PRIVILEGED_QMS_ROLES];

/**
 * ตรวจสอบว่า Role ปัจจุบันเป็นกลุ่มผู้มีสิทธิ์พิเศษ (Privileged) หรือไม่
 */
export function isPrivilegedRole(role?: AnyQmsRole | string | null): boolean {
  if (!role) return false;
  return isPrivilegedQmsRole(role);
}
