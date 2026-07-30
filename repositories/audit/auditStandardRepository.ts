import { BaseRepository } from "../baseRepository";
import { AuditStandard, Prisma } from "@/generated/prisma/client";

export class AuditStandardRepository extends BaseRepository<AuditStandard> {
  constructor() {
    super("auditStandard");
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).auditStandard;
  }

  async findAll(tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    });
  }

  async createOne(name: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).create({ data: { name } });
  }

  async updateName(id: string, name: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).update({ where: { id }, data: { name } });
  }

  async deleteOne(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).delete({ where: { id } });
  }
}
