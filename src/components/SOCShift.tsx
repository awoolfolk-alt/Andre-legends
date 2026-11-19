"use client";

import { useState } from "react";
import {
  searchSIEM,
  SIEM_ALERTS,
  SIEM_LOGS,
  type SIEMAlert,
  type SIEMLog,
} from "@/game/data/content/siem";

type JournalEntry = { alertId: string; note: string; savedAt: string };
const JOURNAL_KEY = "legend-cyberprep-field-journal-v1";
const PLAYBOOKS: Record<SIEMAlert["playbook"], string[]> = {
  phishing: ["Assess the reported message and its context", "Collect sender and destination details without opening the link", "Report or contain using the approved mail process", "Close with a reason and record what other users need to know"],
  malware: ["Assess host, process, and related network evidence", "Contain the host according to the response plan", "Preserve evidence before removing anything", "Recover only from a verified clean source and document lessons"],
  account: ["Validate the account, source, and timestamps", "Check related authentication and file-access events", "Contain access through the approved identity process", "Escalate or close with a clear reason and journal entry"],
};

function readJournal(): JournalEntry[] {
  const raw = localStorage.getItem(JOURNAL_KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every((item) => item
    && typeof item.alertId === "string"
    && typeof item.note === "string"
    && typeof item.savedAt === "string")) {
    throw new Error("The saved Field Journal has an unexpected format.");
  }
  return parsed as JournalEntry[];
}

function toLogLine(log: SIEMLog) {
  return `${log.timestamp} ${log.eventType} user=${log.user} host=${log.host} src_ip=${log.sourceIp} action=${log.action} severity=${log.severity} ${log.process ?? ""} ${log.message}`;
}

