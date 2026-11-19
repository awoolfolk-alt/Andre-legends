// ─────────────────────────────────────────────────────────────
// SFX — synthesized sound, zero audio files (Web Audio API)
// ─────────────────────────────────────────────────────────────
// WHY synthesize instead of shipping .mp3 files? Three reasons:
//   1. Weight — the whole sound set costs ~150 lines of code, not MBs.
//   2. Timing — a chime can pitch-shift per letter typed, which a
//      fixed recording can't do.
//   3. Autoplay laws — browsers block audio until the user touches
//      the page. We "arm" the AudioContext on the first gesture and
//      every sound after that is legal.
//
// The whole engine is one AudioContext + helper functions that build
// tiny node graphs (oscillator -> gain -> destination), fire them,
// and let them garbage-collect themselves.
// ─────────────────────────────────────────────────────────────

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

// The mute choice survives reloads (localStorage = the browser's
// tiny built-in save file).
const MUTE_KEY = "legend3d.muted";

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null; // server render: no audio
  if (!ctx) {
    try {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.5; // global volume ceiling
      master.connect(ctx.destination);
      muted = localStorage.getItem(MUTE_KEY) === "1";
      if (muted) master.gain.value = 0;
    } catch {
      return null; // very old browser: play silent rather than crash
    }
  }
  // A suspended context = the browser is still waiting for a gesture.
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// Call this from ANY first user gesture (click, tap, keypress).
export function armAudio() {
  ensureContext();
}

export function isMuted() {
  return muted;
}

export function toggleMute(): boolean {
  muted = !muted;
  localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

// ─── Primitive builders ─────────────────────────────────────
// One "tone" = oscillator with an envelope (attack/decay shape on a
// gain node). Most game sounds are just tones/noise with the right
// pitch curve and decay.

interface ToneOpts {
  type?: OscillatorType; // waveform: sine (soft), square (8-bit), sawtooth (buzzy)
  from: number; // starting pitch in Hz
  to?: number; // slide to this pitch (pitch drop = impact feel)
  dur: number; // seconds
  vol?: number; // 0..1
  delay?: number; // start this many seconds from now
}

function tone({ type = "sine", from, to, dur, vol = 0.4, delay = 0 }: ToneOpts) {
  const c = ensureContext();
  if (!c || !master) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  if (to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t0 + dur);
  // Envelope: jump up fast, fade to silence. Without the fade you'd
  // hear a nasty click when the sound stops.
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

// Filtered noise = the "breathy" part of swooshes, cracks, wind.
function noise(dur: number, vol: number, filterFrom: number, filterTo: number, delay = 0) {
  const c = ensureContext();
  if (!c || !master) return;
  const t0 = c.currentTime + delay;
  // Build one second of white noise and loop the slice we need.
  const len = Math.ceil(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(filterFrom, t0);
  filter.frequency.exponentialRampToValueAtTime(Math.max(filterTo, 20), t0 + dur);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(gain).connect(master);
  src.start(t0);
}

// ─── The game's sound vocabulary ────────────────────────────
// Every function is fire-and-forget: call it, it plays, done.

export const sfx = {
  // Sword swing: a fast pitch-diving "whoosh" of filtered noise.
  swing() {
    noise(0.22, 0.35, 3200, 500);
  },
  // Blade connects: low thud + a bright metallic tick on top.
  hit() {
    tone({ type: "triangle", from: 180, to: 60, dur: 0.18, vol: 0.5 });
    tone({ type: "square", from: 2400, to: 1800, dur: 0.05, vol: 0.12 });
  },
  // The player takes a hit: a short, ugly pitch drop. Instantly readable.
  hurt() {
    tone({ type: "sawtooth", from: 220, to: 90, dur: 0.25, vol: 0.35 });
  },
  // Correct letter typed: a chime that climbs with each letter, so a
  // whole word sounds like a little ascending scale — belief, audible.
  letter(index: number) {
    const scale = [523, 587, 659, 698, 784, 880, 988, 1047]; // C major
    tone({ type: "sine", from: scale[index % scale.length], dur: 0.18, vol: 0.3 });
  },
  // The word lands and the Shadow cracks: deep boom + glass-splitting noise.
  crack() {
    tone({ type: "sine", from: 120, to: 35, dur: 0.7, vol: 0.6 });
    noise(0.4, 0.3, 4000, 900, 0.05);
  },
  // Misspelled word: two notes fighting (a tritone — the classic "wrong" sound).
  fail() {
    tone({ type: "square", from: 220, dur: 0.3, vol: 0.18 });
    tone({ type: "square", from: 311, dur: 0.3, vol: 0.18 }); // F# vs C = dissonance
  },
  // Boss announcement: a slow dark horn. Two detuned saws = width.
  announce() {
    tone({ type: "sawtooth", from: 98, dur: 1.4, vol: 0.25 });
    tone({ type: "sawtooth", from: 99.5, dur: 1.4, vol: 0.25 });
    tone({ type: "sine", from: 49, dur: 1.6, vol: 0.35 });
  },
  // One heartbeat thump. The word phase loops this: pressure you can hear.
  heartbeat() {
    tone({ type: "sine", from: 70, to: 40, dur: 0.14, vol: 0.55 });
    tone({ type: "sine", from: 65, to: 38, dur: 0.12, vol: 0.4, delay: 0.18 });
  },
  // The Shadow dissolves into light: a rising major arpeggio.
  victory() {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ type: "triangle", from: f, dur: 0.6, vol: 0.28, delay: i * 0.16 })
    );
  },
  // GTA-style death: one deep, final thump. Then silence does the work.
  deathThump() {
    tone({ type: "sine", from: 90, to: 30, dur: 1.2, vol: 0.7 });
  },
  // UI blip for buttons and plaques.
  blip() {
    tone({ type: "sine", from: 880, dur: 0.07, vol: 0.2 });
  },
  // Teleport: a rising shimmer between worlds.
  portal() {
    noise(0.7, 0.25, 300, 3800);
    tone({ type: "sine", from: 220, to: 880, dur: 0.7, vol: 0.2 });
  },
};
