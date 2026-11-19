import type { Card } from "./schemas";

export type QuizResponse = {
  selected: string[];
  typed: string;
  ordered: string[];
};

export type QuizResult = {
  correct: boolean;
  points: number;
  feedback: string;
};

const TYPED_FORMATS = new Set(["F1", "F11", "F12", "F13", "F15", "F20"]);
const MULTI_FORMATS = new Set(["F3", "F4"]);
const EMOTIONAL_WORDS = /\b(?:hate|stupid|idiot|angry|terrified|disgusting)\b/i;
const RATIONALE_WORDS = /\b(?:because|so that|which means|this helps|therefore)\b/i;

export function interactionForFormat(format: string): "typed" | "order" | "multi" | "single" {
  if (format === "F9") return "order";
  if (TYPED_FORMATS.has(format)) return "typed";
  if (MULTI_FORMATS.has(format)) return "multi";
  return "single";
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function scoreQuizResponse(card: Card, response: QuizResponse): QuizResult {
  const interaction = interactionForFormat(card.format);
  if (interaction === "multi") {
    const correctAnswers = new Set(card.answer);
    const selected = new Set(response.selected);
    const points = Math.max(0,
      [...selected].filter((item) => correctAnswers.has(item)).length
      - [...selected].filter((item) => !correctAnswers.has(item)).length,
    ) / correctAnswers.size;
    return {
      correct: points === 1,
      points,
      feedback: points === 1
        ? "Every selection is correct."
        : "Each correct pick adds credit; each incorrect pick removes credit. The score cannot fall below zero.",
    };
  }

  if (interaction === "order") {
    const correct = response.ordered.length === card.answer.length
      && response.ordered.every((answer, index) => answer === card.answer[index]);
    return { correct, points: correct ? 1 : 0, feedback: correct ? "The sequence is in the correct order." : "Check the order of the steps." };
  }

  if (interaction === "typed") {
    const answer = normalize(response.typed);
    let correct: boolean;
    let feedback = "";
    if (card.format === "F20") {
      const hasKeywords = card.requiredKeywords.every((keyword) => answer.includes(normalize(keyword)));
      const hasRationale = !card.requiresRationale || RATIONALE_WORDS.test(answer);
      const followsWritingRules = !EMOTIONAL_WORDS.test(answer);
      correct = hasKeywords && hasRationale && followsWritingRules;
      if (!hasKeywords) feedback = "Include the key ideas listed in the prompt.";
      else if (!hasRationale) feedback = "Explain why; use a reason such as “because” or “this helps.”";
      else if (!followsWritingRules) feedback = "Use neutral, professional wording.";
    } else {
      correct = [...card.answer, ...card.accept].some((accepted) => normalize(accepted) === answer);
      if (!correct) {
        const close = [...card.answer, ...card.accept].some((accepted) => {
          const expected = normalize(accepted);
          return expected.length === answer.length && [...expected].filter((character, index) => character !== answer[index]).length === 1;
        });
        feedback = close ? "Check your spelling; the answer is close." : "Review the key term or command.";
      }
    }
    return { correct, points: correct ? 1 : 0, feedback };
  }

  const correct = response.selected.length === 1 && card.answer.includes(response.selected[0]);
  return { correct, points: correct ? 1 : 0, feedback: correct ? "Correct." : "Review the explanation and clue." };
}
