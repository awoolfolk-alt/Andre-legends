// ─────────────────────────────────────────────────────────────
// WORDS — the affirmation spell system (Mock B-2 core)
// ─────────────────────────────────────────────────────────────
// WHY words as weapons? The final boss of a story about self-doubt
// can't be killed by swinging harder. The sword only WOUNDS the
// Shadow; a correctly spoken affirmation BREAKS him. Spelling is
// the spell — a misspelled word doesn't land.
//
// This file is deliberately tiny and pure (no Three.js, no DOM) so
// it can be unit-tested and reused: the fight orchestrator asks it
// "did they type the word?" and "which word comes next?".
// ─────────────────────────────────────────────────────────────

// One affirmation = one crack in the Shadow's armor.
// The order IS the story arc: you start by PROVING (capable, brave,
// strong) and end by ACCEPTING (loved, confident). That journey —
// proving yourself at Nike, then learning to value yourself at
// i.c.stars — is compressed into eight keystrokes.
//
// WHY build this list from data/affirmations.ts instead of typing
// the words out here? The word bank is the single source of truth:
// meanings, rounds, and the final word all live there. This fight
// still uses the ORIGINAL_EIGHT sequence (the full round system
// arrives with the world build), but a word edited in the bank is
// edited everywhere — no drift between two copies.
import { ORIGINAL_EIGHT, meaningOf } from "./data/affirmations";

export interface Affirmation {
  word: string; // the spell itself — singular, no spaces
  meaning: string; // shown after it lands, so the player learns the lesson
}

export const AFFIRMATIONS: Affirmation[] = ORIGINAL_EIGHT.map((word) => ({
  word,
  meaning: meaningOf(word),
}));

// ─── Input sanitization ─────────────────────────────────────
// WHY sanitize? Players type " worthy " or "Worthy!" — the intent is
// right, the string is wrong. We normalize before comparing so the
// game judges intent, not formatting. But a genuinely wrong letter
// stays wrong: the spell demands precision.
export function sanitize(raw: string): string {
  return raw
    .toUpperCase() // case doesn't matter
    .replace(/[^A-Z]/g, ""); // strip spaces, numbers, punctuation
}

// Compare a typed attempt against the target word.
// Returns per-letter states so the UI can "ignite" correct letters
// one by one — you SEE the word being believed.
export type LetterState = "pending" | "correct" | "wrong";

export function gradeAttempt(attempt: string, target: string): LetterState[] {
  const clean = sanitize(attempt);
  return target.split("").map((letter, i) => {
    if (i >= clean.length) return "pending"; // not typed yet
    return clean[i] === letter ? "correct" : "wrong";
  });
}

export function isExact(attempt: string, target: string): boolean {
  return sanitize(attempt) === target;
}

// ─── Scrambled tiles (mobile input) ─────────────────────────
// WHY tiles on mobile? Typing on glass mid-fight is misery. Tapping
// scrambled letters keeps the spell (you still must KNOW the order)
// without fighting the virtual keyboard.
// We shuffle with a seeded approach from the caller's RNG so tests
// stay deterministic — no bare Math.random() in game code.
export function scramble(word: string, rand: () => number): string[] {
  const letters = word.split("");
  // Fisher-Yates shuffle: walk backwards, swap each letter with a
  // random earlier one. Fair shuffle, every order equally likely.
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  // A shuffle that returns the word unchanged is a free win — redo once.
  if (letters.join("") === word && word.length > 1) {
    [letters[0], letters[1]] = [letters[1], letters[0]];
  }
  return letters;
}
