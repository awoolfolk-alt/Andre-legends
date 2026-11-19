// ─────────────────────────────────────────────────────────────
// GAME PAGE ("/game")
// Because this file is in app/game/, Next.js serves it at the URL "/game".
// The menu's "New Adventure" button sends the player here.
// ─────────────────────────────────────────────────────────────

// "use client" = run in the browser, because the game needs a real screen.
"use client";

// Link = Next.js's version of an <a> tag. It changes pages without a full reload.
import Link from "next/link";
// useEffect runs once after the page appears — perfect for one-time setup.
import { useEffect } from "react";
// The React-to-Phaser bridge that actually starts the game.
import PhaserGame from "@/components/PhaserGame";
// "P" opens the portfolio panel over the game (projects, resume links).
import PortfolioOverlay from "@/components/PortfolioOverlay";
// The floating sound on/off button (pause lives in the game's own ESC menu).
import GameOverlay from "@/components/GameOverlay";
import BossArenaBridge from "@/components/BossArenaBridge";
// Starts the cloud mirror so in-game saves also sync when the player is
// logged in — even if they opened /game directly without visiting the menu.
import { initCloudSync } from "@/game/cloud";

export default function GamePage() {
  // Register the "every local save also goes to the cloud" hook on this
  // page too. It runs once; calling it again anywhere else is a no-op.
  useEffect(() => {
    initCloudSync();
  }, []);

  return (
    // relative = lets the buttons below position themselves inside this box.
    // h-screen w-screen = fill the whole window. bg-[#060b16] = deep night-blue.
    <main className="relative h-screen w-screen select-none bg-[#060b16]">
      {/* The game canvas fills the page. */}
      <PhaserGame />
      <PortfolioOverlay />
      <GameOverlay />
      <BossArenaBridge />
      {/* A small button floating in the top-right corner that takes the
          player back to the main menu at "/". It sits at 12vh so it lines
          up with the sound button on the left and clears the game's HUD. */}
      <Link
        href="/"
        className="absolute right-4 rounded-md border border-legacy/40 bg-navy/70 px-3 py-1 text-xs text-legacy hover:bg-navy"
        style={{ top: "12vh" }}
      >
        ◂ Menu
      </Link>
    </main>
  );
}
