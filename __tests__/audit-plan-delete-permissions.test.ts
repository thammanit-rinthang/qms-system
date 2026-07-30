import { describe, expect, it } from "vitest";
import { canDeleteAuditPlan } from "@/lib/audit/permissions";

describe("audit plan delete permissions", () => {
  it("allows QMS, MR, and IT to delete plans regardless of plan status", () => {
    expect(canDeleteAuditPlan("QMS")).toBe(true);
    expect(canDeleteAuditPlan("MR")).toBe(true);
    expect(canDeleteAuditPlan("IT")).toBe(true);
  });

  it("does not allow other roles to delete audit plans", () => {
    expect(canDeleteAuditPlan("USER")).toBe(false);
    expect(canDeleteAuditPlan("AUDITOR")).toBe(false);
  });
});
