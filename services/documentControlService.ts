import { logger } from '@/lib/logger';
import { AuditService } from '@/services/auditService';
import { DocumentControlRepository } from '@/repositories/documentControlRepository';
import { DocumentCategoryRepository } from '@/repositories/documentCategoryRepository';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { db } from '@/lib/db';
import {
  uploadFileToDocControl,
  deleteSpItem,
  renameSpItem,
  ensureSpFolder,
  moveSpFolderByPath,
  deleteSpFolderByPath,
  buildDocControlCategoryFolderPath,
  buildDocControlDocumentFolderPath,
} from '@/services/sharepoint';
import type { CreateDocumentControlInput, UpdateDocumentControlInput } from '@/types/documentControl';
import { DocControlStatus, Prisma } from '@/generated/prisma/client';
import { UserRepository } from '@/repositories/userRepository';
import { getUserSnapshot } from '@/lib/userSnapshotCache';

export class DocumentControlService {
  private repo = new DocumentControlRepository();
  private categoryRepo = new DocumentCategoryRepository();
  private userRepo = new UserRepository();

  private async findDept(id: string) {
    return db.docControlDept.findUnique({ where: { id } });
  }

  private async getIdentitySnapshot(authUserId: string) {
    // Try cache first (populated at login, no DB hit needed)
    const cached = await getUserSnapshot(authUserId);
    if (cached) return cached;
    // Fallback: User table (during transition or cache miss)
    return this.userRepo.findIdentitySnapshotByAuthUserId(authUserId);
  }

