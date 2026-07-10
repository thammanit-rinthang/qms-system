/* eslint-disable @typescript-eslint/no-explicit-any */
import { logger } from '@/lib/logger';
import { DocumentCategoryRepository } from '@/repositories/documentCategoryRepository';
import { DocumentControlRepository } from '@/repositories/documentControlRepository';
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors';
import type { CreateDocumentCategoryInput, UpdateDocumentCategoryInput } from '@/types/documentControl';
import { db } from '@/lib/db';
import {
  ensureSpFolder,
  moveSpFolderByPath,
  deleteSpFolderByPath,
  buildDocControlCategoryFolderPath,
  buildDocControlDocumentFolderPath,
} from '@/services/sharepoint';

export class DocumentCategoryService {
  private repo = new DocumentCategoryRepository();
  private docRepo = new DocumentControlRepository();

  async listByDepartment(departmentId: string) {
    const categories = await this.repo.listByDepartment(departmentId);
    return categories.map((c: any) => this._format(c));
  }

  async getCategory(id: string) {
    const cat = await this.repo.findByIdWithCount(id);
    if (!cat) throw new NotFoundError('Category');
    return this._format(cat);
  }

  async createCategory(data: CreateDocumentCategoryInput) {
    const dept = await db.docControlDept.findUnique({ where: { id: data.departmentId } });
    if (!dept) throw new ValidationError('Department not found');
    await ensureSpFolder(buildDocControlCategoryFolderPath(dept.name, data.name));

    const cat = await this.repo.create({
      departmentId: data.departmentId,
      authDepartmentId: dept.authDeptCode ?? null,
      departmentName: dept.name,
      name: data.name,
      description: data.description ?? null,
      order: data.order ?? 0,
    } as any);
    return this._format(cat);
  }

  async updateCategory(id: string, data: UpdateDocumentCategoryInput) {
    const cat = await this.repo.findByIdWithCount(id);
    if (!cat) throw new NotFoundError('Category');

    const newName = data.name?.trim();
    if (newName && newName !== cat.name) {
      const deptName = cat.departmentName ?? 'Unknown';
      const oldCategoryPath = buildDocControlCategoryFolderPath(deptName, cat.name);
      const parentPath = buildDocControlCategoryFolderPath(deptName, '__tmp__').replace('/__tmp__', '');

      // Step 1: Move SharePoint folder (external side effect — happens before DB)
      await moveSpFolderByPath({
        sourceFolderPath: oldCategoryPath,
        targetParentPath: parentPath,
        newFolderName: newName.replace(/[/\\:*?"<>|]/g, '_').trim(),
      });

      // Step 2: Wrap ALL DB path rewrites in a single transaction via repository.
      // If the transaction fails after SP move, DB stays consistent (no partial rows),
      // though SP path and DB path may diverge — log for manual reconciliation.
      try {
        await db.$transaction(async (tx) => {
          await this.docRepo.updateCategoryDocumentPaths(
            id,
            deptName,
            newName,
            buildDocControlDocumentFolderPath,
            (d, c, docNum, rev) => buildDocControlDocumentFolderPath(d, c, docNum, rev),
            tx,
          );
        });
      } catch (txErr) {
        logger.error(
          `[DocumentCategoryService.updateCategory] DB transaction failed after SP folder rename. ` +
          `Category ${id} SP folder is now "${newName}" but DB paths may be stale.`,
          txErr,
        );
        throw txErr;
      }
    }

    const updates: any = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.order !== undefined) updates.order = data.order;

    const updated = await this.repo.update(id, updates);
    return this._format(updated);
  }

  async deleteCategory(id: string) {
    const cat = await this.repo.findByIdWithCount(id);
    if (!cat) throw new NotFoundError('Category');

    const hasDocuments = await this.repo.hasDocuments(id);
    if (hasDocuments) {
      throw new ForbiddenError('Cannot delete category with linked documents');
    }

    const deptName = cat.departmentName ?? 'Unknown';
    await deleteSpFolderByPath(buildDocControlCategoryFolderPath(deptName, cat.name));
    return this.repo.delete(id);
  }

  private _format(cat: any) {
    return {
      ...cat,
      createdAt: cat.createdAt?.toISOString?.() ?? cat.createdAt,
      updatedAt: cat.updatedAt?.toISOString?.() ?? cat.updatedAt,
    };
  }
}
