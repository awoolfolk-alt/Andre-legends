"use client";

// ─────────────────────────────────────────────────────────────
// GAME OVERLAY: the small always-there chrome on the /game page.
// Right now that's one button: 🔊 sound effects on/off (same as the N key).
//
// WHY here and not inside Phaser? Muting is a PAGE-level concern, and React
// is great at buttons. PAUSING is the opposite: the game already owns an
// in-world pause menu (ESC inside the game, built by UIScene) that can
// freeze the right world scene AND offer "Save & Exit" — so pause stays
// in the game and this overlay stays out of its way.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { isSfxEnabled, setSfxEnabled } from "@/game/audio/Sfx";

export default function GameOverlay() {
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    // Read the real sound setting once we're in the browser.
    setSoundOn(isSfxEnabled());
    // Keep the button icon in sync if the player presses N inside the game.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "n" || e.key === "N") setSoundOn(isSfxEnabled());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="fixed left-3 z-40 flex gap-2"
      // Sit below the game's HUD bars. The HUD occupies the top ~10.4% of the
      // canvas, and the canvas fills the screen height, so 12vh clears it.
      style={{ top: "12vh" }}
    >
      <button
        onClick={() => {
          setSfxEnabled(!soundOn);
          setSoundOn(!soundOn);
        }}
        className="flex h-11 w-11 items-center justify-center rounded-md border border-legacy/40 bg-navy/70 text-lg text-legacy backdrop-blur hover:bg-navy active:scale-95"
        aria-label={soundOn ? "Mute sound effects (N)" : "Unmute sound effects (N)"}
      >
        {soundOn ? "🔊" : "🔇"}
      </button>
    </div>
  );
}
