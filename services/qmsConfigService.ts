import { SystemConfigRepository } from "@/repositories/systemConfigRepository";
import { db } from "@/lib/db";

export interface FooterConfig {
  moduleKey: string;
  prefix: string;
  label: string;
}

export interface ExportNamingMeta {
  moduleKey: string;
  prefix: string;
  label: string;
  worksheetName: string;
  fileBaseName: string;
}

export class QmsConfigService {
  private configRepo = new SystemConfigRepository();

  private getKeys(moduleKey: string) {
    const key = moduleKey.toUpperCase();
    return {
      prefixKey: `${key}_FOOTER_PREFIX`,
      labelKey: `${key}_FOOTER_LABEL`,
    };
  }

  async getFooterConfigs(modules: string[]): Promise<FooterConfig[]> {
    const results = await Promise.all(
      modules.map(async (mod) => {
        const { prefixKey, labelKey } = this.getKeys(mod);
        const [prefix, label] = await Promise.all([
          this.configRepo.findValueByKey(prefixKey),
          this.configRepo.findValueByKey(labelKey),
        ]);
        return {
          moduleKey: mod,
          prefix: prefix ?? "",
          label: label ?? "",
        };
      })
    );
    return results;
  }

  async getSingleFooterConfig(moduleKey: string): Promise<FooterConfig> {
    const { prefixKey, labelKey } = this.getKeys(moduleKey);
    const [prefix, label] = await Promise.all([
      this.configRepo.findValueByKey(prefixKey),
      this.configRepo.findValueByKey(labelKey),
    ]);
    return {
      moduleKey,
      prefix: prefix ?? "",
      label: label ?? "",
    };
  }

  async getExportNamingMeta(
    moduleKey: string,
    fallback: { label: string; fileBaseName: string; worksheetName?: string },
  ): Promise<ExportNamingMeta> {
    const config = await this.getSingleFooterConfig(moduleKey);
    const label = (config.label || fallback.label).trim();
    const prefix = config.prefix.trim();
    const worksheetSeed = (fallback.worksheetName || label || fallback.label).trim();
    // Export filenames are stable module identifiers. Footer prefix/label are
    // presentation metadata and must not rename downloaded files.
    const filenameSeed = moduleKey.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "_") || fallback.fileBaseName;

    return {
      moduleKey,
      prefix,
      label,
      worksheetName: this.toWorksheetName(worksheetSeed),
      fileBaseName: filenameSeed,
    };
  }

  private toWorksheetName(value: string): string {
    const cleaned = value.replace(/[\\/*?:[\]]/g, " ").replace(/\s+/g, " ").trim();
    return (cleaned || "Export").slice(0, 31);
  }

  private toFileBaseName(value: string): string {
    const cleaned = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");
    return cleaned || "qms-export";
  }

  async updateFooterConfigs(configs: FooterConfig[]) {
    await db.$transaction(async (tx) => {
      for (const config of configs) {
        const { prefixKey, labelKey } = this.getKeys(config.moduleKey);
        await this.configRepo.upsertConfigWithDescription(
          prefixKey,
          config.prefix || "",
          `Footer prefix for ${config.moduleKey}`,
          tx
        );
        await this.configRepo.upsertConfigWithDescription(
          labelKey,
          config.label || "",
          `Footer label for ${config.moduleKey}`,
          tx
        );
      }
    });
  }
}
