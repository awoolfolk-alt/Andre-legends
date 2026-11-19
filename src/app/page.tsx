// ─────────────────────────────────────────────────────────────
// HOME PAGE ("/")
// Next.js "App Router": the folder a page.tsx lives in becomes its URL.
//   app/page.tsx      -> "/"      (this file, the landing page)
//   app/game/page.tsx -> "/game"  (the playable game)
// No router setup needed. Making a folder makes a page.
// ─────────────────────────────────────────────────────────────

// "@/" is a shortcut for the "src/" folder, so we don't need "../../" paths.
import MainMenu from "@/components/MainMenu";

// This page only shows the main menu. All the menu logic lives in MainMenu.tsx,
// which keeps this file tiny and easy to read.
export default function Home() {
  return <MainMenu />;
}
