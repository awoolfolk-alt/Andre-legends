"use client";
// ─────────────────────────────────────────────────────────────
// /prototype — FIRST-PERSON PROTOTYPE SHELL (Mock B-1 + B-2)
// ─────────────────────────────────────────────────────────────
// React owns the CHROME (title, HUD, overlays, touch controls);
// the Prototype class owns the WORLD. The wall between them is one
// hooks object + a few method calls. If you learn one thing from
// this file: DOM is the best HUD renderer ever made — don't draw
// buttons in WebGL that HTML draws better.
// ─────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Prototype,
  type ProtoState,
  type HudState,
  type WordPhaseInfo,
} from "@/game3d/prototype";
import type { BossArenaId } from "@/game3d/world";
import { AFFIRMATIONS, gradeAttempt, sanitize, scramble } from "@/game3d/words";
import { armAudio, isMuted, sfx, toggleMute } from "@/game3d/sfx";

// ─── Memory Stone plaques ───────────────────────────────────
// The whisper-stones are the INNER chapters — not the resume ones.
// Text lives here (presentation) while positions live in world.ts
// (geometry). One source of truth per concern.
const PLAQUES: Record<string, { title: string; text: string }> = {
  "stone-doubt": {
    title: "Whisper — Doubt",
    text: "The voice says you don't belong in the rooms you keep walking into. It rode with you to every interview, every first day. It is lying — and you keep proving it.",
  },
  "stone-discipline": {
    title: "Whisper — Discipline",
    text: "67th to Navy Pier. The lakefront walk nobody applauds. Showing up when nothing claps is the whole skill.",
  },
  "stone-patience": {
    title: "Whisper — Patience",
    text: "Three months of training instead of six. A machine nobody taught you. You learned it anyway. Slow is not stopped.",
  },
};

// Coarse pointer = touch-first device. Decides tile-tapping vs typing
// for the word phase. Checked once at mount — phones don't grow mice.
const isTouchDevice = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

