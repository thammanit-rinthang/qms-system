const AUDIT_PLAN_DELETE_ROLES = new Set(["QMS", "MR", "IT"]);

export function canDeleteAuditPlan(role: string | null | undefined): boolean {
  return role ? AUDIT_PLAN_DELETE_ROLES.has(role) : false;
}
