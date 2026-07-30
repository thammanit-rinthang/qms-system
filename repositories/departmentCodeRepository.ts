import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export class DepartmentCodeRepository {
  private delegate(tx?: Prisma.TransactionClient) {
    return (tx ?? db).departmentCode;
  }

  findAll(tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({ orderBy: { departmentName: "asc" } });
  }

  findByAuthDeptId(authDeptId: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({ where: { authDeptId } });
  }

  findById(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({ where: { id } });
  }

  upsert(data: { authDeptId: string; departmentName: string; code: string }, tx?: Prisma.TransactionClient) {
    // authDeptId is the only @unique key now — standard Prisma upsert is safe (no multi-unique race condition)
    return this.delegate(tx).upsert({
      where:  { authDeptId: data.authDeptId },
      create: data,
      update: { departmentName: data.departmentName, code: data.code },
    });
  }

  delete(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).delete({ where: { id } });
  }
}
