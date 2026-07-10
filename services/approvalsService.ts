import { DarRepository } from "@/repositories/darRepository";
import { CarRepository } from "@/repositories/carRepository";
import { KpiMonthlyReportRepository } from "@/repositories/kpiMonthlyReportRepository";
import { KpiRepository } from "@/repositories/kpiRepository";
import { AuditPlanRepository } from "@/repositories/audit/auditPlanRepository";
import { AuditAppointmentRepository } from "@/repositories/audit/auditAppointmentRepository";
import type { UserRole } from "@/generated/prisma/client";

type PendingDarItem = {
  darId: string;
  darNo: string | null;
  status: string;
  requestDate: string;
  requesterName: string | null;
  stepRole: string;
};

type PendingKpiItem = {
  id: string;
  kpiId: string;
  department: string;
  month: string | null;
  year: number;
  status: string;
  source: "OBJECTIVE" | "MONTHLY";
};

type PendingCarItem = {
  id: string;
  carNo: string;
  status: string;
  targetDepartment: string | null;
  defectDetail: string;
  issuedAt: string | null;
  responseDueAt: string | null;
  updatedAt: string;
  actionType: "MR_REVIEW" | "MR_SIGN";
};

type PendingAuditItem = {
  id: string;
  auditNo: string;
  title: string;
  auditType: string;
  status: string;
  updatedAt: string;
};

type PendingAppointmentItem = {
  id: string;
  appointmentNo: string;
  title: string;
  year: number;
  status: string;
  updatedAt: string;
  actionType: "REVIEW" | "APPROVE";
};

export type PendingApprovalSummary = {
  totalPending: number;
  pendingDarCount: number;
  pendingKpiReviewCount: number;
  pendingKpiApproveCount: number;
  pendingCarReviewCount: number;
  pendingCarSignCount: number;
  pendingAuditReviewCount: number;
  pendingAuditApproveCount: number;
  pendingAppointmentReviewCount: number;
  pendingAppointmentApproveCount: number;
  pendingDarItems: PendingDarItem[];
  pendingKpiReviewItems: PendingKpiItem[];
  pendingKpiApproveItems: PendingKpiItem[];
  pendingCarReviewItems: PendingCarItem[];
  pendingCarSignItems: PendingCarItem[];
  pendingAuditReviewItems: PendingAuditItem[];
  pendingAuditApproveItems: PendingAuditItem[];
  pendingAppointmentReviewItems: PendingAppointmentItem[];
  pendingAppointmentApproveItems: PendingAppointmentItem[];
};

export class ApprovalsService {
  private darRepo = new DarRepository();
  private carRepo = new CarRepository();
  private kpiMonthlyRepo = new KpiMonthlyReportRepository();
  private kpiRepo = new KpiRepository();
  private auditPlanRepo = new AuditPlanRepository();
  private auditApptRepo = new AuditAppointmentRepository();

