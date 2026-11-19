"use client";

import { useState } from "react";
import { AUDIT_CONTROLS, calculateRisk, FRAMEWORKS } from "@/game/data/content/governance";

type View = "inspector" | "risk" | "frameworks";

export default function AuditGovern() {
  const [view, setView] = useState<View>("inspector");
  const [index, setIndex] = useState(0);
  const [finding, setFinding] = useState<boolean | null>(null);
  const [asset, setAsset] = useState("20000");
  const [exposure, setExposure] = useState("25");
  const [annualRate, setAnnualRate] = useState("2");
  const [riskError, setRiskError] = useState("");
  const [riskResult, setRiskResult] = useState<{ singleLoss: number; annualLoss: number } | null>(null);
  const [frameworkIndex, setFrameworkIndex] = useState(0);
  const control = AUDIT_CONTROLS[index];
  const framework = FRAMEWORKS[frameworkIndex];
  const auditDone = finding === control.gap;

  function checkRisk(event: React.FormEvent) {
    event.preventDefault();
    try {
      const result = calculateRisk(Number(asset), Number(exposure), Number(annualRate));
      setRiskResult(result);
      setRiskError("");
    } catch (error) {
      setRiskResult(null);
      setRiskError(error instanceof Error ? error.message : "The risk calculation could not be completed.");
    }
  }

  return (
    <section className="space-y-4 rounded border border-[#526a59] bg-[#19251f] p-4 sm:p-6">
      <header>
        <p className="font-mono text-[10px] tracking-[0.2em] text-[#9bc5a8]">AUDIT & GOVERN · TRAINING RECORDS</p>
        <h2 className="mt-2 text-xl font-bold text-[#f2e5b9]">Inspect evidence, rate risk, map frameworks</h2>
      </header>
      <div className="flex flex-wrap gap-2" aria-label="Audit and Govern tools">
        {([["inspector", "Audit Inspector"], ["risk", "Risk Calculator"], ["frameworks", "Frameworks"]] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setView(id)} aria-pressed={view === id} className={`min-h-10 rounded border px-3 text-xs ${view === id ? "border-[#c6d9a5] bg-[#344c3b]" : "border-[#405148]"}`}>{label}</button>)}
      </div>

      {view === "inspector" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" aria-label="Audit controls">
            {AUDIT_CONTROLS.map((item, itemIndex) => <button key={item.id} type="button" onClick={() => { setIndex(itemIndex); setFinding(null); }} aria-pressed={index === itemIndex} className={`min-h-10 rounded border px-3 text-xs ${index === itemIndex ? "border-[#c6d9a5] bg-[#344c3b]" : "border-[#405148]"}`}>{item.title}</button>)}
          </div>
          <article className="rounded border border-[#405148] bg-[#101815] p-4">
            <p className="font-mono text-[10px] text-[#9bc5a8]">{control.framework.toUpperCase()}</p>
            <h3 className="mt-2 text-lg font-bold text-white">{control.title}</h3>
            <p className="mt-3 text-xs text-[#e7d8ac]">Requirement: {control.expectation}</p>
            <p className="mt-2 text-sm leading-6 text-[#dbe1d4]">Evidence: {control.evidence}</p>
          </article>
          <fieldset>
            <legend className="font-mono text-xs text-[#9bc5a8]">DOES THE EVIDENCE SHOW A CONTROL GAP?</legend>
            <div className="mt-2 flex gap-2">
              {[true, false].map((answer) => <button key={String(answer)} type="button" aria-pressed={finding === answer} onClick={() => setFinding(answer)} className={`min-h-10 rounded border px-3 text-xs ${finding === answer ? "border-[#c6d9a5] bg-[#344c3b]" : "border-[#405148]"}`}>{answer ? "Yes · gap found" : "No · evidence supports it"}</button>)}
            </div>
          </fieldset>
          {finding !== null && <div className="rounded border border-[#405148] p-3" aria-live="polite">
            <p className="font-mono text-xs">{auditDone ? "AUDIT CHECK CORRECT" : "REVIEW THE EVIDENCE"}</p>
            <p className="mt-2 text-sm leading-6 text-[#dbe1d4]">{control.explanation}</p>
            <p className="mt-2 text-xs text-[#aeb7a7]">Document evidence, owner, impact, and follow-up date. A finding is not a personal blame assignment.</p>
          </div>}
        </div>
      )}

      {view === "risk" && (
        <form onSubmit={checkRisk} className="space-y-4 rounded border border-[#405148] bg-[#101815] p-4">
          <p className="text-sm leading-6 text-[#c5cebf]">SLE = asset value × exposure factor. ALE = SLE × annualized rate of occurrence. This estimates loss for planning; it is not a prediction.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs">Asset value ($)<input inputMode="decimal" type="number" min="0" step="100" value={asset} onChange={(event) => setAsset(event.target.value)} className="mt-1 min-h-11 w-full rounded border border-[#526a59] bg-[#0b100e] px-3 text-sm text-white" /></label>
            <label className="text-xs">Exposure factor (%)<input inputMode="decimal" type="number" min="0" max="100" step="1" value={exposure} onChange={(event) => setExposure(event.target.value)} className="mt-1 min-h-11 w-full rounded border border-[#526a59] bg-[#0b100e] px-3 text-sm text-white" /></label>
            <label className="text-xs">ARO · events/year<input inputMode="decimal" type="number" min="0" step="0.1" value={annualRate} onChange={(event) => setAnnualRate(event.target.value)} className="mt-1 min-h-11 w-full rounded border border-[#526a59] bg-[#0b100e] px-3 text-sm text-white" /></label>
          </div>
          <button type="submit" className="min-h-11 rounded bg-[#344c3b] px-4 font-mono text-xs">Calculate estimated loss</button>
          {riskError && <p role="alert" className="text-sm text-amber-200">{riskError}</p>}
          {riskResult && <div className="grid gap-3 sm:grid-cols-2" aria-live="polite">
            <p className="rounded border border-[#405148] p-3 text-sm">SLE · one event: <strong>${riskResult.singleLoss.toLocaleString()}</strong></p>
            <p className="rounded border border-[#405148] p-3 text-sm">ALE · per year: <strong>${riskResult.annualLoss.toLocaleString()}</strong></p>
          </div>}
        </form>
      )}

      {view === "frameworks" && (
        <div className="space-y-3 rounded border border-[#405148] bg-[#101815] p-4">
          <label htmlFor="framework-select" className="block text-xs text-[#c5cebf]">Select a framework or requirement</label>
          <select id="framework-select" value={frameworkIndex} onChange={(event) => setFrameworkIndex(Number(event.target.value))} className="min-h-11 w-full rounded border border-[#526a59] bg-[#0b100e] px-3 text-sm text-white">
            {FRAMEWORKS.map((item, index) => <option key={item.name} value={index}>{item.name}</option>)}
          </select>
          <h3 className="text-lg font-bold text-[#f2e5b9]">{framework.name}</h3>
          <p className="text-sm leading-6 text-[#dbe1d4]">{framework.purpose}</p>
          <p className="rounded border border-[#665d3e] p-3 text-xs leading-5 text-[#e4dfce]">{framework.note}</p>
          {framework.name === "NIST CSF 2.0" && <ul className="grid gap-2 sm:grid-cols-2">
            {["Govern · set direction and oversee risk", "Identify · understand assets and risk", "Protect · safeguard people and assets", "Detect · find possible cybersecurity events", "Respond · contain and manage events", "Recover · restore capabilities"].map((item) => <li key={item} className="rounded border border-[#27352c] p-2 text-xs text-[#c5cebf]">{item}</li>)}
          </ul>}
        </div>
      )}
      <p className="text-xs text-[#aeb7a7]">All audit evidence is fictional. Framework applicability depends on the organization, systems, and data; this practice is not legal advice.</p>
    </section>
  );
}