  async listDocuments(
    page: number,
    limit: number,
    filters?: { search?: string; categoryId?: string; status?: string; sortBy?: string; sortOrder?: string },
  ) {
    const where: Prisma.DocumentControlWhereInput = {};

    if (filters?.search) {
      where.OR = [
        { docNumber: { contains: filters.search, mode: 'insensitive' } },
        { docName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.status) {
      where.status = filters.status as DocControlStatus;
    }

    return this.repo.findManyWithUsers(
      { page, limit, sortBy: filters?.sortBy, sortOrder: filters?.sortOrder },
      where
    );
  }

  async getDocument(id: string) {
    const doc = await this.repo.findDetailById(id);
    if (!doc) {
      throw new NotFoundError('Document');
    }
    return this._formatDocDetail(doc);
  }

  async createDocument(userId: string, data: CreateDocumentControlInput, authUserId?: string | null) {
    const existing = await this.repo.findByDocNumber(data.docNumber);
    if (existing) {
      throw new ValidationError('Document number already exists');
    }

    const [dept, category] = await Promise.all([
      this.findDept(data.departmentId),
      this.categoryRepo.findForDocControl(data.categoryId),
    ]);
    const creator = await this.getIdentitySnapshot(userId);
    if (!dept || !category) throw new ValidationError('Department or category not found');
    if (category.departmentId !== data.departmentId) throw new ValidationError('Category does not belong to department');
    const docFolderPath = buildDocControlDocumentFolderPath(dept.name, category.name, data.docNumber);
    await ensureSpFolder(docFolderPath);

    const doc = await this.repo.create({
      docNumber: data.docNumber,
      docName: data.docName,
      description: data.description ?? null,
      status: (data.status || 'DRAFT') as DocControlStatus,
      departmentId: data.departmentId,
      authDepartmentId: dept.authDeptCode ?? dept.name,
      departmentName: dept.name,
      categoryId: data.categoryId,
      createdById: userId,
      createdByAuthUserId: authUserId ?? null,
      createdByName: creator?.name ?? null,
      revision: null,
      spFolderPath: docFolderPath,
    });

    await AuditService.record({
      actorUserId: userId,
      actorRole: "QMS",
      action: "CREATE",
      resourceType: "DOCUMENT",
      resourceId: doc.id,
      after: { docNumber: doc.docNumber, docName: doc.docName, status: doc.status },
    });

    return this._formatDocDetail(doc);
  }

  async updateDocument(id: string, userId: string, data: UpdateDocumentControlInput, authUserId?: string | null) {
    const doc = await this.repo.findDetailById(id);
    if (!doc) {
      throw new NotFoundError('Document');
    }
    const updater = await this.getIdentitySnapshot(userId);

    const updates: Prisma.DocumentControlUncheckedUpdateInput = {
      updatedById: userId,
      updatedByAuthUserId: authUserId ?? null,
      updatedByName: updater?.name ?? null,
    };
    const nextDepartmentId = data.departmentId ?? doc.departmentId ?? undefined;
    const nextCategoryId = data.categoryId ?? doc.categoryId ?? undefined;
    if (!nextDepartmentId || !nextCategoryId) throw new ValidationError('Department and category are required');

    const [nextDept, nextCategory] = await Promise.all([
      this.findDept(nextDepartmentId),
      this.categoryRepo.findForDocControl(nextCategoryId),
    ]);
    if (!nextDept || !nextCategory) throw new ValidationError('Department or category not found');
    if (nextCategory.departmentId !== nextDepartmentId) throw new ValidationError('Category does not belong to department');

    const currentDeptName = doc.departmentName ?? 'Unknown';
    const currentCategoryName = doc.category?.name ?? 'Uncategorized';
    const oldDocFolderPath = buildDocControlDocumentFolderPath(currentDeptName, currentCategoryName, doc.docNumber);
    const newDocFolderPath = buildDocControlDocumentFolderPath(nextDept.name, nextCategory.name, doc.docNumber);

    if (oldDocFolderPath !== newDocFolderPath) {
      // Step 1: Move the SharePoint folder first (external side effect — cannot easily roll back)
      const targetParentPath = buildDocControlCategoryFolderPath(nextDept.name, nextCategory.name);
      await moveSpFolderByPath({
        sourceFolderPath: oldDocFolderPath,
        targetParentPath,
        newFolderName: doc.docNumber,
      });
      updates.spFolderPath = newDocFolderPath;

      // Step 2: Wrap all DB path rewrites in a transaction so DB stays consistent
      // If this fails after SP already moved, log a warning — SP compensation for folder moves
      // is complex; the important guarantee is that DB does not end up partially updated.
      try {
        await db.$transaction(async (tx) => {
          await this.repo.updateRevisionPaths(
            id,
            (revision) => buildDocControlDocumentFolderPath(nextDept.name, nextCategory.name, doc.docNumber, revision),
            tx,
          );
        });
      } catch (txErr) {
        // DB update failed after SP move succeeded — log for manual reconciliation
        logger.error(
          `[DocumentControlService.updateDocument] DB transaction failed after SP folder move. ` +
          `Document ${id} SP folder is now at ${newDocFolderPath} but DB revision paths may be stale.`,
          txErr,
        );
        throw txErr;
      }
    }

    if (data.docName !== undefined && data.docName !== doc.docName && doc.spItemId && doc.fileName) {
      const extMatch = doc.fileName.match(/(\.[^./\\]+)$/);
      const ext = extMatch ? extMatch[1] : '';
      const safeBaseName = data.docName.replace(/[/\\:*?"<>|]/g, '_').trim();
      if (!safeBaseName) {
        throw new ValidationError('Document name is invalid');
      }

      const renamed = await renameSpItem({
        spItemId: doc.spItemId,
        newName: `${safeBaseName}${ext}`,
      });
      updates.fileName = renamed.name;
      updates.spWebUrl = renamed.spWebUrl;
      updates.spDownloadUrl = renamed.spDownloadUrl;
    }

    if (data.docName !== undefined) updates.docName = data.docName;
    if (data.description !== undefined) updates.description = data.description;
    if (data.status !== undefined) updates.status = data.status;
    if (data.departmentId !== undefined) {
      updates.departmentId = data.departmentId;
      updates.authDepartmentId = nextDept.authDeptCode ?? nextDept.name;
      updates.departmentName = nextDept.name;
    }
    if (data.categoryId !== undefined) updates.categoryId = data.categoryId;

    const updated = await this.repo.update(id, updates);
    return this._formatDocDetail(updated);
  }

  async addRevision(
    id: string,
    userId: string,
    data: { revision: string; effectiveDate?: string | null; status?: DocControlStatus },
    file: { buffer: Uint8Array; name: string; type: string },
    authUserId?: string | null,
  ) {
    const doc = await this.repo.findDetailById(id);
    if (!doc) {
      throw new NotFoundError('Document');
    }

    const deptName = doc.departmentName ?? 'Unknown';
    const categoryName = doc.category?.name ?? 'Uncategorized';
    const creator = await this.getIdentitySnapshot(userId);

    // Step 1: Upload file to SharePoint FIRST.
    // DB changes only happen after upload succeeds so we never mark revisions
    // OBSOLETE without a new revision being safely stored.
    const spResult = await uploadFileToDocControl({
      fileBuffer: file.buffer,
      fileName: file.name,
      mimeType: file.type,
      deptName,
      categoryName,
      docNumber: doc.docNumber,
      revision: data.revision,
    });

    const revisionStatus = data.status || 'ACTIVE';

    // Step 2: Wrap all DB writes in a single transaction.
    // Order: mark old revisions OBSOLETE → create new revision row → update main document.
    // This guarantees the DB is either fully updated or fully rolled back.
    let updatedDoc;
    try {
      updatedDoc = await db.$transaction(async (tx) => {
        // 2a. Mark all existing revisions as OBSOLETE
        await this.repo.obsoleteAndCreateRevision(
          id,
          {
            documentControlId: id,
            revision: data.revision,
            effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null,
            status: revisionStatus,
            spDriveId: spResult.driveId,
            spItemId: spResult.spItemId,
            spWebUrl: spResult.spWebUrl,
            spDownloadUrl: spResult.spDownloadUrl,
            spFolderPath: spResult.folderPath,
            fileName: file.name,
            fileSize: file.buffer.length,
            mimeType: file.type,
            createdById: userId,
            createdByAuthUserId: authUserId ?? null,
            createdByName: creator?.name ?? null,
          },
          tx,
        );

        // 2b. Update main DocumentControl with latest revision info
        return this.repo.update(
          id,
          {
            revision: data.revision,
            effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : null,
            status: revisionStatus,
            spDriveId: spResult.driveId,
            spItemId: spResult.spItemId,
            spWebUrl: spResult.spWebUrl,
            spDownloadUrl: spResult.spDownloadUrl,
            spFolderPath: spResult.folderPath,
            fileName: file.name,
            fileSize: file.buffer.length,
            mimeType: file.type,
            updatedById: userId,
            updatedByAuthUserId: authUserId ?? null,
            updatedByName: creator?.name ?? null,
          },
          tx,
        );
      });
    } catch (txErr) {
      // Step 3: Compensation — DB transaction failed, so delete the uploaded file from SP
      // to avoid leaving an orphaned file with no corresponding DB revision.
      logger.error(
        `[DocumentControlService.addRevision] DB transaction failed after SP upload. ` +
        `Attempting to delete orphaned SP item ${spResult.spItemId}.`,
        txErr,
      );
      try {
        await deleteSpItem(spResult.spItemId);
      } catch (deleteErr) {
        logger.error(
          `[DocumentControlService.addRevision] Compensation delete of SP item ${spResult.spItemId} also failed.`,
          deleteErr,
        );
      }
      throw txErr;
    }

    return this._formatDocDetail(updatedDoc);
  }

  async deleteDocument(id: string, actorUserId?: string) {
    const doc = await this.repo.findDetailById(id);
    if (!doc) {
      throw new NotFoundError('Document');
    }

    if (doc.spFolderPath) {
      await deleteSpFolderByPath(doc.spFolderPath);
    } else if (doc.spItemId) {
      try {
        await deleteSpItem(doc.spItemId);
      } catch {
        // Continue even if SP delete fails
      }
    }

    const result = await this.repo.delete(id);

    if (actorUserId) {
      await AuditService.record({
        actorUserId,
        actorRole: "QMS",
        action: "DELETE",
        resourceType: "DOCUMENT",
        resourceId: id,
        before: { docNumber: (doc as { docNumber?: string }).docNumber, status: (doc as { status?: string }).status },
      });
    }

    return result;
  }

  private _formatDocDetail<T extends { createdAt?: Date | string | null; updatedAt?: Date | string | null; effectiveDate?: Date | string | null }>(doc: T) {
    const raw = doc as T & {
      createdById?: string | null;
      createdByAuthUserId?: string | null;
      createdByName?: string | null;
      updatedById?: string | null;
      updatedByAuthUserId?: string | null;
      updatedByName?: string | null;
      departmentId?: string | null;
      authDepartmentId?: string | null;
      departmentName?: string | null;
      revisions?: Array<{
        id: string;
        documentControlId: string;
        revision: string;
        effectiveDate?: Date | string | null;
        status: DocControlStatus;
        spWebUrl: string | null;
        spDownloadUrl: string | null;
        spFolderPath: string | null;
        fileName: string | null;
        fileSize: number | null;
        mimeType: string | null;
        createdById: string;
        createdByAuthUserId?: string | null;
        createdByName?: string | null;
        createdAt: Date | string;
      }>;
    };

    return {
      ...doc,
      createdBy: raw.createdById
        ? { id: raw.createdById, authUserId: raw.createdByAuthUserId ?? null, name: raw.createdByName ?? null }
        : undefined,
      updatedBy: raw.updatedById
        ? { id: raw.updatedById, authUserId: raw.updatedByAuthUserId ?? null, name: raw.updatedByName ?? null }
        : null,
      department: raw.departmentName
        ? { id: raw.authDepartmentId ?? raw.departmentId ?? '', name: raw.departmentName }
        : null,
      revisions: raw.revisions?.map((rev) => ({
        ...rev,
        createdBy: { id: rev.createdById, authUserId: rev.createdByAuthUserId ?? null, name: rev.createdByName ?? null },
        createdAt: rev.createdAt instanceof Date ? rev.createdAt.toISOString() : rev.createdAt,
        effectiveDate: rev.effectiveDate instanceof Date ? rev.effectiveDate.toISOString() : rev.effectiveDate,
      })),
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : doc.updatedAt,
      effectiveDate: doc.effectiveDate instanceof Date ? doc.effectiveDate.toISOString() : doc.effectiveDate,
    };
  }
}