export default function PrototypePage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const protoRef = useRef<Prototype | null>(null);

  // ── React-side mirrors of game state (fed by hooks) ──
  const [state, setState] = useState<ProtoState>("title");
  const [hud, setHud] = useState<HudState | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [wordPhase, setWordPhase] = useState<WordPhaseInfo | null>(null);
  const [wordCountdown, setWordCountdown] = useState(0);
  const [wordSeconds, setWordSeconds] = useState(0);
  const [wordFlash, setWordFlash] = useState<"ok" | "fail" | null>(null);
  const [plaque, setPlaque] = useState<string | null>(null);
  const [portalAsk, setPortalAsk] = useState(false);
  const [deathLine, setDeathLine] = useState("");
  const [victory, setVictory] = useState<{ seconds: number; misses: number } | null>(null);
  const [muted, setMuted] = useState(false);
  const [untimed, setUntimed] = useState(false);
  const [touch, setTouch] = useState(false);
  const [embedded, setEmbedded] = useState(false);
  const [embeddedBoss, setEmbeddedBoss] = useState<BossArenaId | null>(null);
  const [startupError, setStartupError] = useState<string | null>(null);

  // Announcement banners self-dismiss. The ref guards a stale timer
  // from killing a NEWER banner.
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announce = useCallback((text: string) => {
    setAnnouncement(text);
    if (announceTimer.current) clearTimeout(announceTimer.current);
    announceTimer.current = setTimeout(() => setAnnouncement(null), 4500);
  }, []);

  // ── Boot: build on Begin, or auto-start when embedded for a boss transition. ──
  const begin = (bossId?: BossArenaId) => {
    armAudio();
    setStartupError(null);
    try {
      if (!protoRef.current && canvasRef.current) {
        protoRef.current = new Prototype(
          canvasRef.current,
          {
            onState: setState,
            onHud: setHud,
            onAnnouncement: announce,
            onWordPhase: (info) => {
              setWordPhase(info);
              if (!info) setWordCountdown(0);
            },
            onWordCountdown: setWordCountdown,
            onWordTimer: setWordSeconds,
            onWordResult: (_letters, ok) => {
              setWordFlash(ok ? "ok" : "fail");
              setTimeout(() => setWordFlash(null), 700);
            },
            onPlaque: setPlaque,
            onPortalConfirm: setPortalAsk,
            onDeath: setDeathLine,
            onVictory: setVictory,
          },
          { untimed: bossId ? false : untimed, ...(bossId ? { bossId } : {}) }
        );
      }
      protoRef.current?.start();
      return protoRef.current !== null;
    } catch (error) {
      console.error("Could not start the first-person arena.", error);
      protoRef.current?.dispose();
      protoRef.current = null;
      setStartupError(error instanceof Error ? error.message : "The renderer could not be initialized.");
      return false;
    }
  };

  useEffect(() => {
    setTouch(isTouchDevice());
    setMuted(isMuted());
    const params = new URLSearchParams(window.location.search);
    const requestedBoss = params.get("boss");
    const bossId = (["empire", "nike", "self"] as const).find((id) => id === requestedBoss);
    if (params.get("embed") === "boss" && bossId) {
      setEmbedded(true);
      setEmbeddedBoss(bossId);
      if (begin(bossId)) {
        requestAnimationFrame(() => {
          window.parent.postMessage({ type: "boss3dReady", bossId }, window.location.origin);
        });
      }
    }
    return () => protoRef.current?.dispose();
  }, []);

  const notifyBossBridge = (type: "boss3dComplete" | "boss3dCancel") => {
    if (!embeddedBoss) return;
    window.parent.postMessage({ type, bossId: embeddedBoss }, window.location.origin);
  };

  // ── Global keys ──────────────────────────────────────────
  // E interact / F & Space swing / Esc pause / M mute. The word
  // phase captures its own keys (its input has focus), so none of
  // these fire while spelling — EXCEPT Escape, which should always
  // be able to pause. (Escape during a spell is allowed: the spell
  // simply waits.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Title check comes FIRST: the world doesn't exist yet on the
      // title screen, so a `protoRef` guard above this would swallow
      // the very keypress that's supposed to build it.
      if (state === "title" && (e.code === "Space" || e.code === "Enter")) {
        e.preventDefault();
        begin();
        return;
      }
      const p = protoRef.current;
      if (!p) return;
      if (e.code === "KeyM") {
        setMuted(toggleMute());
        return;
      }
      if (e.code === "Escape") {
        if (state === "play" || state === "pause") p.togglePause();
        return;
      }
      if (state !== "play") return;
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.code === "KeyE") p.interact();
      if (e.code === "KeyF" || e.code === "Space") {
        e.preventDefault();
        p.swing();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, untimed]);

  // Auto-pause when the tab loses focus — mid-fight tab-switch
  // deaths are the worst deaths.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) protoRef.current?.togglePause(true);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  // Mouse: click canvas → pointer lock (desktop); once locked, click
  // = swing. When unlocked, drag = look (handled inside the rig).
  const onCanvasClick = () => {
    const p = protoRef.current;
    if (!p || state !== "play") return;
    if (document.pointerLockElement === canvasRef.current) {
      p.swing();
    } else if (!touch && canvasRef.current) {
      p.input.requestPointerLock(canvasRef.current);
    }
  };

  const bossSegmentCount = hud?.bossId === "self" ? 8 : 1;
  const bossAccent = hud?.bossId === "empire"
    ? "#ff8b38"
    : hud?.bossId === "nike"
      ? "#d94cff"
      : "#c9a6ff";

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black font-display">
      {/* The 3D canvas. When dead, the whole world desaturates and
          leans in — the GTA treatment, done with one CSS filter. */}
      <div
        className={`absolute inset-0 transition-all duration-700 ${
          state === "dead" ? "scale-[1.06] grayscale" : ""
        }`}
      >
        <canvas ref={canvasRef} onClick={onCanvasClick} className="h-full w-full touch-none" />
      </div>

      {embedded && state !== "victory" && (
        <button
          onClick={() => notifyBossBridge("boss3dCancel")}
          className="absolute right-3 top-3 z-20 rounded-lg border border-white/25 bg-black/55 px-3 py-2 text-sm text-white/80 backdrop-blur transition hover:bg-black/80"
        >
          Return to 2D duel
        </button>
      )}

      {startupError && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 px-6 text-center text-white">
          <h2 className="text-2xl font-bold text-[#ffb3b3]">The 3D arena could not start.</h2>
          <p className="mt-3 max-w-lg text-sm text-white/70">{startupError}</p>
          {embedded ? (
            <button
              onClick={() => notifyBossBridge("boss3dCancel")}
              className="mt-6 min-h-[44px] rounded-lg border border-white/30 px-6 py-3 hover:bg-white/10"
            >
              Return to the 2D duel
            </button>
          ) : (
            <button
              onClick={() => router.push("/")}
              className="mt-6 min-h-[44px] rounded-lg border border-white/30 px-6 py-3 hover:bg-white/10"
            >
              Return to the menu
            </button>
          )}
        </div>
      )}

      {/* Crosshair: a single dot. First-person melee needs exactly one
          answer to "where am I aiming" — anything more is noise. */}
      {(state === "play" || state === "word") && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/80 shadow-[0_0_6px_rgba(0,0,0,0.8)]" />
      )}

      {/* ── HUD ── */}
      {hud && state !== "title" && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-5">
          {/* Player vitality */}
          <div className="w-40 sm:w-56">
            <p className="mb-1 text-[10px] tracking-[0.3em] text-white/70">ANDRE</p>
            <div className="h-3 overflow-hidden rounded-full border border-white/30 bg-black/50">
              <div
                className="h-full bg-gradient-to-r from-[#3fae5a] to-[#7ee787] transition-all duration-300"
                style={{ width: `${(hud.hp / hud.maxHp) * 100}%` }}
              />
            </div>
          </div>

          {/* Mute + pause — pinned under the player bar on the LEFT.
              The right corner belongs to the Jukebox (rendered globally
              in layout.tsx); putting these there stacked them on top of
              the music bar on phones. All targets still ≥44px. */}
          <div className="pointer-events-auto absolute left-3 top-[4.5rem] flex gap-2 sm:left-5 sm:top-[4.75rem]">
            <button
              aria-label={muted ? "Unmute" : "Mute"}
              onClick={() => setMuted(toggleMute())}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/25 bg-black/50 text-lg text-white/85 backdrop-blur"
            >
              {muted ? "🔇" : "🔊"}
            </button>
            <button
              aria-label="Pause"
              onClick={() => protoRef.current?.togglePause()}
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/25 bg-black/50 text-lg text-white/85 backdrop-blur"
            >
              ⏸
            </button>
          </div>

          {/* The Shadow's bar. Its bottom edge sits just ABOVE the
              Jukebox (which parks at ~6.5rem under the notch on the
              right side) — right side on desktop, below the mute/pause
              buttons on phones. Never the same strip of screen. */}
          {hud.inCastle && hud.shadowHp > 0 && (
            <div className="absolute left-3 top-[8.75rem] w-44 sm:left-auto sm:right-4 sm:top-3 sm:w-64">
              <p
                className="mb-1 max-w-[10rem] text-[10px] leading-tight tracking-[0.18em] sm:max-w-none sm:text-right sm:tracking-[0.3em]"
                style={{ color: bossAccent }}
              >
                {hud.bossName}
              </p>
              <div className="flex gap-1">
                {Array.from({ length: bossSegmentCount }).map((_, i) => (
                  <div key={i} className="h-3 flex-1 overflow-hidden rounded-sm border border-white/25 bg-black/50">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${Math.max(0, Math.min(1, hud.shadowHp / (hud.shadowMax / bossSegmentCount) - i)) * 100}%`,
                        backgroundColor: bossAccent,
                      }}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-white/50 sm:text-right">
                {hud.bossId === "self" ? `${hud.wordsSpoken}/8 words spoken` : "Sword duel"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Interaction prompt ("E — Read the Memory Stone"). Higher on
          phones (34%) so it clears the joystick + action buttons in
          landscape, where 28% would land right on top of them. */}
      {hud?.prompt && state === "play" && (
        <div className="pointer-events-none absolute bottom-[34%] left-1/2 z-10 -translate-x-1/2 rounded-lg border border-legacy/50 bg-navy/80 px-4 py-2 text-sm text-[#f3e3b5] backdrop-blur sm:bottom-[28%]">
          {hud.prompt}
        </div>
      )}

      {/* Controls hint — bottom center, fades into muscle memory */}
      {state === "play" && !touch && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 text-[11px] tracking-wider text-white/45">
          WASD move · mouse look · click / F swing · E interact · ESC pause · M mute
        </div>
      )}

      {/* ── Announcement banner ── */}
      <AnimatePresence>
        {announcement && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="pointer-events-none absolute left-1/2 top-[24%] z-20 w-full max-w-2xl -translate-x-1/2 rounded-xl bg-black/35 px-4 py-3 text-center backdrop-blur-[2px]"
          >
            <p className="bg-gradient-to-b from-[#e8d5ff] to-[#a86bff] bg-clip-text text-2xl font-black tracking-[0.15em] text-transparent drop-shadow-[0_0_25px_rgba(168,107,255,0.5)] sm:text-4xl">
              {announcement}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Touch controls (joystick + look drag + buttons) ── */}
      {touch && state === "play" && protoRef.current && (
        <TouchControls proto={protoRef.current} />
      )}

      {/* ── Word phase overlay: THE SPELL ── */}
      <AnimatePresence>
        {wordPhase && (
          <WordOverlay
            key={wordPhase.index}
            info={wordPhase}
            countdown={wordCountdown}
            secondsLeft={wordSeconds}
            flash={wordFlash}
            touch={touch}
            onSubmit={(attempt) => protoRef.current?.submitWord(attempt) ?? { ok: false, letters: [] }}
          />
        )}
      </AnimatePresence>

      {/* ── Memory Stone plaque ── */}
      <AnimatePresence>
        {plaque && PLAQUES[plaque] && (
          <OverlayCard onClose={() => protoRef.current?.closePlaque()}>
            <h3 className="mb-3 font-display text-xl text-energy">{PLAQUES[plaque].title}</h3>
            <p className="font-serif leading-relaxed text-white/85">{PLAQUES[plaque].text}</p>
          </OverlayCard>
        )}
      </AnimatePresence>

      {/* ── Portal confirmation ── */}
      <AnimatePresence>
        {portalAsk && (
          <OverlayCard onClose={() => setPortalAsk(false)}>
            <h3 className="mb-3 font-display text-xl text-[#c9a6ff]">The Arch hums.</h3>
            <p className="mb-2 font-serif leading-relaxed text-white/85">
              Beyond it: the Floating Castle — and the Shadow of Andre. The part of you that
              says you are not enough.
            </p>
            <p className="mb-5 font-serif text-sm text-white/55">
              The sword wounds him. Only your words break him. Speak true — spelling is the spell.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => protoRef.current?.enterCastle()}
                className="flex-1 rounded-lg border border-[#a86bff]/60 bg-[#a86bff]/15 px-4 py-3 text-[#e8d5ff] transition hover:bg-[#a86bff]/30"
              >
                ⚔ Step through
              </button>
              <button
                onClick={() => setPortalAsk(false)}
                className="rounded-lg border border-white/20 px-4 py-3 text-white/70 transition hover:bg-white/10"
              >
                Not yet
              </button>
            </div>
          </OverlayCard>
        )}
      </AnimatePresence>

      {/* ── DEATH: the GTA beat ── */}
      <AnimatePresence>
        {state === "dead" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60"
          >
            {/* The word lands HUGE, slow-zooming, like a verdict.
                DISCOURAGED — the world takes your word away. */}
            <motion.h2
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.05, 1], opacity: 1 }}
              transition={{ duration: 1.2, times: [0, 0.7, 1] }}
              className="text-6xl font-black tracking-[0.12em] text-[#d4d4dd] drop-shadow-[0_0_30px_rgba(0,0,0,0.9)] sm:text-8xl"
            >
              DISCOURAGED
            </motion.h2>
            {/* ...and Andre's voice answers it. You take the word back. */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="mt-6 max-w-md px-6 text-center font-serif text-lg text-white/80"
            >
              {deathLine}
            </motion.p>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.8 }}
              onClick={() => protoRef.current?.respawn()}
              className="mt-10 min-h-[44px] rounded-lg border border-legacy/60 bg-legacy/15 px-8 py-3 text-lg text-[#f3e3b5] transition hover:bg-legacy/30"
            >
              ▶ Rise again
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── VICTORY ── */}
      <AnimatePresence>
        {state === "victory" && victory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gradient-to-b from-[#0d1230]/90 to-black/95 px-6 text-center"
          >
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
              <p className="text-sm tracking-[0.5em] text-energy">
                {embedded ? "BOSS DEFEATED" : "THE EIGHTH WORD"}
              </p>
              <h2 className="mt-3 bg-gradient-to-b from-[#fff3c4] to-legacy bg-clip-text text-4xl font-black text-transparent sm:text-6xl">
                {embedded
                  ? embeddedBoss === "empire"
                    ? "The Revenant is silent."
                    : embeddedBoss === "nike"
                      ? "The Nightstalker has fallen."
                      : "The arena is yours."
                  : <>Self Doubt didn&apos;t die.<br />It became Confidence.</>}
              </h2>
              <p className="mx-auto mt-6 max-w-lg font-serif text-white/80">
                {embedded
                  ? embeddedBoss === "self"
                    ? "The word-duel is complete. Return to the story to continue your journey."
                    : "Return to the story to continue your journey."
                  : "Eight affirmations spoken true. The cracks took him apart gently, and the light that seeped out was yours all along."}
              </p>
              <p className="mt-4 text-sm text-white/50">
                {embedded && embeddedBoss !== "self"
                  ? `${victory.seconds}s in the arena`
                  : `${victory.seconds}s on the summit · ${victory.misses} misspelled ${
                      victory.misses === 1 ? "spell" : "spells"
                    }`}
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                {embedded ? (
                  <button
                    onClick={() => notifyBossBridge("boss3dComplete")}
                    className="min-h-[44px] rounded-lg border border-legacy/60 bg-legacy/15 px-8 py-3 text-[#f3e3b5] transition hover:bg-legacy/30"
                  >
                    Continue the story
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        protoRef.current?.restartAll();
                        setVictory(null);
                      }}
                      className="min-h-[44px] rounded-lg border border-legacy/60 bg-legacy/15 px-8 py-3 text-[#f3e3b5] transition hover:bg-legacy/30"
                    >
                      ⚔ Walk the forest again
                    </button>
                    <button
                      onClick={() => router.push("/")}
                      className="min-h-[44px] rounded-lg border border-white/20 px-8 py-3 text-white/70 transition hover:bg-white/10"
                    >
                      Return to the menu
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PAUSE ── */}
      <AnimatePresence>
        {state === "pause" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <h2 className="text-3xl font-black tracking-[0.3em] text-[#f3e3b5]">PAUSED</h2>
            <p className="mt-2 text-sm text-white/50">The forest waits.</p>
            <div className="mt-8 flex flex-col gap-3">
              <button
                onClick={() => protoRef.current?.togglePause(false)}
                className="min-h-[44px] w-64 rounded-lg border border-legacy/60 bg-legacy/15 px-6 py-3 text-[#f3e3b5] transition hover:bg-legacy/30"
              >
                ▶ Resume
              </button>
              <button
                onClick={() => protoRef.current?.restartAll()}
                className="min-h-[44px] w-64 rounded-lg border border-white/20 px-6 py-3 text-white/75 transition hover:bg-white/10"
              >
                ↺ Restart the walk
              </button>
              <button
                onClick={() => router.push("/")}
                className="min-h-[44px] w-64 rounded-lg border border-white/20 px-6 py-3 text-white/75 transition hover:bg-white/10"
              >
                ⌂ Main menu
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TITLE ── */}
      <AnimatePresence>
        {state === "title" && (
          <motion.div
            exit={{ opacity: 0, scale: 1.15 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-gradient-to-b from-[#0b1430] via-[#131c38] to-[#1a1030] px-6"
          >
            <p className="text-xs tracking-[0.5em] text-energy">MOCK B · FIRST-PERSON PROTOTYPE</p>
            <h1 className="mt-4 bg-gradient-to-b from-[#fff3c4] to-legacy bg-clip-text text-center text-5xl font-black text-transparent sm:text-7xl">
              THE LEGEND OF ANDRE
            </h1>
            <p className="mt-3 text-center text-sm tracking-[0.25em] text-white/70">
              THE WALK ⇄ THE SHADOW OF ANDRE
            </p>
            <p className="mt-6 max-w-md text-center font-serif text-white/70">
              Walk the forest. Face the arch. On the summit waits the Shadow — wound him with
              the sword, break him with the Word.
            </p>

            {/* Accessibility: determination is the theme, gatekeeping
                isn't. Untimed Words removes the spell countdown. */}
            <label className="mt-6 flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-white/70">
              <input
                type="checkbox"
                checked={untimed}
                onChange={(e) => setUntimed(e.target.checked)}
                className="h-5 w-5 accent-[#d4a72c]"
              />
              Untimed Words (no 20-second typing limit)
            </label>

            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(212,167,44,0.5)" }}
              whileTap={{ scale: 0.97 }}
              onClick={() => begin()}
              className="mt-8 min-h-[44px] rounded-lg border border-legacy/60 bg-legacy/15 px-10 py-4 text-xl text-[#f3e3b5]"
            >
              ⚔ Begin the Walk
            </motion.button>

            <div className="mt-8 max-w-sm text-center text-[11px] leading-relaxed text-white/40">
              {touch
                ? "Left stick: move · drag right side: look · ⚔ swing · E interact"
                : "WASD move · mouse look · click/F swing · E interact · ESC pause · M mute"}
            </div>
            <button
              onClick={() => router.push("/")}
              className="mt-6 text-sm text-energy hover:underline"
            >
              ← Back to the classic legend
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// OverlayCard — the shared pop-up frame (plaque, portal confirm)
// WHY one component? Every overlay wants the same things: dark
// backdrop, centered card, tap-outside-to-close, ≥44px close.
// Write it once, and no overlay can drift off-brand.
// ─────────────────────────────────────────────────────────────
function OverlayCard({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4"
    >
      <motion.div
        initial={{ scale: 0.92, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border-2 border-legacy/60 bg-navy/95 p-6 text-white"
      >
        {children}
        <button onClick={onClose} className="mt-5 min-h-[44px] text-sm text-energy hover:underline">
          Close ✕
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// WordOverlay — THE SPELL: where the Shadow actually breaks
// ─────────────────────────────────────────────────────────────
// Desktop: type the word. Mobile: tap scrambled letter tiles.
// Correct letters IGNITE white one by one — you watch the word
// being believed. A misspelling doesn't hurt you (pressure, not
// cruelty): the word dissolves, and two failures let the Shadow
// knit his segment shut and the duel resumes.
// ─────────────────────────────────────────────────────────────
function WordOverlay({
  info,
  countdown,
  secondsLeft,
  flash,
  touch,
  onSubmit,
}: {
  info: WordPhaseInfo;
  countdown: number;
  secondsLeft: number;
  flash: "ok" | "fail" | null;
  touch: boolean;
  onSubmit: (attempt: string) => { ok: boolean };
}) {
  const [attempt, setAttempt] = useState("");
  // Tiles are scrambled ONCE per word (useState initializer), so
  // re-renders don't reshuffle mid-spell.
  const [tiles] = useState(() => scramble(info.word, Math.random));
  const [usedTiles, setUsedTiles] = useState<number[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(false);

  // Auto-focus the hidden input on desktop so typing "just works" —
  // no click required mid-boss-fight.
  useEffect(() => {
    if (!touch) inputRef.current?.focus();
  }, [touch]);

  // A failed spell clears the slate for another attempt.
  useEffect(() => {
    if (flash === "fail") {
      setAttempt("");
      setUsedTiles([]);
      submittedRef.current = false;
      if (!touch) inputRef.current?.focus();
    }
  }, [flash, touch]);

  const trySubmit = (candidate: string) => {
    if (countdown > 0) return;
    if (submittedRef.current) return; // one cast per render of the word
    if (sanitize(candidate).length !== info.word.length) return;
    submittedRef.current = true;
    onSubmit(candidate);
  };

  // Live grading drives the per-letter ignite. Pending letters are
  // dark and fractured; correct ones glow; wrong ones flash red.
  const letters = gradeAttempt(attempt, info.word);
  const timedOut = info.timeLimit !== Infinity;
  const frac = timedOut ? Math.max(0, secondsLeft / info.timeLimit) : 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/55 px-4 backdrop-blur-[2px]"
    >
      <p className="text-xs tracking-[0.5em] text-[#c9a6ff]">
        WORD {info.index + 1} OF {info.total}
      </p>
      <p className="mt-2 mb-6 text-center font-serif text-sm text-white/60">
        He staggers. The dark knits shut. Prepare to speak the word — spelling is the spell.
      </p>

      <AnimatePresence mode="wait">
        {countdown > 0 && (
          <motion.div
            key={countdown}
            initial={{ opacity: 0, scale: 0.65 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.3 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm"
          >
            <p className="text-xs tracking-[0.5em] text-[#c9a6ff]">GET READY</p>
            <p className="mt-2 text-8xl font-black text-white drop-shadow-[0_0_30px_rgba(201,166,255,0.7)]">
              {countdown}
            </p>
            <p className="mt-3 text-sm tracking-[0.3em] text-white/70">THE SPELL BEGINS</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The word, letter by letter */}
      <div className="flex gap-1.5 sm:gap-2.5">
        {info.word.split("").map((ch, i) => {
          const st = letters[i];
          return (
            <motion.span
              key={`${info.word}-${i}`}
              initial={{ opacity: 0.25, y: 6, rotate: (i % 2 ? -1 : 1) * 4 }}
              animate={{
                opacity: st === "correct" ? 1 : st === "wrong" ? 1 : 0.45,
                y: 0,
                rotate: st === "pending" ? (i % 2 ? -1 : 1) * 4 : 0,
                scale: st === "correct" ? 1.12 : 1,
              }}
              className={`text-4xl font-black sm:text-6xl ${
                st === "correct"
                  ? "text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.9)]"
                  : st === "wrong"
                    ? "text-[#ff4455]"
                    : "text-[#5a4a7a]"
              }`}
            >
              {ch}
            </motion.span>
          );
        })}
      </div>

      {/* Timer: a draining ring of seconds. Hidden when Untimed Words
          is on — the toggle must be REAL, not cosmetic. */}
      {timedOut && countdown === 0 && (
        <div className="mt-6 h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full transition-all duration-200 ${frac < 0.3 ? "bg-[#ff4455]" : "bg-[#c9a6ff]"}`}
            style={{ width: `${frac * 100}%` }}
          />
        </div>
      )}

      {/* Flash feedback: the word lands or dissolves */}
      <AnimatePresence>
        {flash && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-4 font-serif text-lg ${flash === "ok" ? "text-[#7ee787]" : "text-[#ff8899]"}`}
          >
            {flash === "ok" ? "The word lands. Light seeps through." : "The word dissolves. Spell it true."}
          </motion.p>
        )}
      </AnimatePresence>

      {touch ? (
        // ── Mobile: scrambled tiles ──
        <div className="mt-8 flex w-full max-w-sm flex-col items-center gap-4">
          <div className="flex min-h-[44px] items-center gap-1 rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-2xl tracking-[0.3em] text-white">
            {attempt || <span className="text-white/25">···</span>}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {tiles.map((ch, i) => {
              const used = usedTiles.includes(i);
              return (
                <button
                  key={i}
                  disabled={used || countdown > 0}
                  onClick={() => {
                    sfx.letter(attempt.length);
                    const next = attempt + ch;
                    setAttempt(next);
                    setUsedTiles([...usedTiles, i]);
                    trySubmit(next);
                  }}
                  className={`flex h-12 w-12 items-center justify-center rounded-lg border text-xl font-bold transition ${
                    used
                      ? "border-white/10 text-white/20"
                      : "border-[#a86bff]/50 bg-[#a86bff]/15 text-white active:bg-[#a86bff]/40"
                  }`}
                >
                  {ch}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              setAttempt(attempt.slice(0, -1));
              setUsedTiles(usedTiles.slice(0, -1));
            }}
            className="min-h-[44px] rounded-lg border border-white/20 px-6 py-2 text-white/70"
          >
            ⌫ Backspace
          </button>
        </div>
      ) : (
        // ── Desktop: the keyboard is the wand ──
        <input
          ref={inputRef}
          disabled={countdown > 0}
          value={attempt}
          onChange={(e) => {
            const clean = sanitize(e.target.value);
            if (clean.length > info.word.length) return;
            if (clean.length > attempt.length) sfx.letter(clean.length - 1);
            setAttempt(clean);
            trySubmit(clean);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") trySubmit(attempt);
            e.stopPropagation(); // the spell owns the keyboard right now
          }}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          aria-label={`Speak the word: ${info.word.length} letters`}
          className="mt-8 w-64 rounded-lg border border-[#a86bff]/50 bg-black/50 px-4 py-3 text-center text-2xl tracking-[0.3em] text-white outline-none placeholder:text-white/25 focus:border-white"
          placeholder="TYPE THE WORD"
        />
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// TouchControls — the mobile body
// ─────────────────────────────────────────────────────────────
// Left thumb: virtual joystick (move). Right thumb: drag anywhere on
// the right half (look). Two big buttons: swing + interact.
// Rules honored: no hover-only anything, every target ≥44px, and the
// joystick reports PARTIAL pushes (gentle push = slow walk).
// ─────────────────────────────────────────────────────────────
function TouchControls({ proto }: { proto: Prototype }) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const joyId = useRef<number | null>(null);
  const lookId = useRef<number | null>(null);
  const lastLook = useRef({ x: 0, y: 0 });

  const JOY_R = 52; // px travel of the knob

  // Pointer capture keeps the drag alive if the thumb slides off the
  // element — but it throws for synthetic/orphan pointer ids, so it's
  // wrapped: capture is a nicety, never a crash.
  const capture = (e: React.PointerEvent) => {
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* no active pointer (synthetic events in tests) — drag still works */
    }
  };

  const onJoyMove = (e: React.PointerEvent) => {
    if (joyId.current !== e.pointerId || !baseRef.current) return;
    const rect = baseRef.current.getBoundingClientRect();
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > JOY_R) {
      dx = (dx / len) * JOY_R;
      dy = (dy / len) * JOY_R;
    }
    setKnob({ x: dx, y: dy });
    // Screen-up = forward = +mz. Deadzone so a resting thumb is still.
    const nx = dx / JOY_R;
    const nz = -dy / JOY_R;
    const dead = 0.12;
    proto.input.setJoystick(
      Math.abs(nx) < dead ? 0 : nx,
      Math.abs(nz) < dead ? 0 : nz
    );
  };

  const endJoy = (e: React.PointerEvent) => {
    if (joyId.current !== e.pointerId) return;
    joyId.current = null;
    setKnob({ x: 0, y: 0 });
    proto.input.setJoystick(0, 0);
  };

  return (
    <>
      {/* Look surface: the right half of the screen, invisible. It
          stops short of the bottom 168px so the ⚔/E action buttons are
          NOT inside it — otherwise their bounding boxes overlap by
          design, and every drag near a button would be ambiguous. */}
      <div
        className="absolute inset-x-0 right-0 top-0 z-[5] h-[calc(100%-168px)] touch-none sm:left-1/2"
        onPointerDown={(e) => {
          lookId.current = e.pointerId;
          lastLook.current = { x: e.clientX, y: e.clientY };
          capture(e);
        }}
        onPointerMove={(e) => {
          if (lookId.current !== e.pointerId) return;
          // 2.2x multiplier: thumbs travel shorter distances than mice.
          proto.input.addLook((e.clientX - lastLook.current.x) * 2.2, (e.clientY - lastLook.current.y) * 2.2);
          lastLook.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => (lookId.current = null)}
        onPointerCancel={() => (lookId.current = null)}
      />

      {/* Joystick: bottom-left, safe-area aware */}
      <div
        ref={baseRef}
        className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-[max(1.25rem,env(safe-area-inset-left))] z-20 h-32 w-32 touch-none rounded-full border border-white/20 bg-white/5 backdrop-blur-sm"
        onPointerDown={(e) => {
          joyId.current = e.pointerId;
          capture(e);
          onJoyMove(e);
        }}
        onPointerMove={onJoyMove}
        onPointerUp={endJoy}
        onPointerCancel={endJoy}
      >
        <div
          className="absolute left-1/2 top-1/2 h-14 w-14 rounded-full border border-legacy/60 bg-legacy/30"
          style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
        />
      </div>

      {/* Action buttons: bottom-right. onPointerDown (not onClick) —
          100ms faster, and in a fight 100ms is the difference. */}
      <div className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] z-20 flex items-end gap-3">
        <button
          aria-label="Interact"
          onPointerDown={() => proto.interact()}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-energy/60 bg-energy/20 text-xl text-energy backdrop-blur-sm active:bg-energy/40"
        >
          E
        </button>
        <button
          aria-label="Swing sword"
          onPointerDown={() => proto.swing()}
          className="flex h-20 w-20 items-center justify-center rounded-full border border-legacy/60 bg-legacy/25 text-3xl backdrop-blur-sm active:bg-legacy/50"
        >
          ⚔
        </button>
      </div>
    </>
  );
}
