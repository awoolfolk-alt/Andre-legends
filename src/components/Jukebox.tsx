// "use client" = this runs in the browser (it plays sound and listens to keys).
"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { music, MusicState } from "@/music/MusicPlayer";

// ─────────────────────────────────────────────────────────────
// JUKEBOX: the music buttons you see in the top-right corner.
// It lives in layout.tsx, so it stays on screen (and the song keeps
// playing) when you go from the menu to the game.
//
// It only DRAWS buttons and calls the music engine (MusicPlayer.ts).
// The engine tells it what to show by "subscribing" (see useEffect below).
//
// Keyboard: M = play/pause, [ = previous, ] = next.
// (SPACE and the arrow keys are already used for fighting and moving.)
// ─────────────────────────────────────────────────────────────

export default function Jukebox() {
  // useState holds a value that, when it changes, redraws the component.
  // null = we haven't heard from the engine yet.
  const [s, setS] = useState<MusicState | null>(null);
  // Is the details panel (credits, volume, track list) open?
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Subscribe: the engine calls setS every time something changes.
    // subscribe() hands back an "unsubscribe" function, and returning it
    // here makes React call it when the Jukebox is removed (cleanup).
    const unsubscribe = music.subscribe(setS);
    // Look for the private, local-only playlist on this computer
    music.loadLocal();

    // Keyboard shortcuts for the whole page
    const onKey = (e: KeyboardEvent) => {
      // Don't steal keys while someone is typing in a text box
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (e.key === "m" || e.key === "M") music.toggle();
      if (e.key === "[") music.prev();
      if (e.key === "]") music.next();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unsubscribe();
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // Nothing to show until the engine reports in
  if (!s) return null;
  const track = s.tracks[s.index];
  if (!track) return null;

  return (
    // fixed = stays put while the page scrolls. The top offset clears the
    // game's HUD text (Lv / HP sits at the top-left, but boss names and
    // tutorial lines can run wide) and the phone notch.
    // z-50 = above the game canvas. Narrower on phones (w-52) so it never crowds the screen.
    <div
      className="fixed right-4 z-50 w-52 font-serif text-sm text-white/90 sm:w-72"
      style={{ top: "max(6.5rem, calc(env(safe-area-inset-top) + 12px))" }}
    >
      {/* ── The always-visible bar: song name + 3 buttons ── */}
      <div className="flex items-center gap-2 rounded-lg border border-legacy/40 bg-navy/80 px-3 py-2 backdrop-blur">
        {/* Clicking the song name opens/closes the details panel */}
        <button onClick={() => setOpen(!open)} className="min-w-0 flex-1 text-left" title="Show credits and playlist">
          {/* truncate = cut long names with "..." so the bar stays one line */}
          <div className="truncate text-legacy">♪ {track.title}</div>
          <div className="truncate text-xs text-white/60">{track.artist}</div>
        </button>
        {/* aria-label = the button's name for screen readers (it only shows a symbol) */}
        <button onClick={() => music.prev()} aria-label="Previous song ([)" className="px-1 hover:text-legacy">⏮</button>
        <button onClick={() => music.toggle()} aria-label="Play or pause music (M)" className="px-1 text-lg hover:text-legacy">
          {s.playing ? "⏸" : "▶"}
        </button>
        <button onClick={() => music.next()} aria-label="Next song (])" className="px-1 hover:text-legacy">⏭</button>
      </div>

      {/* Browsers block sound until the visitor clicks. If that happened, say so. */}
      {s.needsClick && (
        <div className="mt-1 rounded bg-black/60 px-2 py-1 text-xs text-energy">Press ▶ to start the music</div>
      )}

      {/* ── The details panel (slides open) ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-2 space-y-3 rounded-lg border border-legacy/40 bg-navy/90 p-3 backdrop-blur"
          >
            {/* CREDIT + LICENSE: every song shows who made it and why we can play it */}
            <div>
              <div className="text-xs uppercase tracking-wider text-white/50">Credit</div>
              <div>{track.credit}</div>
              <div className="mt-1 text-xs text-white/50">License: {track.license}</div>
            </div>

            {/* Songs by other artists play through their OFFICIAL player */}
            {track.kind === "embed" && (
              <iframe
                src={track.embedUrl}
                title={`${track.title} by ${track.artist}`}
                className="h-40 w-full rounded"
                // allow = the permissions the official player needs to play audio
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            )}

            {/* Volume slider: an <input type="range"> from 0 to 1 */}
            <label className="flex items-center gap-2 text-xs">
              Volume
              <input
                type="range" min={0} max={1} step={0.05} value={s.volume}
                onChange={(e) => music.setVolume(Number(e.target.value))}
                className="flex-1 accent-[#d4a72c]"
              />
            </label>

            {/* The whole playlist. Click a song to play it. */}
            <ol className="max-h-40 space-y-1 overflow-y-auto">
              {s.tracks.map((t, i) => (
                // key = a unique id React uses to keep track of list items
                <li key={`${t.title}-${i}`}>
                  <button
                    onClick={() => music.play(i)}
                    className={`w-full truncate text-left hover:text-legacy ${i === s.index ? "text-legacy" : ""}`}
                  >
                    {i + 1}. {t.title} · {t.artist}
                    {/* Mark local-only songs so you remember they won't be on the live site */}
                    {t.kind === "file" && t.local ? " (local only)" : ""}
                  </button>
                </li>
              ))}
            </ol>
            <div className="text-[11px] text-white/40">M play/pause · [ previous · ] next</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
