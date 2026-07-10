/**
 * Unit tests for KpiService state transitions.
 *
 * All external dependencies (DB, repositories, email, audit, notifications)
 * are mocked so tests run without a database connection.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock all external dependencies before importing the service ───────────────

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({})),
    actionToken: {
      create: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    kpiDept: {
      findFirst: vi.fn().mockResolvedValue({ id: "dept-1", name: "IT", isActive: true }),
    },
  },
}));

vi.mock("@/services/auditService", () => ({
  AuditService: { record: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/services/notificationService", () => ({
  NotificationService: { sendEmailOnce: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/services/email", () => ({
  sendKpiObjectiveReviewerAssignedEmail: vi.fn().mockResolvedValue(undefined),
  sendKpiRecallEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/repositories/kpiRepository");
vi.mock("@/repositories/kpiObjectiveRepository");
vi.mock("@/repositories/kpiMonthlyReportRepository");
vi.mock("@/repositories/kpiMonthlyDetailRepository");
vi.mock("@/repositories/approvalSignatureRepository");
vi.mock("@/repositories/userRepository");

// ── Import after mocks ────────────────────────────────────────────────────────

import { KpiService } from "@/services/kpiService";
import { KpiRepository } from "@/repositories/kpiRepository";
import { KpiMonthlyReportRepository } from "@/repositories/kpiMonthlyReportRepository";
import { KpiMonthlyDetailRepository } from "@/repositories/kpiMonthlyDetailRepository";
import { ApprovalSignatureRepository } from "@/repositories/approvalSignatureRepository";
import { UserRepository } from "@/repositories/userRepository";
import { ConflictError, ForbiddenError, NotFoundError } from "@/errors/customErrors";

// ── Helpers ───────────────────────────────────────────────────────────────────

type MockClass<T> = { mock: { instances: T[] } };

function getInstance<T>(Cls: unknown): T {
  return (Cls as MockClass<T>).mock.instances[0];
}

function makeKpi(overrides: Partial<{
  id: string;
  status: string;
  department: string;
  yearly: number;
  reviewerUserId: string | null;
  approverUserId: string | null;
  objectives: { id: string; objective: string }[];
  monthlyReports: { id: string }[];
}> = {}) {
  return {
    id: "kpi-1",
    status: "DRAFT",
    department: "IT",
    yearly: 2025,
    reviewerUserId: "reviewer-1",
    approverUserId: "approver-1",
    objectives: [{ id: "obj-1", objective: "Reduce downtime" }],
    monthlyReports: [],
    ...overrides,
  };
}

const ACTOR_PREPARER = { userId: "preparer-1", role: "USER" as const, departmentId: "dept-1" };
const ACTOR_REVIEWER = { userId: "reviewer-1", role: "QMS" as const, departmentId: "dept-1" };
const ACTOR_APPROVER = { userId: "approver-1", role: "MR" as const, departmentId: "dept-1" };
const ACTOR_STRANGER = { userId: "stranger-99", role: "USER" as const, departmentId: "dept-2" };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("KpiService", () => {
  let service: KpiService;
  let kpiRepo: KpiRepository;
  let monthlyReportRepo: KpiMonthlyReportRepository;
  let monthlyDetailRepo: KpiMonthlyDetailRepository;
  let approvalSigRepo: ApprovalSignatureRepository;
  let userRepo: UserRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new KpiService();

    kpiRepo = getInstance<KpiRepository>(KpiRepository);
    monthlyReportRepo = getInstance<KpiMonthlyReportRepository>(KpiMonthlyReportRepository);
    monthlyDetailRepo = getInstance<KpiMonthlyDetailRepository>(KpiMonthlyDetailRepository);
    approvalSigRepo = getInstance<ApprovalSignatureRepository>(ApprovalSignatureRepository);
    userRepo = getInstance<UserRepository>(UserRepository);
  });

  // ── createKpi ──────────────────────────────────────────────────────────────

  describe("createKpi", () => {
    it("creates KPI when department+year is unique", async () => {
      vi.mocked(kpiRepo.findByDepartmentYear).mockResolvedValue(null);
      const created = makeKpi();
      vi.mocked(kpiRepo.create).mockResolvedValue(created as never);

      const result = await service.createKpi({
        department: "IT",
        yearly: 2025,
        prepare: "Alice",
        reviewer: "Bob",
        approver: "Carol",
      });

      expect(result).toEqual(created);
      expect(kpiRepo.create).toHaveBeenCalledOnce();
    });

    it("throws ConflictError when KPI already exists", async () => {
      vi.mocked(kpiRepo.findByDepartmentYear).mockResolvedValue(makeKpi() as never);

      await expect(
        service.createKpi({ department: "IT", yearly: 2025, prepare: "", reviewer: "", approver: "" })
      ).rejects.toThrow(ConflictError);
    });

    it("converts Prisma P2002 to ConflictError (race condition guard)", async () => {
      vi.mocked(kpiRepo.findByDepartmentYear).mockResolvedValue(null);
      vi.mocked(kpiRepo.create).mockRejectedValue({ code: "P2002" });

      await expect(
        service.createKpi({ department: "IT", yearly: 2025, prepare: "", reviewer: "", approver: "" })
      ).rejects.toThrow(ConflictError);
    });

    it("re-throws non-P2002 DB errors unchanged", async () => {
      vi.mocked(kpiRepo.findByDepartmentYear).mockResolvedValue(null);
      vi.mocked(kpiRepo.create).mockRejectedValue(new Error("CONNECTION_ERROR"));

      await expect(
        service.createKpi({ department: "IT", yearly: 2025, prepare: "", reviewer: "", approver: "" })
      ).rejects.toThrow("CONNECTION_ERROR");
    });
  });

  // ── approveObjectives ──────────────────────────────────────────────────────

  describe("approveObjectives", () => {
    it("throws NotFoundError when KPI does not exist", async () => {
      vi.mocked(kpiRepo.findByIdWithRelations).mockResolvedValue(null);

      await expect(service.approveObjectives("missing", ACTOR_APPROVER)).rejects.toThrow(NotFoundError);
    });

    it("throws ConflictError when KPI is not pending review", async () => {
      vi.mocked(kpiRepo.findByIdWithRelations).mockResolvedValue(makeKpi({ status: "DRAFT" }) as never);

      await expect(service.approveObjectives("kpi-1", ACTOR_APPROVER)).rejects.toThrow(ConflictError);
    });

    it("throws ForbiddenError when actor is not the assigned approver", async () => {
      vi.mocked(kpiRepo.findByIdWithRelations).mockResolvedValue(
        makeKpi({ status: "PENDING_APPROVAL" }) as never
      );
      vi.mocked(approvalSigRepo.findByDocument).mockResolvedValue([
        { step: "REVIEWER", action: "APPROVED", signerUserId: "reviewer-1" } as never,
      ]);

      await expect(service.approveObjectives("kpi-1", ACTOR_STRANGER)).rejects.toThrow(ForbiddenError);
    });

    it("throws ConflictError when reviewer has not approved yet", async () => {
      vi.mocked(kpiRepo.findByIdWithRelations).mockResolvedValue(
        makeKpi({ status: "PENDING_APPROVAL" }) as never
      );
      vi.mocked(approvalSigRepo.findByDocument).mockResolvedValue([]); // no reviewer sig

      await expect(service.approveObjectives("kpi-1", ACTOR_APPROVER)).rejects.toThrow(ConflictError);
    });

    it("sets status to APPROVED when all conditions are met", async () => {
      const kpi = makeKpi({ status: "PENDING_APPROVAL" });
      vi.mocked(kpiRepo.findByIdWithRelations).mockResolvedValue(kpi as never);
      vi.mocked(approvalSigRepo.findByDocument).mockResolvedValue([
        { step: "REVIEWER", action: "APPROVED", signerUserId: "reviewer-1" } as never,
      ]);
      const approvedKpi = { ...kpi, status: "APPROVED" };
      vi.mocked(kpiRepo.setStatus).mockResolvedValue(approvedKpi as never);
      vi.mocked(approvalSigRepo.upsertStep).mockResolvedValue({} as never);
      vi.mocked(monthlyReportRepo.findOrCreate).mockResolvedValue({ id: "report-1" } as never);
      vi.mocked(monthlyDetailRepo.createManyForReport).mockResolvedValue(undefined as never);

      const result = await service.approveObjectives("kpi-1", ACTOR_APPROVER);

      expect(result.status).toBe("APPROVED");
      expect(kpiRepo.setStatus).toHaveBeenCalledWith("kpi-1", "APPROVED", expect.anything());
    });
  });

  // ── rejectObjectives ───────────────────────────────────────────────────────

  describe("rejectObjectives", () => {
    it("throws NotFoundError when KPI does not exist", async () => {
      vi.mocked(kpiRepo.findByIdWithRelations).mockResolvedValue(null);

      await expect(service.rejectObjectives("missing", ACTOR_REVIEWER)).rejects.toThrow(NotFoundError);
    });

    it("throws ConflictError when KPI is not pending review", async () => {
      vi.mocked(kpiRepo.findByIdWithRelations).mockResolvedValue(makeKpi({ status: "DRAFT" }) as never);

      await expect(service.rejectObjectives("kpi-1", ACTOR_REVIEWER)).rejects.toThrow(ConflictError);
    });

    it("throws ForbiddenError when actor is not reviewer or approver", async () => {
      vi.mocked(kpiRepo.findByIdWithRelations).mockResolvedValue(
        makeKpi({ status: "PENDING_REVIEW" }) as never
      );

      await expect(service.rejectObjectives("kpi-1", ACTOR_STRANGER)).rejects.toThrow(ForbiddenError);
    });

    it("sets status to REJECTED and records REVIEWER step when reviewer rejects", async () => {
      const kpi = makeKpi({ status: "PENDING_REVIEW" });
      vi.mocked(kpiRepo.findByIdWithRelations).mockResolvedValue(kpi as never);
      vi.mocked(kpiRepo.setStatus).mockResolvedValue({ ...kpi, status: "REJECTED" } as never);
      vi.mocked(approvalSigRepo.upsertStep).mockResolvedValue({} as never);

      const result = await service.rejectObjectives("kpi-1", ACTOR_REVIEWER);

      expect(result.status).toBe("REJECTED");
      expect(approvalSigRepo.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({ step: "REVIEWER", action: "REJECTED" }),
        expect.anything()
      );
    });

    it("sets status to REJECTED and records APPROVER step when approver rejects", async () => {
      const kpi = makeKpi({ status: "PENDING_REVIEW" });
      vi.mocked(kpiRepo.findByIdWithRelations).mockResolvedValue(kpi as never);
      vi.mocked(kpiRepo.setStatus).mockResolvedValue({ ...kpi, status: "REJECTED" } as never);
      vi.mocked(approvalSigRepo.upsertStep).mockResolvedValue({} as never);

      await service.rejectObjectives("kpi-1", ACTOR_APPROVER);

      expect(approvalSigRepo.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({ step: "APPROVER", action: "REJECTED" }),
        expect.anything()
      );
    });
  });

  // ── recallObjectives ───────────────────────────────────────────────────────

  describe("recallObjectives", () => {
    it("throws NotFoundError when KPI does not exist", async () => {
      vi.mocked(kpiRepo.findByIdWithRelations).mockResolvedValue(null);

      await expect(service.recallObjectives("missing", ACTOR_PREPARER)).rejects.toThrow(NotFoundError);
    });

    it("throws ConflictError when KPI is not pending review", async () => {
      vi.mocked(kpiRepo.findByIdWithRelations).mockResolvedValue(makeKpi({ status: "DRAFT" }) as never);

      await expect(service.recallObjectives("kpi-1", ACTOR_PREPARER)).rejects.toThrow(ConflictError);
    });

    it("throws ForbiddenError when actor is not the original preparer", async () => {
      vi.mocked(kpiRepo.findByIdWithRelations).mockResolvedValue(
        makeKpi({ status: "PENDING_REVIEW" }) as never
      );
      vi.mocked(approvalSigRepo.findByDocument).mockResolvedValue([
        { step: "PREPARER", signerUserId: "other-user" } as never,
      ]);

      await expect(service.recallObjectives("kpi-1", ACTOR_PREPARER)).rejects.toThrow(ForbiddenError);
    });

    it("resets status to DRAFT and clears submission", async () => {
      const kpi = makeKpi({ status: "PENDING_REVIEW" });
      vi.mocked(kpiRepo.findByIdWithRelations).mockResolvedValue(kpi as never);
      vi.mocked(approvalSigRepo.findByDocument).mockResolvedValue([
        { step: "PREPARER", signerUserId: ACTOR_PREPARER.userId } as never,
      ]);
      vi.mocked(kpiRepo.setStatus).mockResolvedValue({ ...kpi, status: "DRAFT" } as never);
      vi.mocked(kpiRepo.clearSubmission).mockResolvedValue({} as never);
      vi.mocked(approvalSigRepo.deleteByDocument).mockResolvedValue({} as never);
      vi.mocked(userRepo.findById).mockResolvedValue(null);

      const result = await service.recallObjectives("kpi-1", ACTOR_PREPARER);

      expect(result.status).toBe("DRAFT");
      expect(kpiRepo.setStatus).toHaveBeenCalledWith("kpi-1", "DRAFT", expect.anything());
      expect(kpiRepo.clearSubmission).toHaveBeenCalledWith("kpi-1", expect.anything());
      expect(approvalSigRepo.deleteByDocument).toHaveBeenCalledWith("KPI", "kpi-1", expect.anything());
    });

    it("returns notifyUserIds for reviewer and approver", async () => {
      const kpi = makeKpi({ status: "PENDING_REVIEW" });
      vi.mocked(kpiRepo.findByIdWithRelations).mockResolvedValue(kpi as never);
      vi.mocked(approvalSigRepo.findByDocument).mockResolvedValue([
        { step: "PREPARER", signerUserId: ACTOR_PREPARER.userId } as never,
      ]);
      vi.mocked(kpiRepo.setStatus).mockResolvedValue({ ...kpi, status: "DRAFT" } as never);
      vi.mocked(kpiRepo.clearSubmission).mockResolvedValue({} as never);
      vi.mocked(approvalSigRepo.deleteByDocument).mockResolvedValue({} as never);
      vi.mocked(userRepo.findById).mockResolvedValue(null);

      const result = await service.recallObjectives("kpi-1", ACTOR_PREPARER);

      expect(result.notifyUserIds).toContain("reviewer-1");
      expect(result.notifyUserIds).toContain("approver-1");
    });
  });

  // ── reviewObjectives ───────────────────────────────────────────────────────

  describe("reviewObjectives", () => {
    it("throws NotFoundError when KPI does not exist", async () => {
      vi.mocked(kpiRepo.findByIdWithRelations).mockResolvedValue(null);

      await expect(service.reviewObjectives("missing", ACTOR_REVIEWER)).rejects.toThrow(NotFoundError);
    });

    it("throws ConflictError when KPI is not pending review", async () => {
      vi.mocked(kpiRepo.findByIdWithRelations).mockResolvedValue(makeKpi({ status: "APPROVED" }) as never);

      await expect(service.reviewObjectives("kpi-1", ACTOR_REVIEWER)).rejects.toThrow(ConflictError);
    });

    it("throws ForbiddenError when actor is not the assigned reviewer", async () => {
      vi.mocked(kpiRepo.findByIdWithRelations).mockResolvedValue(
        makeKpi({ status: "PENDING_REVIEW" }) as never
      );

      await expect(service.reviewObjectives("kpi-1", ACTOR_STRANGER)).rejects.toThrow(ForbiddenError);
    });

    it("records REVIEWER approval signature", async () => {
      const kpi = makeKpi({ status: "PENDING_REVIEW" });
      vi.mocked(kpiRepo.findByIdWithRelations).mockResolvedValue(kpi as never);
      vi.mocked(kpiRepo.setStatus).mockResolvedValue({ ...kpi, status: "PENDING_REVIEW" } as never);
      vi.mocked(approvalSigRepo.upsertStep).mockResolvedValue({} as never);

      await service.reviewObjectives("kpi-1", ACTOR_REVIEWER);

      expect(approvalSigRepo.upsertStep).toHaveBeenCalledWith(
        expect.objectContaining({ step: "REVIEWER", action: "APPROVED" }),
        expect.anything()
      );
    });
  });

  // ── deleteKpi ──────────────────────────────────────────────────────────────

  describe("deleteKpi", () => {
    it("throws NotFoundError when KPI does not exist", async () => {
      vi.mocked(kpiRepo.findByIdWithRelations).mockResolvedValue(null);

      await expect(service.deleteKpi("missing")).rejects.toThrow(NotFoundError);
    });

    it("throws ConflictError when KPI has monthly reports", async () => {
      vi.mocked(kpiRepo.findByIdWithRelations).mockResolvedValue(
        makeKpi({ monthlyReports: [{ id: "report-1" }] }) as never
      );

      await expect(service.deleteKpi("kpi-1")).rejects.toThrow(ConflictError);
    });

    it("deletes KPI when no monthly reports exist", async () => {
      vi.mocked(kpiRepo.findByIdWithRelations).mockResolvedValue(makeKpi() as never);
      vi.mocked(kpiRepo.delete).mockResolvedValue({} as never);

      await service.deleteKpi("kpi-1");

      expect(kpiRepo.delete).toHaveBeenCalledWith("kpi-1", expect.anything());
    });
  });
});
