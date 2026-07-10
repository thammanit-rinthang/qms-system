import type { Prisma } from "@/generated/prisma/client";
import { CarRepository } from "@/repositories/carRepository";

export class CarExportService {
  private repo = new CarRepository();

  async listCars(where: Prisma.CarMasterWhereInput) {
    return this.repo.findForExport(where);
  }
}
