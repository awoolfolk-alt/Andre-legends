import { describe, expect, it } from "vitest";
import { PHISH_MESSAGES } from "./phish";

describe("Phish Hunt messages", () => {
  it("provides 40 complete fictional messages across multiple channels", () => {
    expect(PHISH_MESSAGES).toHaveLength(40);
    expect(new Set(PHISH_MESSAGES.map((message) => message.id)).size).toBe(40);
    expect(new Set(PHISH_MESSAGES.map((message) => message.channel)).size).toBeGreaterThanOrEqual(5);
    for (const message of PHISH_MESSAGES) {
      expect(message.sender).toBeTruthy();
      expect(message.body).toBeTruthy();
      expect(message.explanation).toBeTruthy();
      expect(message.action).toBeTruthy();
      expect(["phish", "legit"]).toContain(message.verdict);
    }
  });
});
