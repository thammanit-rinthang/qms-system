import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export class CarSequenceRepository {
  // Find the lowest sequence number not already in use for this year (gap-fill).
  // Uses pg_try_advisory_xact_lock to serialize concurrent creates within the same year.
  async nextSequence(year: number, tx?: Prisma.TransactionClient): Promise<number> {
    // Lock and read must share the same transaction — pg_advisory_xact_lock is transaction-scoped
    const run = async (client: Prisma.TransactionClient) => {
      const lockKey = BigInt(0x43415253) * BigInt(10000) + BigInt(year % 10000);
      await client.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey}::bigint)`;
      const existing = await client.$queryRaw<{ seq: number }[]>`
        SELECT "sequenceNo" AS seq
        FROM "CarMaster"
        WHERE "carYear" = ${year}
        ORDER BY "sequenceNo"
      `;
      const used = new Set(existing.map((r) => Number(r.seq)));
      let next = 1;
      while (used.has(next)) next++;
      return next;
    };
    return tx ? run(tx) : db.$transaction(run);
  }

  async previewNext(year: number): Promise<number> {
    const existing = await db.$queryRaw<{ seq: number }[]>`
      SELECT "sequenceNo" AS seq
      FROM "CarMaster"
      WHERE "carYear" = ${year}
      ORDER BY "sequenceNo"
    `;
    const used = new Set(existing.map((r) => Number(r.seq)));
    let next = 1;
    while (used.has(next)) next++;
    return next;
  }
}
