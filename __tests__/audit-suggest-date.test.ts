import { describe, expect, it } from "vitest";
import { auditScheduleConfirmSchema } from "@/lib/validations/audit";

describe("audit schedule suggested date", () => {
  it("accepts a suggested replacement time with a reason", () => {
    const result = auditScheduleConfirmSchema.parse({
      status: "SUGGESTED",
      reason: "ติดภารกิจหน่วยงาน",
      suggestedStartAt: "2026-08-10T09:00:00.000Z",
      suggestedEndAt: "2026-08-10T12:00:00.000Z",
    });

    expect(result.status).toBe("SUGGESTED");
    expect(result.suggestedStartAt).toBeInstanceOf(Date);
    expect(result.suggestedEndAt).toBeInstanceOf(Date);
  });

  it("rejects a suggested time when the end is not after the start", () => {
    expect(() =>
      auditScheduleConfirmSchema.parse({
        status: "SUGGESTED",
        reason: "ติดภารกิจหน่วยงาน",
        suggestedStartAt: "2026-08-10T12:00:00.000Z",
        suggestedEndAt: "2026-08-10T09:00:00.000Z",
      }),
    ).toThrow();
  });
});
