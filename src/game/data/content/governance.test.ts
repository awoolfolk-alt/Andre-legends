import { describe, expect, it } from "vitest";
import { AUDIT_CONTROLS, calculateRisk, FRAMEWORKS } from "./governance";

describe("Audit and Govern training", () => {
  it("calculates SLE and ALE with bounded, explicit inputs", () => {
    expect(calculateRisk(20_000, 25, 2)).toEqual({ singleLoss: 5_000, annualLoss: 10_000 });
    expect(() => calculateRisk(100, 101, 1)).toThrow(/Exposure factor/);
  });

  it("has audit evidence and current framework teaching notes", () => {
    expect(AUDIT_CONTROLS.length).toBeGreaterThanOrEqual(5);
    expect(AUDIT_CONTROLS.some((control) => control.gap)).toBe(true);
    expect(FRAMEWORKS.find((framework) => framework.name === "NIST CSF 2.0")?.purpose).toContain("Govern");
  });
});
