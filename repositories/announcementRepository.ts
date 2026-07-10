import { BaseRepository } from "./baseRepository";
import { Announcement, Prisma } from "@/generated/prisma/client";

export class AnnouncementRepository extends BaseRepository<Announcement> {
  constructor() {
    super("announcement");
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).announcement;
  }

  async findManyWithCreatedBy(tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        sourceSystem: true,
        displayType: true,
        pushToCompanyCenter: true,
        status: true,
        startDate: true,
        endDate: true,
        expiryDate: true,
        fileName: true,
        spItemId: true,
        spWebUrl: true,
        spDownloadUrl: true,
        bgColor: true,
        bgImageUrl: true,
        bgImageSpId: true,
        textColor: true,
        createdById: true,
        createdByAuthUserId: true,
        createdByName: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByIdWithCreatedBy(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
        sourceSystem: true,
        displayType: true,
        pushToCompanyCenter: true,
        status: true,
        startDate: true,
        endDate: true,
        expiryDate: true,
        fileName: true,
        spItemId: true,
        spWebUrl: true,
        spDownloadUrl: true,
        bgColor: true,
        bgImageUrl: true,
        bgImageSpId: true,
        textColor: true,
        createdById: true,
        createdByAuthUserId: true,
        createdByName: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findManyScrollingOrList(
    where: Prisma.AnnouncementWhereInput,
    take: number,
    tx?: Prisma.TransactionClient
  ) {
    return this.delegate(tx).findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  async findActivePublic(now: Date, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where: {
        status: "ACTIVE",
        pushToCompanyCenter: true,
        OR: [{ startDate: null }, { startDate: { lte: now } }],
        AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        sourceSystem: true,
        displayType: true,
        startDate: true,
        endDate: true,
        fileName: true,
        spWebUrl: true,
        bgColor: true,
        textColor: true,
        createdAt: true,
        createdByName: true,
      },
    });
  }

  async findActiveTicker(now: Date, take: number, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where: {
        displayType: "SCROLLING",
        OR: [{ startDate: null }, { startDate: { lte: now } }],
        AND: [
          { OR: [{ endDate: null }, { endDate: { gte: now } }] },
          { OR: [{ expiryDate: null }, { expiryDate: { gte: now } }] },
        ],
      },
      select: { id: true, title: true, sourceSystem: true },
      take,
    });
  }
}
