"use client";

import { useMemo, useState } from "react";
import { PHISH_MESSAGES } from "@/game/data/content/phish";

const RED_FLAGS = [
  "urgent deadline",
  "password request",
  "MFA code request",
  "spoofed sender",
  "unexpected attachment",
  "payment change",
  "bypassing process",
  "unexpected fee",
  "unverified link",
  "unexpected MFA request",
  "one-time code request",
  "unverified caller",
  "new unverified account",
  "verification code request",
  "avoid official channel",
  "unexpected QR login",
  "credential request",
  "unverified destination",
  "unsolicited MFA prompt",
  "repeated approval requests",
  "unsolicited MFA code",
  "urgent threat",
  "unverified phone number",
];
const ACTIONS = [
  "Report it using the approved security-report button.",
  "Verify the request using a known phone number and report the message.",
  "Do not open the link; check tracking in the carrier's official app or website.",
  "Decline, end the call, and contact IT through the known help desk number.",
  "Do not send details; report the account and contact support through the official app.",
  "Close the page and ask IT using a known contact method.",
  "Reject the prompts and report them; change credentials through the known sign-in page if instructed.",
  "Open the saved company portal directly and check the assignment there.",
  "Open the shared workspace from your saved bookmark and review the notes.",
  "Do not reply or share the code; report the message and review account activity through the official app.",
];

