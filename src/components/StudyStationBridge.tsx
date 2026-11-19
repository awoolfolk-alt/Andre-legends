"use client";

import { useEffect, useRef, useState } from "react";
import {
  SECURITY_PLUS_REFERENCES,
  SECURITY_PLUS_STATIONS,
  STUDY_BUILDINGS,
  type StudyQuestion,
  type StudyScenario,
  type StudySubjectId,
} from "@/game/data/securityPlus";

type Request = { subject: StudySubjectId; stationId: string };
type Mode = "guide" | "quiz" | "scenario" | "recall" | "calculate" | "sequence";
type StationProgress = { answered: number; correct: number; missed: Record<string, number> };
type Progress = Record<string, StationProgress>;
type Question = StudyQuestion | StudyScenario;
type ActivityTutorial = { goal: string; steps: string[]; vocabulary: string[] };

const EMPTY_PROGRESS: Progress = {};
const SEQUENCES: Record<string, Record<number, { prompt: string; steps: string[] }>> = {
  architecture: {
    0: {
      prompt: "Select the steps of a secure VPN connection in the right order.",
      steps: ["Authenticate identity and device", "Negotiate tunnel parameters", "Establish encrypted tunnel", "Route authorized traffic", "Monitor and terminate session"],
    },
    2: {
      prompt: "Select the OSI layers from Layer 1 to Layer 7.",
      steps: ["Physical", "Data Link", "Network", "Transport", "Session", "Presentation", "Application"],
    },
  },
  operations: {
    0: {
      prompt: "Select the incident-response phases in the right order.",
      steps: ["Preparation", "Detection", "Analysis", "Containment", "Eradication", "Recovery", "Lessons Learned"],
    },
  },
};
const ACTIVITY_TUTORIALS: Record<string, ActivityTutorial[]> = {
  governance: [
    { goal: "Pick the response that handles each business risk and understand why.", steps: ["Read the situation and identify what could be harmed.", "Choose accept, avoid, transfer, or mitigate based on what the organization is doing.", "Read the explanation; it will tell you why the other responses do not fit as well."], vocabulary: ["Likelihood = how probable an event is. Impact = how much harm it could cause.", "Mitigate = lower likelihood or impact. Accept = knowingly keep a risk with approval.", "Transfer = share some financial loss; it does not remove responsibility. Avoid = stop the risky activity."] },
    { goal: "Practice turning governance and risk terms into clear decisions.", steps: ["Read the question once for the important clue.", "Choose the best answer, not just a true-sounding answer.", "Use the explanation to connect the clue to the security term."], vocabulary: ["A policy is the big rule; a standard makes it measurable; a procedure gives the steps.", "A compensating control is an alternate safeguard when the preferred fix cannot be used.", "Compliance means meeting requirements that actually apply to the organization and data."] },
    { goal: "Calculate the estimated yearly loss from a repeated risk.", steps: ["Multiply asset value by exposure factor to get one-event loss (SLE).", "Multiply SLE by annual rate of occurrence (ARO) to get yearly loss (ALE).", "Enter the dollar amount. Example: $10,000 × 20% × 2 events/year = $4,000/year."], vocabulary: ["Exposure factor is a percent; turn 20% into 0.20 for multiplication.", "ARO means estimated number of events per year. ALE is a planning estimate, not a promise.", "Formula: SLE = AV × EF. ALE = SLE × ARO."] },
  ],
  threats: [
    { goal: "Decide whether a message is suspicious and identify the clues.", steps: ["Read who sent it and what they want you to do.", "Look for urgency, a strange address, unexpected files, money/password requests, or pressure to skip normal steps.", "Choose the safest action. When unsure, report it and verify using a contact method you already know."], vocabulary: ["Phishing uses deceptive messages; smishing is by text; vishing is by voice.", "BEC (business email compromise) often impersonates a leader or vendor to redirect money or data.", "Never click a suspicious link just to test it."] },
    { goal: "Match what malware does to its behavior name.", steps: ["Focus on the behavior in the clue, not the file name.", "Choose the malware type that best matches that behavior.", "Read the explanation and learn how it differs from similar terms."], vocabulary: ["A worm can spread itself between systems; a trojan disguises itself as legitimate software.", "Ransomware blocks or encrypts data to demand payment; spyware secretly watches activity.", "One incident may combine multiple behaviors; behavior clues are not proof by themselves."] },
    { goal: "Recall a security term from its plain-language meaning.", steps: ["Read the definition and think of the key behavior it describes.", "Type the matching term, then check your answer.", "If you miss it, read the example definition and try again later."], vocabulary: ["An indicator is a clue to investigate, not proof of compromise.", "A vulnerability is a weakness; an exploit uses a weakness; a threat could cause harm.", "CVE names a known vulnerability; CVSS rates severity; EPSS estimates exploitation likelihood."] },
  ],
  architecture: [
    { goal: "Build a secure VPN connection by choosing each step in order.", steps: ["Click the step that should happen first; your choice is added to the build list.", "Continue until every step is placed, then choose Check my order.", "If stuck, use Show a hint. A VPN protects the connection path, but it does not make an unsafe device safe."], vocabulary: ["Authenticate means check who the user is; authorize means decide what they may access.", "Encryption scrambles traffic so outsiders cannot easily read it in transit.", "MFA, device health checks, least privilege, and monitoring are still needed around a VPN."] },
    { goal: "Choose access and network designs that give people only the access they need.", steps: ["Find the user's task, the resource, and any time/device limits.", "Choose the option that grants only the required access and includes appropriate checks.", "Read why a VPN alone or a shared admin account is not enough."], vocabulary: ["MFA combines different types: something you know, have, or are.", "RBAC uses job roles; ABAC also considers attributes such as device health or data sensitivity.", "Segmentation puts systems into zones and limits which connections can cross between them."] },
    { goal: "Put the seven OSI networking layers in order from 1 to 7.", steps: ["Click one layer at a time from the physical connection upward to the user-facing application.", "Check your order when all seven are selected.", "Use the layer names and hint to learn the path; this is a memory model, not a security control by itself."], vocabulary: ["Physical carries signals; Data Link moves frames on a local link; Network routes packets.", "Transport handles end-to-end delivery; Session manages conversations; Presentation formats data; Application supports user-facing network services.", "Mnemonic: Please Do Not Throw Sausage Pizza Away."] },
  ],
  operations: [
    { goal: "Put the common incident-response lifecycle in order.", steps: ["Click each phase in the order a response team generally follows.", "Check your sequence after all phases are selected.", "Use the hint and feedback to remember what each phase accomplishes."], vocabulary: ["Preparation happens before an incident; detection and analysis check what is happening.", "Containment limits spread; eradication removes the cause; recovery restores service safely.", "Lessons learned improve the plan. Real incidents may require phases to overlap."] },
    { goal: "Triage alerts by checking evidence and taking a safe next step.", steps: ["Read the alert and note the device, account, time, and business context.", "Choose the response that validates evidence and follows the incident plan.", "Do not wipe devices or declare a breach based on one alert alone."], vocabulary: ["A SIEM collects and correlates logs; EDR focuses on endpoint activity.", "An alert is a signal to investigate, not automatic proof of an attack.", "Containment limits impact; preserve evidence and escalate according to your role."] },
    { goal: "Recall an operations term from what an analyst does.", steps: ["Read the definition and connect it to the incident-response job.", "Type the term, then check the answer.", "Read the explanation and remember why keeping a record matters."], vocabulary: ["Chain of custody records who handled evidence and when.", "SIEM helps correlate events; SOAR automates approved playbooks.", "Containment limits impact; eradication removes the cause; recovery restores service."] },
  ],
};

