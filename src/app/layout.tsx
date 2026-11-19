// ─────────────────────────────────────────────────────────────
// ROOT LAYOUT
// layout.tsx wraps EVERY page in the app. Anything here (fonts, global CSS,
// the <html> and <body> tags, the Jukebox) is shared by "/", "/game",
// "/vision", "/portfolio" and the mock pages.
// ─────────────────────────────────────────────────────────────

// "import type" brings in only a TypeScript type (used for checking, not running).
import type { Metadata } from "next";
// Load our global styles (Tailwind + base page colors) once for the whole app.
import "./globals.css";
// The site-wide music player (floating vinyl in the corner of every page).
import Jukebox from "@/components/Jukebox";

// metadata = info for the browser tab and search engines / link previews.
// Next.js reads this export and builds the <title> and <meta> tags for us.
export const metadata: Metadata = {
  title: "The Legend of Andre: Rise of Legacy",
  description: "A playable, Zelda-inspired portfolio of Andre Woolfolk's journey.",
};

// "children" is a prop: whatever page is being shown gets passed in here.
// Props are the inputs a component receives, like arguments to a function.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Cinzel = the engraved display font used by titles and headings. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        {/* The site-wide music player: floats in the corner of every page.
            Songs come from src/music/playlist.ts (the game's Vinyl Lounge
            has its own in-world record player for embeds). */}
        <Jukebox />
      </body>
    </html>
  );
}
