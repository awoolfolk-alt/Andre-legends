"use client";

import { useState } from "react";
import { CURRICULUM_CONTENT, type Scenario } from "@/game/data/content";

const TUTORIALS: Record<string, { before: string; words: string[]; lab?: "terminal" | "powershell" }> = {
  S1: { before: "A device you did not expect is a reason to pause. You are not responsible for figuring out what is inside it.", words: ["Baiting: leaving something tempting so a person connects or opens it.", "Removable media: a device such as a USB drive that can carry files or interact with a computer."] },
  S2: { before: "A convincing label does not prove who left a device or whether it is safe.", words: ["Baiting uses curiosity or urgency to tempt someone into an unsafe action.", "Report means tell the team that owns the security process; do not investigate the item yourself."] },
  S3: { before: "A warning plus an unknown connection is enough to stop and ask for help. Do not unlock or explore the other person's device.", words: ["Isolate: limit a device's network connection so a possible problem cannot spread.", "Preserve evidence: avoid deleting files or changing the device before responders assess it."] },
  S4: { before: "One symptom is not proof of malware, but several unusual signs should be reported. Do not install a tool offered by the suspicious pop-up.", words: ["Cryptojacking: secretly using a device's computing power to mine cryptocurrency.", "High CPU: the processor is unusually busy; investigators check which process is responsible."], lab: "powershell" },
  S5: { before: "Do not negotiate or wipe the device on your own. The response team coordinates containment and recovery.", words: ["Ransomware: malware that blocks or encrypts data and demands payment.", "Clean backup: a recovery copy checked to be safe and usable before restoring."], lab: "terminal" },
  S6: { before: "Being polite does not mean bypassing an access check. Use the organization's visitor process.", words: ["Tailgating: following an authorized person through a controlled door without authenticating.", "Authorization: permission to enter a particular space, not just a plausible story."] },
  S7: { before: "Report a missing work device right away. The organization can revoke sessions and decide whether to lock or wipe it.", words: ["Full-disk encryption: protects data stored on the device when it is powered off or locked.", "Remote wipe: an approved action that removes data from a managed device; report first and follow policy."] },
  S8: { before: "Protect yourself and the screen without escalating the interaction. If a password may have been seen, follow the approved change/report process.", words: ["Shoulder surfing: watching a person enter information to learn a password or view private data.", "Screen lock: stops someone from using an unattended session."] },
  S9: { before: "Use updates inside the actual application or an approved software portal, not a random webpage.", words: ["Malvertising: harmful content delivered through an online advertisement or page.", "Trojan: software disguised as something useful or harmless."] },
  S10: { before: "The behavior is the clue. A filename or icon does not prove what the program really does.", words: ["Ransomware encrypts or blocks access to data to demand payment.", "Malware analysis belongs in an authorized, isolated lab—not on your everyday work device."], lab: "terminal" },
};

function matchesAnswer(input: string, accepted: string[]) {
  const normalized = input.trim().toLowerCase();
  return accepted.some((answer) => normalized.includes(answer.toLowerCase()));
}

