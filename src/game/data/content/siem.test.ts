import { describe, expect, it } from "vitest";
import { searchSIEM } from "./siem";

describe("SOC Shift search simulator", () => {
  it("supports SPL-style terms and field comparisons", () => {
    expect(searchSIEM("index=main fail*").rows.map((row) => row.id)).toEqual(["log-01", "log-02", "log-03"]);
    expect(searchSIEM('metadata.event_type = "USER_LOGIN" AND user=jdoe').rows.map((row) => row.id)).toEqual(["log-01", "log-02", "log-03"]);
  });

  it("surfaces invalid fields and limits input length", () => {
    expect(searchSIEM("secret_field=value").error).toContain("Unknown SIEM field");
    expect(searchSIEM("x".repeat(301)).error).toContain("300 characters");
  });
});
