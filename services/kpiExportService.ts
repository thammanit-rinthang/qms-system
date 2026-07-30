import type { Prisma } from "@/generated/prisma/client";
import { KpiMonthlyReportRepository } from "@/repositories/kpiMonthlyReportRepository";
import { KpiRepository } from "@/repositories/kpiRepository";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

export interface KpiYearlyPreviewRow {
  no: number;
  objective: string;
  target: string;
  frequency: string;
  team: string;
  unit: string | null;
  months: Array<{
    key: (typeof MONTHS)[number];
    value: string;
    numericValue: number | null;
    status: "achieved" | "failed" | "pending";
  }>;
  average: string;
  averageNumericValue: number | null;
}

export interface KpiYearlyPreviewData {
  year: number;
  yearBE: number;
  nextYear: number;
  generatedAt: string;
  rows: KpiYearlyPreviewRow[];
}

export class KpiExportService {
  private kpiRepo = new KpiRepository();
  private monthlyRepo = new KpiMonthlyReportRepository();

  async listKpis(where: Prisma.KPIWhereInput) {
    return this.kpiRepo.findForExport(where);
  }

  async listMonthlyReports(where: Prisma.KPIMonthlyReportWhereInput) {
    return this.monthlyRepo.findForExport(where);
  }

  async getYearlyPreview(input: { year: number; kpiId?: string; department?: string }): Promise<KpiYearlyPreviewData> {
    const kpiWhere: Prisma.KPIWhereInput = {
      yearly: input.year,
      department: { not: "SYSTEM_MASTER" },
      ...(input.kpiId ? { id: input.kpiId } : {}),
      ...(!input.kpiId && input.department ? { department: input.department } : {}),
    };

    const monthlyWhere: Prisma.KPIMonthlyReportWhereInput = {
      year: input.year,
      kpi: {
        department: { not: "SYSTEM_MASTER" },
        ...(input.kpiId ? { id: input.kpiId } : {}),
        ...(!input.kpiId && input.department ? { department: input.department } : {}),
      },
    };

    const [kpis, reports] = await Promise.all([
      this.listKpis(kpiWhere),
      this.listMonthlyReports(monthlyWhere),
    ]);

    const reportMap = new Map<string, Map<string, number>>();
    for (const report of reports) {
      for (const detail of report.details) {
        if (detail.actualResult === null) continue;
        const key = `${report.kpiId}:${detail.kpiObjectiveId}`;
        const months = reportMap.get(key) ?? new Map<string, number>();
        months.set(report.month, detail.actualResult);
        reportMap.set(key, months);
      }
    }

    const rows: KpiYearlyPreviewRow[] = [];
    let no = 1;

    for (const kpi of kpis) {
      for (const objective of kpi.objectives) {
        const key = `${kpi.id}:${objective.id}`;
        const monthlyValues = reportMap.get(key) ?? new Map<string, number>();
        const unit = objective.unit ?? null;
        const monthCells = MONTHS.map((month) => {
          const numericValue = monthlyValues.get(month) ?? null;
          return {
            key: month,
            numericValue,
            value: this.formatMetric(numericValue, unit),
            status: this.getMetricStatus(numericValue, objective.target),
          };
        });

        const actualNumbers = monthCells
          .map((month) => month.numericValue)
          .filter((value): value is number => value !== null);

        const averageNumericValue = actualNumbers.length > 0
          ? actualNumbers.reduce((sum, value) => sum + value, 0) / actualNumbers.length
          : null;

        rows.push({
          no,
          objective: objective.objective,
          target: this.formatTarget(objective.target, unit),
          frequency: this.formatFrequency(objective.frequency),
          team: kpi.department,
          unit,
          months: monthCells,
          average: this.formatMetric(averageNumericValue, unit),
          averageNumericValue,
        });
        no += 1;
      }
    }

    return {
      year: input.year,
      yearBE: input.year + 543,
      nextYear: input.year + 1,
      generatedAt: new Date().toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok" }),
      rows,
    };
  }

  private isPercentUnit(unit: string | null | undefined) {
    if (!unit) return false;
    const normalized = unit.trim().toLowerCase();
    return normalized === "%" || normalized === "percent";
  }

  private formatTarget(target: number, unit: string | null | undefined) {
    return unit?.trim() ? `${target} ${unit.trim()}` : String(target);
  }

  private formatFrequency(value: string) {
    const normalized = value.trim().toUpperCase();
    switch (normalized) {
      case "MONTHLY":
        return "Per month";
      case "QUARTERLY":
        return "Per quarter";
      case "SEMI_ANNUALLY":
        return "Semi-annually";
      case "ANNUALLY":
        return "Per year";
      default:
        return value;
    }
  }

  private formatMetric(value: number | null, unit: string | null | undefined) {
    if (value === null) return "-";
    if (this.isPercentUnit(unit) && value >= 0 && value <= 1) {
      return `${(value * 100).toFixed(2)}%`;
    }
    if (Number.isInteger(value)) {
      return String(value);
    }
    return value.toFixed(2);
  }

  private getMetricStatus(value: number | null, target: number): "achieved" | "failed" | "pending" {
    if (value === null) return "pending";
    return value >= target ? "achieved" : "failed";
  }
}
