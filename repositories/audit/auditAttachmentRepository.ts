import { BaseRepository } from "../baseRepository";
import { AuditAttachment, Prisma } from "@/generated/prisma/client";

export class AuditAttachmentRepository extends BaseRepository<AuditAttachment> {
  constructor() {
    super("auditAttachment");
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).auditAttachment;
  }

  async findByResource(resourceType: string, resourceId: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where: { resourceType, resourceId },
      orderBy: { createdAt: "desc" },
    });
  }
}
