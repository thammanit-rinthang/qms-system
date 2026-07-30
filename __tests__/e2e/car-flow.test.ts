/**
 * CAR flow integration tests — service layer (no Playwright; project standard = Vitest).
 * Tests the full state-machine transitions for 2 critical paths:
 *   1. Happy path: DRAFT → ISSUED → RESPONDED → VERIFY_1 PASSED → CLOSED
 *   2. Re-CAR path: DRAFT → ISSUED → RESPONDED → VERIFY_1 FAILED → VERIFY_2 FAILED → RE_CAR
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Module mocks ─────────────────────────────────────────────────────────────

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
  sendCarMrReviewRequestEmail: vi.fn().mockResolvedValue(undefined),
  sendCarPlanApprovedEmail: vi.fn().mockResolvedValue(undefined),
  sendCarPlanRejectedEmail: vi.fn().mockResolvedValue(undefined),
  sendCarVerifyPassEmail: vi.fn().mockResolvedValue(undefined),
  sendCarVerify2NotifyEmail: vi.fn().mockResolvedValue(undefined),
  sendCarVerify2DateRequestEmail: vi.fn().mockResolvedValue(undefined),
  sendCarReCarEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/actionTokenService", () => ({
  ActionTokenService: { issue: vi.fn().mockResolvedValue("tok-mr") },
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
    authUserId: "auth-actor",
    name: "Actor",
    email: "actor@example.com",
    employeeId: "E001",
    m365Linked: true,
    departmentId: "dept-qms",
    departmentName: "QMS",
  }),
}));

vi.mock("@/repositories/carRepository");
vi.mock("@/repositories/carSequenceRepository");
vi.mock("@/repositories/systemConfigRepository");

// ─── Imports ──────────────────────────────────────────────────────────────────

import { CarService } from "@/services/carService";
import { CarRepository } from "@/repositories/carRepository";
import { SystemConfigRepository } from "@/repositories/systemConfigRepository";
import { sendCarVerifyPassEmail, sendCarVerify2NotifyEmail, sendCarVerify2DateRequestEmail } from "@/services/carEmailService";
import { CarReminderService } from "@/services/carReminderService";

type MockClass<T> = { mock: { instances: T[] } };
const getInstance = <T>(Cls: unknown) => (Cls as MockClass<T>).mock.instances[0];

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const CAR_ID = "car-flow-1";
const CAR_NO = "C26-001";
const DEPT_EMAIL = "qa@example.com";

function baseDetail(status: string) {
  return {
    id: CAR_ID, carNo: CAR_NO, carYear: 2026, sequenceNo: 1,
    status, sourceType: "I", sourceDetail: null, isoStandards: [],
    defectDetail: "NC", nonConformanceRef: "NC-001", issuerPosition: "QMS",
    issuedAt: new Date(), responseDueAt: new Date(),
    reCar: false, reCarRefId: null, reCarRef: null, reCarChildren: [],
    createdAt: new Date(), updatedAt: new Date(),
    issuerId: "issuer-1", issuerAuthUserId: "auth-issuer-1",
    issuerName: "Alice", issuerEmployeeId: "E001",
    targetDepartmentId: "dept-1", targetAuthDepartmentId: "dept-1",
    targetDepartmentName: "QA",
    targetEmailGroups: [DEPT_EMAIL], targetEmailGroupsCc: [],
    response: null, verifications: [], mrSignature: null, mrResponseReview: null,
  };
}

function forIssueMock(status = "DRAFT") {
  return {
    id: CAR_ID, carNo: CAR_NO, status,
    targetEmailGroups: [DEPT_EMAIL], targetEmailGroupsCc: [],
    targetDepartmentId: "dept-1", targetAuthDepartmentId: "dept-1",
    targetDepartmentName: "QA", issuerId: "issuer-1", issuerAuthUserId: "auth-issuer-1",
    issuerName: "Alice",
  };
}

function forVerifyMock(status: string) {
  return {
    id: CAR_ID, carNo: CAR_NO, status,
    targetDepartmentId: "dept-1", targetAuthDepartmentId: "dept-1",
    targetDepartmentName: "QA", issuerId: "issuer-1", issuerAuthUserId: "auth-issuer-1",
    issuerName: "Alice", targetEmailGroups: [DEPT_EMAIL], targetEmailGroupsCc: [],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CAR flow — happy path (DRAFT → ISSUED → RESPONDED → VERIFY_1 PASS → CLOSED)", () => {
  let svc: CarService;
  let carRepo: CarRepository;
  let configRepo: SystemConfigRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new CarService();
    carRepo = getInstance<CarRepository>(CarRepository);
    configRepo = getInstance<SystemConfigRepository>(SystemConfigRepository);
    vi.mocked(configRepo.findValueByKey).mockResolvedValue(null);
  });

  it("step 1 — issueCar transitions DRAFT → ISSUED and schedules reminder", async () => {
    vi.mocked(carRepo.findForIssue).mockResolvedValue(forIssueMock("DRAFT") as never);
    vi.mocked(carRepo.issue).mockResolvedValue({} as never);
    vi.mocked(carRepo.createNotificationLog).mockResolvedValue({} as never);
    vi.mocked(carRepo.findDetailById).mockResolvedValue(baseDetail("ISSUED") as never);

    const { car } = await svc.issueCar(CAR_ID, "actor-1", "auth-actor");

    expect(car.status).toBe("ISSUED");
    expect(carRepo.issue).toHaveBeenCalledWith(CAR_ID, expect.any(Date), expect.any(Date), null, expect.anything());
    expect(CarReminderService.schedule).toHaveBeenCalledWith(CAR_ID, expect.objectContaining({ issuerEmail: expect.any(String) }));
  });

  it("step 2 — respondToCar transitions ISSUED → RESPONDED and cancels reminder", async () => {
    vi.mocked(carRepo.findForRespond).mockResolvedValue({
      id: CAR_ID, carNo: CAR_NO, status: "ISSUED",
      targetDepartmentId: "dept-1", targetAuthDepartmentId: "dept-1",
      issuerId: "issuer-1", issuerAuthUserId: "auth-issuer-1", issuerName: "Alice",
      targetEmailGroups: [DEPT_EMAIL], targetEmailGroupsCc: [],
      response: null,
    } as never);
    vi.mocked(carRepo.createResponseAndSetStatus).mockResolvedValue({} as never);
    vi.mocked(carRepo.createNotificationLog).mockResolvedValue({} as never);
    vi.mocked(carRepo.findDetailById).mockResolvedValue(baseDetail("RESPONDED") as never);

    const result = await svc.respondToCar(
      CAR_ID, "responder-1", "dept-1",
      { responderPosition: "Dept Officer", responseType: "FIVE_WHY" as const, whyAnalysis: "x", rootCausePerson: false, rootCauseMaterial: false, rootCauseMachine: false, rootCauseMethod: false, rootCauseOther: false, rootCauseSummary: "y", immediateAction: "z", preventiveAction: "w", plannedCompletionDate: "2026-07-01", responderSignaturePath: "data:image/png;base64,test", targetMrAuthUserId: "mr-auth-1" },
      "auth-responder-1", "dept-1"
    );

    expect(result.status).toBe("RESPONDED");
    expect(CarReminderService.cancel).toHaveBeenCalledWith(CAR_ID);
  });

  it("step 3 — verifyCar PASSED transitions → CLOSED and sends MR verify-pass email", async () => {
    vi.mocked(carRepo.findForVerify).mockResolvedValue(forVerifyMock("VERIFY_1") as never);
    vi.mocked(carRepo.createVerificationAndSetStatus).mockResolvedValue({} as never);
    vi.mocked(carRepo.createNotificationLog).mockResolvedValue({} as never);
    vi.mocked(carRepo.findDetailById).mockResolvedValue(baseDetail("CLOSED") as never);
    vi.mocked(configRepo.findValueByKey).mockImplementation(async (k) =>
      k === "CURRENT_MR_AUTH_USER_ID" ? "mr-auth-1" :
      k === "CURRENT_MR_EMAIL" ? "mr@example.com" : null
    );

    const result = await svc.verifyCar(CAR_ID, "verifier-1", { round: 1, result: "PASSED", findings: "All good", verifierPosition: "QMS Officer", verifierSignaturePath: "data:image/png;base64,test", targetMrAuthUserId: "mr-auth-1" }, "auth-verifier-1");

    expect(result.status).toBe("CLOSED");
    expect(carRepo.createVerificationAndSetStatus).toHaveBeenCalledWith(
      CAR_ID, expect.objectContaining({ result: "PASSED" }), "verifier-1", expect.any(Object), "CLOSED", expect.anything()
    );
    expect(sendCarVerifyPassEmail).toHaveBeenCalledWith(
      expect.objectContaining({ mrEmail: "actor@example.com", token: "tok-mr" })
    );
  });
});

describe("CAR flow — Re-CAR path (VERIFY_1 FAIL → VERIFY_2 FAIL → RE_CAR)", () => {
  let svc: CarService;
  let carRepo: CarRepository;
  let configRepo: SystemConfigRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new CarService();
    carRepo = getInstance<CarRepository>(CarRepository);
    configRepo = getInstance<SystemConfigRepository>(SystemConfigRepository);
    vi.mocked(configRepo.findValueByKey).mockResolvedValue(null);
    vi.mocked(carRepo.createVerificationAndSetStatus).mockResolvedValue({} as never);
    vi.mocked(carRepo.createNotificationLog).mockResolvedValue({} as never);
  });

  it("VERIFY_1 FAILED → status VERIFY_2, sends Verify2Notify email to dept", async () => {
    vi.mocked(carRepo.findForVerify).mockResolvedValue(forVerifyMock("VERIFY_1") as never);
    vi.mocked(carRepo.findDetailById).mockResolvedValue(baseDetail("VERIFY_2") as never);

    const result = await svc.verifyCar(
      CAR_ID, "verifier-1",
      { round: 1, result: "FAILED", findings: "Not fixed", verifierPosition: "QMS Officer", verifierSignaturePath: "data:image/png;base64,test" },
      "auth-verifier-1"
    );

    expect(result.status).toBe("VERIFY_2");
    expect(carRepo.createVerificationAndSetStatus).toHaveBeenCalledWith(
      CAR_ID, expect.objectContaining({ round: 1, result: "FAILED" }),
      "verifier-1", expect.any(Object), "VERIFY_2", expect.anything()
    );
    expect(sendCarVerify2DateRequestEmail).toHaveBeenCalledWith(
      expect.objectContaining({ targetEmail: DEPT_EMAIL })
    );
    expect(sendCarVerify2NotifyEmail).not.toHaveBeenCalled();
    expect(sendCarVerifyPassEmail).not.toHaveBeenCalled();
  });

  it("VERIFY_2 FAILED → status RE_CAR, no email sent", async () => {
    vi.mocked(carRepo.findForVerify).mockResolvedValue(forVerifyMock("VERIFY_2") as never);
    vi.mocked(carRepo.findDetailById).mockResolvedValue(baseDetail("RE_CAR") as never);

    const result = await svc.verifyCar(
      CAR_ID, "verifier-1",
      { round: 2, result: "FAILED", findings: "Still not fixed", verifierPosition: "QMS Officer", verifierSignaturePath: "data:image/png;base64,test" },
      "auth-verifier-1"
    );

    expect(result.status).toBe("RE_CAR");
    expect(carRepo.createVerificationAndSetStatus).toHaveBeenCalledWith(
      CAR_ID, expect.objectContaining({ round: 2, result: "FAILED" }),
      "verifier-1", expect.any(Object), "RE_CAR", expect.anything()
    );
    expect(sendCarVerifyPassEmail).not.toHaveBeenCalled();
    expect(sendCarVerify2NotifyEmail).not.toHaveBeenCalled();
  });
});
