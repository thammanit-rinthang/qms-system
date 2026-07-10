import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}

interface ModelDelegate<T, CreateDTO, UpdateDTO> {
  findMany(args?: Record<string, unknown>): Promise<T[]>;
  count(args?: { where?: unknown }): Promise<number>;
  findUnique(args: Record<string, unknown>): Promise<T | null>;
  findFirst(args?: Record<string, unknown>): Promise<T | null>;
  create(args: { data: CreateDTO | Record<string, unknown> }): Promise<T>;
  update(args: { where: Record<string, unknown>; data: UpdateDTO | Record<string, unknown> }): Promise<T>;
  delete(args: { where: { id: string } }): Promise<T>;
  upsert(args: Record<string, unknown>): Promise<T>;
}

export abstract class BaseRepository<T, CreateDTO = unknown, UpdateDTO = unknown> {
  constructor(protected modelName: Uncapitalize<Prisma.ModelName>) {}

  protected getClient(tx?: Prisma.TransactionClient) {
    return tx || db;
  }

  protected getModel(tx?: Prisma.TransactionClient) {
    const client = this.getClient(tx);
    return (client as unknown as Record<string, unknown>)[this.modelName] as ModelDelegate<T, CreateDTO, UpdateDTO>;
  }

  async paginate(
    params: PaginationParams,
    where: unknown = {},
    orderBy: unknown = { createdAt: "desc" },
    tx?: Prisma.TransactionClient
  ): Promise<PaginatedResult<T>> {
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    const model = this.getModel(tx);

    const [data, total] = await Promise.all([
      model.findMany({ where, orderBy, skip, take: limit }),
      model.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<T | null> {
    return this.getModel(tx).findUnique({ where: { id } });
  }

  async create(data: CreateDTO, tx?: Prisma.TransactionClient): Promise<T> {
    return this.getModel(tx).create({ data });
  }

  async update(id: string, data: UpdateDTO, tx?: Prisma.TransactionClient): Promise<T> {
    return this.getModel(tx).update({ where: { id }, data });
  }

  async delete(id: string, tx?: Prisma.TransactionClient): Promise<T> {
    return this.getModel(tx).delete({ where: { id } });
  }
}
