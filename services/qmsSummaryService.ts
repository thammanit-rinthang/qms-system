import { QmsSummaryRepository } from "@/repositories/qmsSummaryRepository";
import type { DarStatus, CarStatus, FindingCategory, FindingStatus, AchievedStatus } from "@/generated/prisma/client";

export interface SummaryDarItem {
  id: string;
  requestDate: Date;
  status: DarStatus;
  docType: string;
  objective: string;
  requesterDepartmentName: string | null;
  authDepartmentId: string | null;
  departmentId: string;
}

export interface SummaryCarItem {
  id: string;
  issuedAt: Date | null;
  createdAt: Date;
  status: CarStatus;
  targetDepartmentName: string | null;
  targetAuthDepartmentId: string | null;
  responseDueAt: Date | null;
}

export interface SummaryKpiItem {
  id: string;
  actualResult: number | null;
  achievedStatus: AchievedStatus;
  kpiObjective: {
    target: number;
    unit: string | null;
    objective: string;
  };
  monthlyReport: {
    month: string;
    year: number;
    kpi: {
      department: string;
    };
  };
}

export interface SummaryAuditFindingItem {
  id: string;
  createdAt: Date;
  category: FindingCategory;
  status: FindingStatus;
  departmentId: string | null;
}

export interface SummaryDeptCode {
  authDeptId: string;
  departmentName: string;
  code: string;
}

export interface SummaryKpiDept {
  name: string;
  authDeptCode: string | null;
}

export interface SummaryDocDept {
  name: string;
  authDeptCode: string | null;
}

export interface QmsPendingCountSummary {
  pendingCount: number;
  pendingDarCount: number;
  pendingCarCount: number;
}

export interface QmsSummaryData extends QmsPendingCountSummary {
  dars: SummaryDarItem[];
  cars: SummaryCarItem[];
  kpis: SummaryKpiItem[];
  auditFindings: SummaryAuditFindingItem[];
  deptCodes: SummaryDeptCode[];
  kpiDepts: SummaryKpiDept[];
  docDepts: SummaryDocDept[];
}

export class QmsSummaryService {
  private summaryRepo = new QmsSummaryRepository();

  private isPendingDarStatus(status: DarStatus): boolean {
    return status !== "COMPLETED" && status !== "CANCELLED";
  }

  private isPendingCarStatus(status: CarStatus): boolean {
    return status !== "CLOSED" && status !== "CANCELLED";
  }

  async getSummaryData(): Promise<QmsSummaryData> {
    const [dars, cars, kpis, auditFindings, deptCodes, kpiDepts, docDepts] =
      await this.summaryRepo.getSummaryData();

    const pendingDarCount = (dars as Array<{ status: DarStatus }>).filter((d) =>
      this.isPendingDarStatus(d.status)
    ).length;
    const pendingCarCount = (cars as Array<{ status: CarStatus }>).filter((c) =>
      this.isPendingCarStatus(c.status)
    ).length;
    const pendingCount = pendingDarCount + pendingCarCount;

    return {
      dars: (dars as Array<{
        id: string;
        requestDate: Date;
        status: DarStatus;
        docType: string;
        objective: string;
        requesterDepartmentName: string | null;
        authDepartmentId: string | null;
        departmentId: string;
      }>).map((d) => ({
        id: d.id,
        requestDate: d.requestDate,
        status: d.status,
        docType: d.docType,
        objective: d.objective,
        requesterDepartmentName: d.requesterDepartmentName,
        authDepartmentId: d.authDepartmentId,
        departmentId: d.departmentId,
      })),
      cars: cars as SummaryCarItem[],
      kpis: (kpis as Array<{
        id: string;
        actualResult: number | null;
        achievedStatus: AchievedStatus;
        kpiObjective: {
          target: number;
          unit: string | null;
          objective: string;
        };
        monthlyReport: {
          month: string;
          year: number;
          kpi: {
            department: string;
          };
        };
      }>).map((k) => ({
        id: k.id,
        actualResult: k.actualResult,
        achievedStatus: k.achievedStatus,
        kpiObjective: {
          target: k.kpiObjective.target,
          unit: k.kpiObjective.unit,
          objective: k.kpiObjective.objective,
        },
        monthlyReport: {
          month: k.monthlyReport.month,
          year: k.monthlyReport.year,
          kpi: {
            department: k.monthlyReport.kpi.department,
          },
        },
      })),
      auditFindings: auditFindings as SummaryAuditFindingItem[],
      deptCodes: deptCodes as SummaryDeptCode[],
      kpiDepts: kpiDepts as SummaryKpiDept[],
      docDepts: docDepts as SummaryDocDept[],
      pendingCount,
      pendingDarCount,
      pendingCarCount,
    };
  }

  async getPendingCountSummary(): Promise<QmsPendingCountSummary> {
    const summary = await this.getSummaryData();

    return {
      pendingCount: summary.pendingCount,
      pendingDarCount: summary.pendingDarCount,
      pendingCarCount: summary.pendingCarCount,
    };
  }
}