  async getPendingSummaryForUser(
    userId: string,
    authUserId?: string | null,
    role?: UserRole,
  ): Promise<PendingApprovalSummary> {
    const shouldLoadMrQueue = role === "MR";
    // session.user.id IS the authUserId — use it as fallback when authUserId alias is not in token
    const auditId = authUserId ?? userId;
    const [
      pendingDarCount,
      pendingDarItemsRaw,
      pendingKpiMonthlyReviewCount,
      pendingKpiMonthlyApproveCount,
      pendingKpiMonthlyReviewRaw,
      pendingKpiMonthlyApproveRaw,
      pendingKpiObjectiveReviewCount,
      pendingKpiObjectiveApproveCount,
      pendingKpiObjectiveReviewRaw,
      pendingKpiObjectiveApproveRaw,
      pendingCarReviewCount,
      pendingCarSignCount,
      pendingCarReviewItemsRaw,
      pendingCarSignItemsRaw,
      pendingAuditReviewCount,
      pendingAuditApproveCount,
      pendingAuditReviewRaw,
      pendingAuditApproveRaw,
      pendingAppointmentReviewCount,
      pendingAppointmentApproveCount,
      pendingAppointmentReviewRaw,
      pendingAppointmentApproveRaw,
    ] = await Promise.all([
      this.darRepo.countPendingApprovalsByUser(userId, authUserId),
      this.darRepo.findPendingApprovalsByUser(userId, authUserId, 10),
      this.kpiMonthlyRepo.countPendingReviewByUser(userId),
      this.kpiMonthlyRepo.countPendingApproveByUser(userId),
      this.kpiMonthlyRepo.findPendingReviewByUser(userId, 10),
      this.kpiMonthlyRepo.findPendingApproveByUser(userId, 10),
      this.kpiRepo.countPendingReviewByUser(userId),
      this.kpiRepo.countPendingApproveByUser(userId),
      this.kpiRepo.findPendingReviewByUser(userId, 10),
      this.kpiRepo.findPendingApproveByUser(userId, 10),
      shouldLoadMrQueue ? this.carRepo.countPendingMrResponseReviews() : Promise.resolve(0),
      shouldLoadMrQueue ? this.carRepo.countPendingMrSignatures() : Promise.resolve(0),
      shouldLoadMrQueue ? this.carRepo.findPendingMrResponseReviews(10) : Promise.resolve([]),
      shouldLoadMrQueue ? this.carRepo.findPendingMrSignatures(10) : Promise.resolve([]),
      auditId ? this.auditPlanRepo.countPendingReviewByUser(auditId) : Promise.resolve(0),
      auditId ? this.auditPlanRepo.countPendingApproveByUser(auditId) : Promise.resolve(0),
      auditId ? this.auditPlanRepo.findPendingReviewByUser(auditId, 10) : Promise.resolve([]),
      auditId ? this.auditPlanRepo.findPendingApproveByUser(auditId, 10) : Promise.resolve([]),
      auditId ? this.auditApptRepo.countPendingReviewByUser(auditId) : Promise.resolve(0),
      auditId ? this.auditApptRepo.countPendingApproveByUser(auditId) : Promise.resolve(0),
      auditId ? this.auditApptRepo.findPendingReviewByUser(auditId, 10) : Promise.resolve([]),
      auditId ? this.auditApptRepo.findPendingApproveByUser(auditId, 10) : Promise.resolve([]),
    ]);

    const pendingDarItems: PendingDarItem[] = pendingDarItemsRaw.map((row) => ({
      darId: row.darMaster.id,
      darNo: row.darMaster.darNo,
      status: row.darMaster.status,
      requestDate: row.darMaster.requestDate.toISOString(),
      requesterName: row.darMaster.requesterName,
      stepRole: row.stepRole,
    }));

    const monthlyReviewItems: PendingKpiItem[] = pendingKpiMonthlyReviewRaw.map((row) => ({
      id: row.id,
      kpiId: row.kpi.id,
      department: row.kpi.department,
      month: row.month,
      year: row.year,
      status: row.status,
      source: "MONTHLY",
    }));

    const monthlyApproveItems: PendingKpiItem[] = pendingKpiMonthlyApproveRaw.map((row) => ({
      id: row.id,
      kpiId: row.kpi.id,
      department: row.kpi.department,
      month: row.month,
      year: row.year,
      status: row.status,
      source: "MONTHLY",
    }));

    const objectiveReviewItems: PendingKpiItem[] = pendingKpiObjectiveReviewRaw.map((row) => ({
      id: row.id,
      kpiId: row.id,
      department: row.department,
      month: null,
      year: row.yearly,
      status: row.status,
      source: "OBJECTIVE",
    }));

    const objectiveApproveItems: PendingKpiItem[] = pendingKpiObjectiveApproveRaw.map((row) => ({
      id: row.id,
      kpiId: row.id,
      department: row.department,
      month: null,
      year: row.yearly,
      status: row.status,
      source: "OBJECTIVE",
    }));

    const pendingKpiReviewItems = [...objectiveReviewItems, ...monthlyReviewItems];
    const pendingKpiApproveItems = [...objectiveApproveItems, ...monthlyApproveItems];

    const pendingCarReviewItems: PendingCarItem[] = pendingCarReviewItemsRaw.map((row) => ({
      id: row.id,
      carNo: row.carNo,
      status: row.status,
      targetDepartment: row.targetDepartmentName ?? null,
      defectDetail: row.defectDetail,
      issuedAt: row.issuedAt?.toISOString() ?? null,
      responseDueAt: row.responseDueAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
      actionType: "MR_REVIEW",
    }));

    const pendingCarSignItems: PendingCarItem[] = pendingCarSignItemsRaw.map((row) => ({
      id: row.id,
      carNo: row.carNo,
      status: row.status,
      targetDepartment: row.targetDepartmentName ?? null,
      defectDetail: row.defectDetail,
      issuedAt: row.issuedAt?.toISOString() ?? null,
      responseDueAt: row.responseDueAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
      actionType: "MR_SIGN",
    }));

    const pendingKpiReviewCount = pendingKpiObjectiveReviewCount + pendingKpiMonthlyReviewCount;
    const pendingKpiApproveCount = pendingKpiObjectiveApproveCount + pendingKpiMonthlyApproveCount;

    const pendingAuditReviewItems: PendingAuditItem[] = pendingAuditReviewRaw.map((row) => ({
      id: row.id,
      auditNo: row.auditNo,
      title: row.title,
      auditType: row.auditType,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
    }));

    const pendingAuditApproveItems: PendingAuditItem[] = pendingAuditApproveRaw.map((row) => ({
      id: row.id,
      auditNo: row.auditNo,
      title: row.title,
      auditType: row.auditType,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
    }));

    const pendingAppointmentReviewItems: PendingAppointmentItem[] = pendingAppointmentReviewRaw.map((row) => ({
      id: row.id,
      appointmentNo: row.appointmentNo,
      title: row.title,
      year: row.year,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
      actionType: "REVIEW",
    }));

    const pendingAppointmentApproveItems: PendingAppointmentItem[] = pendingAppointmentApproveRaw.map((row) => ({
      id: row.id,
      appointmentNo: row.appointmentNo,
      title: row.title,
      year: row.year,
      status: row.status,
      updatedAt: row.updatedAt.toISOString(),
      actionType: "APPROVE",
    }));

    return {
      totalPending:
        pendingDarCount +
        pendingKpiReviewCount +
        pendingKpiApproveCount +
        pendingCarReviewCount +
        pendingCarSignCount +
        pendingAuditReviewCount +
        pendingAuditApproveCount +
        pendingAppointmentReviewCount +
        pendingAppointmentApproveCount,
      pendingDarCount,
      pendingKpiReviewCount,
      pendingKpiApproveCount,
      pendingCarReviewCount,
      pendingCarSignCount,
      pendingAuditReviewCount,
      pendingAuditApproveCount,
      pendingAppointmentReviewCount,
      pendingAppointmentApproveCount,
      pendingDarItems,
      pendingKpiReviewItems,
      pendingKpiApproveItems,
      pendingCarReviewItems,
      pendingCarSignItems,
      pendingAuditReviewItems,
      pendingAuditApproveItems,
      pendingAppointmentReviewItems,
      pendingAppointmentApproveItems,
    };
  }
}
