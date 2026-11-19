"use client";

import { useMemo, useRef, useState } from "react";
import CyberPrepQuiz from "@/components/CyberPrepQuiz";
import {
  createTerminalSession,
  executeTerminalCommand,
  type TerminalSession,
} from "@/game/data/content/terminal";

const LEVELS = [
  {
    name: "First Shell",
    intro: "Find your location, inspect the training folder, read the welcome note, and calculate 7 + 5.",
    hint: "Try pwd, ls -la, cat readme.txt, then expr 7 + 5.",
    quiz: ["risk-vulnerability-01"],
    check: (session: TerminalSession) => {
      const history = session.history.join("\n");
      return ["pwd", "ls", "cat", "expr"].every((command) => new RegExp(`(^|\\n)${command}(?:\\s|$)`).test(history));
    },
  },
  {
    name: "Paths & Hidden Files",
    intro: "Move up a folder, return home with ~, and locate the hidden training clue.",
    hint: "Use cd .., cd ~, and ls -la. Hidden names begin with a dot.",
    quiz: ["hidden-files-command-11"],
    check: (session: TerminalSession) => session.cwd === "/home/analyst"
      && session.history.some((command) => command === "cd ..")
      && session.history.some((command) => command === "cd ~")
      && session.history.some((command) => command.startsWith("ls") && command.includes("a")),
  },
  {
    name: "Log Hunter",
    intro: "Search the simulated server log for errors, then count the matching lines.",
    hint: "Try grep -i error logs/server_logs.txt | wc -l. These are fictional log entries.",
    quiz: ["log-output-count-15"],
    check: (session: TerminalSession) => session.history.some((command) => command.includes("grep") && command.includes("error"))
      && session.history.some((command) => command.includes("wc") && command.includes("|")),
  },
  {
    name: "Fix the Tree",
    intro: "Move Q3patches.txt into reports, then record what you did in notes/tasks.txt with nano.",
    hint: "Try mv Q3patches.txt reports, then nano notes/tasks.txt. Save with CTRL+X, Y, ENTER.",
    quiz: ["grep-arguments-13"],
    check: (session: TerminalSession) => Boolean(session.files["/home/analyst/reports/Q3patches.txt"])
      && !session.files["/home/analyst/Q3patches.txt"]
      && session.files["/home/analyst/notes/tasks.txt"]?.content.toLowerCase().includes("completed") === true,
  },
  {
    name: "Permission Decoder",
    intro: "Set access.txt to owner read/write and group read, create tnguyen, add the account to security, and assign file ownership.",
    hint: "Try chmod 640 access.txt; sudo useradd tnguyen; sudo usermod -aG security tnguyen; sudo chown tnguyen:security access.txt.",
    quiz: ["permission-character-14"],
    check: (session: TerminalSession) => session.files["/home/analyst/access.txt"]?.permissions === "-rw-r-----"
      && session.users.tnguyen?.includes("security") === true
      && session.files["/home/analyst/access.txt"]?.owner === "tnguyen"
      && session.files["/home/analyst/access.txt"]?.group === "security",
  },
];

type NanoStage = "editing" | "confirm-save" | "confirm-name";

function commandPrompt(session: TerminalSession) {
  return `analyst@cyberprep:${session.cwd.replace("/home/analyst", "~")}$`;
}

