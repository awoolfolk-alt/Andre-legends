import { z } from "zod";
import { loadContent } from "./load";

const ReviewStateSchema = z.object({
  level: z.number().int().min(0).max(5),
  misses: z.number().int().nonnegative(),
  attempts: z.number().int().nonnegative(),
  correct: z.number().int().nonnegative(),
  nextReview: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).strict();

const ReviewStoreSchema = z.object({
  version: z.literal(1),
  cards: z.record(z.string(), ReviewStateSchema),
}).strict();

export type ReviewState = z.infer<typeof ReviewStateSchema>;
export type ReviewStore = z.infer<typeof ReviewStoreSchema>;

export const REVIEW_STORAGE_KEY = "legend-cyberprep-review-v1";
const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const;

export const STARTING_WEAK_SPOTS = [
  { id: "xss-types", label: "XSS types: reflected, stored, and DOM-based", cardId: null },
  { id: "absolute-words", label: "Absolute words in select-all questions", cardId: "linux-distros-select-all-04" },
  { id: "security-posture-definition", label: "Security posture: protection of data and critical assets", cardId: null },
  { id: "rmf-assess-authorize-monitor", label: "NIST RMF: distinguish assess, authorize, and monitor", cardId: "rmf-order-09" },
] as const;

export function emptyReviewStore(): ReviewStore {
  return { version: 1, cards: {} };
}

export function readReviewStore(): { store: ReviewStore; error: string } {
  try {
    const raw = localStorage.getItem(REVIEW_STORAGE_KEY);
    if (!raw) return { store: emptyReviewStore(), error: "" };
    const parsed: unknown = JSON.parse(raw);
    return { store: loadContent(ReviewStoreSchema, parsed, "saved spaced-repetition progress"), error: "" };
  } catch (error) {
    console.error("Could not load spaced-repetition progress.", error);
    return { store: emptyReviewStore(), error: "Saved review progress could not be read; current session results are still available." };
  }
}

export function recordCardAnswer(
  store: ReviewStore,
  cardId: string,
  isCorrect: boolean,
  today = new Date(),
): ReviewStore {
  const previous = store.cards[cardId] ?? {
    level: 0,
    misses: 0,
    attempts: 0,
    correct: 0,
    nextReview: toDateString(today),
  };
  const level = isCorrect ? Math.min(5, previous.level + 1) : 0;
  const intervalIndex = isCorrect ? Math.max(0, level - 1) : 0;
  const nextReview = new Date(today);
  nextReview.setUTCDate(nextReview.getUTCDate() + (isCorrect ? REVIEW_INTERVAL_DAYS[intervalIndex] : 0));

  return {
    version: 1,
    cards: {
      ...store.cards,
      [cardId]: {
        level,
        misses: previous.misses + (isCorrect ? 0 : 1),
        attempts: previous.attempts + 1,
        correct: previous.correct + (isCorrect ? 1 : 0),
        nextReview: toDateString(nextReview),
      },
    },
  };
}

export function dueCardIds(store: ReviewStore, today = new Date()): string[] {
  const date = toDateString(today);
  return Object.entries(store.cards)
    .filter(([, state]) => state.nextReview <= date)
    .map(([cardId]) => cardId);
}

export function weakCardIds(store: ReviewStore): string[] {
  return Object.entries(store.cards)
    .filter(([, state]) => state.misses >= 2)
    .map(([cardId]) => cardId);
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}
