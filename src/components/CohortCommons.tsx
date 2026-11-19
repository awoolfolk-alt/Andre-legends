"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadCohortSnapshot,
  postMentorNote,
  readLocalCohortMetrics,
  saveBestRaidScore,
  saveCohortProfile,
  type CohortMetrics,
  type CohortNote,
  type CohortProfile,
} from "@/game/data/content/cohort";

const RAID_QUESTIONS = [
  {
    prompt: "A teammate receives an MFA approval they did not request. What is the safest immediate action?",
    options: ["Approve it to stop the prompts", "Reject it and report the unexpected request", "Send the code to the help desk"],
    answer: 1,
  },
  {
    prompt: "A vendor emails new payment details and asks you to skip the normal callback. What should you do?",
    options: ["Verify through a known phone number and follow the payment-change process", "Reply to the email to confirm", "Pay a small test amount first"],
    answer: 0,
  },
  {
    prompt: "A web server log contains a suspicious request. What is an indicator of compromise?",
    options: ["A clue that may suggest malicious activity and needs investigation", "Proof by itself that the server is compromised", "A security control that blocks all attacks"],
    answer: 0,
  },
];

type SnapshotState = {
  signedIn: boolean;
  ownProfile: CohortProfile | null;
  profiles: CohortProfile[];
  notes: CohortNote[];
};

const EMPTY_SNAPSHOT: SnapshotState = { signedIn: false, ownProfile: null, profiles: [], notes: [] };
const PRIVATE_METRICS: CohortMetrics = { best_wpm: 0, quiz_accuracy: 0, fence_tiles: 0, best_raid_score: 0 };

