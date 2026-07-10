import { db } from '@/lib/db';
import { listAuthCenterDepartments } from '@/lib/auth-center-admin-client';
import type { KpiDept } from '@/generated/prisma/client';

export type KpiDeptRow = Pick<KpiDept, 'id' | 'name' | 'authDeptCode' | 'emailGroup' | 'isActive' | 'sortOrder' | 'createdAt' | 'updatedAt'>;

export class KpiDeptService {
  async list(): Promise<KpiDeptRow[]> {
    return db.kpiDept.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  }

  async listActive(): Promise<KpiDeptRow[]> {
    return db.kpiDept.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  }

  async create(data: { name: string; emailGroup?: string | null; isActive?: boolean }) {
    const count = await db.kpiDept.count();
    return db.kpiDept.create({
      data: { name: data.name.trim(), emailGroup: data.emailGroup ?? null, isActive: data.isActive ?? true, sortOrder: count },
    });
  }

  async update(id: string, data: { name?: string; emailGroup?: string | null; isActive?: boolean; sortOrder?: number }) {
    return db.kpiDept.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.emailGroup !== undefined && { emailGroup: data.emailGroup }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    });
  }

  async delete(id: string) {
    const dept = await db.kpiDept.findUnique({ where: { id } });
    if (!dept) throw new Error('Department not found');
    const hasKpis = await db.kPI.count({ where: { department: dept.name } });
    if (hasKpis > 0) throw new Error('ไม่สามารถลบแผนกที่มี KPI อยู่ได้');
    return db.kpiDept.delete({ where: { id } });
  }

  async syncFromAuthCenter(accessToken?: string | null): Promise<{ created: number; skipped: number }> {
    const authDepts = await listAuthCenterDepartments({ accessToken });
    let created = 0;
    let skipped = 0;

    for (const d of authDepts) {
      // Match by authDeptCode first, then fall back to name (handles rows seeded before sync)
      const existing = await db.kpiDept.findFirst({
        where: { OR: [{ authDeptCode: d.code }, { name: d.displayName }] },
      });
      if (existing) {
        // Backfill authDeptCode if it was seeded without one
        if (!existing.authDeptCode) {
          await db.kpiDept.update({ where: { id: existing.id }, data: { authDeptCode: d.code } });
        }
        skipped++;
        continue;
      }
      const count = await db.kpiDept.count();
      await db.kpiDept.create({
        data: { name: d.displayName, authDeptCode: d.code, emailGroup: d.emailGroup ?? null, isActive: true, sortOrder: count },
      });
      created++;
    }

    return { created, skipped };
  }
}
