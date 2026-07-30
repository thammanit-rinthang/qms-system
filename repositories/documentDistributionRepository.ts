import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export class DocumentDistributionRepository {
  private delegate(tx?: Prisma.TransactionClient) {
    return (tx ?? db).documentDistribution;
  }

  private targetDelegate(tx?: Prisma.TransactionClient) {
    return (tx ?? db).documentDistributionTarget;
  }

  findByRevisionId(revisionId: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({ where: { revisionId } });
  }

  create(
    data: Prisma.DocumentDistributionUncheckedCreateInput & {
      targets: Prisma.DocumentDistributionTargetUncheckedCreateWithoutDistributionInput[];
    },
    tx?: Prisma.TransactionClient,
  ) {
    const { targets, ...rest } = data;
    return this.delegate(tx).create({
      data: { ...rest, targets: { createMany: { data: targets } } },
      include: { targets: true },
    });
  }

  findManyByDarId(darMasterId: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where: { darMasterId },
      orderBy: { publishedAt: "desc" },
      include: { targets: true },
    });
  }

  findAllRecent(take = 100, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      orderBy: { publishedAt: "desc" },
      take,
      include: {
        targets: true,
        darMaster: { select: { darNo: true } },
        revision: { include: { documentControl: { select: { docNumber: true, docName: true } } } },
      },
    });
  }

  findById(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      include: {
        targets: true,
        revision: { include: { documentControl: { select: { docNumber: true, docName: true } } } },
        darMaster: { select: { darNo: true } },
      },
    });
  }

  update(id: string, data: Prisma.DocumentDistributionUncheckedUpdateInput, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).update({
      where: { id },
      data,
      include: { targets: true },
    });
  }

  delete(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).delete({ where: { id } });
  }

  deletePendingTargetsNotIn(distributionId: string, departmentIds: string[], tx?: Prisma.TransactionClient) {
    return this.targetDelegate(tx).deleteMany({
      where: {
        distributionId,
        departmentId: { notIn: departmentIds },
        downloadedAt: null,
      },
    });
  }

  createTargets(distributionId: string, targets: { departmentId: string; departmentCode: string; departmentName: string }[], tx?: Prisma.TransactionClient) {
    if (!targets.length) return Promise.resolve({ count: 0 });
    return this.targetDelegate(tx).createMany({
      data: targets.map((target) => ({ distributionId, ...target })),
      skipDuplicates: true,
    });
  }

  findTarget(distributionId: string, departmentId: string, tx?: Prisma.TransactionClient) {
    return this.targetDelegate(tx).findUnique({
      where: { distributionId_departmentId: { distributionId, departmentId } },
    });
  }

  addTarget(
    distributionId: string,
    target: { departmentId: string; departmentCode: string; departmentName: string },
    tx?: Prisma.TransactionClient,
  ) {
    return this.targetDelegate(tx).create({ data: { distributionId, ...target } });
  }

  // Conditional update (only when not yet downloaded) so two concurrent requests
  // from the same department can't both win the one-download-per-revision limit.
  async claimTargetDownload(
    id: string,
    data: { downloadedById: string; downloadedByName: string | null; finalPdfSpItemId: string; finalPdfSpWebUrl: string },
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const result = await this.targetDelegate(tx).updateMany({
      where: { id, downloadedAt: null },
      data: { ...data, downloadedAt: new Date() },
    });
    return result.count > 0;
  }
}
