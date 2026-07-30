import { AnnouncementRepository } from "@/repositories/announcementRepository";
import { NotFoundError } from "@/errors/customErrors";
import { redis } from "@/lib/redis";

export type AnnouncementRow = {
  id: string;
  title: string;
  content: string;
  sourceSystem: string;
  displayType: string;
  pushToCompanyCenter: boolean;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  fileName: string | null;
  spWebUrl: string | null;
  spItemId?: string | null;
  spDownloadUrl?: string | null;
  mimeType?: string | null;
  bgColor: string | null;
  bgImageUrl: string | null;
  bgImageSpId: string | null;
  textColor: string | null;
  createdAt: Date;
  createdByName: string | null;
};

export type CreateAnnouncementInput = {
  title: string;
  content: string;
  sourceSystem?: string;
  displayType?: string;
  pushToCompanyCenter?: boolean;
  startDate?: Date | null;
  endDate?: Date | null;
  expiryDate?: Date | null;
  spItemId?: string | null;
  spWebUrl?: string | null;
  spDownloadUrl?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  bgColor?: string | null;
  bgImageUrl?: string | null;
  bgImageSpId?: string | null;
  textColor?: string | null;
};

export type UpdateAnnouncementInput = {
  title: string;
  content: string;
  sourceSystem: string;
  displayType: string;
  pushToCompanyCenter: boolean;
  startDate: Date | null;
  endDate: Date | null;
  bgColor?: string | null;
  bgImageUrl?: string | null;
  bgImageSpId?: string | null;
  textColor?: string | null;
};

export class AnnouncementService {
  private announceRepo = new AnnouncementRepository();

  private static readonly LIST_KEY = "qms:announcements:list";
  private static readonly LIST_TTL = 60; // 1 minute

  private async invalidateListCache(): Promise<void> {
    try {
      await redis.del(AnnouncementService.LIST_KEY);
    } catch {
      // Non-fatal
    }
  }

  async listAnnouncements(): Promise<AnnouncementRow[]> {
    try {
      const cached = await redis.get(AnnouncementService.LIST_KEY);
      if (cached) return JSON.parse(cached) as AnnouncementRow[];
    } catch {
      // Redis unavailable — fall through to DB
    }

    const rows = await this.announceRepo.findManyWithCreatedBy();

    try {
      await redis.set(
        AnnouncementService.LIST_KEY,
        JSON.stringify(rows),
        "EX",
        AnnouncementService.LIST_TTL
      );
    } catch {
      // Cache write failure is non-fatal
    }

    return rows as AnnouncementRow[];
  }

  async getAnnouncement(id: string): Promise<AnnouncementRow> {
    const row = await this.announceRepo.findByIdWithCreatedBy(id);
    if (!row) throw new NotFoundError("Announcement not found");
    return row as AnnouncementRow;
  }

  async createAnnouncement(data: CreateAnnouncementInput, createdById: string, createdByAuthUserId?: string | null, createdByName?: string | null): Promise<{ id: string }> {
    const newAnn = await this.announceRepo.create({
      ...data,
      createdById,
      createdByAuthUserId: createdByAuthUserId ?? null,
      createdByName: createdByName ?? null,
    });
    await this.invalidateListCache();
    return { id: newAnn.id };
  }

  async updateAnnouncement(id: string, data: UpdateAnnouncementInput): Promise<{ id: string }> {
    const existing = await this.announceRepo.findById(id);
    if (!existing) throw new NotFoundError("Announcement not found");
    const updated = await this.announceRepo.update(id, data);
    await this.invalidateListCache();
    return { id: updated.id };
  }

  async toggleAnnouncementActive(id: string, active: boolean): Promise<{ id: string }> {
    const existing = await this.announceRepo.findById(id);
    if (!existing) throw new NotFoundError("Announcement not found");
    const updated = await this.announceRepo.update(id, { status: active ? "ACTIVE" : "INACTIVE" });
    await this.invalidateListCache();
    return { id: updated.id };
  }

  async deleteAnnouncement(id: string): Promise<void> {
    const existing = await this.announceRepo.findById(id);
    if (!existing) throw new NotFoundError("Announcement not found");
    await this.announceRepo.delete(id);
    await this.invalidateListCache();
  }
}
