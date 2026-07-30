import { describe, expect, it } from "vitest";
import { getEmailSendReadiness } from "@/lib/email-health";

describe("email send readiness", () => {
  it("reports ready when Auth Center and a sender credential are available", () => {
    expect(getEmailSendReadiness({ authCenterUrl: "https://auth.example.com", hasSessionToken: true, hasM2mCredentials: false })).toEqual({
      ready: true,
      mode: "delegated",
      skipReason: null,
    });
  });

  it("reports the exact skip reason when no mail route is configured", () => {
    expect(getEmailSendReadiness({ authCenterUrl: "", hasSessionToken: false, hasM2mCredentials: false })).toEqual({
      ready: false,
      mode: "unavailable",
      skipReason: "AUTH_CENTER_URL or mail credentials are missing",
    });
  });
});