export default function TerminalOps() {
  const [level, setLevel] = useState(1);
  const [session, setSession] = useState(() => createTerminalSession(1));
  const [command, setCommand] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [nanoPath, setNanoPath] = useState<string | null>(null);
  const [nanoDraft, setNanoDraft] = useState("");
  const [nanoStage, setNanoStage] = useState<NanoStage>("editing");
  const [errorMessage, setErrorMessage] = useState("");
  const [hintVisible, setHintVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const historyIndex = useRef(-1);
  const lab = LEVELS[level - 1];
  const completed = useMemo(() => lab.check(session), [lab, session]);

  async function submitCommand() {
    const entered = command.trim();
    if (!entered && !pendingConfirmation) return;
    setCommand("");
    setErrorMessage("");
    historyIndex.current = -1;

    if (pendingConfirmation) {
      const confirm = /^(y|yes)$/i.test(entered);
      setPendingConfirmation(null);
      if (!confirm) {
        setSession((current) => ({ ...current, output: [...current.output, `${commandPrompt(current)} ${entered}`, "Operation cancelled."] }));
        return;
      }
      const result = await executeTerminalCommand(session, pendingConfirmation, { confirmed: true });
      setSession(result.session);
      if (result.output.length) result.session.output = [...session.output, `${commandPrompt(session)} ${pendingConfirmation}`, ...result.output];
      scrollOutput();
      return;
    }

    const result = await executeTerminalCommand(session, entered);
    if (result.confirmation) {
      setPendingConfirmation(entered);
      setSession((current) => ({
        ...current,
        output: [...current.output, `${commandPrompt(current)} ${entered}`, result.confirmation!.question],
      }));
      scrollOutput();
      return;
    }

    if (result.output.some((line) => line.startsWith("EDITOR:"))) {
      const path = result.output[0].slice("EDITOR:".length);
      setSession(result.session);
      setNanoPath(path);
      setNanoDraft(result.session.files[path]?.content ?? "");
      setNanoStage("editing");
      return;
    }

    const output = result.cleared
      ? ["CyberPrep Bash Simulator · fictional filesystem only"]
      : [...(result.output.length ? result.output : [""])];
    result.session.output = [...session.output, `${commandPrompt(session)} ${entered}`, ...output];
    setSession(result.session);
    scrollOutput();
  }

  function scrollOutput() {
    requestAnimationFrame(() => outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight, behavior: "smooth" }));
  }

  function saveNano() {
    if (!nanoPath) return;
    const nextSession: TerminalSession = {
      ...session,
      files: { ...session.files, [nanoPath]: { ...session.files[nanoPath], content: nanoDraft } },
      history: [...session.history, `nano ${nanoPath}`],
      output: [...session.output, `Saved ${nanoPath} in the virtual filesystem.`],
    };
    setSession(nextSession);
    setNanoPath(null);
    setNanoStage("editing");
  }

  function handleNanoKey(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.ctrlKey && event.key.toLowerCase() === "x" && nanoStage === "editing") {
      event.preventDefault();
      setNanoStage("confirm-save");
    } else if (nanoStage === "confirm-save" && event.key.toLowerCase() === "y") {
      event.preventDefault();
      setNanoStage("confirm-name");
    } else if (nanoStage === "confirm-save" && event.key.toLowerCase() === "n") {
      event.preventDefault();
      setNanoPath(null);
      setNanoStage("editing");
    } else if (nanoStage === "confirm-name" && event.key === "Enter") {
      event.preventDefault();
      saveNano();
    }
  }

  function changeLevel(next: number) {
    setLevel(next);
    setSession(createTerminalSession(next));
    setPendingConfirmation(null);
    setCommand("");
    setHintVisible(false);
    setErrorMessage("");
    setShowQuiz(false);
  }

  return (
    <section className="rounded border border-[#526a59] bg-[#19251f] p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-[#9bc5a8]">ISOLATED PRACTICE ENVIRONMENT · NO REAL SHELL ACCESS</p>
          <h2 className="mt-2 text-xl font-bold text-[#f2e5b9]">Terminal Ops · {lab.name}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#dbe1d4]">{lab.intro}</p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Terminal Ops levels">
          {LEVELS.map((item, index) => (
            <button key={item.name} type="button" onClick={() => changeLevel(index + 1)}
              aria-pressed={level === index + 1}
              className={`min-h-10 rounded border px-3 py-2 font-mono text-xs ${level === index + 1 ? "border-[#c6d9a5] bg-[#344c3b] text-white" : "border-[#405148] text-[#c5cebf]"}`}>
              {index + 1}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded border border-[#665d3e] bg-[#28271e] p-3">
        <p className="text-sm text-[#e4dfce]"><strong>Checkpoint:</strong> {completed ? "Complete — final virtual state verified." : "Finish the lab goal, then check your work."}</p>
        <button type="button" onClick={() => setHintVisible((visible) => !visible)}
          className="min-h-10 rounded border border-[#665d3e] px-3 py-2 text-xs text-[#e7d8ac]">{hintVisible ? "Hide hint" : "Show hint"}</button>
        {hintVisible && <p className="w-full font-mono text-xs text-[#d6d1bc]">{lab.hint}</p>}
      </div>

      <div ref={outputRef} aria-label="Terminal output" aria-live="polite"
        className="mt-4 h-64 overflow-auto rounded border border-[#405148] bg-[#07100c] p-3 font-mono text-xs leading-5 text-[#b8e3bf] sm:h-80">
        {session.output.map((line, index) => <div key={`${index}-${line}`}>{line || "\u00a0"}</div>)}
      </div>
      <form className="mt-2 flex gap-2" onSubmit={(event) => { event.preventDefault(); void submitCommand(); }}>
        <label className="sr-only" htmlFor="terminal-command">Terminal command</label>
        <span className="self-center font-mono text-xs text-[#9bc5a8]">{commandPrompt(session)}</span>
        <input ref={inputRef} id="terminal-command" value={command} onChange={(event) => setCommand(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp") {
              event.preventDefault();
              const nextIndex = Math.min(historyIndex.current + 1, session.history.length - 1);
              historyIndex.current = nextIndex;
              setCommand(session.history[session.history.length - 1 - nextIndex] ?? "");
            } else if (event.key === "ArrowDown" && historyIndex.current >= 0) {
              event.preventDefault();
              historyIndex.current -= 1;
              setCommand(historyIndex.current < 0 ? "" : session.history[session.history.length - 1 - historyIndex.current] ?? "");
            }
          }}
          autoComplete="off" spellCheck={false}
          className="min-h-11 min-w-0 flex-1 rounded border border-[#526a59] bg-[#0a110e] px-3 font-mono text-sm text-white outline-none focus:border-[#c6d9a5]"
          placeholder={pendingConfirmation ? "Type y to confirm or n to cancel" : "Type a simulated command"} />
        <button type="submit" className="min-h-11 rounded border border-[#a7c597]/60 bg-[#283b2f] px-4 font-mono text-xs text-[#d8efcb]">Run</button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] text-[#aeb7a7]">PRACTICE USERS: analyst, jdoe · ADMIN COMMANDS REQUIRE sudo · DATA IS FAKE</p>
        {completed && level < LEVELS.length && <button type="button" onClick={() => changeLevel(level + 1)}
          className="min-h-10 rounded border border-[#a7c597]/60 bg-[#283b2f] px-4 py-2 font-mono text-xs font-bold text-[#d8efcb]">Next level · {LEVELS[level].name}</button>}
          {completed && <button type="button" onClick={() => setShowQuiz((visible) => !visible)}
            className="min-h-10 rounded border border-[#665d3e] px-4 py-2 font-mono text-xs text-[#e7d8ac]">{showQuiz ? "Hide follow-up quiz" : "Take follow-up quiz"}</button>}
        </div>
        {errorMessage && <p role="status" className="mt-2 text-xs text-amber-200">{errorMessage}</p>}
        {completed && showQuiz && <div className="mt-5"><CyberPrepQuiz key={`${level}-${lab.quiz.join("-")}`} cardIds={lab.quiz} /></div>}

      {nanoPath && (
        <div className="fixed inset-0 z-[140] grid place-items-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-labelledby="nano-title">
          <div className="w-full max-w-3xl rounded border-2 border-[#a2a083] bg-[#101815] p-4">
            <h3 id="nano-title" className="font-mono text-lg text-[#e7d8ac]">GNU nano · {nanoPath}</h3>
            <p className="mt-1 text-xs text-[#aeb7a7]">Edit training notes only; Ctrl+X → Y → Enter saves to the virtual filesystem.</p>
            <textarea autoFocus value={nanoDraft} readOnly={nanoStage !== "editing"}
              onChange={(event) => setNanoDraft(event.target.value)}
              onKeyDown={handleNanoKey} rows={12}
              className="mt-3 w-full rounded border border-[#526a59] bg-[#07100c] p-3 font-mono text-sm text-white outline-none focus:border-[#c6d9a5] disabled:opacity-70" />
            <p aria-live="polite" className="mt-2 min-h-5 font-mono text-xs text-[#e7d8ac]">
              {nanoStage === "confirm-save" ? "Save modified buffer? Press Y to save, N to cancel." : nanoStage === "confirm-name" ? "Press Enter to confirm the filename." : "Editing virtual file"}
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setNanoPath(null)} className="min-h-10 rounded border border-[#526a59] px-3 text-xs text-[#dbe1d4]">Cancel</button>
              <button type="button" onClick={() => setNanoStage(nanoStage === "editing" ? "confirm-save" : nanoStage === "confirm-save" ? "confirm-name" : "confirm-name")}
                onDoubleClick={saveNano} className="min-h-10 rounded border border-[#a7c597]/60 px-3 text-xs text-[#d8efcb]">
                {nanoStage === "editing" ? "Ctrl+X" : nanoStage === "confirm-save" ? "Y · Save" : "Enter · Confirm"}
              </button>
              {nanoStage === "confirm-name" && <button type="button" onClick={saveNano} className="min-h-10 rounded bg-[#344c3b] px-3 text-xs text-white">Save note</button>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
