import { db } from "@/lib/db";
import { BaseRepository } from "../baseRepository";
import { AuditFinding, FindingStatus, Prisma } from "@/generated/prisma/client";

export class AuditFindingRepository extends BaseRepository<AuditFinding> {
  constructor() {
    super("auditFinding");
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).auditFinding;
  }

  async findByPlanId(planId: string, status?: FindingStatus, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({
      where: { planId, ...(status ? { status } : {}) },
      include: { correctiveAction: true, verification: true },
      orderBy: { findingNo: "asc" },
    });
  }

  async findDetailById(id: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findUnique({
      where: { id },
      include: { correctiveAction: true, verification: true },
    });
  }

  async countByPlanAndStatus(planId: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).groupBy({
      by: ["status"],
      where: { planId },
      _count: { status: true },
    });
  }

  /**
   * Atomically increment and return the next finding sequence number for a plan.
   * Uses SystemConfig INSERT ON CONFLICT — same strategy as CarSequenceRepository.
   * Call inside the same transaction as the finding create to ensure atomicity.
   */
  async nextFindingNo(planId: string, tx?: Prisma.TransactionClient): Promise<string> {
    const client = tx ?? db;
    const existing = await client.$queryRaw<{ seq: number }[]>`
      SELECT CAST(finding_no AS INTEGER) AS seq
      FROM audit_findings
      WHERE plan_id = ${planId}
      ORDER BY seq
    `;
    const used = new Set(existing.map((r) => r.seq));
    let next = 1;
    while (used.has(next)) next++;
    return String(next).padStart(3, "0");
  }

  async updateStatus(id: string, status: FindingStatus, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).update({ where: { id }, data: { status } });
  }
}
