import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export interface AuditLogFilter {
  action?: string;
  resourceType?: string;
  resourceId?: string;
  actorUserId?: string;
  from?: Date;
  to?: Date;
  search?: string; // matches resourceId or actor name
}

export interface AuditLogRow {
  id: string;
  actorUserId: string;
  actorName: string | null;
  actorEmail: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  before: Prisma.JsonValue;
  after: Prisma.JsonValue;
  metadata: Prisma.JsonValue;
  createdAt: Date;
}

function buildWhere(filter: AuditLogFilter): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};

  if (filter.action) where.action = filter.action;
  if (filter.resourceType) where.resourceType = filter.resourceType;
  if (filter.resourceId) where.resourceId = filter.resourceId;
  if (filter.actorUserId) where.actorUserId = filter.actorUserId;

  if (filter.from || filter.to) {
    where.createdAt = {
      ...(filter.from ? { gte: filter.from } : {}),
      ...(filter.to ? { lte: filter.to } : {}),
    };
  }

  if (filter.search) {
    where.OR = [
      { resourceId: { contains: filter.search, mode: "insensitive" } },
      { actorUserId: { contains: filter.search, mode: "insensitive" } },
    ];
  }

  return where;
}

async function mapRows(
  rows: Awaited<ReturnType<typeof db.auditLog.findMany>>
): Promise<AuditLogRow[]> {
  if (rows.length === 0) return [];

  // User table removed (Phase D) — resolve names from snapshot cache
  const { getUserSnapshot } = await import("@/lib/userSnapshotCache");
  const userIds = [...new Set(rows.map((r) => r.actorUserId))];
  const snapshots = await Promise.all(userIds.map((id) => getUserSnapshot(id)));
  const userMap = new Map(
    userIds.map((id, i) => [id, snapshots[i]])
  );

  return rows.map((r) => {
    const actor = userMap.get(r.actorUserId);
    return {
      ...r,
      actorName: actor?.name ?? null,
      actorEmail: actor?.email ?? r.actorUserId,
    };
  });
}

export class AuditLogRepository {
  async findMany(
    filter: AuditLogFilter,
    page = 1,
    limit = 50,
  ): Promise<{ data: AuditLogRow[]; total: number }> {
    const where = buildWhere(filter);
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ]);

    return { data: await mapRows(rows), total };
  }

  async findAllForExport(filter: AuditLogFilter, maxRows = 10_000): Promise<AuditLogRow[]> {
    const where = buildWhere(filter);
    const rows = await db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: maxRows,
    });
    return mapRows(rows);
  }
}
