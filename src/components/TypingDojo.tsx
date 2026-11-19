"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CURRICULUM_CONTENT,
  readReviewStore,
  type ReviewStore,
} from "@/game/data/content";

type DojoMode = "acronym" | "ports" | "phrase";
type Prompt = { question: string; answer: string };
type Run = { wpm: number; accuracy: number; date: string; durationMs?: number };
type DojoSave = {
  version: 1;
  runs: Run[];
  bestWpm: number;
  weakKeys: Record<string, number>;
  bestReplay?: { answer: string; durationMs: number; wpm: number };
};

const STORAGE_KEY = "legend-typing-dojo-v1";
const MAX_SAVED_RUNS = 100;
const MAX_ADAPTIVE_RUNS = 5;
const MIN_ACCURACY_FOR_BEST = 90;

const PROMPTS: Record<DojoMode, Prompt[]> = {
  acronym: [
    { question: "SIEM", answer: "Security information and event management" },
    { question: "MFA", answer: "Multifactor authentication" },
    { question: "VPN", answer: "Virtual private network" },
    { question: "IDS", answer: "Intrusion detection system" },
    { question: "DLP", answer: "Data loss prevention" },
  ],
  ports: [
    { question: "DNS · enter the default port", answer: "53" },
    { question: "HTTP · enter the default port", answer: "80" },
    { question: "HTTPS · enter the default port", answer: "443" },
    { question: "SSH · enter the default port", answer: "22" },
  ],
  phrase: [
    { question: "Type the definition", answer: "A vulnerability is a weakness that a threat could exploit." },
    { question: "Type the definition", answer: "Integrity means data remains accurate and unchanged." },
    { question: "Type the safe action", answer: "Report suspicious messages using a trusted channel." },
    { question: "Type the principle", answer: "Give each account only the access it needs." },
  ],
};

const MODE_LABELS: Record<DojoMode, string> = {
  acronym: "Acronym Unpacker",
  ports: "Port Defender",
  phrase: "Exact Phrase",
};

const EMPTY_SAVE: DojoSave = { version: 1, runs: [], bestWpm: 0, weakKeys: {} };

function isDojoSave(value: unknown): value is DojoSave {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return record.version === 1
    && typeof record.bestWpm === "number"
    && Number.isFinite(record.bestWpm)
    && record.bestWpm >= 0
    && Array.isArray(record.runs)
    && record.runs.every((run) => {
      if (!run || typeof run !== "object") return false;
      const item = run as Record<string, unknown>;
      return typeof item.wpm === "number"
        && Number.isFinite(item.wpm)
        && item.wpm >= 0
        && typeof item.accuracy === "number"
        && item.accuracy >= 0
        && item.accuracy <= 1
        && typeof item.date === "string"
        && (item.durationMs === undefined || (typeof item.durationMs === "number" && Number.isFinite(item.durationMs) && item.durationMs >= 0));
    })
    && !!record.weakKeys
    && typeof record.weakKeys === "object"
    && Object.values(record.weakKeys).every((count) => (
      typeof count === "number" && Number.isInteger(count) && count >= 0
    ))
    && (record.bestReplay === undefined || (
      typeof record.bestReplay === "object"
      && record.bestReplay !== null
      && typeof (record.bestReplay as Record<string, unknown>).answer === "string"
      && typeof (record.bestReplay as Record<string, unknown>).durationMs === "number"
      && typeof (record.bestReplay as Record<string, unknown>).wpm === "number"
    ));
}

function readSave(): { save: DojoSave; error: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { save: EMPTY_SAVE, error: "" };
    const parsed: unknown = JSON.parse(raw);
    if (!isDojoSave(parsed)) throw new Error("Saved Typing Dojo data has an unsupported format.");
    return { save: parsed, error: "" };
  } catch (error) {
    console.error("Could not load Typing Dojo progress.", error);
    return { save: EMPTY_SAVE, error: "Saved Typing Dojo progress could not be read; this session will start fresh." };
  }
}

