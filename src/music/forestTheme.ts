// ─────────────────────────────────────────────────────────────
// FOREST THEME: the game's starter song, generated in code.
//
// WHY generate instead of an MP3 file? Three reasons:
//   1. ZERO download — the browser synthesizes it, so the game stays light.
//   2. It can never 404 (a missing MP3 breaks the jukebox's first song).
//   3. It's a teaching example: music is just notes + timing.
//
// HOW: a tiny step sequencer. Every STEP_MS it plays the next note of a
// calm D-major arpeggio (the "forest" feel) plus a soft bass note each bar.
// Uses the Web Audio API directly — no libraries.
// ─────────────────────────────────────────────────────────────

type OscName = OscillatorType;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let step = 0;

const STEP_MS = 260; // eighth-note at ~115 BPM
// D major pentatonic arpeggio — gentle, hopeful, loops cleanly.
// (Frequencies in Hz; D4=293.66, F#4=369.99, A4=440, D5=587.33, E5=659.25, A5=880)
const MELODY: (number | null)[] = [
  293.66, 369.99, 440.0, 587.33,
  440.0, 659.25, 587.33, 440.0,
  369.99, 440.0, 587.33, 739.99,
  880.0, 739.99, 587.33, 440.0,
];
// One bass note per bar (4 steps), an octave-and-a-half under the melody.
const BASS: (number | null)[] = [
  146.83, null, null, null,
  185.0, null, null, null,
  146.83, null, null, null,
  220.0, null, null, null,
];

function audio(): AudioContext {
  // Create the context on first use — always from a user gesture
  // (the jukebox play button), so browsers allow sound.
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  return ctx;
}

function note(freq: number, type: OscName, dur: number, vol: number) {
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const t = ctx.currentTime;
  osc.type = type;
  osc.frequency.value = freq;
  // A soft envelope: quick fade in, slow fade out (no clicks between notes)
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t);
  osc.stop(t + dur);
}

export function startForestTheme() {
  const c = audio();
  if (c.state === "suspended") void c.resume();
  if (timer) return; // already playing
  timer = setInterval(() => {
    const melody = MELODY[step % MELODY.length];
    const bass = BASS[step % BASS.length];
    if (melody) note(melody, "triangle", 0.5, 0.16);
    if (bass) note(bass, "sine", 1.0, 0.22);
    step++;
  }, STEP_MS);
}

export function stopForestTheme() {
  if (timer) clearInterval(timer);
  timer = null;
}

export function setForestThemeVolume(v: number) {
  if (master) master.gain.value = Math.min(1, Math.max(0, v));
}
