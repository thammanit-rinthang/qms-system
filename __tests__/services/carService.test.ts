import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn({})),
  },
}));

vi.mock("@/services/auditService", () => ({
  AuditService: { record: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/services/carEmailService", () => ({
  sendCarIssuedEmail: vi.fn().mockResolvedValue(undefined),
  sendCarReminderEmail: vi.fn().mockResolvedValue(undefined),
  sendCarRespondedEmail: vi.fn().mockResolvedValue(undefined),
  sendCarVerifyPassEmail: vi.fn().mockResolvedValue(undefined),
  sendCarVerify2NotifyEmail: vi.fn().mockResolvedValue(undefined),
  sendCarVerify2DateRequestEmail: vi.fn().mockResolvedValue(undefined),
  sendCarReCarEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/actionTokenService", () => ({
  ActionTokenService: { issue: vi.fn().mockResolvedValue("token-1") },
}));

vi.mock("@/services/carNotificationService", () => ({
  notifyCarUser: vi.fn().mockResolvedValue(undefined),
  canReceiveEmail: vi.fn().mockReturnValue(true),
}));

vi.mock("@/services/carReminderService", () => ({
  CarReminderService: {
    schedule: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/userSnapshotCache", () => ({
  getUserSnapshot: vi.fn().mockResolvedValue({
    authUserId: "auth-verifier-1",
    name: "Bob",
    email: "bob@example.com",
    employeeId: "E002",
    m365Linked: true,
    departmentId: "dept-qms",
    departmentName: "QMS",
  }),
}));

vi.mock("@/repositories/carRepository");
vi.mock("@/repositories/carSequenceRepository");
vi.mock("@/repositories/systemConfigRepository");

import { CarService } from "@/services/carService";
import { CarRepository } from "@/repositories/carRepository";
import { sendCarVerifyPassEmail, sendCarVerify2NotifyEmail, sendCarVerify2DateRequestEmail } from "@/services/carEmailService";
import { SystemConfigRepository } from "@/repositories/systemConfigRepository";

type MockClass<T> = { mock: { instances: T[] } };

function getInstance<T>(Cls: unknown): T {
  return (Cls as MockClass<T>).mock.instances[0];
}

function makeForVerifyRaw(overrides: Record<string, unknown> = {}) {
  return {
    id: "car-1",
    carNo: "C26-001",
    status: "VERIFY_1",
    targetDepartmentId: "dept-1",
    targetAuthDepartmentId: "dept-1",
    targetDepartmentName: "QA",
    issuerId: "issuer-1",
    issuerAuthUserId: "auth-issuer-1",
    issuerName: "Alice",
    targetEmailGroups: ["qa@example.com"],
    targetEmailGroupsCc: [],
    ...overrides,
  };
}

function makeSummaryRaw(overrides: Record<string, unknown> = {}) {
  return {
    id: "car-1",
    carNo: "C26-001",
    carYear: 2026,
    status: "ISSUED",
    sourceType: "I",
    defectDetail: "Incorrect batch label",
    issuedAt: new Date("2026-06-01T00:00:00.000Z"),
    responseDueAt: new Date("2026-06-08T00:00:00.000Z"),
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    issuer: { id: "issuer-1", name: "Alice" },
    targetDepartment: { id: "dept-1", name: "QA" },
    _count: { verifications: 1 },
    ...overrides,
  };
}

function makeDetailRaw(overrides: Record<string, unknown> = {}) {
  return {
    id: "car-1",
    carNo: "C26-001",
    carYear: 2026,
    sequenceNo: 1,
    status: "ISSUED",
    sourceType: "I",
    sourceDetail: null,
    isoStandards: ["ISO 9001:2015"],
    defectDetail: "Incorrect batch label",
    nonConformanceRef: "NC-001",
    issuerPosition: "QMS Officer",
    issuedAt: new Date("2026-06-01T00:00:00.000Z"),
    responseDueAt: new Date("2026-06-08T00:00:00.000Z"),
    reCar: false,
    reCarRefId: null,
    reCarRef: null,
    reCarChildren: [],
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    issuer: { id: "issuer-1", name: "Alice", employeeId: "E001", department: { id: "dept-qms", name: "QMS" } },
    targetDepartment: { id: "dept-1", name: "QA", emailGroup: "qa@example.com" },
    targetEmailGroups: ["qa@example.com"],
    response: null,
    verifications: [],
    mrSignature: null,
    notificationLogs: [],
    ...overrides,
  };
}

describe("CarService", () => {
  let service: CarService;
  let carRepo: CarRepository;

  let configRepo: SystemConfigRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CarService();
    carRepo = getInstance<CarRepository>(CarRepository);
    configRepo = getInstance<SystemConfigRepository>(SystemConfigRepository);
  });

  it("maps paginated car list results", async () => {
    vi.mocked(carRepo.paginateSummaries).mockResolvedValue({
      data: [makeSummaryRaw()],
      meta: { page: 2, limit: 20, total: 41 },
    } as never);

    const result = await service.listCars(
      { page: 2, limit: 20, search: "batch", scope: "mine" },
      { scope: "mine", issuerAuthUserId: "auth-user-1" }
    );

    expect(carRepo.paginateSummaries).toHaveBeenCalledWith(
      { page: 2, limit: 20, search: "batch", scope: "mine" },
      { scope: "mine", issuerAuthUserId: "auth-user-1" }
    );
    expect(result.meta).toEqual({ page: 2, limit: 20, total: 41 });
    expect(result.data[0]).toMatchObject({
      id: "car-1",
      carNo: "C26-001",
      verificationCount: 1,
      issuedAt: "2026-06-01T00:00:00.000Z",
      responseDueAt: "2026-06-08T00:00:00.000Z",
    });
  });

  it("rejects mine scope without Auth Center user id", async () => {
    await expect(
      service.listCars({ page: 1, limit: 20, scope: "mine" }, { scope: "mine" })
    ).rejects.toThrow("Auth Center user scope is required");
  });

  it("rejects department scope without Auth Center department id", async () => {
    await expect(
      service.listCars(
        { page: 1, limit: 20, scope: "my-department" },
        { scope: "my-department", issuerAuthUserId: "auth-user-1" }
      )
    ).rejects.toThrow("Auth Center department scope is required");
  });

  it("issues car through repository boundary and records notification", async () => {
    vi.mocked(carRepo.findForIssue).mockResolvedValue({
      id: "car-1",
      status: "DRAFT",
      targetEmailGroups: ["qa@example.com"],
      targetDepartmentId: "dept-1",
      issuerId: "issuer-1",
      carNo: "C26-001",
      targetDepartment: { name: "QA", emailGroup: "qa@example.com" },
    } as never);
    vi.mocked(carRepo.issue).mockResolvedValue({} as never);
    vi.mocked(carRepo.createNotificationLog).mockResolvedValue({} as never);
    vi.mocked(carRepo.findDetailById).mockResolvedValue(makeDetailRaw() as never);

    const result = await service.issueCar("car-1", "actor-1");

    expect(carRepo.issue).toHaveBeenCalledWith(
      "car-1",
      expect.any(Date),
      expect.any(Date),
      null,
      expect.anything()
    );
    expect(carRepo.createNotificationLog).toHaveBeenCalledWith(
      { carMasterId: "car-1", type: "ISSUED", recipient: "qa@example.com" },
      expect.anything(),
    );
    expect(result.car.carNo).toBe("C26-001");
  });

  describe("verifyCar", () => {
    function setupVerify(overrides: Record<string, unknown> = {}) {
      vi.mocked(carRepo.findForVerify).mockResolvedValue(makeForVerifyRaw(overrides) as never);
      vi.mocked(carRepo.createVerificationAndSetStatus).mockResolvedValue({} as never);
      vi.mocked(carRepo.createNotificationLog).mockResolvedValue({} as never);
      vi.mocked(carRepo.findDetailById).mockResolvedValue(makeDetailRaw() as never);
    }

    it("PASSED round=1 → status CLOSED, issues ActionToken, queues MR email", async () => {
      setupVerify();
      vi.mocked(configRepo.findValueByKey).mockImplementation(async (key) => {
        if (key === "CURRENT_MR_AUTH_USER_ID") return "mr-auth-1";
        if (key === "CURRENT_MR_EMAIL") return "mr@example.com";
        return null;
      });

      await service.verifyCar("car-1", "verifier-1", { round: 1, result: "PASSED", findings: "OK", verifierPosition: "QMS Officer", verifierSignaturePath: "data:image/png;base64,test", targetMrAuthUserId: "mr-auth-1" }, "auth-verifier-1");

      expect(carRepo.createVerificationAndSetStatus).toHaveBeenCalledWith(
        "car-1",
        expect.objectContaining({ round: 1, result: "PASSED" }),
        "verifier-1",
        expect.any(Object),
        "CLOSED",
        expect.anything()
      );
      // ActionToken issued for MR
      const { ActionTokenService } = await import("@/services/actionTokenService");
      expect(ActionTokenService.issue).toHaveBeenCalledWith(
        expect.objectContaining({ module: "CAR", role: "APPROVER_MR" })
      );
      // MR verify-pass email queued (mrEmail comes from getUserSnapshot)
      expect(sendCarVerifyPassEmail).toHaveBeenCalledWith(
        expect.objectContaining({ carId: "car-1", carNo: "C26-001", mrEmail: "bob@example.com" })
      );
    });

    it("FAILED round=1 → status VERIFY_2, sends Verify2Notify email to dept", async () => {
      setupVerify();
      vi.mocked(configRepo.findValueByKey).mockResolvedValue(null);

      await service.verifyCar(
        "car-1",
        "verifier-1",
        { round: 1, result: "FAILED", findings: "Not fixed", verifierPosition: "QMS Officer", verifierSignaturePath: "data:image/png;base64,test" },
        "auth-verifier-1"
      );

      expect(carRepo.createVerificationAndSetStatus).toHaveBeenCalledWith(
        "car-1",
        expect.objectContaining({ round: 1, result: "FAILED" }),
        "verifier-1",
        expect.any(Object),
        "VERIFY_2",
        expect.anything()
      );
      expect(sendCarVerify2DateRequestEmail).toHaveBeenCalledWith(
        expect.objectContaining({ carId: "car-1", targetEmail: "qa@example.com" })
      );
      expect(sendCarVerify2NotifyEmail).not.toHaveBeenCalled();
    });

    it("FAILED round=2 → status RE_CAR, no email sent", async () => {
      setupVerify({ status: "VERIFY_2" });
      vi.mocked(configRepo.findValueByKey).mockResolvedValue(null);

      await service.verifyCar(
        "car-1",
        "verifier-1",
        { round: 2, result: "FAILED", findings: "Still not fixed", verifierPosition: "QMS Officer", verifierSignaturePath: "data:image/png;base64,test" },
        "auth-verifier-1"
      );

      expect(carRepo.createVerificationAndSetStatus).toHaveBeenCalledWith(
        "car-1",
        expect.objectContaining({ round: 2, result: "FAILED" }),
        "verifier-1",
        expect.any(Object),
        "RE_CAR",
        expect.anything()
      );
      expect(sendCarVerifyPassEmail).not.toHaveBeenCalled();
      expect(sendCarVerify2NotifyEmail).not.toHaveBeenCalled();
    });

    it("rejects wrong status for round", async () => {
      // Status is VERIFY_1 but we request round=2 → should throw
      vi.mocked(carRepo.findForVerify).mockResolvedValue(makeForVerifyRaw({ status: "VERIFY_1" }) as never);

      await expect(
        service.verifyCar("car-1", "verifier-1", { round: 2, result: "FAILED", findings: "x", verifierPosition: "QMS", verifierSignaturePath: "data:image/png;base64,test" })
      ).rejects.toThrow("VERIFY_2");
    });
  });
});
