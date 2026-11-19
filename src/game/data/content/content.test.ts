import { describe, expect, it } from "vitest";
import { CURRICULUM_CONTENT } from "./index";
import { loadContentList } from "./load";
import { CardSchema } from "./schemas";
import { dueCardIds, emptyReviewStore, recordCardAnswer, weakCardIds } from "./review";
import { interactionForFormat, scoreQuizResponse } from "./quiz";

describe("CyberPrep curriculum content", () => {
  it("validates the JSON seed files and includes every documented quiz format", () => {
    const formats = new Set(CURRICULUM_CONTENT.cards.map((card) => card.format));
    expect(CURRICULUM_CONTENT.briefs).toHaveLength(1);
    expect(CURRICULUM_CONTENT.cards.length).toBeGreaterThanOrEqual(20);
    expect(Array.from({ length: 20 }, (_, index) => `F${index + 1}`).every((format) => formats.has(format))).toBe(true);
    expect(CURRICULUM_CONTENT.scenarios).toHaveLength(1);
    expect(CURRICULUM_CONTENT.labs).toHaveLength(1);
    expect(CURRICULUM_CONTENT.cases).toHaveLength(1);
  });

  it("rejects duplicate IDs and malformed cards with actionable validation errors", () => {
    const card = CURRICULUM_CONTENT.cards[0];
    expect(() => loadContentList(CardSchema, [card, card], "test.json")).toThrow(/Duplicate id/);
    expect(CardSchema.safeParse({ ...card, format: "bad" }).success).toBe(false);
  });
});

describe("quiz format rendering and scoring", () => {
  const card = (id: string) => {
    const found = CURRICULUM_CONTENT.cards.find((item) => item.id === id);
    if (!found) throw new Error(`Missing test card ${id}.`);
    return found;
  };

  it("maps all 20 question formats to a usable interaction", () => {
    const formats = new Set(CURRICULUM_CONTENT.cards.map((item) => item.format));
    const interactions = Array.from({ length: 20 }, (_, index) => interactionForFormat(`F${index + 1}`));
    expect(formats.size).toBe(20);
    expect(interactions).toContain("single");
    expect(interactions).toContain("multi");
    expect(interactions).toContain("order");
    expect(interactions).toContain("typed");
  });

  it("scores multi-select with the wrong-pick penalty", () => {
    const question = card("lessons-learned-select-03");
    const partial = scoreQuizResponse(question, {
      selected: ["Find improvements to the response plan"],
      typed: "",
      ordered: [],
    });
    expect(partial.points).toBe(0.5);
    expect(partial.correct).toBe(false);
    const penalty = scoreQuizResponse(question, {
      selected: ["Find improvements to the response plan", "Blame one person"],
      typed: "",
      ordered: [],
    });
    expect(penalty.points).toBe(0);

    const all = scoreQuizResponse(question, {
      selected: question.answer,
      typed: "",
      ordered: [],
    });
    expect(all.points).toBe(1);
  });

  it("scores written answers only when key ideas and rationale are present", () => {
    const written = card("mfa-written-20");
    expect(scoreQuizResponse(written, {
      selected: [],
      typed: "MFA requires another factor beyond the password because stolen passwords alone are not enough.",
      ordered: [],
    }).correct).toBe(true);
    expect(scoreQuizResponse(written, {
      selected: [],
      typed: "MFA requires another factor beyond the password.",
      ordered: [],
    }).correct).toBe(false);
  });

  it("scores an ordered sequence exactly", () => {
    const ordered = card("rmf-order-09");
    expect(scoreQuizResponse(ordered, { selected: [], typed: "", ordered: ordered.answer }).correct).toBe(true);
    expect(scoreQuizResponse(ordered, { selected: [], typed: "", ordered: [...ordered.answer].reverse() }).correct).toBe(false);
  });

  it("accepts normalized typed commands and near misses receive no credit", () => {
    const typed = card("hidden-files-command-11");
    expect(scoreQuizResponse(typed, { selected: [], typed: "  LS   -A ", ordered: [] }).correct).toBe(true);
    expect(scoreQuizResponse(typed, { selected: [], typed: "ls -l", ordered: [] }).correct).toBe(false);
  });
});

describe("spaced repetition", () => {
  const today = new Date("2026-11-19T12:00:00.000Z");

  it("advances correct cards through the configured interval ladder", () => {
    let progress = emptyReviewStore();
    const expectedDates = ["2026-11-20", "2026-11-22", "2026-11-26", "2026-12-03", "2026-12-19", "2026-12-19"];
    for (const expected of expectedDates) {
      progress = recordCardAnswer(progress, "card", true, today);
      expect(progress.cards.card.nextReview).toBe(expected);
    }
    expect(progress.cards.card.level).toBe(5);
  });

  it("resets the review interval on a miss and flags a card after two misses", () => {
    let progress = recordCardAnswer(emptyReviewStore(), "card", true, today);
    progress = recordCardAnswer(progress, "card", false, today);
    expect(progress.cards.card.level).toBe(0);
    expect(dueCardIds(progress, today)).toContain("card");
    progress = recordCardAnswer(progress, "card", false, today);
    expect(weakCardIds(progress)).toContain("card");
  });
});