function isRequest(value: unknown): value is Request {
  if (!value || typeof value !== "object") return false;
  const request = value as Record<string, unknown>;
  return request.subject === "security-plus" &&
    typeof request.stationId === "string" &&
    SECURITY_PLUS_STATIONS.some((station) => station.id === request.stationId);
}

function shuffled<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function modeForGame(stationId: string, index: number): Mode {
  const modes: Record<string, Mode[]> = {
    governance: ["scenario", "quiz", "calculate"],
    threats: ["scenario", "quiz", "recall"],
    architecture: ["sequence", "scenario", "sequence"],
    operations: ["sequence", "scenario", "recall"],
  };
  return modes[stationId]?.[index] ?? "quiz";
}

function isProgress(value: unknown): value is Progress {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return false;
    const progress = entry as Record<string, unknown>;
    if (
      !Number.isInteger(progress.answered) ||
      (progress.answered as number) < 0 ||
      !Number.isInteger(progress.correct) ||
      (progress.correct as number) < 0 ||
      (progress.correct as number) > (progress.answered as number) ||
      !progress.missed ||
      typeof progress.missed !== "object" ||
      Array.isArray(progress.missed)
    ) return false;
    return Object.values(progress.missed).every((count) => Number.isInteger(count) && (count as number) >= 0);
  });
}

function readProgress(): Progress {
  const raw = window.localStorage.getItem("legend-security-plus-progress-v1");
  if (!raw) return EMPTY_PROGRESS;
  const parsed: unknown = JSON.parse(raw);
  if (!isProgress(parsed)) {
    throw new Error("Saved study progress has an unexpected format.");
  }
  return parsed;
}

function choicesFor(question: Question) {
  return question.options.map((option, index) => ({ option, index }));
}