export default function SOCShift({ onOpenLab }: { onOpenLab: (mode: "terminal" | "powershell") => void }) {
  const [alertId, setAlertId] = useState(SIEM_ALERTS[0].id);
  const [priority, setPriority] = useState<SIEMAlert["recommendedPriority"] | "">("");
  const [priorityReason, setPriorityReason] = useState("");
  const [search, setSearch] = useState('metadata.event_type = "USER_LOGIN"');
  const [searchResult, setSearchResult] = useState<SIEMLog[] | null>(null);
  const [searchError, setSearchError] = useState("");
  const [checkedSteps, setCheckedSteps] = useState<string[]>([]);
  const [hintOpen, setHintOpen] = useState(false);
  const [journalText, setJournalText] = useState("");
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [journalError, setJournalError] = useState("");
  const [journalSaved, setJournalSaved] = useState(false);
  const alert = SIEM_ALERTS.find((item) => item.id === alertId) ?? SIEM_ALERTS[0];
  const evidence = SIEM_LOGS.filter((log) => alert.evidenceIds.includes(log.id));
  const playbook = PLAYBOOKS[alert.playbook];
  const triageComplete = priority === alert.recommendedPriority && priorityReason.trim().length >= 12;
  const playbookComplete = checkedSteps.length === playbook.length;

  function chooseAlert(nextAlert: SIEMAlert) {
    setAlertId(nextAlert.id);
    setPriority("");
    setPriorityReason("");
    setCheckedSteps([]);
    setHintOpen(false);
    setJournalSaved(false);
    setJournalText("");
    setSearchResult(null);
  }

  function runSearch() {
    const result = searchSIEM(search);
    setSearchResult(result.rows);
    setSearchError(result.error ?? "");
  }

  function toggleStep(step: string) {
    setCheckedSteps((current) => current.includes(step) ? current.filter((value) => value !== step) : [...current, step]);
  }

  function saveJournal() {
    try {
      const current = readJournal();
      const next = [
        ...current.filter((entry) => entry.alertId !== alert.id),
        { alertId: alert.id, note: journalText.trim(), savedAt: new Date().toISOString() },
      ];
      localStorage.setItem(JOURNAL_KEY, JSON.stringify(next));
      setJournal(next);
      setJournalSaved(true);
      setJournalError("");
    } catch (error) {
      console.error("Could not save the SOC Field Journal.", error);
      setJournalError(error instanceof Error ? error.message : "The Field Journal could not be saved.");
    }
  }

  function loadJournal() {
    try {
      setJournal(readJournal());
      setJournalError("");
    } catch (error) {
      console.error("Could not load the SOC Field Journal.", error);
      setJournalError(error instanceof Error ? error.message : "The Field Journal could not be read.");
    }
  }

  return (
    <section className="space-y-4 rounded border border-[#526a59] bg-[#19251f] p-4 sm:p-6">
      <header>
        <p className="font-mono text-[10px] tracking-[0.2em] text-[#9bc5a8]">SOC SHIFT · FICTIONAL SIEM DATA</p>
        <h2 className="mt-2 text-xl font-bold text-[#f2e5b9]">Triage, investigate, and document</h2>
        <p className="mt-2 text-sm text-[#c5cebf]">Practice receive and assess → assign priority → collect and analyze → follow a playbook → escalate or close with reasons.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(14rem,1fr)_2fr]">
        <nav className="space-y-2" aria-label="Alert queue">
          <h3 className="font-mono text-xs text-[#e7d8ac]">ALERT QUEUE · {SIEM_ALERTS.length}</h3>
          {SIEM_ALERTS.map((item) => <button key={item.id} type="button" onClick={() => chooseAlert(item)} aria-pressed={alertId === item.id} className={`block min-h-14 w-full rounded border p-3 text-left ${alertId === item.id ? "border-[#c6d9a5] bg-[#344c3b]" : "border-[#405148] bg-[#101815]"}`}>
            <span className="block font-mono text-[10px] text-[#e7d8ac]">{item.severity.toUpperCase()}</span>
            <span className="mt-1 block text-xs text-white">{item.title}</span>
          </button>)}
        </nav>
        <article className="rounded border border-[#405148] bg-[#101815] p-4">
          <p className="font-mono text-[10px] text-[#9bc5a8]">{alert.id.toUpperCase()} · SEVERITY {alert.severity.toUpperCase()}</p>
          <h3 className="mt-2 text-lg font-bold text-white">{alert.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[#c5cebf]">{alert.summary}</p>
          <div className="mt-3 space-y-2">{evidence.map((log) => <div key={log.id} className="rounded border border-[#27352c] p-3 font-mono text-[10px] leading-5 text-[#c7f1cf]">{toLogLine(log)}</div>)}</div>
          {hintOpen && <p className="mt-3 rounded border border-[#665d3e] p-3 text-xs leading-5 text-[#e7d8ac]" role="status">Hint assistant: {alert.clue} This is a fixed teaching hint, not an AI verdict. Validate evidence before deciding.</p>}
          <button type="button" onClick={() => setHintOpen((open) => !open)} className="mt-3 min-h-10 rounded border border-[#665d3e] px-3 text-xs">{hintOpen ? "Hide hint" : "Ask the hint assistant"}</button>
        </article>
      </div>

      <section className="rounded border border-[#405148] bg-[#101815] p-4" aria-labelledby="triage-title">
        <h3 id="triage-title" className="font-mono text-xs text-[#e7d8ac]">TRIAGE DESK</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-xs text-[#c5cebf]">Assign priority
            <select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)} className="mt-1 min-h-11 w-full rounded border border-[#526a59] bg-[#0b100e] px-3 text-sm text-white">
              <option value="">Choose priority</option>
              {(["low", "medium", "high", "critical"] as const).map((value) => <option key={value} value={value}>{value.toUpperCase()}</option>)}
            </select>
          </label>
          <label className="text-xs text-[#c5cebf]">Why this priority?
            <input value={priorityReason} onChange={(event) => setPriorityReason(event.target.value)} className="mt-1 min-h-11 w-full rounded border border-[#526a59] bg-[#0b100e] px-3 text-sm text-white" placeholder="Mention evidence and possible impact" />
          </label>
        </div>
        <p className="mt-2 text-xs" aria-live="polite">{triageComplete ? "Triage checkpoint reached. Your rationale uses the scenario's expected priority." : "Consider evidence, impact, scope, and urgency. A single alert is not proof."}</p>
      </section>

      <section className="rounded border border-[#405148] bg-[#101815] p-4" aria-labelledby="search-title">
        <h3 id="search-title" className="font-mono text-xs text-[#e7d8ac]">SEARCH CONSOLE · SPL-STYLE AND UDM-STYLE</h3>
        <label htmlFor="siem-query" className="sr-only">Enter a simulated SIEM query</label>
        <input id="siem-query" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") runSearch(); }} className="mt-3 min-h-11 w-full rounded border border-[#526a59] bg-[#0b100e] px-3 font-mono text-sm text-[#c7f1cf]" />
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" onClick={runSearch} className="min-h-10 rounded bg-[#344c3b] px-4 font-mono text-xs">Search training logs</button>
          <button type="button" onClick={() => setSearch("index=main fail*")} className="min-h-10 rounded border border-[#405148] px-3 text-xs">SPL example</button>
          <button type="button" onClick={() => setSearch('metadata.event_type = "USER_LOGIN"')} className="min-h-10 rounded border border-[#405148] px-3 text-xs">UDM example</button>
          {searchError && <p role="alert" className="self-center text-xs text-amber-200">{searchError}</p>}
        </div>
        {searchResult && <div className="mt-3 space-y-2" aria-live="polite">
          <p className="text-xs text-[#9bc5a8]">{searchResult.length} matching training events</p>
          {searchResult.map((log) => <p key={log.id} className="rounded border border-[#27352c] p-2 font-mono text-[10px] text-[#c7f1cf]">{toLogLine(log)}</p>)}
        </div>}
      </section>

      <section className="rounded border border-[#405148] bg-[#101815] p-4" aria-labelledby="playbook-title">
        <h3 id="playbook-title" className="font-mono text-xs text-[#e7d8ac]">PLAYBOOK RUNNER · {alert.playbook.toUpperCase()}</h3>
        <div className="mt-3 space-y-2">{playbook.map((step, index) => <label key={step} className="flex min-h-11 items-center gap-3 rounded border border-[#27352c] px-3 text-xs text-[#dbe1d4]">
          <input type="checkbox" checked={checkedSteps.includes(step)} onChange={() => toggleStep(step)} />
          <span>{index + 1}. {step}</span>
        </label>)}</div>
        <p className="mt-2 text-xs text-[#aeb7a7]" aria-live="polite">{playbookComplete ? "All practice steps reviewed. In a real incident, follow the approved playbook." : `${checkedSteps.length} of ${playbook.length} steps reviewed.`}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => onOpenLab("terminal")} className="min-h-10 rounded border border-[#526a59] px-3 text-xs">Open Terminal Ops</button>
          <button type="button" onClick={() => onOpenLab("powershell")} className="min-h-10 rounded border border-[#526a59] px-3 text-xs">Open PowerShell Ops</button>
        </div>
      </section>

      <section className="rounded border border-[#405148] bg-[#101815] p-4" aria-labelledby="journal-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="journal-title" className="font-mono text-xs text-[#e7d8ac]">FIELD JOURNAL · STORED IN THIS BROWSER</h3>
          <button type="button" onClick={loadJournal} className="min-h-9 rounded border border-[#405148] px-3 text-xs">Load saved entries</button>
        </div>
        <label htmlFor="field-journal" className="sr-only">Write an incident journal entry</label>
        <textarea id="field-journal" value={journalText} onChange={(event) => { setJournalText(event.target.value); setJournalSaved(false); }} maxLength={1000} rows={4} className="mt-3 w-full rounded border border-[#526a59] bg-[#0b100e] p-3 text-sm text-white" placeholder="Write what you observed, what you checked, your rationale, and what should happen next. Do not enter real personal or company data." />
        <button type="button" onClick={saveJournal} disabled={journalText.trim().length < 12} className="mt-2 min-h-10 rounded bg-[#344c3b] px-4 font-mono text-xs disabled:opacity-40">Save journal entry</button>
        {journalSaved && <p role="status" className="mt-2 text-xs text-[#b8d7bf]">Journal entry saved locally.</p>}
        {journalError && <p role="alert" className="mt-2 text-xs text-amber-200">{journalError}</p>}
        {journal.length > 0 && <ul className="mt-3 space-y-2">{journal.map((entry) => <li key={entry.alertId} className="rounded border border-[#27352c] p-3 text-xs">
          <p className="font-mono text-[#9bc5a8]">{SIEM_ALERTS.find((item) => item.id === entry.alertId)?.title ?? entry.alertId} · {new Date(entry.savedAt).toLocaleString()}</p>
          <p className="mt-2 whitespace-pre-wrap text-[#dbe1d4]">{entry.note}</p>
        </li>)}</ul>}
      </section>
      <p className="text-xs text-[#aeb7a7]">All SIEM events are fictional; the query simulator only searches this local training dataset. It has no connection to real organizational logs.</p>
    </section>
  );
}
