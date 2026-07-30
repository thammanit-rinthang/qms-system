import { describe, expect, it } from "vitest";
import { isAuthCenterAccessTokenExpired } from "@/lib/auth-session";

describe("Auth Center session expiry", () => {
  it("treats an expired access token as an expired QMS session", () => {
    expect(isAuthCenterAccessTokenExpired(Math.floor(Date.now() / 1000) - 1)).toBe(true);
  });

  it("allows a session whose access token has not expired", () => {
    expect(isAuthCenterAccessTokenExpired(Math.floor(Date.now() / 1000) + 60)).toBe(false);
  });

  it("reads the expiry from a legacy session access token when no copied expiry exists", () => {
    const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 1 }));
    const token = `header.${payload}.signature`;

    expect(isAuthCenterAccessTokenExpired(undefined, Math.floor(Date.now() / 1000), token)).toBe(true);
  });
});
