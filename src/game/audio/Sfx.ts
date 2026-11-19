// ─────────────────────────────────────────────────────────────
// SFX: every sound effect in the game, SYNTHESIZED with the Web Audio API.
//
// WHY synthesize instead of loading MP3 files? Zero downloads, zero
// asset files, and each sound is a few lines of code you can tune.
// A sound is just: an oscillator (a tone) or noise (a hiss), with a
// volume "envelope" that shapes how it starts and ends.
//
// Browsers block audio until the visitor first clicks/taps/presses a key,
// so the AudioContext is created lazily on the first gesture (see arm()).
//
// Toggle with the 🔊 button on the game page, or the N key.
// The choice is remembered in localStorage between visits.
// ─────────────────────────────────────────────────────────────

// One shared audio context for the whole game (undefined until first gesture).
let ctx: AudioContext | undefined;
// One master volume knob every sound passes through, so muting is one line.
let master: GainNode | undefined;
// A short buffer of white noise, reused by every "whoosh"/"thud" sound.
let noiseBuf: AudioBuffer | undefined;

// Is sound on? Read the saved choice once (default: on).
// "typeof window" guards the server render, where localStorage doesn't exist.
let enabled = true;
try {
  if (typeof window !== "undefined") enabled = localStorage.getItem("legend.sfxMuted") !== "1";
} catch { /* private window: keep the default */ }

// Create (or wake) the AudioContext. Called on the first user gesture.
// Returns false if audio still can't run yet (no gesture has happened).
function arm(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (!ctx) {
      // webkitAudioContext = older Safari's name for the same thing
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5; // half volume: SFX sit under the music
      master.connect(ctx.destination);
      // Build 0.4 seconds of white noise once; every whoosh reuses it.
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    // A suspended context was created but the browser is still blocking it
    if (ctx.state === "suspended") void ctx.resume();
    return ctx.state === "running" || ctx.state === "suspended"; // exists = we may proceed
  } catch {
    return false;
  }
}

// The first click/tap/keypress anywhere unlocks audio for the whole session.
if (typeof window !== "undefined") {
  const unlock = () => arm();
  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
}

// ── tiny synth helpers ──────────────────────────────────────────
// tone(): play one note. freq = pitch in Hz, dur = length in seconds,
// type = waveform color ("sine" smooth, "square" retro, "triangle" soft),
// vol = loudness, slide = pitch bends toward this Hz (falls or rises).
function tone(freq: number, dur: number, type: OscillatorType, vol: number, slide?: number, delay = 0) {
  if (!enabled || !arm() || !ctx || !master) return;
  try {
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slide), t0 + dur);
    // The envelope: start silent, jump to full, fade to nothing (no clicks)
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch { /* never let sound crash the game */ }
}

// noise(): filtered white noise, for whooshes and impacts.
// freq = the filter's center pitch (low = thud, high = hiss).
function noise(dur: number, vol: number, freq: number, slide?: number, delay = 0) {
  if (!enabled || !arm() || !ctx || !master || !noiseBuf) return;
  try {
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass"; // keep only the frequencies near `freq`
    filter.frequency.setValueAtTime(freq, t0);
    if (slide) filter.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
    filter.Q.value = 1.2; // how narrow the kept band is
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter).connect(gain).connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  } catch { /* never let sound crash the game */ }
}

// ── the game's sound vocabulary ─────────────────────────────────
// Each function is one game moment. Systems call these by name, so
// retuning a sound means editing only this file.
export const sfx = {
  // One slash of the 3-hit combo. i = which slash (0, 1, 2); each swings higher.
  slash(i = 0) {
    noise(0.16, 0.5, 900 + i * 350, 2600 + i * 600);
  },
  // A landed hit: a short low thud. heavier = deeper and louder.
  hit(heavy = false) {
    noise(heavy ? 0.22 : 0.12, heavy ? 0.8 : 0.5, heavy ? 240 : 420, 90);
    if (heavy) tone(120, 0.18, "sine", 0.5, 50);
  },
  // The heavy attack's golden raise (a rising shimmer) and its slam.
  heavyRaise() {
    tone(500, 0.35, "triangle", 0.25, 1400);
  },
  heavySlam() {
    noise(0.3, 0.9, 180, 60);
    tone(90, 0.3, "sine", 0.7, 40);
  },
  // Dash: a quick airy whoosh.
  dash() {
    noise(0.18, 0.35, 1400, 4200);
  },
  // Courage Strike: blink + strike in one gesture.
  courage() {
    noise(0.2, 0.4, 1800, 5200);
    tone(700, 0.2, "square", 0.15, 1800, 0.08);
  },
  // Leadership Aura: a warm three-note lift (gold sound for a gold power).
  aura() {
    tone(392, 0.3, "triangle", 0.3);
    tone(494, 0.3, "triangle", 0.3, undefined, 0.1);
    tone(587, 0.5, "triangle", 0.3, undefined, 0.2);
  },
  // The hero got hurt.
  hurt() {
    tone(220, 0.2, "square", 0.3, 110);
    noise(0.15, 0.4, 300, 120);
  },
  // Level up: a little rising arpeggio (a mini fanfare).
  levelup() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, "triangle", 0.32, undefined, i * 0.09));
  },
  // A boss falls: deep impact, then a relieved chime.
  bossDown() {
    noise(0.5, 0.9, 150, 40);
    tone(660, 0.4, "triangle", 0.3, undefined, 0.35);
    tone(880, 0.6, "triangle", 0.3, undefined, 0.5);
  },
  // The Future Kingdom gate opens: a slow golden shimmer.
  gate() {
    [330, 415, 494, 659, 830].forEach((f, i) => tone(f, 0.6, "sine", 0.22, undefined, i * 0.12));
  },
  // The hero falls: a soft descending sigh, not a punishment.
  fell() {
    tone(330, 0.7, "sine", 0.3, 130);
  },
  // Dialogue "blip": one tick per line advance. Speaker pitch varies a little
  // so different voices feel different without any recorded audio.
  blip(pitch = 600) {
    tone(pitch, 0.06, "square", 0.12);
  },
  // A locked power was pressed: a dull "not yet".
  locked() {
    tone(160, 0.15, "square", 0.2, 120);
  },
};

// Turn sound on/off. The game page button and the N key both call this.
export function setSfxEnabled(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem("legend.sfxMuted", on ? "0" : "1");
  } catch { /* private window: don't persist */ }
}

// Read the current setting (the 🔊/🔇 button label uses this).
export function isSfxEnabled() {
  return enabled;
}

// The N key toggles sound, like M toggles music. Registered once, page-wide.
if (typeof window !== "undefined") {
  window.addEventListener("keydown", (e) => {
    const el = e.target as HTMLElement | null;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
    if (e.key === "n" || e.key === "N") setSfxEnabled(!enabled);
  });
}
