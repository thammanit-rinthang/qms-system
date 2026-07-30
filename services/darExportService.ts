import type { Prisma } from "@/generated/prisma/client";
import { DarRepository } from "@/repositories/darRepository";

export class DarExportService {
  private repo = new DarRepository();

  async listDars(where: Prisma.DarMasterWhereInput) {
    return this.repo.findForExport(where);
  }
}