function shuffled<T>(values: T[]): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export default function PhishHunt() {
  const [round] = useState(() => shuffled(PHISH_MESSAGES));
  const [view, setView] = useState<"inbox" | "phone">("inbox");
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [verdict, setVerdict] = useState<"phish" | "legit" | "">("");
  const [flags, setFlags] = useState<string[]>([]);
  const [action, setAction] = useState("");
  const [checked, setChecked] = useState(false);
  const [points, setPoints] = useState(0);
  const [caught, setCaught] = useState<Record<string, string[]>>({});
  const messages = round.filter((item) => view === "inbox"
    ? item.channel === "Work email"
    : item.channel !== "Work email");
  const message = messages[index % messages.length];
  const missedFlags = useMemo(() => message.redFlags.filter((flag) => !flags.includes(flag)), [flags, message.redFlags]);

  function checkAnswer() {
    if (!verdict || !action || checked) return;
    const correctVerdict = verdict === message.verdict;
    const correctFlags = message.redFlags.filter((flag) => flags.includes(flag)).length;
    const falseFlags = flags.filter((flag) => !message.redFlags.includes(flag)).length;
    const actionSafe = message.verdict === "phish"
      ? !action.includes("Open the shared workspace") && !action.includes("Open the saved company")
      : action.includes("Open the shared workspace") || action.includes("Open the saved company");
    const earned = (correctVerdict ? 1 : 0) + Math.max(0, correctFlags - falseFlags) + (actionSafe ? 1 : 0);
    setPoints((current) => current + earned);
    setCaught((current) => ({ ...current, [message.id]: missedFlags }));
    setChecked(true);
  }

  function next() {
    setIndex((current) => (current + 1) % messages.length);
    setExpanded(false);
    setVerdict("");
    setFlags([]);
    setAction("");
    setChecked(false);
  }

  function changeView(nextView: "inbox" | "phone") {
    setView(nextView);
    setIndex(0);
    setExpanded(false);
    setVerdict("");
    setFlags([]);
    setAction("");
    setChecked(false);
  }

  function toggleFlag(flag: string) {
    setFlags((current) => current.includes(flag) ? current.filter((value) => value !== flag) : [...current, flag]);
  }

  return (
    <section className="space-y-4 rounded border border-[#526a59] bg-[#19251f] p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-[#9bc5a8]">PHISH HUNT · FICTIONAL MESSAGES</p>
          <h2 className="mt-2 text-xl font-bold text-[#f2e5b9]">{view === "inbox" ? "Work inbox" : "Personal phone"} · {index + 1} of {messages.length}</h2>
          <p className="mt-1 text-sm text-[#c5cebf]">Decide whether it is phishing, select the clues you noticed, then choose a safe action.</p>
        </div>
        <p className="font-mono text-xs" aria-live="polite">POINTS · {points} · FLAG MISSES · {Object.values(caught).flat().length}</p>
      </header>

      <div className="flex flex-wrap gap-2" aria-label="Message surface">
        <button type="button" onClick={() => changeView("inbox")} aria-pressed={view === "inbox"} className={`min-h-10 rounded border px-3 text-xs ${view === "inbox" ? "border-[#c6d9a5] bg-[#344c3b]" : "border-[#405148]"}`}>Work inbox · 12 messages</button>
        <button type="button" onClick={() => changeView("phone")} aria-pressed={view === "phone"} className={`min-h-10 rounded border px-3 text-xs ${view === "phone" ? "border-[#c6d9a5] bg-[#344c3b]" : "border-[#405148]"}`}>Phone · 28 messages</button>
      </div>

      <article className="rounded border border-[#405148] bg-[#101815] p-4">
        <p className="font-mono text-[10px] text-[#9bc5a8]">{message.channel.toUpperCase()} · {message.preview}</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[#dbe1d4]">
            {view === "phone" ? message.sender.split("<")[0].trim() : "Inspect the full sender before deciding"}
          </p>
          <button type="button" onClick={() => setExpanded((open) => !open)} aria-expanded={expanded} className="min-h-10 rounded border border-[#526a59] px-3 text-xs"> {expanded ? "Hide sender details" : view === "phone" ? "Tap to inspect sender" : "Show full sender"} </button>
        </div>
        {expanded && <p className="mt-2 break-all font-mono text-xs text-[#e7d8ac]">{message.sender}</p>}
        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-[#f0f0e8]">{message.body}</p>
      </article>

      <div className="grid gap-4 lg:grid-cols-2">
        <fieldset className="rounded border border-[#405148] p-3">
          <legend className="px-1 font-mono text-xs text-[#e7d8ac]">1 · YOUR VERDICT</legend>
          <div className="mt-2 flex gap-2">
            {(["phish", "legit"] as const).map((value) => <button key={value} type="button" disabled={checked} aria-pressed={verdict === value} onClick={() => setVerdict(value)} className={`min-h-11 rounded border px-4 font-mono text-xs ${verdict === value ? "border-[#c6d9a5] bg-[#344c3b]" : "border-[#405148]"}`}>{value.toUpperCase()}</button>)}
          </div>
        </fieldset>
        <label className="rounded border border-[#405148] p-3">
          <span className="font-mono text-xs text-[#e7d8ac]">3 · SAFEST NEXT ACTION</span>
          <select value={action} disabled={checked} onChange={(event) => setAction(event.target.value)} className="mt-2 min-h-11 w-full rounded border border-[#526a59] bg-[#101815] px-3 text-sm text-white">
            <option value="">Choose an action</option>
            {ACTIONS.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
          </select>
        </label>
      </div>

      <fieldset className="rounded border border-[#405148] p-3">
        <legend className="px-1 font-mono text-xs text-[#e7d8ac]">2 · CLUES YOU NOTICED</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {RED_FLAGS.map((flag) => <label key={flag} className="flex min-h-10 items-center gap-2 text-xs text-[#dbe1d4]">
            <input type="checkbox" checked={flags.includes(flag)} disabled={checked} onChange={() => toggleFlag(flag)} />
            {flag}
          </label>)}
        </div>
      </fieldset>

      {!checked ? (
        <button type="button" onClick={checkAnswer} disabled={!verdict || !action} className="min-h-11 rounded bg-[#344c3b] px-4 font-mono text-xs disabled:opacity-40">Check my answer</button>
      ) : (
        <div className="rounded border border-[#50634e] bg-[#17221c] p-4" aria-live="polite">
          <p className="font-mono text-sm font-bold text-[#e7d8ac]">{verdict === message.verdict ? "VERDICT CORRECT" : `NOT QUITE · THIS MESSAGE IS ${message.verdict.toUpperCase()}`}</p>
          <p className="mt-2 text-sm leading-6 text-[#dbe1d4]">{message.explanation}</p>
          <p className="mt-2 text-xs text-[#c5cebf]"><strong>Useful clues:</strong> {message.redFlags.length ? message.redFlags.join(", ") : "No clear phishing red flag; verify using the known company portal."}</p>
          {flags.length > 0 && <p className="mt-2 text-xs text-[#b8d7bf]"><strong>Clues you caught:</strong> {message.redFlags.filter((flag) => flags.includes(flag)).join(", ") || "No correct clues selected."}</p>}
          {missedFlags.length > 0 && <p className="mt-2 text-xs text-amber-200">Clues you can review: {missedFlags.join(", ")}</p>}
          <p className="mt-2 text-xs text-[#c5cebf]"><strong>Safe action:</strong> {message.action}</p>
          <button type="button" onClick={next} className="mt-4 min-h-11 rounded border border-[#526a59] px-4 font-mono text-xs">Next message</button>
        </div>
      )}
      <p className="text-xs text-[#aeb7a7]">Training only: every company, message, sender, and domain is fictional. Never test a suspicious link by opening it.</p>
    </section>
  );
}
