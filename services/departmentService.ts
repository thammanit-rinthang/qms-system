import type { DepartmentRow, DepartmentDetail } from "@/types/department";
import {
  listAuthCenterDepartments,
  createAuthCenterDepartment,
  updateAuthCenterDepartment,
  deleteAuthCenterDepartment,
  type AuthCenterDepartment,
} from "@/lib/auth-center-admin-client";
import {
  getDepartments,
  getDepartmentByCode,
  invalidateDepartmentCache,
} from "@/lib/departmentCache";

export class DepartmentService {
  private fromAuthCenter(ac: AuthCenterDepartment): DepartmentRow {
    return {
      id: ac.code,
      name: ac.displayName,
      emailGroup: ac.emailGroup ?? null,
      isActive: true,
      _count: { users: ac.userCount },
      createdAt: ac.createdAt,
      updatedAt: ac.updatedAt,
    };
  }

  // ─── Public active list (used by business forms) ───────────────────────────

  async getActiveDepartments(accessToken?: string | null): Promise<{ id: string; name: string; emailGroup: string | null }[]> {
    const depts = await getDepartments(accessToken);
    return depts.map((d) => ({ id: d.code, name: d.displayName, emailGroup: d.emailGroup ?? null }));
  }

  // ─── Admin list (IT admin page) ────────────────────────────────────────────

  async getAllDepartments(accessToken?: string | null): Promise<DepartmentRow[]> {
    const depts = await listAuthCenterDepartments({ accessToken });
    return depts.map((d) => this.fromAuthCenter(d));
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  async createDepartment(data: { name: string; emailGroup?: string | null; isActive?: boolean }, accessToken?: string | null): Promise<DepartmentRow> {
    const code = data.name.trim().toUpperCase().replace(/\s+/g, "_");
    const ac = await createAuthCenterDepartment({
      code,
      displayName: data.name.trim(),
      emailGroup: data.emailGroup ?? null,
    }, { accessToken });
    await invalidateDepartmentCache();
    return this.fromAuthCenter(ac);
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  async updateDepartment(id: string, data: { name?: string; emailGroup?: string | null; isActive?: boolean }, accessToken?: string | null): Promise<DepartmentRow> {
    const ac = await updateAuthCenterDepartment(id, {
      displayName: data.name,
      emailGroup: data.emailGroup ?? null,
    }, { accessToken });
    await invalidateDepartmentCache();
    return this.fromAuthCenter(ac);
  }

  // ─── Members view ──────────────────────────────────────────────────────────

  async getDepartmentWithMembers(id: string, accessToken?: string | null): Promise<DepartmentDetail | null> {
    const dept = await getDepartmentByCode(id, accessToken);
    if (!dept) return null;

    return {
      id: dept.code,
      name: dept.displayName,
      emailGroup: dept.emailGroup ?? null,
      isActive: true,
      _count: { users: dept.userCount },
      createdAt: dept.createdAt,
      updatedAt: dept.updatedAt,
      members: [] as DepartmentDetail["members"],
    };
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async deleteDepartment(id: string, accessToken?: string | null): Promise<void> {
    await deleteAuthCenterDepartment(id, { accessToken });
    await invalidateDepartmentCache();
  }

  // ─── Sync from Entra ──────────────────────────────────────────────────────
  // Entra sync now only invalidates the cache; Auth Center is the source of truth.

  async syncFromEntraGroups(
    groups: Array<{ displayName?: string | null; mail?: string | null }>
  ): Promise<{ total: number; created: number; updated: number; skipped: number }> {
    const valid = groups.filter((g) => g.displayName?.trim());
    const skipped = groups.length - valid.length;
    // With Auth Center as source of truth, sync is a no-op at the local level.
    await invalidateDepartmentCache();
    return { total: groups.length, created: 0, updated: 0, skipped };
  }
}
