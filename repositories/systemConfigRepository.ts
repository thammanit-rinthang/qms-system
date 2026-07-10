import { BaseRepository } from "./baseRepository";
import { SystemConfig, Prisma } from "@/generated/prisma/client";

export class SystemConfigRepository extends BaseRepository<SystemConfig> {
  constructor() {
    super("systemConfig");
  }

  private delegate(tx?: Prisma.TransactionClient) {
    return this.getClient(tx).systemConfig;
  }

  async findValueByKey(configKey: string, tx?: Prisma.TransactionClient): Promise<string | null> {
    const row = await this.delegate(tx).findUnique({
      where: { configKey },
      select: { configValue: true },
    });
    return row?.configValue ?? null;
  }

  async upsertConfig(
    configKey: string,
    configValue: string,
    description?: string,
    tx?: Prisma.TransactionClient
  ): Promise<SystemConfig> {
    return this.delegate(tx).upsert({
      where: { configKey },
      update: { configValue },
      create: { configKey, configValue, description },
    });
  }

  async upsertConfigWithDescription(
    configKey: string,
    configValue: string,
    description: string,
    tx?: Prisma.TransactionClient
  ): Promise<SystemConfig> {
    return this.delegate(tx).upsert({
      where: { configKey },
      update: { configValue, description },
      create: { configKey, configValue, description },
    });
  }

  async deleteByKey(configKey: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).deleteMany({ where: { configKey } });
  }

  async deleteByKeyAndValue(configKey: string, configValue: string, tx?: Prisma.TransactionClient) {
    return this.delegate(tx).deleteMany({ where: { configKey, configValue } });
  }

  async findManyByKeys(configKeys: string[], tx?: Prisma.TransactionClient) {
    return this.delegate(tx).findMany({ where: { configKey: { in: configKeys } } });
  }
}
