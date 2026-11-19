import { describe, expect, it } from "vitest";
import {
  compileCaptureFilter,
  compileDisplayFilter,
  TRAINING_CAPTURE,
} from "./packet";

describe("Packet Lab filters", () => {
  it("supports display-filter fields, contains, comparisons, and logic", () => {
    const filter = compileDisplayFilter('tcp.port == 80 && tcp contains "GET"');
    expect(TRAINING_CAPTURE.filter(filter).map((packet) => packet.number)).toEqual([6, 18]);
    expect(TRAINING_CAPTURE.filter(compileDisplayFilter("dns || icmp")).length).toBe(6);
    expect(TRAINING_CAPTURE.filter(compileDisplayFilter("frame.len >= 90")).map((packet) => packet.number)).toEqual([6, 18]);
  });

  it("supports BPF-style protocol, host, port, source, destination, and network filters", () => {
    expect(TRAINING_CAPTURE.filter(compileCaptureFilter("tcp port 80 and host 192.0.2.10")).map((packet) => packet.number))
      .toEqual([3, 4, 5, 6, 7, 16, 17, 18, 19]);
    expect(TRAINING_CAPTURE.filter(compileCaptureFilter("src host 192.0.2.10 and udp port 53")).map((packet) => packet.number)).toEqual([1, 11]);
    expect(TRAINING_CAPTURE.filter(compileCaptureFilter("net 192.0.2.0/24")).length).toBeGreaterThan(0);
  });

  it("reports invalid expressions rather than silently accepting them", () => {
    expect(() => compileDisplayFilter("tcp.port = 80")).toThrow();
    expect(() => compileCaptureFilter("tcp port")).toThrow();
  });
});
