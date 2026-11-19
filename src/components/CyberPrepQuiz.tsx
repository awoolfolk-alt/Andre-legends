"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CURRICULUM_CONTENT, interactionForFormat, scoreQuizResponse, type Card } from "@/game/data/content";
import {
  dueCardIds,
  readReviewStore,
  recordCardAnswer,
  REVIEW_STORAGE_KEY,
  STARTING_WEAK_SPOTS,
  weakCardIds,
  type ReviewStore,
} from "@/game/data/content/review";

type QuizMode = "all" | "due";

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function highlightClues(text: string, clues: string[]): ReactNode[] {
  const validClues = clues.filter(Boolean).sort((a, b) => b.length - a.length);
  if (!validClues.length) return [text];
  const expression = new RegExp(`(${validClues.map((clue) => clue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return text.split(expression).map((part, index) => (
    validClues.some((clue) => clue.trim().toLowerCase() === part.trim().toLowerCase())
      ? <mark key={`${part}-${index}`} className="rounded bg-[#71602c] px-0.5 text-white">{part}</mark>
      : part
  ));
}

function Feedback({ card, isCorrect }: { card: Card; isCorrect: boolean }) {
  return (
    <div className="mt-4 rounded border border-[#405148] bg-[#101815] p-4" aria-live="polite">
      <p className={`font-mono text-sm font-bold ${isCorrect ? "text-emerald-300" : "text-amber-200"}`}>
        {isCorrect ? "CORRECT" : "NOT QUITE"}
      </p>
      <p className="mt-2 text-sm leading-6 text-[#e0e5d8]">{card.explanation}</p>
      {!isCorrect && <p className="mt-2 text-xs text-[#c5cebf]">Expected: {card.answer.join(" → ")}</p>}
      {card.versions && (
        <div className="mt-3 rounded border border-[#665d3e] p-3 text-xs leading-5">
          <p className="font-mono text-[#e7d8ac]">VERSION CHECK</p>
          {Object.entries(card.versions).map(([label, version]) => (
            <p key={label} className="mt-1 text-[#dbe1d4]"><strong>{label}:</strong> {version}</p>
          ))}
        </div>
      )}
      {card.sourceUrl && (
        <a
          href={card.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block min-h-10 rounded border border-[#526a59] px-3 py-2 text-xs text-[#b8d7bf] underline hover:bg-white/5"
        >
          Verify with official reference ↗
        </a>
      )}
    </div>
  );
}

export default function CyberPrepQuiz({ cardIds }: { cardIds?: string[] }) {
  const availableCards = useMemo(() => {
    if (!cardIds) return CURRICULUM_CONTENT.cards;
    const filter = new Set(cardIds);
    return CURRICULUM_CONTENT.cards.filter((card) => filter.has(card.id));
  }, [cardIds]);
  const [mode, setMode] = useState<QuizMode>("all");
  const [review, setReview] = useState<ReviewStore>({ version: 1, cards: {} });
  const [storageError, setStorageError] = useState("");
  const [roundIds, setRoundIds] = useState(() => shuffle(availableCards.map((card) => card.id)));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [ordered, setOrdered] = useState<string[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);

  useEffect(() => {
    const loaded = readReviewStore();
    setReview(loaded.store);
    setStorageError(loaded.error);
  }, []);

  const cardsById = useMemo(() => new Map(CURRICULUM_CONTENT.cards.map((card) => [card.id, card])), []);
  const card = cardsById.get(roundIds[index]) ?? CURRICULUM_CONTENT.cards[0];
  const dueIds = dueCardIds(review);
  const weakIds = weakCardIds(review);
  const reviewMode = mode === "due";
  const interaction = interactionForFormat(card.format);
  const isMulti = interaction === "multi";
  const isOrdering = interaction === "order";
  const isTyped = interaction === "typed";
  const choiceOptions = useMemo(
    () => (isOrdering ? shuffle(card.options) : card.options),
    [card.id, isOrdering, card.options],
  );

  function start(nextMode: QuizMode) {
    setMode(nextMode);
    const due = new Set(dueCardIds(review));
    const ids = nextMode === "due"
      ? availableCards.filter((item) => due.has(item.id)).map((item) => item.id)
      : availableCards.map((item) => item.id);
    setRoundIds(shuffle(ids));
    setIndex(0);
    setSelected([]);
    setTyped("");
    setOrdered([]);
    setResult(null);
    setScore(0);
    setAnswered(0);
  }

  function submit() {
    if (result !== null) return;
    const scored = scoreQuizResponse(card, { selected, typed, ordered });
    const { correct, points } = scored;

    const updated = recordCardAnswer(review, card.id, correct);
    try {
      localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(updated));
      setStorageError("");
    } catch (error) {
      console.error("Could not save quiz review progress.", error);
      setStorageError("This answer was scored, but browser storage could not save the review schedule.");
    }
    setReview(updated);
    setResult(correct);
    setScore((current) => current + points);
    setAnswered((current) => current + 1);
  }

  function next() {
    const nextIndex = index + 1;
    if (nextIndex >= roundIds.length) {
      start(mode);
      return;
    }
    setIndex(nextIndex);
    setSelected([]);
    setTyped("");
    setOrdered([]);
    setResult(null);
  }

  function toggleSelection(option: string) {
    if (result !== null) return;
    if (isMulti) {
      setSelected((current) => current.includes(option)
        ? current.filter((value) => value !== option)
        : [...current, option]);
    } else {
      setSelected([option]);
    }
  }

  function addOrderStep(option: string) {
    if (result !== null || ordered.includes(option)) return;
    setOrdered((current) => [...current, option]);
  }

  const clueHighlighted = highlightClues(card.prompt, card.clueWords);

  if (!roundIds.length) {
    return (
      <section className="rounded border border-[#526a59] bg-[#19251f] p-5">
        <h2 className="text-xl font-bold text-[#f2e5b9]">Review queue is clear</h2>
        <p className="mt-2 text-sm text-[#dbe1d4]">No cards are due today. Practice the full deck or return when your next review is due.</p>
        <button onClick={() => start("all")} className="mt-4 min-h-10 rounded border border-[#526a59] px-4 py-2 text-sm text-white">Practice all cards</button>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded border border-[#526a59] bg-[#19251f] p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#9bc5a8]">CHECKPOINT QUIZ · {availableCards.length} ORIGINAL QUESTIONS</p>
            <h2 className="mt-2 text-xl font-bold text-[#f2e5b9]">Quiz & spaced review</h2>
            <p className="mt-1 text-sm text-[#c5cebf]">Question formats F1–F20; answers, explanations, and references are shown after each response.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => start("all")} className={`min-h-10 rounded border px-3 py-2 text-xs ${!reviewMode ? "border-[#c6d9a5] bg-[#344c3b] text-white" : "border-[#405148] text-[#c5cebf]"}`}>Full deck</button>
            <button type="button" onClick={() => start("due")} className={`min-h-10 rounded border px-3 py-2 text-xs ${reviewMode ? "border-[#c6d9a5] bg-[#344c3b] text-white" : "border-[#405148] text-[#c5cebf]"}`}>Review due · {dueIds.length}</button>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded border border-[#405148] bg-[#101815] p-3"><p className="font-mono text-[10px] text-[#9bc5a8]">ROUND</p><p className="mt-1 text-sm text-white">{Math.min(index + 1, roundIds.length)} / {roundIds.length}</p></div>
          <div className="rounded border border-[#405148] bg-[#101815] p-3"><p className="font-mono text-[10px] text-[#9bc5a8]">POINTS</p><p className="mt-1 text-sm text-white">{score.toFixed(2)} / {answered}</p></div>
          <div className="rounded border border-[#405148] bg-[#101815] p-3"><p className="font-mono text-[10px] text-[#9bc5a8]">WEAK CARDS</p><p className="mt-1 text-sm text-white">{weakIds.length} · missed twice or more</p></div>
        </div>
        {storageError && <p role="status" className="mt-3 text-xs text-amber-200">{storageError}</p>}
      </section>

      <section className="rounded border border-[#526a59] bg-[#19251f] p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-[#9bc5a8]">
          <span>{card.format} · {card.district.toUpperCase()} · DIFFICULTY {card.difficulty}</span>
          <span>{card.objective}</span>
        </div>
        <h3 className="mt-4 whitespace-pre-line text-lg font-semibold leading-7 text-white">{clueHighlighted}</h3>
        {isTyped ? (
          <label className="mt-4 block text-xs text-[#c5cebf]">
            {card.format === "F20" ? "Write one clear sentence that explains why." : "Type your answer"}
            <textarea
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              disabled={result !== null}
              rows={card.format === "F20" ? 3 : 1}
              className="mt-2 min-h-12 w-full rounded border border-[#526a59] bg-[#0a110e] p-3 font-mono text-sm text-white outline-none focus:border-[#c6d9a5] disabled:opacity-70"
            />
          </label>
        ) : isOrdering ? (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-[#c5cebf]">Tap items in order. Use undo if you pick one incorrectly.</p>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-[#e0e5d8]">
              {ordered.map((item) => <li key={item}>{item}</li>)}
            </ol>
            <div className="grid gap-2 sm:grid-cols-2">
              {choiceOptions.map((option) => (
                <button key={option} type="button" onClick={() => addOrderStep(option)} disabled={ordered.includes(option) || result !== null}
                  className="min-h-11 rounded border border-[#405148] px-3 py-2 text-left text-sm text-white enabled:hover:bg-white/5 disabled:opacity-40">{option}</button>
              ))}
            </div>
            <button type="button" onClick={() => setOrdered((current) => current.slice(0, -1))} disabled={!ordered.length || result !== null}
              className="min-h-10 rounded border border-[#665d3e] px-3 py-2 text-xs text-[#e7d8ac] disabled:opacity-40">Undo last step</button>
          </div>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {card.options.map((option) => {
              const isSelected = selected.includes(option);
              return (
                <button key={option} type="button" onClick={() => toggleSelection(option)} disabled={result !== null}
                  aria-pressed={isSelected}
                  className={`min-h-11 rounded border px-3 py-2 text-left text-sm ${isSelected ? "border-[#c6d9a5] bg-[#344c3b] text-white" : "border-[#405148] bg-[#101815] text-[#e0e5d8]"} disabled:opacity-70`}>
                  {isMulti && <span aria-hidden="true" className="mr-2">{isSelected ? "☑" : "☐"}</span>}{option}
                </button>
              );
            })}
          </div>
        )}
        {isMulti && <p className="mt-2 text-xs text-[#aeb7a7]">{card.selectCount ? `Select exactly ${card.selectCount}.` : "Select every correct option; wrong selections reduce credit."}</p>}
        {result === null ? (
          <button type="button" onClick={submit} disabled={(isTyped && !typed.trim()) || (isMulti && !selected.length) || (isOrdering && !ordered.length) || (!isTyped && !isMulti && !isOrdering && !selected.length)}
            className="mt-5 min-h-11 rounded border border-[#a7c597]/60 bg-[#283b2f] px-5 py-2 font-mono text-xs font-bold text-[#d8efcb] disabled:opacity-40">Submit answer</button>
        ) : (
          <>
            <Feedback card={card} isCorrect={result} />
            <button type="button" onClick={next} className="mt-4 min-h-11 rounded border border-[#a7c597]/60 bg-[#283b2f] px-5 py-2 font-mono text-xs font-bold text-[#d8efcb]">
              {index + 1 === roundIds.length ? "Finish round" : "Next question"}
            </button>
          </>
        )}
      </section>

      <section className="rounded border border-[#405148] bg-[#172521] p-4">
        <h3 className="font-mono text-xs font-bold tracking-wider text-[#c6d9a5]">STARTING WEAK SPOTS & YOUR MISSES</h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {STARTING_WEAK_SPOTS.map((spot) => {
            const state = spot.cardId ? review.cards[spot.cardId] : undefined;
            return <li key={spot.id} className="rounded border border-[#405148] bg-[#101815] p-3 text-xs text-[#dbe1d4]">
              {spot.label}{state && <span className="block mt-1 text-[#aeb7a7]">{state.misses} misses · review level {state.level} · next {state.nextReview}</span>}
            </li>;
          })}
          {weakIds.filter((id) => !STARTING_WEAK_SPOTS.some((spot) => spot.cardId === id)).map((id) => (
            <li key={id} className="rounded border border-amber-800/60 bg-[#241b14] p-3 text-xs text-amber-100">
              {cardsById.get(id)?.prompt ?? id} · {review.cards[id]?.misses ?? 0} misses · due {review.cards[id]?.nextReview}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
