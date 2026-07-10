import { BaseRepository } from "./baseRepository";
import { CarAttachment, Prisma } from "@/generated/prisma/client";

export class CarAttachmentRepository extends BaseRepository<CarAttachment> {
  constructor() {
    super("carAttachment");
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).carAttachment;
  }

  async findResponseWithCar(responseId: string, tx?: Prisma.TransactionClient) {
    return this.getClient(tx).carResponse.findUnique({
      where: { id: responseId },
      select: {
        id: true,
        responderId: true,
        carMaster: {
          select: {
            id: true,
            carNo: true,
            status: true,
            targetDepartmentId: true,
            targetAuthDepartmentId: true,
          },
        },
      },
    });
  }

  async createAttachment(data: Prisma.CarAttachmentUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).create({ data });
  }
}
