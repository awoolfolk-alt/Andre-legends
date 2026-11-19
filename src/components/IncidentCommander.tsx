"use client";

import { useEffect, useState } from "react";
import {
  CURRICULUM_CONTENT,
  type IncidentCase,
  type Scenario,
} from "@/game/data/content";
import { SIEM_ALERTS, SIEM_LOGS } from "@/game/data/content/siem";

type StageName = "detect" | "investigate" | "respond" | "debrief" | "report" | "lessons";
type Report = { caseId: string; summary: string; evidence: string; action: string; lesson: string; savedAt: string };
type ResponseChoice = { text: string; rating: "best" | "acceptable" | "risky"; feedback: string };
const REPORTS_KEY = "legend-cyberprep-incident-reports-v1";
const STAGES: { id: StageName; label: string }[] = [
  { id: "detect", label: "Detect" },
  { id: "investigate", label: "Investigate" },
  { id: "respond", label: "Respond" },
  { id: "debrief", label: "CSF Debrief" },
  { id: "report", label: "Report" },
  { id: "lessons", label: "Lessons" },
];
const MENTOR_NOTES = [
  "Security has many entry points. Clear communication and careful documentation are useful skills even before you write code.",
  "When you are new to a field, ask precise questions, take notes, and keep learning from people with different backgrounds.",
  "A good incident report separates what the evidence shows from what the team still needs to verify.",
  "Practice explaining a technical finding in plain language; that skill helps both teammates and nontechnical partners.",
  "You do not need to know everything to start. Build one reliable skill at a time and ask for help when the evidence is unclear.",
];
const CASE_RESPONSES: Record<string, ResponseChoice[]> = {
  "case-recipe-redirect": [
    { text: "Preserve the packet and server logs; have the authorized team restrict the affected management path, then restore a verified clean configuration.", rating: "best", feedback: "This limits further impact, preserves evidence, and requires validation before service is restored." },
    { text: "Restart the public server and erase the logs so the suspected attacker loses access.", rating: "risky", feedback: "Erasing logs destroys evidence, and restarting alone may leave the change in place." },
    { text: "Turn off every company website immediately.", rating: "risky", feedback: "That is broader than the evidence supports. Use the incident plan to contain the affected service proportionately." },
  ],
  "case-phished-intern": [
    { text: "Escalate through the identity and privacy response plans, preserve audit records, and let authorized responders contain the account.", rating: "best", feedback: "This protects the account and records while routing customer-impact decisions to the right owners." },
    { text: "Delete the changed customer rows before anyone sees them.", rating: "risky", feedback: "Deleting records can destroy evidence and make recovery harder. Preserve the audit trail and use approved recovery." },
    { text: "Blame the intern and close the alert because the password has changed.", rating: "risky", feedback: "A password change does not establish that sessions or customer records are safe. Respond without blame and verify scope." },
  ],
  "case-charging-phone": [
    { text: "Record the device and alert, follow endpoint policy for disconnecting or isolating it, and ask support to review telemetry.", rating: "best", feedback: "The alert confirms a connection, not malware. Use policy and evidence before deciding on stronger containment." },
    { text: "Assume the phone is infected and wipe the laptop immediately.", rating: "risky", feedback: "That conclusion is not supported by the alert and could destroy evidence or disrupt work." },
    { text: "Ignore the alert because the employee only wanted to charge a phone.", rating: "risky", feedback: "Intent does not show whether data was transferred. Review the device event and apply the workplace policy." },
  ],
  "case-locked-files": [
    { text: "Follow the approved plan to isolate affected systems, preserve evidence, and verify clean backups before recovery.", rating: "best", feedback: "Containment limits spread; evidence supports investigation; verified backups support safer recovery." },
    { text: "Pay the ransom and immediately reconnect the share.", rating: "risky", feedback: "Payment does not guarantee recovery or remove the threat. Reconnection before validation can cause more harm." },
    { text: "Delete the ransom note and all suspicious files before contacting responders.", rating: "risky", feedback: "This may remove important evidence and makes the incident harder to investigate." },
  ],
  "case-leaky-share": [
    { text: "Preserve sign-in and sharing logs; have the data owner restrict public access through the approved process and verify permissions.", rating: "best", feedback: "This reduces exposure while preserving evidence and checks that intended access still works." },
    { text: "Delete the finance file and all sharing logs.", rating: "risky", feedback: "Deleting the file may disrupt the business, and deleting logs destroys evidence. Restrict access and verify scope." },
    { text: "Disable all external accounts before checking whether the admin access was approved.", rating: "risky", feedback: "The records need context. Coordinate a proportionate response with the account owner and incident lead." },
  ],
};

