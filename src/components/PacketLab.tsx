"use client";

import { useMemo, useState } from "react";
import {
  compileCaptureFilter,
  compileDisplayFilter,
  TRAINING_CAPTURE,
  type TrainingPacket,
} from "@/game/data/content/packet";

const LEVELS = [
  { title: "Layer Stack", goal: "Select a packet and trace its headers: Ethernet carries MAC addresses, IP carries network addresses, and TCP/UDP carries ports.", hint: "Click a packet. Compare Ethernet II, IPv4, and the transport layer below." },
  { title: "Model Matcher", goal: "OSI has seven layers. TCP/IP is commonly taught as four layers. Choose the correct statement.", hint: "The models organize the same communication work into a different number of layers." },
  { title: "Packet Inspector", goal: "Select a packet and find its source, destination, TTL, and frame length in the decoded details.", hint: "Select one packet in the top pane; the lower panes show decoded layers and bytes." },
  { title: "Filter Sprint", goal: "Use a Wireshark-style display filter to show the HTTP packets on TCP port 80.", hint: "Try tcp.port == 80. Display filters use field names and ==, not BPF words." },
  { title: "Two Filter Boxes", goal: "Use both languages: display filter tcp.port == 80 and capture filter tcp port 80 and host 192.0.2.10.", hint: "The display filter uses tcp.port == 80. The capture filter uses tcp port 80 and host 192.0.2.10." },
];

function bytesFor(packet: TrainingPacket) {
  const bytes = new TextEncoder().encode(packet.payload).slice(0, 40);
  const rows: { offset: string; hex: string; text: string }[] = [];
  for (let index = 0; index < bytes.length; index += 8) {
    const row = bytes.slice(index, index + 8);
    rows.push({
      offset: index.toString(16).padStart(4, "0"),
      hex: Array.from(row).map((value) => value.toString(16).padStart(2, "0")).join(" "),
      text: Array.from(row).map((value) => value >= 32 && value < 127 ? String.fromCharCode(value) : ".").join(""),
    });
  }
  return rows;
}

function packetSummary(packet: TrainingPacket) {
  if (packet.dnsQuery) return `Standard query ${packet.dnsQuery}`;
  if (packet.httpMethod) return `${packet.httpMethod} ${packet.httpHost ?? ""}`.trim();
  if (packet.flags) return `TCP ${packet.flags}`;
  return packet.payload;
}

