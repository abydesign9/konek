import { describe, expect, it } from "vitest";
import { detectCountry, findCountry } from "./carriers";

describe("detectCountry", () => {
  it("detects Nigeria from a +234 number", () => {
    expect(detectCountry("+2348031234567")?.code).toBe("NG");
  });

  it("detects the UK from +44", () => {
    expect(detectCountry("+447911123456")?.code).toBe("GB");
  });

  it("prefers the longest matching dial code", () => {
    // +234 (Nigeria) must win over +2 (no such entry) — and +233 vs +23x
    expect(detectCountry("+233201234567")?.code).toBe("GH");
  });

  it("tolerates spaces and punctuation", () => {
    expect(detectCountry("+1 (555) 123-4567")?.code).toBe("US");
  });

  it("returns null for an unknown code", () => {
    expect(detectCountry("+9990000000")).toBeNull();
  });

  it("findCountry resolves carriers", () => {
    expect(findCountry("KE")?.carriers.some((c) => c.id === "safaricom")).toBe(true);
  });
});