export default function StudyStationBridge() {
  const [request, setRequest] = useState<Request | null>(null);
  const [visible, setVisible] = useState(false);
  const [stationId, setStationId] = useState(SECURITY_PLUS_STATIONS[0].id);
  const [mode, setMode] = useState<Mode>("guide");
  const [controlsOpen, setControlsOpen] = useState(false);
  const [activityStarted, setActivityStarted] = useState(false);
  const [activityScore, setActivityScore] = useState({ correct: 0, answered: 0 });
  const [questionOrder, setQuestionOrder] = useState<number[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [recallAnswer, setRecallAnswer] = useState("");
  const [recallResult, setRecallResult] = useState<boolean | null>(null);
  const [typingStats, setTypingStats] = useState<{ wpm: number; accuracy: number } | null>(null);
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [calculation, setCalculation] = useState<{ asset: number; exposure: number; aro: number; answer: number } | null>(null);
  const recallStarted = useRef(Date.now());
  const [activityIndex, setActivityIndex] = useState(0);
  const [sequenceChoices, setSequenceChoices] = useState<string[]>([]);
  const [sequenceSelected, setSequenceSelected] = useState<string[]>([]);
  const [sequenceResult, setSequenceResult] = useState<boolean | null>(null);
  const [showSequenceHint, setShowSequenceHint] = useState(false);
  const closeStationRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let disposed = false;
    let removeListener = () => {};
    import("@/game/systems/EventBus")
      .then(({ EventBus, EVT }) => {
        if (disposed) return;
        const open = (payload: unknown) => {
          if (!isRequest(payload)) return;
          setRequest(payload);
          setStationId(payload.stationId);
          setMode("guide");
          setControlsOpen(false);
          setActivityStarted(false);
          setActivityIndex(0);
          setVisible(false);
          requestAnimationFrame(() => setVisible(true));
        };
        closeStationRef.current = () => EventBus.emit(EVT.studyStationClose);
        EventBus.on(EVT.studyStationOpen, open);
        removeListener = () => {
          EventBus.off(EVT.studyStationOpen, open);
          closeStationRef.current = null;
        };
      })
      .catch((error: unknown) => {
        console.error("Could not load the study station event bridge.", error);
        setProgressError("Study station communication could not start.");
      });
    try {
      setProgress(readProgress());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Saved study progress could not be read.";
      console.error("Could not load Security+ study progress.", error);
      setProgressError(`${message} Progress will remain available for this visit.`);
    }
    return () => {
      disposed = true;
      removeListener();
    };
  }, []);

  useEffect(() => {
    if (!request) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeTerminal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // closeTerminal is stable for the lifetime of this mounted terminal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const station = SECURITY_PLUS_STATIONS.find((item) => item.id === stationId) ?? SECURITY_PLUS_STATIONS[0];
  const currentProgress = progress[station.id] ?? { answered: 0, correct: 0, missed: {} };
  const missedCount = Object.values(currentProgress.missed).reduce((total, count) => total + count, 0);
  const quizQuestions = mode === "scenario" ? station.scenarios : station.questions;
  const currentQuestion = questionOrder.length
    ? quizQuestions[questionOrder[questionIndex % questionOrder.length]]
    : undefined;
  const termsOrder = questionOrder.length
    ? station.terms[questionOrder[questionIndex % questionOrder.length]]
    : undefined;
  const activeSequence = SEQUENCES[station.id]?.[activityIndex];
  const tutorial = ACTIVITY_TUTORIALS[station.id]?.[activityIndex];

  function closeTerminal() {
    setVisible(false);
    window.setTimeout(() => {
      setRequest(null);
      if (!closeStationRef.current) {
        console.error("The study station close event is unavailable.");
        return;
      }
      closeStationRef.current();
    }, 350);
  }

  function beginMode(nextMode: Mode) {
    setMode(nextMode);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setRecallAnswer("");
    setRecallResult(null);
    setTypingStats(null);
    setSequenceSelected([]);
    setSequenceResult(null);
    setShowSequenceHint(false);
    setQuestionOrder(nextMode === "quiz"
      ? shuffled(station.questions.map((_, index) => index))
      : nextMode === "scenario"
        ? shuffled(station.scenarios.map((_, index) => index))
        : nextMode === "recall"
          ? shuffled(station.terms.map((_, index) => index))
          : []);
    setCalculation(nextMode === "calculate" ? makeCalculation() : null);
    setSequenceChoices(activeSequence ? shuffled(activeSequence.steps) : []);
    recallStarted.current = Date.now();
  }

  function chooseStation(nextStationId: string) {
    setStationId(nextStationId);
    setActivityIndex(0);
    setMode("guide");
    setActivityStarted(false);
    setActivityScore({ correct: 0, answered: 0 });
    setQuestionOrder([]);
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setRecallAnswer("");
    setRecallResult(null);
    setTypingStats(null);
    setSequenceChoices([]);
    setSequenceSelected([]);
    setSequenceResult(null);
    setControlsOpen(false);
  }

  function chooseActivity(index: number) {
    const nextMode = modeForGame(station.id, index);
    setActivityIndex(index);
    setActivityStarted(false);
    setActivityScore({ correct: 0, answered: 0 });
    setControlsOpen(false);
    beginMode(nextMode);
    const sequence = SEQUENCES[station.id]?.[index];
    setSequenceChoices(sequence ? shuffled(sequence.steps) : []);
  }

  function makeCalculation() {
    const asset = (Math.floor(Math.random() * 9) + 2) * 10000;
    const exposure = (Math.floor(Math.random() * 5) + 1) * 10;
    const aro = Math.floor(Math.random() * 4) + 1;
    return { asset, exposure, aro, answer: Math.round(asset * exposure / 100 * aro) };
  }

  function recordAnswer(correct: boolean, key: string) {
    setActivityScore((score) => ({
      correct: score.correct + (correct ? 1 : 0),
      answered: score.answered + 1,
    }));
    const next: Progress = {
      ...progress,
      [station.id]: {
        answered: currentProgress.answered + 1,
        correct: currentProgress.correct + (correct ? 1 : 0),
        missed: correct
          ? currentProgress.missed
          : { ...currentProgress.missed, [key]: (currentProgress.missed[key] ?? 0) + 1 },
      },
    };
    setProgress(next);
    try {
      window.localStorage.setItem("legend-security-plus-progress-v1", JSON.stringify(next));
      setProgressError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Study progress could not be saved.";
      console.error("Could not save Security+ study progress.", error);
      setProgressError(`Progress could not be saved on this device: ${message}`);
    }
  }

  function answerQuestion(choiceIndex: number) {
    if (!currentQuestion || selectedAnswer !== null) return;
    setSelectedAnswer(choiceIndex);
    const correct = choiceIndex === currentQuestion.answer;
    recordAnswer(correct, currentQuestion.prompt);
  }

  function nextQuestion() {
    if (questionIndex + 1 >= questionOrder.length) {
      setQuestionOrder(shuffled(questionOrder));
      setQuestionIndex(0);
    } else {
      setQuestionIndex((index) => index + 1);
    }
    setSelectedAnswer(null);
    setRecallAnswer("");
    setRecallResult(null);
    setTypingStats(null);
    setCalculation(mode === "calculate" ? makeCalculation() : null);
    setSequenceSelected([]);
    setSequenceResult(null);
    setShowSequenceHint(false);
    setSequenceChoices(activeSequence ? shuffled(activeSequence.steps) : []);
    recallStarted.current = Date.now();
  }

  function addSequenceStep(step: string) {
    if (sequenceResult !== null || sequenceSelected.includes(step)) return;
    setSequenceSelected((current) => [...current, step]);
  }

  function checkSequence() {
    if (!activeSequence || sequenceResult !== null || sequenceSelected.length !== activeSequence.steps.length) return;
    const correct = sequenceSelected.every((step, index) => step === activeSequence.steps[index]);
    setSequenceResult(correct);
    recordAnswer(correct, station.activities[activityIndex]);
  }

  function restartSequence() {
    setSequenceSelected([]);
    setSequenceResult(null);
    setShowSequenceHint(false);
    setSequenceChoices(activeSequence ? shuffled(activeSequence.steps) : []);
  }

  function submitRecall() {
    if (!termsOrder || recallResult !== null) return;
    const correct = recallAnswer.trim().toLowerCase() === termsOrder.term.toLowerCase();
    setRecallResult(correct);
    setTypingStats(measureTyping(recallAnswer, termsOrder.term, recallStarted.current));
    recordAnswer(correct, termsOrder.term);
  }

  function submitCalculation() {
    if (!calculation || recallResult !== null) return;
    const correct = Number(recallAnswer.replace(/[$,\s]/g, "")) === calculation.answer;
    setRecallResult(correct);
    setTypingStats(measureTyping(recallAnswer, String(calculation.answer), recallStarted.current));
    recordAnswer(correct, "ALE calculation");
  }

  if (!request) return null;

  const building = STUDY_BUILDINGS[request.subject];
  const accuracy = currentProgress.answered
    ? Math.round((currentProgress.correct / currentProgress.answered) * 100)
    : 0;
  const referencesByStation: Record<string, number[]> = {
    governance: [0, 1],
    threats: [0, 3, 5],
    architecture: [0, 4],
    operations: [0, 1, 2],
  };
  const referenceIndexes = referencesByStation[station.id] ?? [0];

  return (
    <div
      className={`fixed inset-0 z-[120] bg-[#171817] p-1.5 transition-opacity duration-300 sm:p-3 ${visible ? "opacity-100" : "opacity-0"}`}
      role="dialog"
      aria-modal="true"
      aria-label={`${station.name} Security+ study terminal`}
    >
      <div className="flex h-full flex-col border-[7px] border-[#555950] bg-[#252923] p-1 shadow-[inset_0_0_0_2px_#a29a7e,0_0_60px_#000] sm:border-[12px] sm:p-2">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#a2a083] bg-[#263c43] px-3 py-2 font-mono text-xs text-[#c7f1cf] sm:px-5 sm:py-3 sm:text-sm">
          <div>
            <p className="font-bold tracking-widest">LEGEND SOC TRAINING TERMINAL</p>
            <p className="mt-1 text-[10px] text-[#c7d0bc]/75">{building.subject} · supplemental study; verify current objectives</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-right text-[10px] text-[#c7d0bc]/75">TYPED DRILLS · WPM TRACKING<br />SECURE LOCAL PROFILE</span>
            <button onClick={closeTerminal} className="min-h-10 rounded border border-[#c7f1cf]/40 px-3 text-[#c7f1cf] hover:bg-white/10">
              Return to office · Esc
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col bg-[#101b19] text-[#e5eadc]">
          <div className="shrink-0 border-b border-[#506b5c] bg-[#172521]">
            <button
              type="button"
              onClick={() => setControlsOpen((open) => !open)}
              aria-expanded={controlsOpen}
              className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-left font-mono text-xs text-[#d4e4d3] hover:bg-white/5"
            >
              <span><span className="text-[#9bc5a8]">STUDY MENU</span> · {station.name} · {mode === "guide" ? "Study guide" : station.activities[activityIndex]}</span>
              <span className="shrink-0 text-[#e7d8ac]">{controlsOpen ? "HIDE ▲" : "CHANGE / OPEN ▼"}</span>
            </button>
            {controlsOpen && (
              <div className="space-y-3 border-t border-[#405148] p-3 sm:p-4">
                <div>
                  <p className="mb-2 font-mono text-[10px] tracking-[0.2em] text-[#9bc5a8]">STUDY STATIONS</p>
                  <div className="flex flex-wrap gap-2">
                    {SECURITY_PLUS_STATIONS.map((item, index) => (
                      <button
                        key={item.id}
                        onClick={() => chooseStation(item.id)}
                        className={modeButton(station.id === item.id)}
                      >
                        {String(index + 1).padStart(2, "0")} · {item.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 font-mono text-[10px] tracking-[0.2em] text-[#9bc5a8]">STUDY GUIDE AND PRACTICE GAMES</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setMode("guide");
                        setActivityStarted(false);
                        setControlsOpen(false);
                      }}
                      className={modeButton(mode === "guide")}
                    >
                      Read the guide
                    </button>
                    {station.activities.map((activity, index) => (
                      <button
                        key={activity}
                        onClick={() => chooseActivity(index)}
                        className={modeButton(mode !== "guide" && activityIndex === index)}
                      >
                        PLAY · {activity}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="font-mono text-[10px] text-[#aeb7a7]">THIS STATION · {currentProgress.answered} answers · {accuracy}% accuracy · {missedCount} missed attempts · saved on this device</p>
              </div>
            )}
          </div>

          <section className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto max-w-6xl">
              <div className="mb-4 border-b border-[#405148] pb-4">
                <p className="font-mono text-[10px] tracking-[0.25em] text-[#9bc5a8]">STATION {String(SECURITY_PLUS_STATIONS.indexOf(station) + 1).padStart(2, "0")} · SECURITY OPERATIONS</p>
                <h1 className="mt-2 text-2xl font-bold text-[#f2e5b9] sm:text-3xl">{station.name}</h1>
                <p className="mt-2 max-w-3xl text-sm text-[#c5cebf]">{station.focus}</p>
              </div>

              {mode === "guide" && (
                <div className="space-y-5">
                  <div className="rounded border border-[#665d3e] bg-[#28271e] p-4 text-sm leading-6 text-[#e4dfce]">
                    <strong className="text-[#f2e5b9]">Start here:</strong> Read each topic in order. New words are explained below in plain language, and the examples connect them to everyday situations. When you are ready, open <strong>Study Menu</strong> above and choose a practice game.
                  </div>
                  {station.guide.map((section) => (
                    <article key={section.heading} className="rounded border border-[#405148] bg-[#1a2621] p-4 sm:p-5">
                      <h2 className="font-mono text-sm font-bold text-[#c6d9a5]">{section.heading}</h2>
                      <p className="mt-2 text-sm leading-6 text-[#e0e5d8]">{section.body}</p>
                    </article>
                  ))}
                  <section className="rounded border border-[#405148] bg-[#172521] p-4 sm:p-5">
                    <h2 className="font-mono text-sm font-bold tracking-wider text-[#c6d9a5]">WORDS TO KNOW</h2>
                    <p className="mt-1 text-xs text-[#aeb7a7]">Use these definitions as a quick glossary. Try saying each one in your own words.</p>
                    <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                      {station.terms.map((term) => (
                        <div key={term.term} className="rounded border border-[#405148] bg-[#101815] p-3">
                          <dt className="font-mono text-sm font-bold text-[#e7d8ac]">{term.term}</dt>
                          <dd className="mt-1 text-sm leading-6 text-[#dbe1d4]">{term.definition}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                  <div className="rounded border border-[#665d3e] bg-[#28271e] p-4 text-xs leading-5 text-[#d6d1bc]">
                    <strong className="text-[#f2e5b9]">Exam note:</strong> This is original supplemental study material, not a complete course or a guarantee of passing. Exam versions and objectives change; use CompTIA's current objectives to decide what to study.
                  </div>
                </div>
              )}

              {mode !== "guide" && !activityStarted && tutorial && (
                <div className="rounded border border-[#526a59] bg-[#19251f] p-4 sm:p-7">
                  <p className="font-mono text-xs tracking-[0.2em] text-[#a9c8b0]">MISSION BRIEF · READ BEFORE PLAYING</p>
                  <h2 className="mt-2 text-2xl font-bold text-[#f2e5b9]">{station.activities[activityIndex]}</h2>
                  <p className="mt-3 text-base leading-7 text-[#e0e5d8]"><strong className="text-[#c6d9a5]">Your goal:</strong> {tutorial.goal}</p>
                  <div className="mt-5 grid gap-5 md:grid-cols-2">
                    <div className="rounded border border-[#405148] bg-[#101815] p-4">
                      <h3 className="font-mono text-xs font-bold tracking-widest text-[#9bc5a8]">HOW TO PLAY</h3>
                      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-[#dbe1d4]">
                        {tutorial.steps.map((step) => <li key={step}>{step}</li>)}
                      </ol>
                    </div>
                    <div className="rounded border border-[#405148] bg-[#101815] p-4">
                      <h3 className="font-mono text-xs font-bold tracking-widest text-[#9bc5a8]">LEARN THESE FIRST</h3>
                      <ul className="mt-3 space-y-2 text-sm leading-6 text-[#dbe1d4]">
                        {tutorial.vocabulary.map((item) => <li key={item}>· {item}</li>)}
                      </ul>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActivityScore({ correct: 0, answered: 0 });
                      setActivityStarted(true);
                    }}
                    className="mt-6 min-h-12 rounded border border-[#a7c597]/60 bg-[#283b2f] px-6 py-3 font-mono text-sm font-bold text-[#d8efcb] hover:bg-[#344c3b]"
                  >
                    Start game
                  </button>
                </div>
              )}

              {mode !== "guide" && activityStarted && tutorial && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded border border-[#405148] bg-[#172521] p-3">
                  <p className="font-mono text-xs text-[#c6d9a5]">GAME SCORE · {activityScore.correct}/{activityScore.answered} correct</p>
                  <details>
                  <summary className="cursor-pointer font-mono text-xs text-[#c6d9a5]">
                    Need the instructions or terms again? Open the lesson
                  </summary>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <ol className="list-decimal space-y-1 pl-5 text-xs leading-5 text-[#dbe1d4]">{tutorial.steps.map((step) => <li key={step}>{step}</li>)}</ol>
                    <ul className="space-y-1 text-xs leading-5 text-[#dbe1d4]">{tutorial.vocabulary.map((item) => <li key={item}>· {item}</li>)}</ul>
                  </div>
                  </details>
                </div>
              )}

              {(mode === "quiz" || mode === "scenario") && activityStarted && currentQuestion && (
                <div className="rounded border border-[#526a59] bg-[#19251f] p-4 sm:p-6">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-[#a9c8b0]">
                    <span>{station.activities[activityIndex].toUpperCase()} · ROUND {questionIndex + 1}</span>
                    <span>QUESTION {questionIndex + 1} / {questionOrder.length}</span>
                  </div>
                  <h2 className="text-lg font-semibold leading-7 text-white">{currentQuestion.prompt}</h2>
                  <div className="mt-5 grid gap-2">
                    {choicesFor(currentQuestion).map(({ option, index }) => (
                      <button
                        key={option}
                        disabled={selectedAnswer !== null}
                        onClick={() => answerQuestion(index)}
                        className={`min-h-12 rounded border px-4 py-3 text-left text-sm transition-colors ${
                          selectedAnswer === index
                            ? index === currentQuestion.answer ? "border-[#79c69b] bg-[#254335]" : "border-[#d47c70] bg-[#492b29]"
                            : selectedAnswer !== null && index === currentQuestion.answer
                              ? "border-[#79c69b] bg-[#254335]"
                              : "border-[#46564a] bg-[#202d25] hover:bg-[#2c3a30]"
                        }`}
                      >
                        <span className="mr-3 font-mono text-[#9abca2]">{String.fromCharCode(65 + index)}.</span>{option}
                      </button>
                    ))}
                  </div>
                  {selectedAnswer !== null && (
                    <div className="mt-4 rounded border border-[#50634e] bg-[#17221c] p-4" role="status">
                      <p className={`font-mono text-sm font-bold ${selectedAnswer === currentQuestion.answer ? "text-[#8ce0a7]" : "text-[#f0b29e]"}`}>
                        {selectedAnswer === currentQuestion.answer ? "CORRECT" : "REVIEW THIS"}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#dbe1d4]">{currentQuestion.explanation}</p>
                      <button onClick={nextQuestion} className="mt-4 rounded border border-[#9bc5a8]/50 px-4 py-2 font-mono text-xs text-[#c7f1cf] hover:bg-white/10">
                        Next shuffled question
                      </button>
                    </div>
                  )}
                </div>
              )}

              {mode === "recall" && activityStarted && termsOrder && (
                <div className="rounded border border-[#526a59] bg-[#19251f] p-4 sm:p-6">
                  <p className="font-mono text-xs tracking-widest text-[#a9c8b0]">TERM RECALL DRILL · ITEM {questionIndex + 1}</p>
                  <p className="mt-4 text-lg leading-7">{termsOrder.definition}</p>
                  <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); submitRecall(); }}>
                    <input value={recallAnswer} onChange={(event) => setRecallAnswer(event.target.value)} disabled={recallResult !== null} className="min-h-12 flex-1 rounded border border-[#526a59] bg-[#101815] px-4 font-mono text-sm text-white outline-none focus:border-[#b6d59c]" placeholder="Type the matching term" autoComplete="off" />
                    <button disabled={recallResult !== null || !recallAnswer.trim()} className="min-h-12 rounded border border-[#a7c597]/60 px-5 font-mono text-xs text-[#d8efcb] disabled:opacity-40">Check answer</button>
                  </form>
                  {recallResult !== null && (
                    <div className="mt-4 rounded border border-[#50634e] bg-[#17221c] p-4">
                      <p className={recallResult ? "text-[#8ce0a7]" : "text-[#f0b29e]"}>{recallResult ? "CORRECT" : `REVIEW · ${termsOrder.term}`}</p>
                      <p className="mt-2 text-sm text-[#dbe1d4]">{termsOrder.definition}</p>
                      {typingStats && <p className="mt-2 font-mono text-xs text-[#a9c8b0]">{typingStats.wpm} WPM · {typingStats.accuracy}% typing accuracy</p>}
                      <button onClick={nextQuestion} className="mt-4 rounded border border-[#9bc5a8]/50 px-4 py-2 font-mono text-xs">Next term</button>
                    </div>
                  )}
                </div>
              )}

              {mode === "calculate" && activityStarted && calculation && (
                <div className="rounded border border-[#526a59] bg-[#19251f] p-4 sm:p-6">
                  <p className="font-mono text-xs tracking-widest text-[#a9c8b0]">ALE CALCULATOR SPRINT</p>
                  <p className="mt-4 leading-7">Asset value: <strong>${calculation.asset.toLocaleString()}</strong><br />Exposure factor: <strong>{calculation.exposure}%</strong><br />Annualized rate of occurrence: <strong>{calculation.aro}</strong></p>
                  <p className="mt-3 text-sm text-[#c5cebf]">Calculate annual loss expectancy (ALE). Enter the yearly amount.</p>
                  <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); submitCalculation(); }}>
                    <input inputMode="numeric" value={recallAnswer} onChange={(event) => setRecallAnswer(event.target.value)} disabled={recallResult !== null} className="min-h-12 flex-1 rounded border border-[#526a59] bg-[#101815] px-4 font-mono text-sm text-white outline-none focus:border-[#b6d59c]" placeholder="ALE in dollars" />
                    <button disabled={recallResult !== null || !recallAnswer.trim()} className="min-h-12 rounded border border-[#a7c597]/60 px-5 font-mono text-xs disabled:opacity-40">Check ALE</button>
                  </form>
                  {recallResult !== null && (
                    <div className="mt-4 rounded border border-[#50634e] bg-[#17221c] p-4 text-sm">
                      <p className={recallResult ? "text-[#8ce0a7]" : "text-[#f0b29e]"}>{recallResult ? "CORRECT" : `REVIEW · $${calculation.answer.toLocaleString()}`}</p>
                      <p className="mt-2 text-[#dbe1d4]">SLE = asset value × exposure factor. ALE = SLE × ARO.</p>
                      {typingStats && <p className="mt-2 font-mono text-xs text-[#a9c8b0]">{typingStats.wpm} WPM · {typingStats.accuracy}% typing accuracy</p>}
                      <button onClick={nextQuestion} className="mt-4 rounded border border-[#9bc5a8]/50 px-4 py-2 font-mono text-xs">New calculation</button>
                    </div>
                  )}
                </div>
              )}

              {mode === "sequence" && activityStarted && activeSequence && (
                <div className="rounded border border-[#526a59] bg-[#19251f] p-4 sm:p-6">
                  <p className="font-mono text-xs tracking-widest text-[#a9c8b0]">{station.activities[activityIndex].toUpperCase()}</p>
                  <p className="mt-4 text-lg leading-7">{activeSequence.prompt}</p>
                  <div className="mt-5 grid gap-5 lg:grid-cols-2">
                    <div className="rounded border border-[#405148] bg-[#101815] p-4">
                      <p className="font-mono text-xs tracking-widest text-[#9bc5a8]">YOUR BUILD · CLICK STEPS IN ORDER</p>
                      <ol className="mt-3 min-h-16 list-decimal space-y-2 pl-6 text-sm text-[#e0e5d8]">
                        {sequenceSelected.map((step) => <li key={step}>{step}</li>)}
                        {!sequenceSelected.length && <li className="list-none text-[#8e9b90]">Choose the first step to begin.</li>}
                      </ol>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button onClick={checkSequence} disabled={sequenceSelected.length !== activeSequence.steps.length || sequenceResult !== null} className="min-h-10 rounded border border-[#a7c597]/60 px-4 font-mono text-xs disabled:opacity-40">Check my order</button>
                        <button onClick={restartSequence} disabled={sequenceResult === null && sequenceSelected.length === 0} className="min-h-10 rounded border border-[#526a59] px-4 font-mono text-xs disabled:opacity-40">Start over</button>
                        <button onClick={() => setShowSequenceHint((show) => !show)} className="min-h-10 rounded border border-[#526a59] px-4 font-mono text-xs">{showSequenceHint ? "Hide hint" : "Show a hint"}</button>
                      </div>
                      {showSequenceHint && <p className="mt-3 text-sm text-[#c6d9a5]">Hint: {activeSequence.steps[0]} comes first.</p>}
                    </div>
                    <div className="rounded border border-[#405148] bg-[#101815] p-4">
                      <p className="font-mono text-xs tracking-widest text-[#9bc5a8]">AVAILABLE STEPS · SELECT ONE</p>
                      <div className="mt-3 grid gap-2">
                        {sequenceChoices.map((step) => (
                          <button key={step} onClick={() => addSequenceStep(step)} disabled={sequenceSelected.includes(step) || sequenceResult !== null} className="min-h-11 rounded border border-[#46564a] bg-[#202d25] px-3 py-2 text-left text-sm hover:bg-[#2c3a30] disabled:cursor-default disabled:opacity-40">
                            {sequenceSelected.includes(step) ? "PLACED · " : ""}{step}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {sequenceResult !== null && (
                    <div className="mt-4 rounded border border-[#50634e] bg-[#17221c] p-4 text-sm">
                      <p className={sequenceResult ? "text-[#8ce0a7]" : "text-[#f0b29e]"}>{sequenceResult ? "NICE WORK · CORRECT ORDER" : "NOT QUITE · STUDY THE ORDER BELOW"}</p>
                      <ol className="mt-2 list-decimal space-y-1 pl-5 text-[#dbe1d4]">{activeSequence.steps.map((step) => <li key={step}>{step}</li>)}</ol>
                      <button onClick={restartSequence} className="mt-4 rounded border border-[#9bc5a8]/50 px-4 py-2 font-mono text-xs">Play this round again</button>
                    </div>
                  )}
                </div>
              )}

              {progressError && <p className="mt-4 text-xs text-[#f0b29e]" role="alert">{progressError}</p>}

              <footer className="mt-6 border-t border-[#405148] pt-4">
                <p className="mb-2 font-mono text-[10px] tracking-widest text-[#9bc5a8]">REFERENCE DESK · VERIFY AGAINST CURRENT EXAM OBJECTIVES</p>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {referenceIndexes.map((index) => {
                    const reference = SECURITY_PLUS_REFERENCES[index];
                    return (
                    <a key={reference.url} href={reference.url} target="_blank" rel="noreferrer" className="block rounded border border-[#405148] bg-[#172521] p-3 hover:border-[#9bc5a8]">
                      <span className="text-xs font-semibold text-[#b8d7c1] underline decoration-[#65816e] underline-offset-2">{reference.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-[#aeb7a7]">{reference.description}</span>
                    </a>
                    );
                  })}
                </div>
              </footer>
            </div>
          </section>
        </div>
        <div className="flex h-3 shrink-0 items-center justify-center bg-[#555950]">
          <div className="h-1 w-20 rounded-full bg-[#9a9a87]" />
        </div>
      </div>
    </div>
  );
}

function modeButton(active: boolean) {
  return `min-h-10 rounded border px-3 py-2 font-mono text-[11px] transition-colors ${
    active
      ? "border-[#c6b77c] bg-[#394238] text-[#f4e8bd]"
      : "border-[#415148] bg-[#202b25] text-[#d3decf] hover:bg-[#2b3930]"
  }`;
}

function measureTyping(typed: string, expected: string, startedAt: number) {
  const elapsedMinutes = Math.max((Date.now() - startedAt) / 60_000, 1 / 60);
  const normalizedTyped = typed.trim().replace(/\s+/g, " ").toLowerCase();
  const normalizedExpected = expected.trim().replace(/\s+/g, " ").toLowerCase();
  const matchingCharacters = [...normalizedTyped].reduce(
    (matches, character, index) => matches + (character === normalizedExpected[index] ? 1 : 0),
    0,
  );
  return {
    wpm: Math.round((typed.length / 5) / elapsedMinutes),
    accuracy: Math.round((matchingCharacters / Math.max(normalizedTyped.length, normalizedExpected.length, 1)) * 100),
  };
}
