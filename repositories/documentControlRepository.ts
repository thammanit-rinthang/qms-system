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
  distributions: true,
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
      darMasterId: true,
      darMaster: {
        select: {
          id: true,
          darNo: true,
          objective: true,
          requesterName: true,
          requestDate: true,
        },
      },
      distribution: { select: { id: true, linkToDocumentControl: true } },
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

  // --- Revision lookups for the Distribution feature ---
  async findRevisionForDistribution(revisionId: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).documentControlRevision.findUnique({
      where: { id: revisionId },
      select: {
        id: true, documentControlId: true, darMasterId: true, spItemId: true, fileName: true, mimeType: true,
        documentControl: { select: { docNumber: true, docName: true } },
      },
    });
  }

  async findCandidateRevisionsByDarId(
    darId: string,
    filter?: { authDepartmentId?: string | null; departmentName?: string | null; categoryName?: string | null },
    tx?: Prisma.TransactionClient,
  ) {
    const categoryName = filter?.categoryName?.trim();
    const departmentName = filter?.departmentName?.trim();
    const departmentFilter = filter?.authDepartmentId
      ? { OR: [{ authDepartmentId: filter.authDepartmentId }, ...(departmentName ? [{ departmentName }] : [])] }
      : departmentName
        ? { departmentName }
        : undefined;

    return this.getClient(tx).documentControlRevision.findMany({
      where: {
        distribution: null,
        documentControl: {
          ...(departmentFilter ?? {}),
          ...(categoryName ? { category: { name: { equals: categoryName, mode: "insensitive" } } } : {}),
        },
        OR: [{ darMasterId: darId }, { darMasterId: null }],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, revision: true, fileName: true, mimeType: true, createdAt: true,
        darMasterId: true,
        documentControl: { select: { docNumber: true, docName: true, departmentName: true, authDepartmentId: true, category: { select: { name: true } } } },
      },
    });
  }

  async findRevisionWithDocument(revisionId: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).documentControlRevision.findUnique({
      where: { id: revisionId },
      select: { id: true, documentControlId: true, darMasterId: true, spDriveId: true, spItemId: true, spWebUrl: true, spDownloadUrl: true, spFolderPath: true, fileName: true, fileSize: true, mimeType: true, revision: true, documentControl: { select: { docNumber: true, docName: true, departmentId: true, authDepartmentId: true, departmentName: true, categoryId: true } } },
    });
  }

  async findRevisionsForDocument(documentControlId: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).documentControlRevision.findMany({
      where: { documentControlId },
      select: { revision: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async deleteRevision(documentControlId: string, revisionId: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).documentControlRevision.delete({
      where: { id: revisionId, documentControlId },
    });
  }

  async findDocControlDepartment(authDepartmentId: string | null, departmentName: string | null, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).docControlDept.findFirst({ where: { OR: [{ authDeptCode: authDepartmentId ?? "" }, { name: departmentName ?? "" }] } });
  }

  async findCategoryByDepartmentAndName(departmentId: string, name: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).documentCategory.findFirst({ where: { departmentId, name: { equals: name, mode: "insensitive" } } });
  }

  async findOrCreateCategory(departmentId: string, name: string, departmentName: string, authDepartmentId: string | null, tx?: Prisma.TransactionClient) {
    const existing = await this.findCategoryByDepartmentAndName(departmentId, name, tx);
    return existing ?? this.getClient(tx).documentCategory.create({ data: { departmentId, name, departmentName, authDepartmentId, description: "สร้างจาก Distribution setup" } });
  }

  async linkRevisionToDar(revisionId: string, darId: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).documentControlRevision.update({ where: { id: revisionId }, data: { darMasterId: darId } });
  }

  async createDocumentFromDar(data: { docNumber: string; docName: string; revision: string; description: string; departmentId: string; authDepartmentId: string | null; departmentName: string; categoryId: string; createdById: string; createdByAuthUserId: string | null; createdByName: string | null; spDriveId: string | null; spItemId: string; spWebUrl: string | null; fileName: string; mimeType: string }, darId: string, tx: Prisma.TransactionClient) {
    const doc = await tx.documentControl.create({ data: { ...data, status: "ACTIVE" } });
    return tx.documentControlRevision.create({ data: { documentControlId: doc.id, revision: data.revision, status: "ACTIVE", spDriveId: data.spDriveId, spItemId: data.spItemId, spWebUrl: data.spWebUrl, fileName: data.fileName, mimeType: data.mimeType, createdById: data.createdById, createdByAuthUserId: data.createdByAuthUserId, createdByName: data.createdByName, darMasterId: darId } });
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

  async findForExport(where: Prisma.DocumentControlWhereInput = {}, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where,
      orderBy: [
        { departmentName: 'asc' },
        { category: { name: 'asc' } },
        { docNumber: 'asc' },
      ],
      select: {
        id: true,
        docNumber: true,
        docName: true,
        revision: true,
        description: true,
        status: true,
        effectiveDate: true,
        createdByName: true,
        createdAt: true,
        departmentName: true,
        distributions: true,
        category: { select: { name: true } },
        revisions: {
          orderBy: { createdAt: 'desc' },
          select: {
            revision: true,
            status: true,
            effectiveDate: true,
            createdAt: true,
            createdByName: true,
            darMaster: {
              select: {
                darNo: true,
                objective: true,
                requestDate: true,
                requesterName: true,
                distributions: {
                  select: {
                    departmentName: true,
                    authDepartmentId: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }
}