export default function FoundDevice({ onOpenLab }: { onOpenLab: (mode: "terminal" | "powershell") => void }) {
  const scenarios = CURRICULUM_CONTENT.scenarios;
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [threatAnswer, setThreatAnswer] = useState("");
  const [flagAnswer, setFlagAnswer] = useState("");
  const [understandingChecked, setUnderstandingChecked] = useState(false);
  const [points, setPoints] = useState(0);
  const scenario: Scenario = scenarios[index];
  const tutorial = TUTORIALS[scenario.id] ?? {
    before: "Pause, identify what is known, and choose a response that protects people and preserves evidence.",
    words: [],
  };
  const action = choice === null ? null : scenario.actions[choice];
  const threatCorrect = matchesAnswer(threatAnswer, scenario.typeAnswers.attack);
  const flagCorrect = matchesAnswer(flagAnswer, scenario.typeAnswers.redFlags);

  function chooseAction(actionIndex: number) {
    if (choice !== null) return;
    setChoice(actionIndex);
    const rating = scenario.actions[actionIndex].rating;
    setPoints((current) => current + (rating === "best" ? 2 : rating === "acceptable" ? 1 : 0));
  }

  function nextScenario() {
    setIndex((current) => (current + 1) % scenarios.length);
    setChoice(null);
    setThreatAnswer("");
    setFlagAnswer("");
    setUnderstandingChecked(false);
  }

  return (
    <section className="space-y-4 rounded border border-[#526a59] bg-[#19251f] p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-[#9bc5a8]">FOUND DEVICE · SAFE RESPONSE PRACTICE</p>
          <h2 className="mt-2 text-xl font-bold text-[#f2e5b9]">{scenario.title}</h2>
          <p className="mt-2 text-sm text-[#c5cebf]">Scenario {index + 1} of {scenarios.length} · practice points {points}</p>
        </div>
        <span className="rounded border border-[#526a59] px-3 py-2 font-mono text-[10px]">{scenario.surface.toUpperCase()}</span>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Found Device scenarios">
        {scenarios.map((item, scenarioIndex) => <button key={item.id} type="button" onClick={() => { setIndex(scenarioIndex); setChoice(null); setThreatAnswer(""); setFlagAnswer(""); setUnderstandingChecked(false); }} aria-current={index === scenarioIndex ? "step" : undefined} className={`min-h-10 rounded border px-3 text-xs ${index === scenarioIndex ? "border-[#c6d9a5] bg-[#344c3b]" : "border-[#405148]"}`}>Scenario {scenarioIndex + 1}</button>)}
      </nav>

      <article className="rounded border border-[#405148] bg-[#101815] p-4">
        <p className="font-mono text-[10px] text-[#9bc5a8]">{scenario.setting.toUpperCase()}</p>
        <p className="mt-2 text-sm leading-6 text-white">{scenario.story}</p>
      </article>
      <aside className="rounded border border-[#665d3e] bg-[#28271e] p-4">
        <h3 className="font-mono text-xs text-[#e7d8ac]">BEFORE YOU CHOOSE</h3>
        <p className="mt-2 text-sm leading-6 text-[#e4dfce]">{tutorial.before}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-[#d3cba9]">{tutorial.words.map((word) => <li key={word}>{word}</li>)}</ul>
      </aside>

      <fieldset className="space-y-2">
        <legend className="font-mono text-xs text-[#9bc5a8]">WHAT WOULD YOU DO?</legend>
        {scenario.actions.map((item, actionIndex) => <button key={item.text} type="button" disabled={choice !== null} onClick={() => chooseAction(actionIndex)} className={`block min-h-11 w-full rounded border px-3 py-2 text-left text-sm disabled:cursor-default ${choice === actionIndex ? "border-[#c6d9a5] bg-[#344c3b]" : "border-[#405148] bg-[#101815] hover:bg-[#26352c]"}`}>{item.text}</button>)}
      </fieldset>

      {action && (
        <div className="rounded border border-[#50634e] bg-[#17221c] p-4" aria-live="polite">
          <p className="font-mono text-xs text-[#e7d8ac]">{action.rating.toUpperCase()} RESPONSE</p>
          <p className="mt-2 text-sm leading-6 text-[#dbe1d4]">{action.feedback}</p>
          {tutorial.lab && <button type="button" onClick={() => onOpenLab(tutorial.lab!)} className="mt-3 min-h-10 rounded border border-[#526a59] px-3 text-xs">Open the related {tutorial.lab === "powershell" ? "PowerShell" : "Terminal"} practice lab</button>}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-[#c5cebf]">Name the likely threat or issue
              <input value={threatAnswer} onChange={(event) => setThreatAnswer(event.target.value)} disabled={understandingChecked} className="mt-1 min-h-11 w-full rounded border border-[#526a59] bg-[#101815] px-3 text-sm text-white" placeholder="Use your own words" />
            </label>
            <label className="text-xs text-[#c5cebf]">Type one red flag you noticed
              <input value={flagAnswer} onChange={(event) => setFlagAnswer(event.target.value)} disabled={understandingChecked} className="mt-1 min-h-11 w-full rounded border border-[#526a59] bg-[#101815] px-3 text-sm text-white" placeholder="What made you pause?" />
            </label>
          </div>
          {!understandingChecked ? (
            <button type="button" onClick={() => setUnderstandingChecked(true)} disabled={!threatAnswer.trim() || !flagAnswer.trim()} className="mt-3 min-h-10 rounded border border-[#526a59] px-3 text-xs disabled:opacity-40">Check what I learned</button>
          ) : (
            <div className="mt-3 text-xs leading-5">
              <p className={threatCorrect ? "text-[#b8d7bf]" : "text-amber-200"}>{threatCorrect ? "Threat identified." : `Review the term: ${scenario.typeAnswers.attack.join(", ")}.`}</p>
              <p className={flagCorrect ? "text-[#b8d7bf]" : "text-amber-200"}>{flagCorrect ? "Red flag identified." : `Clues include: ${scenario.typeAnswers.redFlags.join(", ")}.`}</p>
            </div>
          )}
          {understandingChecked && <button type="button" onClick={nextScenario} className="mt-4 min-h-10 rounded bg-[#344c3b] px-4 font-mono text-xs">Next scenario</button>}
        </div>
      )}
      <p className="text-xs text-[#aeb7a7]">If a situation is real, follow your organization's process and contact its security team. This training never executes malware or interacts with physical devices.</p>
    </section>
  );
}