export default function CohortCommons() {
  const [snapshot, setSnapshot] = useState<SnapshotState>(EMPTY_SNAPSHOT);
  const [displayName, setDisplayName] = useState("");
  const [metrics, setMetrics] = useState<CohortMetrics>(PRIVATE_METRICS);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [noteTopic, setNoteTopic] = useState<CohortNote["topic"]>("study");
  const [noteText, setNoteText] = useState("");
  const [noteMessage, setNoteMessage] = useState("");
  const [raidStarted, setRaidStarted] = useState(false);
  const [raidIndex, setRaidIndex] = useState(0);
  const [raidScore, setRaidScore] = useState(0);
  const [raidAnswer, setRaidAnswer] = useState<number | null>(null);
  const [raidSaveMessage, setRaidSaveMessage] = useState("");
  const question = RAID_QUESTIONS[raidIndex];

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const next = await loadCohortSnapshot();
      if (next.error) setError(next.error);
      setSnapshot({
        signedIn: next.signedIn,
        ownProfile: next.ownProfile,
        profiles: next.profiles,
        notes: next.notes,
      });
      if (next.ownProfile) setDisplayName(next.ownProfile.display_name);
      setLoading(false);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "The cohort service could not be reached.";
      console.error("Could not load Cohort Commons.", caught);
      setError(message);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    try {
      setMetrics(readLocalCohortMetrics());
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Local learning metrics could not be read.";
      console.error("Could not read local CyberPrep metrics.", caught);
      setError(message);
    }
  }, [refresh]);

  const joined = snapshot.ownProfile?.is_shared === true;
  const authorNames = useMemo(() => {
    const profiles = [...snapshot.profiles, ...(snapshot.ownProfile ? [snapshot.ownProfile] : [])];
    return new Map(profiles.map((profile) => [profile.user_id, profile.display_name]));
  }, [snapshot.ownProfile, snapshot.profiles]);
  const boards = useMemo(() => [
    { title: "Speed · best WPM", value: (profile: CohortProfile) => profile.best_wpm },
    { title: "Quiz accuracy", value: (profile: CohortProfile) => profile.quiz_accuracy },
    { title: "Study fence tiles", value: (profile: CohortProfile) => profile.fence_tiles },
    { title: "Raid nights · best score", value: (profile: CohortProfile) => profile.best_raid_score },
  ], []);

  async function saveProfile(share: boolean) {
    setBusy(true);
    setError("");
    let updatedMetrics = metrics;
    try {
      updatedMetrics = readLocalCohortMetrics();
      if (snapshot.ownProfile) updatedMetrics.best_raid_score = snapshot.ownProfile.best_raid_score;
      setMetrics(updatedMetrics);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Could not read local learning progress.";
      setError(message);
      setBusy(false);
      return;
    }
    const message = await saveCohortProfile(displayName, share, updatedMetrics);
    setBusy(false);
    if (message) {
      setError(message);
      return;
    }
    setError("");
    await refresh();
  }

  async function sendNote() {
    setBusy(true);
    setError("");
    const message = await postMentorNote(noteTopic, noteText);
    setBusy(false);
    if (message) {
      setError(message);
      return;
    }
    setNoteText("");
    setNoteMessage("Your note was shared with signed-in cohort members.");
    await refresh();
  }

  async function nextRaidQuestion() {
    if (raidAnswer === null) return;
    const nextScore = raidScore + (raidAnswer === question.answer ? 1 : 0);
    setRaidScore(nextScore);
    setRaidAnswer(null);
    if (raidIndex === RAID_QUESTIONS.length - 1) {
      setRaidStarted(false);
      setRaidSaveMessage("Round complete. Your result is available here; joining the cohort shares your best score.");
      const saveMessage = await saveBestRaidScore(nextScore);
      if (saveMessage) setError(saveMessage);
      else if (joined) setRaidSaveMessage("Round complete. Your best score was shared with the cohort.");
      await refresh();
      return;
    }
    setRaidIndex((current) => current + 1);
  }

  function startRaid() {
    setRaidStarted(true);
    setRaidIndex(0);
    setRaidScore(0);
    setRaidAnswer(null);
    setRaidSaveMessage("");
  }

  return (
    <section className="space-y-5 rounded border border-[#526a59] bg-[#19251f] p-4 sm:p-6">
      <header>
        <p className="font-mono text-[10px] tracking-[0.2em] text-[#9bc5a8]">COHORT COMMONS · ACCOUNT-BASED · PRIVATE BY DEFAULT</p>
        <h2 className="mt-2 text-xl font-bold text-[#f2e5b9]">Study together, share only what you choose</h2>
        <p className="mt-2 text-sm leading-6 text-[#dbe1d4]">The leaderboards show a display name and aggregate practice stats only. Your email, password, game save, and exact study answers are not shown.</p>
      </header>

      {loading && <p role="status" className="text-sm text-[#c5cebf]">Loading the cohort…</p>}
      {!loading && !snapshot.signedIn && <p className="rounded border border-[#665d3e] p-3 text-sm text-[#e7d8ac]">Sign in with your own account to join the shared boards. Guest play and local learning progress still work.</p>}

      {snapshot.signedIn && (
        <section className="rounded border border-[#405148] bg-[#101815] p-4" aria-labelledby="cohort-profile-title">
          <h3 id="cohort-profile-title" className="font-mono text-xs tracking-widest text-[#e7d8ac]">COHORT PROFILE · OPT IN</h3>
          <label htmlFor="cohort-display-name" className="mt-3 block text-xs text-[#c5cebf]">Display name (do not use your email or a password)</label>
          <input id="cohort-display-name" value={displayName} maxLength={24} onChange={(event) => setDisplayName(event.target.value)} placeholder="Choose a study nickname" className="mt-1 min-h-11 w-full max-w-sm rounded border border-[#526a59] bg-[#0b100e] px-3 text-sm text-white" />
          <p className="mt-2 text-xs text-[#aeb7a7]">If you join, shared fields are best WPM, quiz accuracy, earned study-fence tiles, and your best 3-question raid score. Email and password are never included.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {!joined ? (
              <button type="button" disabled={busy} onClick={() => saveProfile(true)} className="min-h-11 rounded bg-[#344c3b] px-4 font-mono text-xs disabled:opacity-40">Join leaderboards</button>
            ) : (
              <>
                <span className="self-center text-xs text-[#b8d7bf]">Sharing is on</span>
                <button type="button" disabled={busy} onClick={() => saveProfile(false)} className="min-h-11 rounded border border-[#665d3e] px-3 text-xs disabled:opacity-40">Leave leaderboards</button>
              </>
            )}
          </div>
        </section>
      )}

      {snapshot.signedIn && (
        <div className="grid gap-4 xl:grid-cols-2">
          {boards.map((board) => {
            const ranked = [...snapshot.profiles].sort((a, b) => board.value(b) - board.value(a)).slice(0, 10);
            return <section key={board.title} className="rounded border border-[#405148] bg-[#101815] p-4">
              <h3 className="font-mono text-xs text-[#e7d8ac]">{board.title.toUpperCase()}</h3>
              {ranked.length ? <ol className="mt-3 space-y-2">
                {ranked.map((profile, index) => <li key={profile.user_id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{index + 1}. {profile.display_name}</span>
                  <span className="font-mono text-[#b8d7bf]">{board.value(profile)}{board.title === "Quiz accuracy" ? "%" : ""}</span>
                </li>)}
              </ol> : <p className="mt-3 text-xs text-[#aeb7a7]">No one has opted into this board yet.</p>}
            </section>;
          })}
        </div>
      )}

      <section className="rounded border border-[#405148] bg-[#101815] p-4" aria-labelledby="raid-night-title">
        <h3 id="raid-night-title" className="font-mono text-xs text-[#e7d8ac]">COHORT RAID NIGHT · 3-QUESTION BOSS ROUND</h3>
        {!raidStarted ? (
          <div className="mt-3">
            <p className="text-sm text-[#c5cebf]">Practice incident-response decisions. Your score stays local unless you opt into the cohort leaderboard.</p>
            <button type="button" onClick={startRaid} className="mt-3 min-h-11 rounded bg-[#344c3b] px-4 font-mono text-xs">Start Boss Round</button>
            {raidSaveMessage && <p role="status" className="mt-3 text-xs text-[#b8d7bf]">{raidSaveMessage}</p>}
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-xs text-[#9bc5a8]">Question {raidIndex + 1} of {RAID_QUESTIONS.length} · current score {raidScore}</p>
            <p className="mt-2 text-sm text-white">{question.prompt}</p>
            <div className="mt-3 grid gap-2">{question.options.map((option, index) => <button key={option} type="button" disabled={raidAnswer !== null} onClick={() => setRaidAnswer(index)} aria-pressed={raidAnswer === index} className={`min-h-11 rounded border px-3 py-2 text-left text-xs ${raidAnswer === index ? "border-[#c6d9a5] bg-[#344c3b]" : "border-[#405148]"}`}>{option}</button>)}</div>
            {raidAnswer !== null && <button type="button" onClick={nextRaidQuestion} className="mt-3 min-h-11 rounded border border-[#526a59] px-4 font-mono text-xs">{raidIndex === RAID_QUESTIONS.length - 1 ? "Finish round" : "Next question"}</button>}
          </div>
        )}
      </section>

      <section className="rounded border border-[#405148] bg-[#101815] p-4" aria-labelledby="mentor-notes-title">
        <h3 id="mentor-notes-title" className="font-mono text-xs text-[#e7d8ac]">MENTOR NOTES · SHARED WITH SIGNED-IN MEMBERS</h3>
        <p className="mt-2 text-xs text-[#aeb7a7]">Share a study tip, not personal information, credentials, incident details, or private work data. Notes are visible to signed-in cohort members.</p>
        {snapshot.signedIn && (
          <div className="mt-3 space-y-2">
            <label htmlFor="mentor-note-topic" className="sr-only">Mentor note topic</label>
            <select id="mentor-note-topic" value={noteTopic} onChange={(event) => setNoteTopic(event.target.value as CohortNote["topic"])} className="min-h-10 rounded border border-[#526a59] bg-[#0b100e] px-3 text-xs text-white">
              <option value="study">Study tip</option>
              <option value="terminal">Terminal Ops</option>
              <option value="phishing">Phish Hunt</option>
              <option value="network">Networking</option>
            </select>
            <label htmlFor="mentor-note" className="sr-only">Write a Mentor Note</label>
            <textarea id="mentor-note" value={noteText} maxLength={500} onChange={(event) => setNoteText(event.target.value)} rows={3} className="w-full rounded border border-[#526a59] bg-[#0b100e] p-3 text-sm text-white" placeholder="Explain one useful idea in your own words…" />
            <button type="button" disabled={!joined || busy || noteText.trim().length < 8} onClick={sendNote} className="min-h-10 rounded bg-[#344c3b] px-4 font-mono text-xs disabled:opacity-40">Post Mentor Note</button>
            {!joined && <p className="text-xs text-[#aeb7a7]">Join the cohort profile before posting.</p>}
          </div>
        )}
        {noteMessage && <p role="status" className="mt-2 text-xs text-[#b8d7bf]">{noteMessage}</p>}
        <ul className="mt-4 space-y-3">
          {snapshot.notes.map((note) => <li key={note.id} className="rounded border border-[#27352c] p-3">
            <p className="font-mono text-[10px] text-[#9bc5a8]">{authorNames.get(note.user_id) ?? "Cohort learner"} · {note.topic} · {new Date(note.created_at).toLocaleDateString()}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#dbe1d4]">{note.note}</p>
          </li>)}
          {!snapshot.notes.length && <li className="text-xs text-[#aeb7a7]">No notes yet. Join the cohort to add the first tip.</li>}
        </ul>
      </section>

      {error && <p role="alert" className="rounded border border-[#80534a] bg-[#34201d] p-3 text-sm text-[#ffc3b1]">{error} If the tables are missing, apply the included Supabase migration.</p>}
      <button type="button" onClick={refresh} disabled={loading} className="min-h-10 rounded border border-[#405148] px-3 text-xs disabled:opacity-40">Refresh cohort</button>
    </section>
  );
}
