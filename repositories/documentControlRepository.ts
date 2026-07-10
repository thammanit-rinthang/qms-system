import { BaseRepository, type PaginatedResult } from '@/repositories/baseRepository';
import { DocumentControl, Prisma } from '@/generated/prisma/client';

const DOC_SELECT = {
  id: true,
  docNumber: true,
  docName: true,
  revision: true,
  description: true,
  status: true,
  effectiveDate: true,
  spDriveId: true,
  spItemId: true,
  spWebUrl: true,
  spDownloadUrl: true,
  spFolderPath: true,
  fileName: true,
  fileSize: true,
  mimeType: true,
  createdById: true,
  createdByAuthUserId: true,
  createdByName: true,
  updatedById: true,
  updatedByAuthUserId: true,
  updatedByName: true,
  createdAt: true,
  updatedAt: true,
  departmentId: true,
  authDepartmentId: true,
  departmentName: true,
  categoryId: true,
  category: { select: { id: true, name: true, departmentId: true } },
  revisions: {
    select: {
      id: true,
      documentControlId: true,
      revision: true,
      effectiveDate: true,
      status: true,
      spDriveId: true,
      spItemId: true,
      spWebUrl: true,
      spDownloadUrl: true,
      spFolderPath: true,
      fileName: true,
      fileSize: true,
      mimeType: true,
      createdById: true,
      createdByAuthUserId: true,
      createdByName: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.DocumentControlSelect;

type DocumentControlWithRelations = Prisma.DocumentControlGetPayload<{
  select: typeof DOC_SELECT;
}>;

export class DocumentControlRepository extends BaseRepository<DocumentControl> {
  constructor() {
    super('documentControl');
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).documentControl;
  }

  async findManyWithUsers(
    params: { page: number; limit: number; sortBy?: string; sortOrder?: string },
    where: Prisma.DocumentControlWhereInput = {},
    tx?: Prisma.TransactionClient,
  ): Promise<PaginatedResult<DocumentControlWithRelations>> {
    const skip = (params.page - 1) * params.limit;
    const order: Record<string, string> = params.sortBy
      ? { [params.sortBy]: params.sortOrder ?? 'desc' }
      : { createdAt: 'desc' };

    const [data, total] = await Promise.all([
      this.delegate(tx).findMany({
        where,
        select: DOC_SELECT,
        orderBy: order,
        skip,
        take: params.limit,
      }),
      this.delegate(tx).count({ where }),
    ]);

    return { data, meta: { page: params.page, limit: params.limit, total } };
  }

  async findDetailById(id: string, tx?: Prisma.TransactionClient): Promise<DocumentControlWithRelations | null> {
    return this.delegate(tx).findUnique({ where: { id }, select: DOC_SELECT });
  }

  async findByDocNumber(docNumber: string, tx?: Prisma.TransactionClient): Promise<DocumentControlWithRelations | null> {
    return this.delegate(tx).findUnique({ where: { docNumber }, select: DOC_SELECT });
  }

  async updateRevisionPaths(
    documentControlId: string,
    pathBuilder: (revision: string) => string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = this.getClient(tx);
    const revisions = await client.documentControlRevision.findMany({
      where: { documentControlId },
      select: { id: true, revision: true },
    });
    await Promise.all(
      revisions.map((rev) =>
        client.documentControlRevision.update({
          where: { id: rev.id },
          data: { spFolderPath: pathBuilder(rev.revision) },
        }),
      ),
    );
  }

  async obsoleteAndCreateRevision(
    documentControlId: string,
    revisionData: Prisma.DocumentControlRevisionUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.documentControlRevision.updateMany({
      where: { documentControlId },
      data: { status: 'OBSOLETE' },
    });
    await tx.documentControlRevision.create({ data: revisionData });
  }

  async updateCategoryDocumentPaths(
    categoryId: string,
    deptName: string,
    newCategoryName: string,
    buildDocPath: (deptName: string, categoryName: string, docNumber: string) => string,
    buildRevPath: (deptName: string, categoryName: string, docNumber: string, revision: string) => string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const docs = await tx.documentControl.findMany({
      where: { categoryId },
      select: { id: true, docNumber: true },
    });

    await Promise.all(
      docs.map(async (doc) => {
        const newDocPath = buildDocPath(deptName, newCategoryName, doc.docNumber);
        await tx.documentControl.update({
          where: { id: doc.id },
          data: { spFolderPath: newDocPath },
        });
        const revisions = await tx.documentControlRevision.findMany({
          where: { documentControlId: doc.id },
          select: { id: true, revision: true },
        });
        await Promise.all(
          revisions.map((rev) =>
            tx.documentControlRevision.update({
              where: { id: rev.id },
              data: { spFolderPath: buildRevPath(deptName, newCategoryName, doc.docNumber, rev.revision) },
            }),
          ),
        );
      }),
    );
  }
}
