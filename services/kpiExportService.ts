import type { Prisma } from "@/generated/prisma/client";
import { KpiMonthlyReportRepository } from "@/repositories/kpiMonthlyReportRepository";
import { KpiRepository } from "@/repositories/kpiRepository";

export class KpiExportService {
  private kpiRepo = new KpiRepository();
  private monthlyRepo = new KpiMonthlyReportRepository();

  async listKpis(where: Prisma.KPIWhereInput) {
    return this.kpiRepo.findForExport(where);
  }

  async listMonthlyReports(where: Prisma.KPIMonthlyReportWhereInput) {
    return this.monthlyRepo.findForExport(where);
  }
}
