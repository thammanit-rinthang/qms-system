import { db } from '@/lib/db';
import { listAuthCenterDepartments } from '@/lib/auth-center-admin-client';
import type { DocControlDept } from '@/generated/prisma/client';

export type DocControlDeptRow = Pick<DocControlDept, 'id' | 'name' | 'authDeptCode' | 'emailGroup' | 'isActive' | 'sortOrder' | 'createdAt' | 'updatedAt'> & {
  _count?: { categories: number; documents: number };
};

export class DocControlDeptService {
  async list(): Promise<DocControlDeptRow[]> {
    return db.docControlDept.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async listActive(): Promise<DocControlDeptRow[]> {
    return db.docControlDept.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findById(id: string) {
    return db.docControlDept.findUnique({ where: { id } });
  }

  async create(data: { name: string; emailGroup?: string | null; isActive?: boolean }) {
    const count = await db.docControlDept.count();
    return db.docControlDept.create({
      data: {
        name: data.name.trim(),
        emailGroup: data.emailGroup ?? null,
        isActive: data.isActive ?? true,
        sortOrder: count,
      },
    });
  }

  async update(id: string, data: { name?: string; emailGroup?: string | null; isActive?: boolean; sortOrder?: number }) {
    return db.docControlDept.update({
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
    const hasCategories = await db.documentCategory.count({ where: { departmentId: id } });
    if (hasCategories > 0) throw new Error('ไม่สามารถลบแผนกที่มีหมวดหมู่เอกสารอยู่ได้');
    return db.docControlDept.delete({ where: { id } });
  }

  // Pull Auth Center departments → upsert into DocControlDept (never deletes existing rows).
  async syncFromAuthCenter(accessToken?: string | null): Promise<{ created: number; skipped: number }> {
    const authDepts = await listAuthCenterDepartments({ accessToken });
    let created = 0;
    let skipped = 0;

    for (const d of authDepts) {
      const existing = await db.docControlDept.findFirst({
        where: { OR: [{ authDeptCode: d.code }, { name: d.displayName }] },
      });
      if (existing) {
        if (!existing.authDeptCode) {
          await db.docControlDept.update({ where: { id: existing.id }, data: { authDeptCode: d.code } });
        }
        skipped++;
        continue;
      }
      const count = await db.docControlDept.count();
      await db.docControlDept.create({
        data: { name: d.displayName, authDeptCode: d.code, emailGroup: d.emailGroup ?? null, isActive: true, sortOrder: count },
      });
      created++;
    }

    return { created, skipped };
  }
}
