import { describe, expect, it } from "vitest";
import { hasValidMagicBytes } from "@/lib/fileValidation";

describe("file signature validation", () => {
  it("accepts a PDF with a PDF signature", () => {
    expect(hasValidMagicBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, ...new Array(8).fill(0)]), "application/pdf")).toBe(true);
  });

  it("rejects a mislabeled file", () => {
    expect(hasValidMagicBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, ...new Array(8).fill(0)]), "image/png")).toBe(false);
  });

  it("rejects a truncated file", () => {
    expect(hasValidMagicBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46]), "application/pdf")).toBe(false);
  });
});