function readReports(): Report[] {
  const raw = localStorage.getItem(REPORTS_KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every((item) => item
    && typeof item.caseId === "string"
    && typeof item.summary === "string"
    && typeof item.evidence === "string"
    && typeof item.action === "string"
    && (item.lesson === undefined || typeof item.lesson === "string")
    && typeof item.savedAt === "string")) {
    throw new Error("Saved incident reports have an unexpected format.");
  }
  return parsed.map((item) => ({ ...item, lesson: item.lesson ?? "" }) as Report);
}

function findStage(caseData: IncidentCase, stage: StageName) {
  return caseData.stages.find((item) => item.stage === stage);
}

export default function IncidentCommander({ onOpenLab }: { onOpenLab: (mode: "terminal" | "powershell" | "packet" | "sql" | "soc" | "found-device") => void }) {
  const cases = CURRICULUM_CONTENT.cases;
  const [caseIndex, setCaseIndex] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [detectConfirmed, setDetectConfirmed] = useState(false);
  const [investigationDone, setInvestigationDone] = useState(false);
  const [responseChoice, setResponseChoice] = useState<number | null>(null);
  const [csfAnswers, setCsfAnswers] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState("");
  const [evidence, setEvidence] = useState("");
  const [action, setAction] = useState("");
  const [showModel, setShowModel] = useState(false);
  const [lessonAnswer, setLessonAnswer] = useState("");
  const [completed, setCompleted] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [reportError, setReportError] = useState("");
  const [caseReports, setCaseReports] = useState<Report[]>([]);
  useEffect(() => {
    try {
      setCaseReports(readReports());
    } catch (error) {
      console.error("Could not load the local incident portfolio.", error);
      setReportError(error instanceof Error ? error.message : "Saved incident reports could not be loaded.");
    }
  }, []);

  const caseData = cases[caseIndex];
  const stage = STAGES[stageIndex];
  const detect = findStage(caseData, "detect");
  const investigate = findStage(caseData, "investigate");
  const respond = findStage(caseData, "respond");
  const debrief = findStage(caseData, "debrief");
  const report = findStage(caseData, "report");
  const lessons = findStage(caseData, "lessons");
  const scenario: Scenario | undefined = detect?.stage === "detect"
    ? CURRICULUM_CONTENT.scenarios.find((item) => item.id === detect.data)
    : undefined;
  const alert = detect?.stage === "detect"
    ? SIEM_ALERTS.find((item) => item.id === detect.data)
    : undefined;
  const responseScenario = respond?.stage === "respond"
    ? CURRICULUM_CONTENT.scenarios.find((item) => item.id === respond.choices)
    : undefined;
  const responses = (respond?.stage === "respond" ? CASE_RESPONSES[respond.choices] : undefined)
    ?? responseScenario?.actions
    ?? [];
  const activeResponse = responseChoice === null ? null : responses[responseChoice];
  const expectedRooms = debrief?.stage === "debrief" ? debrief.csfRooms : [];
  const debriefQuestions = debrief?.stage === "debrief" ? debrief.questions : {};
  const reportTemplate = report?.stage === "report" ? report.template : "";
  const modelReport = report?.stage === "report" ? report.modelReport : "";
  const lessonQuestion = lessons?.stage === "lessons" ? lessons.question : "";
  const upgrades = lessons?.stage === "lessons" ? lessons.upgrades : [];
  const combinedReport = `${summary}\n${evidence}\n${action}`;
  const emotionalLanguage = /\b(terrible|awful|good|bad|stupid|crazy)\b/i.test(combinedReport);
  const hasEvidenceCitation = /\b(source:|log-\d+|packet|capture|sql|alert)\b/i.test(evidence);
  const recommendationJustified = /\b(because|so that|to protect|to reduce|to prevent|to verify)\b/i.test(action);
  const uncertainClaim = /\b(possibly|may|might|suspect(?:ed)?|appears|likely)\b/i.test(combinedReport);
  const uncertaintyQualified = !uncertainClaim || /\bwe believe\b/i.test(combinedReport);
  const reportChecks = [
    { label: "Factual summary and evidence are included", complete: summary.trim().length >= 20 && evidence.trim().length >= 20 },
    { label: "Evidence identifies a source (for example, log-01 or packet capture)", complete: hasEvidenceCitation },
    { label: "Recommendation explains why the action is useful", complete: action.trim().length >= 20 && recommendationJustified },
    { label: "Emotional or judgmental wording is removed", complete: !emotionalLanguage },
    { label: "Unproven claims use “we believe”", complete: uncertaintyQualified },
  ];
  const progressReady = stage.id === "detect" ? detectConfirmed
    : stage.id === "investigate" ? investigationDone
      : stage.id === "respond" ? responseChoice !== null && activeResponse?.rating !== "risky"
        : stage.id === "debrief" ? expectedRooms.length > 0 && expectedRooms.every((room) => (csfAnswers[room]?.trim().length ?? 0) >= 20)
          : stage.id === "report" ? reportChecks.every((check) => check.complete)
            : lessonAnswer.trim().length >= 12;

  function chooseCase(index: number) {
    setCaseIndex(index);
    setStageIndex(0);
    setDetectConfirmed(false);
    setInvestigationDone(false);
    setResponseChoice(null);
    setCsfAnswers({});
    setSummary("");
    setEvidence("");
    setAction("");
    setShowModel(false);
    setLessonAnswer("");
    setCompleted(false);
    setReportMessage("");
  }

  function saveReport() {
    try {
      const current = readReports();
      const next: Report[] = [
        ...current.filter((item) => item.caseId !== caseData.id),
        { caseId: caseData.id, summary: summary.trim(), evidence: evidence.trim(), action: action.trim(), lesson: lessonAnswer.trim(), savedAt: new Date().toISOString() },
      ];
      localStorage.setItem(REPORTS_KEY, JSON.stringify(next));
      setCaseReports(next);
      setReportError("");
      setReportMessage("Report saved in the local portfolio.");
    } catch (error) {
      console.error("Could not save the incident report.", error);
      setReportError(error instanceof Error ? error.message : "The report could not be saved.");
    }
  }

  function exportReport() {
    const markdown = `# ${caseData.title}\n\n## Exam objectives\n${caseData.objectives.map((objective) => `- ${objective}`).join("\n")}\n\n## Summary\n${summary.trim()}\n\n## Evidence\n${evidence.trim()}\n\n## Actions and next steps\n${action.trim()}\n\n## Lessons learned\n${lessonAnswer.trim()}\n`;
    const file = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${caseData.id}-report.md`;
    link.click();
    URL.revokeObjectURL(url);
    setReportMessage("Markdown report exported to your browser's download location.");
  }

  function advance() {
    if (!progressReady) return;
    if (stageIndex === STAGES.length - 1) {
      try {
        const current = readReports();
        const next: Report[] = [
          ...current.filter((item) => item.caseId !== caseData.id),
          { caseId: caseData.id, summary: summary.trim(), evidence: evidence.trim(), action: action.trim(), lesson: lessonAnswer.trim(), savedAt: new Date().toISOString() },
        ];
        localStorage.setItem(REPORTS_KEY, JSON.stringify(next));
        setCaseReports(next);
        setReportError("");
        setCompleted(true);
      } catch (error) {
        console.error("Could not save the completed incident case.", error);
        setReportError(error instanceof Error ? error.message : "The completed case could not be saved.");
      }
      return;
    }
    setStageIndex((current) => current + 1);
    setReportMessage("");
  }

  const responseRating = activeResponse?.rating;
  const labMode = investigate?.stage === "investigate" && investigate.lab.includes("packet") ? "packet"
    : investigate?.stage === "investigate" && investigate.lab.includes("sql") ? "sql"
      : investigate?.stage === "investigate" && investigate.lab.includes("soc") ? "soc"
        : investigate?.stage === "investigate" && investigate.lab.includes("found-device") ? "found-device"
          : investigate?.stage === "investigate" && investigate.lab.includes("powershell") ? "powershell"
            : "terminal";

  return (
    <section className="space-y-4 rounded border border-[#526a59] bg-[#19251f] p-4 sm:p-6">
      <header>
        <p className="font-mono text-[10px] tracking-[0.2em] text-[#9bc5a8]">INCIDENT COMMANDER · FICTIONAL CASES</p>
        <h2 className="mt-2 text-xl font-bold text-[#f2e5b9]">{caseData.title}</h2>
        <p className="mt-2 text-sm text-[#c5cebf]">Work one case from a clue through investigation, response, report, and lessons learned.</p>
        <p className="mt-3 text-xs text-[#aeb7a7]">Exam objectives</p>
        <ul className="mt-1 flex flex-wrap gap-2">{caseData.objectives.map((objective) => <li key={objective} className="rounded border border-[#405148] px-2 py-1 text-[10px] text-[#c5cebf]">{objective}</li>)}</ul>
      </header>
      <nav className="flex flex-wrap gap-2" aria-label="Incident cases">
        {cases.map((item, index) => <button key={item.id} type="button" onClick={() => chooseCase(index)} aria-current={caseIndex === index ? "step" : undefined} className={`min-h-10 rounded border px-3 text-xs ${caseIndex === index ? "border-[#c6d9a5] bg-[#344c3b]" : "border-[#405148]"}`}>Case {index + 1}</button>)}
      </nav>
      <nav className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="Incident response stages">
        {STAGES.map((item, index) => <button key={item.id} type="button" onClick={() => { if (index <= stageIndex) setStageIndex(index); }} aria-current={stage.id === item.id ? "step" : undefined} className={`min-h-10 rounded border px-2 text-xs ${stage.id === item.id ? "border-[#c6d9a5] bg-[#344c3b]" : "border-[#405148]"} ${index > stageIndex ? "cursor-not-allowed opacity-50" : ""}`}>{index + 1}. {item.label}</button>)}
      </nav>

      <article className="rounded border border-[#405148] bg-[#101815] p-4">
        <p className="font-mono text-[10px] text-[#9bc5a8]">{stage.label.toUpperCase()} · {stageIndex + 1} / {STAGES.length}</p>
        {stage.id === "detect" && (
          <div className="mt-2">
            <h3 className="font-bold text-white">{scenario?.title ?? alert?.title ?? caseData.title}</h3>
            <p className="mt-2 text-xs text-[#aeb7a7]">Observed on: {detect?.stage === "detect" ? detect.surface : "training system"}</p>
            <p className="mt-2 text-sm leading-6 text-[#dbe1d4]">{scenario?.story ?? alert?.summary ?? (detect?.stage === "detect" ? detect.data : "Review the training case details and begin with a potential event, not an unsupported conclusion.")}</p>
            <p className="mt-3 text-xs text-[#aeb7a7]">First step: record what was observed, when it happened, and which systems or people may be affected. A clue is not proof by itself.</p>
            <button type="button" onClick={() => setDetectConfirmed(true)} className="mt-3 min-h-10 rounded border border-[#526a59] px-3 text-xs">Record as a potential incident</button>
          </div>
        )}
        {stage.id === "investigate" && (
          <div className="mt-2">
            <p className="text-sm leading-6 text-[#dbe1d4]">Investigation exercise: <strong>{investigate?.stage === "investigate" ? investigate.lab : "review the available evidence"}</strong>. Correlate timestamps, asset, account, and source. Do not delete files or run unknown tools.</p>
            <button type="button" onClick={() => onOpenLab(labMode)} className="mt-3 min-h-10 rounded border border-[#526a59] px-3 text-xs">Open safe simulated investigation lab</button>
            <button type="button" onClick={() => setInvestigationDone(true)} className="ml-2 mt-3 min-h-10 rounded border border-[#526a59] px-3 text-xs">I reviewed the evidence</button>
            {alert && <div className="mt-3 space-y-2">{alert.evidenceIds.map((id) => {
              const log = SIEM_LOGS.find((item) => item.id === id);
              return log ? <p key={id} className="rounded border border-[#27352c] p-2 font-mono text-[10px] leading-5 text-[#c7f1cf]">{log.timestamp} · {log.eventType} · {log.user}@{log.host} · {log.sourceIp} · {log.action} · {log.message}</p> : null;
            })}</div>}
          </div>
        )}
        {stage.id === "respond" && (
          <fieldset className="mt-2 space-y-2">
            <legend className="text-sm text-[#dbe1d4]">Choose a response. Select the least disruptive action that follows policy and protects evidence.</legend>
            {responses.map((item, index) => <button key={item.text} type="button" onClick={() => setResponseChoice(index)} aria-pressed={responseChoice === index} className={`block min-h-11 w-full rounded border px-3 py-2 text-left text-xs ${responseChoice === index ? "border-[#c6d9a5] bg-[#344c3b]" : "border-[#405148]"}`}>{item.text}</button>)}
            {activeResponse && <div className="mt-3 rounded border border-[#27352c] p-3" aria-live="polite">
              <p className="font-mono text-xs">{responseRating === "best" ? "RECOMMENDED RESPONSE" : responseRating === "acceptable" ? "ACCEPTABLE, WITH A FOLLOW-UP" : "RISKY RESPONSE · REVIEW WHY"}</p>
              <p className="mt-2 text-sm text-[#dbe1d4]">{activeResponse.feedback}</p>
            </div>}
          </fieldset>
        )}
        {stage.id === "debrief" && (
          <div className="mt-2">
            <p className="text-sm text-[#dbe1d4]">Answer the guiding questions in each NIST CSF 2.0 room. Write at least a short sentence; there is no single perfect phrasing.</p>
            <div className="mt-3 space-y-3">{expectedRooms.map((room) => <section key={room} className="rounded border border-[#27352c] p-3">
              <h3 className="font-mono text-xs font-bold text-[#c6d9a5]">{room}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[#c5cebf]">{(debriefQuestions[room] ?? []).map((question) => <li key={question}>{question}</li>)}</ul>
              <label className="mt-2 block text-xs text-[#aeb7a7]" htmlFor={`debrief-${room}`}>Your notes for {room}
                <textarea id={`debrief-${room}`} value={csfAnswers[room] ?? ""} onChange={(event) => setCsfAnswers((current) => ({ ...current, [room]: event.target.value }))} maxLength={1000} rows={3} className="mt-1 w-full rounded border border-[#526a59] bg-[#0b100e] p-3 text-sm text-white" />
              </label>
            </section>)}</div>
          </div>
        )}
        {stage.id === "report" && (
          <div className="mt-2 space-y-3">
            <p className="text-xs text-[#aeb7a7]">Template: {reportTemplate}. Keep the report factual: what happened, evidence, actions, and next steps.</p>
            {[
              ["report-summary", "Summary · what happened?", summary, setSummary],
              ["report-evidence", "Evidence · what did you verify?", evidence, setEvidence],
              ["report-action", "Actions and next steps", action, setAction],
            ].map(([id, label, value, setter]) => <label key={id as string} className="block text-xs text-[#c5cebf]">{label as string}
              <textarea id={id as string} value={value as string} onChange={(event) => (setter as (value: string) => void)(event.target.value)} maxLength={1500} rows={3} className="mt-1 w-full rounded border border-[#526a59] bg-[#0b100e] p-3 text-sm text-white" />
            </label>)}
            <div className="rounded border border-[#405148] p-3">
              <h3 className="font-mono text-xs text-[#c6d9a5]">WHAT'S MISSING?</h3>
              <p className="mt-1 text-[10px] text-[#aeb7a7]">Use observable facts, cite a source, justify the recommendation, and qualify claims the evidence has not proved.</p>
              <ul className="mt-2 space-y-1 text-xs">{reportChecks.map((check) => <li key={check.label} className={check.complete ? "text-[#b8d7bf]" : "text-amber-200"}>{check.complete ? "✓" : "•"} {check.label}</li>)}</ul>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={saveReport} disabled={!progressReady} className="min-h-10 rounded border border-[#526a59] px-3 text-xs disabled:opacity-40">Save to local portfolio</button>
              <button type="button" onClick={exportReport} disabled={!progressReady} className="min-h-10 rounded border border-[#526a59] px-3 text-xs disabled:opacity-40">Export Markdown</button>
              <button type="button" onClick={() => setShowModel((open) => !open)} className="min-h-10 rounded border border-[#665d3e] px-3 text-xs">{showModel ? "Hide model comparison" : "Compare with model report"}</button>
            </div>
            {showModel && <div className="rounded border border-[#665d3e] p-3 text-sm leading-6 text-[#e4dfce]">{modelReport}</div>}
            {reportMessage && <p role="status" className="text-xs text-[#b8d7bf]">{reportMessage}</p>}
            {reportError && <p role="alert" className="text-xs text-amber-200">{reportError}</p>}
          </div>
        )}
        {stage.id === "lessons" && (
          <div className="mt-2 space-y-3">
            <p className="text-sm text-[#dbe1d4]">{lessonQuestion}</p>
            <label htmlFor="incident-lesson" className="block text-xs text-[#c5cebf]">Write one improvement in your own words
              <textarea id="incident-lesson" value={lessonAnswer} onChange={(event) => setLessonAnswer(event.target.value)} maxLength={800} rows={3} className="mt-1 w-full rounded border border-[#526a59] bg-[#0b100e] p-3 text-sm text-white" />
            </label>
            <ul className="list-disc space-y-1 pl-5 text-xs text-[#aeb7a7]">{upgrades.map((upgrade) => <li key={upgrade}>{upgrade}</li>)}</ul>
            <p className="text-xs text-[#aeb7a7]">A specific lesson you write is saved with the local portfolio entry when you finish the case.</p>
          </div>
        )}
      </article>

      {completed ? (
        <div className="rounded border border-[#50634e] bg-[#17221c] p-4" role="status">
          <h3 className="font-mono text-sm text-[#b8d7bf]">CASE COMPLETE</h3>
          <p className="mt-2 text-sm text-[#dbe1d4]">You completed all six response stages. Your report and lesson are saved in this browser; nothing was uploaded.</p>
          <p className="mt-3 border-l-2 border-[#665d3e] pl-3 text-sm text-[#e4dfce]"><strong>Mentor Note:</strong> {MENTOR_NOTES[caseIndex % MENTOR_NOTES.length]}</p>
          <button type="button" onClick={() => chooseCase(caseIndex)} className="mt-3 min-h-10 rounded border border-[#526a59] px-3 text-xs">Replay this case</button>
        </div>
      ) : <button type="button" onClick={advance} disabled={!progressReady} className="min-h-11 rounded bg-[#344c3b] px-4 font-mono text-xs disabled:opacity-40">{stageIndex === STAGES.length - 1 ? "Complete incident case" : `Continue to ${STAGES[stageIndex + 1].label}`}</button>}
      {reportError && <p role="alert" className="text-xs text-amber-200">{reportError}</p>}
      {caseReports.length > 0 && <p className="text-xs text-[#aeb7a7]">Local portfolio reports saved in this browser: {caseReports.length}. Reports are not uploaded.</p>}
      <p className="text-xs text-[#aeb7a7]">Training only. Follow your organization's incident-response plan in a real event; this simulator does not contact systems, users, or authorities.</p>
    </section>
  );
}