export default function PacketLab() {
  const [level, setLevel] = useState(0);
  const [displayFilter, setDisplayFilter] = useState("");
  const [captureFilter, setCaptureFilter] = useState("");
  const [appliedDisplay, setAppliedDisplay] = useState("");
  const [appliedCapture, setAppliedCapture] = useState("");
  const [filterError, setFilterError] = useState("");
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [osiAnswer, setOsiAnswer] = useState<boolean | null>(null);
  const [filtersApplied, setFiltersApplied] = useState(false);

  const visiblePackets = useMemo(() => {
    try {
      const display = compileDisplayFilter(appliedDisplay);
      const capture = compileCaptureFilter(appliedCapture);
      return TRAINING_CAPTURE.filter((packet) => display(packet) && capture(packet));
    } catch {
      return TRAINING_CAPTURE;
    }
  }, [appliedCapture, appliedDisplay]);
  const selectedPacket = visiblePackets.find((packet) => packet.number === selectedNumber) ?? visiblePackets[0] ?? null;
  const levelInfo = LEVELS[level];
  const complete = level === 0
    ? selectedNumber !== null && selectedPacket !== null
    : level === 1
      ? osiAnswer === false
      : level === 2
        ? selectedNumber !== null && selectedPacket !== null
        : level === 3
          ? filtersApplied && appliedDisplay.trim() !== "" && !filterError && visiblePackets.length > 0
          : filtersApplied && appliedDisplay.trim() !== "" && appliedCapture.trim() !== "" && !filterError && visiblePackets.length > 0;

  function applyFilters(displaySource: string, captureSource: string) {
    try {
      const display = compileDisplayFilter(displaySource);
      const capture = compileCaptureFilter(captureSource);
      const matches = TRAINING_CAPTURE.filter((packet) => display(packet) && capture(packet));
      setAppliedDisplay(displaySource);
      setAppliedCapture(captureSource);
      setFilterError(matches.length ? "" : "No packets matched. Check your syntax or loosen the filter.");
      setSelectedNumber(matches[0]?.number ?? null);
      setFiltersApplied(true);
    } catch (error) {
      setFilterError(error instanceof Error ? error.message : "The filter could not be parsed.");
    }
  }

  function selectLevel(next: number) {
    setLevel(next);
    setDisplayFilter("");
    setCaptureFilter("");
    setAppliedDisplay("");
    setAppliedCapture("");
    setFilterError("");
    setSelectedNumber(null);
    setOsiAnswer(null);
    setFiltersApplied(false);
  }

  return (
    <section className="space-y-4 rounded border border-[#526a59] bg-[#19251f] p-4 sm:p-6">
      <header>
        <p className="font-mono text-[10px] tracking-[0.2em] text-[#9bc5a8]">PACKET LAB · FAKE CAPTURE · NO NETWORK ACCESS</p>
        <h2 className="mt-2 text-xl font-bold text-[#f2e5b9]">{levelInfo.title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#dbe1d4]">{levelInfo.goal}</p>
      </header>
      <div className="flex flex-wrap gap-2" aria-label="Packet Lab levels">
        {LEVELS.map((item, index) => <button key={item.title} type="button" onClick={() => selectLevel(index)} aria-pressed={level === index} className={`min-h-10 rounded border px-3 text-xs ${level === index ? "border-[#c6d9a5] bg-[#344c3b]" : "border-[#405148]"}`}>Level {index + 1}</button>)}
      </div>
      {level === 1 && (
        <fieldset className="rounded border border-[#405148] p-3">
          <legend className="px-1 text-xs text-[#e7d8ac]">Do OSI and TCP/IP both have seven layers?</legend>
          <div className="mt-2 flex gap-2">
            {[true, false].map((answer) => <button key={String(answer)} type="button" aria-pressed={osiAnswer === answer} onClick={() => setOsiAnswer(answer)} className={`min-h-10 rounded border px-3 text-xs ${osiAnswer === answer ? "border-[#c6d9a5] bg-[#344c3b]" : "border-[#405148]"}`}>{answer ? "Yes" : "No · OSI 7, TCP/IP 4"}</button>)}
          </div>
          {osiAnswer !== null && <p className="mt-2 text-xs text-[#c5cebf]">OSI is a seven-layer reference model. The TCP/IP model is usually shown with four layers: link, internet, transport, and application.</p>}
        </fieldset>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        <label className="block text-xs text-[#c5cebf]">
          DISPLAY FILTER · Wireshark syntax
          <input value={displayFilter} onChange={(event) => setDisplayFilter(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") applyFilters(displayFilter, captureFilter); }} placeholder='tcp.port == 80 && tcp contains "GET"' className="mt-1 min-h-11 w-full rounded border border-[#526a59] bg-[#101815] px-3 font-mono text-sm text-[#c7f1cf]" aria-describedby="display-filter-help" />
          <span id="display-filter-help" className="mt-1 block text-[10px] text-[#aeb7a7]">Fields: ip.addr, ip.src, ip.dst, tcp.port, udp.port, dns, http, icmp, frame.len, ip.ttl.</span>
        </label>
        <label className="block text-xs text-[#c5cebf]">
          CAPTURE FILTER · BPF syntax
          <input value={captureFilter} onChange={(event) => setCaptureFilter(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") applyFilters(displayFilter, captureFilter); }} placeholder="tcp port 80 and host 192.0.2.10" className="mt-1 min-h-11 w-full rounded border border-[#526a59] bg-[#101815] px-3 font-mono text-sm text-[#c7f1cf]" />
          <span className="mt-1 block text-[10px] text-[#aeb7a7]">BPF terms: tcp, udp, icmp, host, src/dst host, port, src/dst port, net; combine with and/or/not.</span>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => applyFilters(displayFilter, captureFilter)} className="min-h-10 rounded bg-[#344c3b] px-4 font-mono text-xs">Apply both filters</button>
        <button type="button" onClick={() => { setDisplayFilter(""); setCaptureFilter(""); applyFilters("", ""); }} className="min-h-10 rounded border border-[#405148] px-3 text-xs">Clear filters</button>
        {filterError && <p role="alert" className="text-xs text-amber-200">{filterError}</p>}
        <span className="ml-auto font-mono text-xs text-[#aeb7a7]">{visiblePackets.length} / {TRAINING_CAPTURE.length} packets</span>
      </div>

      <div className="overflow-x-auto rounded border border-[#405148] bg-[#101815]">
        <table className="w-full border-collapse text-left text-xs">
          <caption className="p-2 text-left text-[#9bc5a8]">PACKET LIST · protocol labels are shown in text as well as color</caption>
          <thead><tr>{["No.", "Time", "Source", "Destination", "Protocol", "Length", "Info"].map((heading) => <th key={heading} scope="col" className="border-b border-[#405148] px-2 py-2 font-mono text-[#e7d8ac]">{heading}</th>)}</tr></thead>
          <tbody>{visiblePackets.map((packet) => <tr key={packet.number} className={packet.number === selectedPacket?.number ? "bg-[#27352c]" : ""}>
            <td className="border-b border-[#27352c] px-2 py-2"><button type="button" onClick={() => setSelectedNumber(packet.number)} aria-label={`Inspect packet ${packet.number}`} aria-pressed={packet.number === selectedPacket?.number} className="min-h-9 min-w-8 underline">{packet.number}</button></td>
            <td className="border-b border-[#27352c] px-2 py-2 font-mono">{packet.time}</td>
            <td className="border-b border-[#27352c] px-2 py-2">{packet.sourceIp}</td>
            <td className="border-b border-[#27352c] px-2 py-2">{packet.destinationIp}</td>
            <td className="border-b border-[#27352c] px-2 py-2"><span className="rounded border border-[#526a59] px-2 py-1">{packet.protocol}</span></td>
            <td className="border-b border-[#27352c] px-2 py-2">{packet.frameLength}</td>
            <td className="border-b border-[#27352c] px-2 py-2">{packetSummary(packet)}</td>
          </tr>)}</tbody>
        </table>
      </div>

      {selectedPacket && (
        <div className="grid gap-3 lg:grid-cols-2">
          <section className="rounded border border-[#405148] bg-[#101815] p-3" aria-labelledby="packet-details-title">
            <h3 id="packet-details-title" className="font-mono text-xs text-[#e7d8ac]">PACKET DETAILS · No. {selectedPacket.number}</h3>
            <dl className="mt-3 space-y-2 text-xs">
              <div><dt className="font-bold text-[#9bc5a8]">Frame</dt><dd>Frame length: {selectedPacket.frameLength} bytes · captured data: {selectedPacket.length} bytes</dd></div>
              <div><dt className="font-bold text-[#9bc5a8]">Ethernet II</dt><dd>Source MAC: {selectedPacket.sourceMac} · Destination MAC: {selectedPacket.destinationMac}</dd></div>
              <div><dt className="font-bold text-[#9bc5a8]">IPv4</dt><dd>Source IP: {selectedPacket.sourceIp} · Destination IP: {selectedPacket.destinationIp} · TTL: {selectedPacket.ttl}</dd></div>
              <div><dt className="font-bold text-[#9bc5a8]">{selectedPacket.protocol}</dt><dd>{selectedPacket.sourcePort !== undefined ? `Source port: ${selectedPacket.sourcePort} · Destination port: ${selectedPacket.destinationPort} · Flags: ${selectedPacket.flags ?? "none"}` : "No TCP/UDP ports in this packet."}</dd></div>
              {selectedPacket.dnsQuery && <div><dt className="font-bold text-[#9bc5a8]">DNS</dt><dd>Query: {selectedPacket.dnsQuery}</dd></div>}
              {selectedPacket.httpHost && <div><dt className="font-bold text-[#9bc5a8]">HTTP</dt><dd>{selectedPacket.httpMethod} · Host: {selectedPacket.httpHost}</dd></div>}
            </dl>
          </section>
          <section className="rounded border border-[#405148] bg-[#101815] p-3" aria-labelledby="packet-bytes-title">
            <h3 id="packet-bytes-title" className="font-mono text-xs text-[#e7d8ac]">BYTES · training payload preview</h3>
            <div className="mt-3 space-y-1 font-mono text-[10px] text-[#c7f1cf]">
              {bytesFor(selectedPacket).map((row) => <p key={row.offset} className="grid grid-cols-[3rem_1fr_1fr] gap-2"><span>{row.offset}</span><span>{row.hex}</span><span>{row.text}</span></p>)}
            </div>
          </section>
        </div>
      )}
      <p className="font-mono text-xs" aria-live="polite">{complete ? "LAB COMPLETE · checkpoint reached" : "LAB IN PROGRESS"}</p>
      {filterError && <p className="text-xs text-[#e7d8ac]">Hint: {levelInfo.hint}</p>}
      <p className="text-xs text-[#aeb7a7]">This capture is a fixed fictional dataset using documentation-only IP ranges. The viewer cannot capture or send real network traffic.</p>
    </section>
  );
}