function choosePrompt(mode: DojoMode, weakKeys: Record<string, number>): Prompt {
  const candidates = PROMPTS[mode];
  const weighted = candidates.map((prompt) => {
    const keyMatches = [...prompt.answer.toLowerCase()]
      .reduce((count, key) => count + (weakKeys[key] ?? 0), 0);
    return { prompt, weight: 1 + keyMatches };
  });
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  let choice = Math.random() * totalWeight;
  for (const item of weighted) {
    choice -= item.weight;
    if (choice < 0) return item.prompt;
  }
  return candidates[0];
}

function measureRun(correctKeys: number, attemptedKeys: number, startedAt: number) {
  const minutes = Math.max((Date.now() - startedAt) / 60_000, 1 / 60_000);
  return {
    wpm: Math.round((correctKeys / 5) / minutes),
    accuracy: attemptedKeys ? Math.round((correctKeys / attemptedKeys) * 100) : 0,
  };
}

export default function TypingDojo({ timersDisabled = false }: { timersDisabled?: boolean }) {
  const [mode, setMode] = useState<DojoMode>("acronym");
  const [saved, setSaved] = useState<DojoSave>(EMPTY_SAVE);
  const [prompt, setPrompt] = useState<Prompt>(() => PROMPTS.acronym[0]);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");
  const [liveStats, setLiveStats] = useState<{ wpm: number; accuracy: number } | null>(null);
  const [runStats, setRunStats] = useState<Run | null>(null);
  const [combo, setCombo] = useState(0);
  const [roundStartedAt, setRoundStartedAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const startedAt = useRef<number | null>(null);
  const submitRound = useRef<() => void>(() => {});
  const correctKeys = useRef(0);
  const attemptedKeys = useRef(0);
  const currentCombo = useRef(0);
  const promptSequence = useRef(0);
  const [loadError, setLoadError] = useState("");
  const [ghostRace, setGhostRace] = useState(false);
  const [review, setReview] = useState<ReviewStore | null>(null);

  useEffect(() => {
    const result = readSave();
    setSaved(result.save);
    setLoadError(result.error);
    setReview(readReviewStore().store);
  }, []);

  const averageWpm = useMemo(() => {
    const recent = saved.runs.slice(-MAX_ADAPTIVE_RUNS);
    if (!recent.length) return 0;
    return Math.round(recent.reduce((sum, run) => sum + run.wpm, 0) / recent.length);
  }, [saved.runs]);

  function resetRound(nextMode = mode) {
    setGhostRace(false);
    const nextPrompt = choosePrompt(nextMode, saved.weakKeys);
    if (PROMPTS[nextMode].length > 1 && nextPrompt === prompt && promptSequence.current % 2 === 0) {
      const alternate = PROMPTS[nextMode].find((item) => item !== prompt);
      if (alternate) {
        setPrompt(alternate);
      } else {
        setPrompt(nextPrompt);
      }
    } else {
      setPrompt(nextPrompt);
    }
    promptSequence.current += 1;
    setAnswer("");
    setFeedback("");
    setLiveStats(null);
    setRunStats(null);
    setCombo(0);
    setRoundStartedAt(null);
    setTimeLeft(null);
    currentCombo.current = 0;
    startedAt.current = null;
    correctKeys.current = 0;
    attemptedKeys.current = 0;
  }

  function changeMode(nextMode: DojoMode) {
    setMode(nextMode);
    resetRound(nextMode);
  }

  function startGhostRace() {
    const replay = saved.bestReplay;
    if (!replay) return;
    setMode("phrase");
    setGhostRace(true);
    setPrompt({ question: "Race your own best run", answer: replay.answer });
    setAnswer("");
    setFeedback("");
    setLiveStats(null);
    setRunStats(null);
    setCombo(0);
    setRoundStartedAt(null);
    setTimeLeft(null);
    currentCombo.current = 0;
    startedAt.current = null;
    correctKeys.current = 0;
    attemptedKeys.current = 0;
  }

  function handleChange(value: string) {
    const appended = value.length > answer.length ? value.slice(answer.length) : "";
    if (appended) {
      if (startedAt.current === null) {
        startedAt.current = Date.now();
        setRoundStartedAt(startedAt.current);
        setTimeLeft(timersDisabled ? null : timeLimitSeconds);
      }
      const weakKeys = { ...saved.weakKeys };
      for (let index = 0; index < appended.length; index += 1) {
        const character = appended[index];
        const position = answer.length + index;
        const expected = prompt.answer[position];
        attemptedKeys.current += 1;
        if (character?.toLowerCase() === expected?.toLowerCase()) {
          correctKeys.current += 1;
          currentCombo.current += 1;
          setCombo(currentCombo.current);
        } else {
          const key = character?.toLowerCase() ?? "";
          weakKeys[key] = (weakKeys[key] ?? 0) + 1;
          currentCombo.current = 0;
          setCombo(0);
        }
      }
      if (weakKeys !== saved.weakKeys) setSaved((current) => ({ ...current, weakKeys }));
      setLiveStats(measureRun(correctKeys.current, attemptedKeys.current, startedAt.current!));
    }
    setAnswer(value);
    setFeedback("");
  }

  function submitAnswer() {
    if (runStats) {
      resetRound();
      return;
    }
    if (startedAt.current === null) {
      setFeedback("Type your answer first, then check it.");
      return;
    }

    const stats = measureRun(correctKeys.current, attemptedKeys.current, startedAt.current);
    const correct = answer.trim().toLowerCase() === prompt.answer.toLowerCase();
    const durationMs = Date.now() - startedAt.current;
    const run: Run = { wpm: stats.wpm, accuracy: stats.accuracy / 100, date: new Date().toISOString(), durationMs };
    const nextRuns = [...saved.runs, run].slice(-MAX_SAVED_RUNS);
    const bestWpm = stats.accuracy >= MIN_ACCURACY_FOR_BEST
      ? Math.max(saved.bestWpm, stats.wpm)
      : saved.bestWpm;
    const bestReplay = stats.accuracy >= MIN_ACCURACY_FOR_BEST && stats.wpm > saved.bestWpm
      ? { answer: prompt.answer, durationMs, wpm: stats.wpm }
      : saved.bestReplay;
    const nextSave = { ...saved, runs: nextRuns, bestWpm, ...(bestReplay ? { bestReplay } : {}) };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSave));
      setSaved(nextSave);
      setLoadError("");
    } catch (error) {
      console.error("Could not save Typing Dojo progress.", error);
      setLoadError("This run is shown, but browser storage could not save it.");
    }

    setRunStats(run);
    setFeedback(correct
      ? "Correct. Nice work."
      : `Not quite. The answer is: ${prompt.answer}`);
  }

  const accuracy = runStats ? Math.round(runStats.accuracy * 100) : liveStats?.accuracy;
  const accuracyLabel = accuracy === undefined ? "—" : `${accuracy}%`;
  const targetWpm = averageWpm ? Math.max(1, Math.round(averageWpm * 1.05)) : 20;
  const timeLimitSeconds = Math.min(
    120,
    ghostRace && saved.bestReplay
      ? Math.max(8, Math.ceil(saved.bestReplay.durationMs / 1000))
      : Math.max(8, Math.ceil((prompt.answer.length / 5 / targetWpm) * 60 * 1.5)),
  );
  const domainAccuracy = (["hardware", "network", "security"] as const).map((district) => {
    const cards = CURRICULUM_CONTENT.cards.filter((card) => card.district === district);
    const progress = cards.flatMap((card) => {
      const state = review?.cards[card.id];
      return state ? [state] : [];
    });
    const attempts = progress.reduce((sum, state) => sum + state.attempts, 0);
    const correct = progress.reduce((sum, state) => sum + state.correct, 0);
    return { district, attempts, accuracy: attempts ? Math.round(correct / attempts * 100) : null };
  });
  const wpmTrend = saved.runs.slice(-5);
  const runElapsed = roundStartedAt === null ? 0 : Date.now() - roundStartedAt;
  const ghostProgress = saved.bestReplay
    ? Math.min(100, Math.round(runElapsed / saved.bestReplay.durationMs * 100))
    : 0;
  const playerProgress = Math.min(100, Math.round(answer.length / Math.max(prompt.answer.length, 1) * 100));
  submitRound.current = submitAnswer;

  useEffect(() => {
    if (timersDisabled || roundStartedAt === null || runStats) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, timeLimitSeconds - Math.floor((Date.now() - roundStartedAt) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) submitRound.current();
    }, 250);
    return () => window.clearInterval(timer);
  }, [roundStartedAt, runStats, timeLimitSeconds, timersDisabled]);

  return (
    <section className="rounded border border-[#526a59] bg-[#19251f] p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-[#9bc5a8]">SKILL WARM-UP · LOCAL PROGRESS</p>
          <h2 className="mt-2 text-xl font-bold text-[#f2e5b9]">Typing Dojo</h2>
          <p className="mt-1 text-sm text-[#c5cebf]">Practice security language. Type carefully first; speed will build with accuracy.</p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center font-mono text-[10px]">
          <div className="rounded border border-[#405148] bg-[#101815] px-3 py-2">
            <p className="text-[#9bc5a8]">5-RUN AVG</p><p className="mt-1 text-sm text-white">{averageWpm} WPM</p>
          </div>
          <div className="rounded border border-[#405148] bg-[#101815] px-3 py-2">
            <p className="text-[#9bc5a8]">NEXT TARGET</p><p className="mt-1 text-sm text-white">{targetWpm} WPM</p>
          </div>
          <div className="rounded border border-[#405148] bg-[#101815] px-3 py-2">
            <p className="text-[#9bc5a8]">BEST</p><p className="mt-1 text-sm text-white">{saved.bestWpm} WPM</p>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2" aria-label="Typing modes">
        {(Object.keys(MODE_LABELS) as DojoMode[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => changeMode(item)}
            aria-pressed={mode === item}
            className={`min-h-10 rounded border px-3 py-2 font-mono text-xs ${mode === item ? "border-[#c6d9a5] bg-[#344c3b] text-white" : "border-[#405148] text-[#c5cebf] hover:bg-white/5"}`}
          >
            {MODE_LABELS[item]}
          </button>
        ))}
        <button type="button" onClick={startGhostRace} disabled={!saved.bestReplay} className="min-h-10 rounded border border-[#526a59] px-3 py-2 font-mono text-xs disabled:opacity-40">
          Race my best
        </button>
      </div>

      <div className="mt-4 rounded border border-[#405148] bg-[#101815] p-4">
        <p className="font-mono text-xs text-[#9bc5a8]">{MODE_LABELS[mode].toUpperCase()}</p>
        <h3 className="mt-2 text-lg font-semibold text-white">{prompt.question}</h3>
        {ghostRace && saved.bestReplay && (
          <div className="mt-3 space-y-2" aria-label="Ghost race progress">
            <div className="flex items-center justify-between text-xs"><span>YOU</span><span>{playerProgress}%</span></div>
            <div className="h-2 overflow-hidden rounded bg-[#27352c]"><div className="h-full bg-[#9bc5a8]" style={{ width: `${playerProgress}%` }} /></div>
            <div className="flex items-center justify-between text-xs"><span>YOUR BEST GHOST</span><span>{ghostProgress}%</span></div>
            <div className="h-2 overflow-hidden rounded bg-[#27352c]"><div className="h-full bg-[#e7d8ac]" style={{ width: `${ghostProgress}%` }} /></div>
          </div>
        )}
        <label className="mt-4 block text-xs text-[#c5cebf]" htmlFor="typing-dojo-answer">Your answer</label>
        <input
          id="typing-dojo-answer"
          value={answer}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submitAnswer();
            }
          }}
          disabled={Boolean(runStats)}
          autoComplete="off"
          spellCheck={false}
          className="mt-1 min-h-12 w-full rounded border border-[#526a59] bg-[#0a110e] px-3 font-mono text-sm text-white outline-none focus:border-[#c6d9a5] disabled:opacity-70"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-xs text-[#aeb7a7]">WPM · {runStats?.wpm ?? liveStats?.wpm ?? "—"} <span className="mx-2">|</span> STREAK · {combo} <span className="mx-2">|</span> ACCURACY · {accuracyLabel} <span className="mx-2">|</span> {timersDisabled ? "UNTIMED PRACTICE" : `TIME · ${timeLeft === null ? `${timeLimitSeconds}s` : `${timeLeft}s`}`}</p>
          <button
            type="button"
            onClick={submitAnswer}
            className="min-h-10 rounded border border-[#a7c597]/60 bg-[#283b2f] px-4 py-2 font-mono text-xs font-bold text-[#d8efcb] hover:bg-[#344c3b]"
          >
            {runStats ? "Next round" : "Check answer"}
          </button>
        </div>
        {feedback && <p aria-live="polite" className="mt-3 text-sm text-[#e7d8ac]">{feedback}</p>}
        {runStats && (
          <p className="mt-2 font-mono text-xs text-[#a9c8b0]">
            {runStats.wpm} WPM · {Math.round(runStats.accuracy * 100)}% accuracy
            {runStats.accuracy * 100 < MIN_ACCURACY_FOR_BEST ? " · 90% accuracy is needed for a new best." : ""}
            {ghostRace && saved.bestReplay && runStats.durationMs !== undefined
              ? ` · ${runStats.durationMs <= saved.bestReplay.durationMs ? "Beat your ghost!" : `Ghost finished ${Math.ceil((runStats.durationMs - saved.bestReplay.durationMs) / 1000)}s ahead.`}`
              : ""}
          </p>
        )}
        {loadError && <p role="status" className="mt-2 text-xs text-amber-200">{loadError}</p>}
      </div>
      <section className="rounded border border-[#405148] bg-[#101815] p-4" aria-labelledby="typing-dashboard-title">
        <h3 id="typing-dashboard-title" className="font-mono text-xs tracking-widest text-[#e7d8ac]">LEARNING DASHBOARD</h3>
        <p className="mt-1 text-xs text-[#aeb7a7]">Recent typing speed and quiz accuracy are stored locally in this browser.</p>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div>
            <p className="text-xs text-[#c5cebf]">WPM trend · last 5 runs</p>
            {wpmTrend.length ? (
              <div className="mt-2 flex h-28 items-end gap-2" aria-label="Recent words-per-minute trend">
                {wpmTrend.map((run, index) => {
                  const height = Math.max(8, Math.round(run.wpm / Math.max(...wpmTrend.map((item) => item.wpm), 1) * 100));
                  return <div key={`${run.date}-${index}`} className="flex flex-1 flex-col items-center justify-end gap-1">
                    <span className="text-[10px]">{run.wpm}</span>
                    <div className="w-full rounded-t bg-[#829b71]" style={{ height: `${height}%` }} aria-label={`${run.wpm} WPM`} />
                  </div>;
                })}
              </div>
            ) : <p className="mt-2 text-xs text-[#aeb7a7]">Complete a typing round to start the trend.</p>}
          </div>
          <div>
            <p className="text-xs text-[#c5cebf]">Quiz accuracy by exam district</p>
            <dl className="mt-2 space-y-2">
              {domainAccuracy.map((item) => <div key={item.district} className="flex justify-between gap-3 text-xs">
                <dt className="capitalize">{item.district}</dt>
                <dd>{item.accuracy === null ? "No quiz answers yet" : `${item.accuracy}% · ${item.attempts} attempts`}</dd>
              </div>)}
            </dl>
          </div>
        </div>
      </section>
    </section>
  );
}
