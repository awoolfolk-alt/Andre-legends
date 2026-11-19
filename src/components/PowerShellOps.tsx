"use client";

import { useState } from "react";
import { createPowerShellSession, executePowerShell, type PowerShellSession } from "@/game/data/content/powershell";

const LEVELS = [
  { title: "Navigate Windows", goal: "Use Get-Location, inspect the training files, and open the welcome note.", hint: "Try Get-Location, Get-ChildItem, then Get-Content readme.txt.", linux: "pwd · ls · cat" },
  { title: "Search & Filter", goal: "Find the failed logon records in the fictional authentication log.", hint: "Try Select-String -Pattern failed -Path auth.log.", linux: "grep -i failed auth.log" },
  { title: "Processes & Services", goal: "Find the high-CPU process and inspect the simulated services.", hint: "Try Get-Process | Where-Object {$_.CPU -gt 50}, then Get-Service.", linux: "ps · systemctl" },
  { title: "Event Log Detective", goal: "Inspect the Windows event examples and identify event 4625.", hint: "Use Get-WinEvent. Event 4625 means failed logon; 4624 is successful.", linux: "grep in auth.log" },
  { title: "Least Privilege Offboarding", goal: "Disable jdoe's account. A standard user should not change account settings.", hint: "Try Disable-LocalUser -Name jdoe; then choose Run as Administrator and retry.", linux: "sudo usermod --lock jdoe" },
];

export default function PowerShellOps() {
  const [level, setLevel] = useState(0);
  const [session, setSession] = useState<PowerShellSession>(() => createPowerShellSession());
  const [command, setCommand] = useState("");
  const [hint, setHint] = useState(false);
  const lab = LEVELS[level];
  const done = level === 0
    ? /get-location|pwd/i.test(session.history.join("\n")) && /get-childitem|ls|dir/i.test(session.history.join("\n")) && /get-content|cat|type/i.test(session.history.join("\n"))
    : level === 1
      ? session.history.some((entry) => /select-string/i.test(entry))
      : level === 2
        ? session.history.some((entry) => /get-process/i.test(entry)) && session.history.some((entry) => /get-service/i.test(entry))
        : level === 3
          ? session.history.some((entry) => /get-winevent/i.test(entry))
          : session.users.some((user) => user.Name === "jdoe" && user.Enabled === false);

  function run(event: React.FormEvent) {
    event.preventDefault();
    setSession((current) => executePowerShell(current, command));
    setCommand("");
  }

  function selectLevel(index: number) {
    setLevel(index);
    setSession(createPowerShellSession());
    setHint(false);
  }

  return (
    <section className="space-y-4 rounded border border-[#526a59] bg-[#19251f] p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-[#9bc5a8]">WINDOWS OPS · SIMULATED POWERSHELL</p>
          <h2 className="mt-2 text-xl font-bold text-[#f2e5b9]">{lab.title}</h2>
          <p className="mt-2 text-sm text-[#dbe1d4]">{lab.goal}</p>
        </div>
        <button type="button" onClick={() => setSession((current) => ({ ...current, elevated: !current.elevated }))} aria-pressed={session.elevated} className="min-h-10 rounded border border-[#82936d] px-3 text-xs">
          {session.elevated ? "Administrator · on" : "Run as Administrator"}
        </button>
      </header>
      <div className="flex flex-wrap gap-2" aria-label="PowerShell levels">
        {LEVELS.map((item, index) => <button key={item.title} type="button" onClick={() => selectLevel(index)} aria-pressed={level === index} className={`min-h-10 rounded border px-3 text-xs ${level === index ? "border-[#c6d9a5] bg-[#344c3b]" : "border-[#405148]"}`}>Level {index + 1}</button>)}
      </div>
      <p className="rounded border border-[#405148] p-3 text-xs text-[#c5cebf]"><strong>Linux ↔ PowerShell:</strong> {lab.linux}</p>
      <div className="rounded border border-[#405148] bg-[#0b100e] p-3" aria-label="Simulated PowerShell output">
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs leading-5 text-[#c7f1cf]" aria-live="polite">{session.output.join("\n")}</pre>
      </div>
      <form onSubmit={run} className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="powershell-command">Enter a simulated PowerShell command</label>
        <input id="powershell-command" value={command} onChange={(event) => setCommand(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded border border-[#526a59] bg-[#101815] px-3 font-mono text-sm text-white" placeholder="Get-ChildItem" autoComplete="off" />
        <button type="submit" className="min-h-11 rounded bg-[#344c3b] px-4 font-mono text-xs">Run command</button>
      </form>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setHint(true)} className="min-h-10 rounded border border-[#665d3e] px-3 text-xs">Show a hint</button>
        {hint && <p className="text-sm text-[#e7d8ac]">{lab.hint}</p>}
        <p className="ml-auto font-mono text-xs" aria-live="polite">{done ? "LAB COMPLETE · checkpoint reached" : "LAB IN PROGRESS"}</p>
      </div>
      <p className="text-xs text-[#aeb7a7]">Safety: this is a fictional environment. Commands cannot access your computer, accounts, files, or network.</p>
    </section>
  );
}
