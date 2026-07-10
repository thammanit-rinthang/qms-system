import type { UserRole as PrismaUserRole } from "@/generated/prisma/client";

export const LEGACY_QMS_ROLES = ["USER", "QMS", "MR", "IT"] as const;
export const RENAMED_QMS_ROLES = ["QMS_USER", "QMS_QMS", "QMS_MR", "QMS_IT"] as const;
export const ALL_QMS_ROLES = [...LEGACY_QMS_ROLES, ...RENAMED_QMS_ROLES] as const;
export const LEGACY_PRIVILEGED_QMS_ROLES = ["QMS", "MR", "IT"] as const;

export type LegacyQmsRole = (typeof LEGACY_QMS_ROLES)[number];
export type RenamedQmsRole = (typeof RENAMED_QMS_ROLES)[number];
export type AnyQmsRole = (typeof ALL_QMS_ROLES)[number];

const ROLE_ALIASES: Record<AnyQmsRole, LegacyQmsRole> = {
  USER: "USER",
  QMS: "QMS",
  MR: "MR",
  IT: "IT",
  QMS_USER: "USER",
  QMS_QMS: "QMS",
  QMS_MR: "MR",
  QMS_IT: "IT",
};

const RENAMED_ROLE_MAP: Record<LegacyQmsRole, RenamedQmsRole> = {
  USER: "QMS_USER",
  QMS: "QMS_QMS",
  MR: "QMS_MR",
  IT: "QMS_IT",
};

export function isAnyQmsRole(value: unknown): value is AnyQmsRole {
  return typeof value === "string" && (ALL_QMS_ROLES as readonly string[]).includes(value);
}

export function normalizeQmsRole(role: unknown): LegacyQmsRole {
  if (isAnyQmsRole(role)) {
    return ROLE_ALIASES[role];
  }
  return "USER";
}

export function normalizeQmsRoles(roles: readonly unknown[]): LegacyQmsRole[] {
  const normalized = roles.map((role) => normalizeQmsRole(role));
  return [...new Set(normalized)];
}

export function toRenamedQmsRole(role: LegacyQmsRole): RenamedQmsRole {
  return RENAMED_ROLE_MAP[role];
}

export function toPrismaUserRole(role: unknown): PrismaUserRole {
  return normalizeQmsRole(role) as PrismaUserRole;
}

export function hasQmsRole(actualRole: unknown, ...expectedRoles: readonly unknown[]): boolean {
  const normalizedActual = normalizeQmsRole(actualRole);
  return expectedRoles.some((role) => normalizeQmsRole(role) === normalizedActual);
}

export function isPrivilegedQmsRole(role: unknown): boolean {
  return (LEGACY_PRIVILEGED_QMS_ROLES as readonly string[]).includes(normalizeQmsRole(role));
}

export function pickHighestQmsRole(roles: readonly unknown[]): LegacyQmsRole {
  const normalized = normalizeQmsRoles(roles);
  if (normalized.includes("IT")) return "IT";
  if (normalized.includes("QMS")) return "QMS";
  if (normalized.includes("MR")) return "MR";
  return "USER";
}
