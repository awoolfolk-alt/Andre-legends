import Link from "next/link";
import { notFound } from "next/navigation";
import { ChapterContent } from "@/components/PortfolioView";
import { PORTFOLIO_CHAPTERS } from "@/game/data/portfolioChapters";

// ─────────────────────────────────────────────────────────────
// ONE CHAPTER, ONE PAGE (/portfolio/prologue, /portfolio/business, …)
// The chapter chips on the main portfolio page open these. The words
// are the SAME ones the main page shows (ChapterContent is shared) —
// the main page keeps its long scroll, these are just focused doors
// into each chapter. Design is intentionally minimal for now; a
// richer per-chapter look is planned later.
//
// Static export: generateStaticParams pre-builds all 7 pages at
// build time, and dynamicParams=false makes any other id a 404.
// ─────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return PORTFOLIO_CHAPTERS.map((ch) => ({ chapter: ch.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ chapter: string }> }) {
  const { chapter } = await params;
  const ch = PORTFOLIO_CHAPTERS.find((c) => c.id === chapter);
  return { title: ch ? `${ch.region} | Andre Woolfolk` : "Chapter not found" };
}

export default async function ChapterPage({ params }: { params: Promise<{ chapter: string }> }) {
  const { chapter } = await params;
  const ch = PORTFOLIO_CHAPTERS.find((c) => c.id === chapter);
  if (!ch) notFound();

  return (
    <div className="portfolio-scroll min-h-screen bg-[#0b0f1c]">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-10 sm:py-12">
        {/* Minimal frame: back to the full scroll, or into the game. */}
        <nav className="mb-8 flex items-center justify-between">
          <Link
            href="/portfolio"
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:border-energy hover:text-energy"
          >
            ← Full Portfolio
          </Link>
          <Link
            href="/game"
            className="rounded-full border border-legacy/50 bg-legacy/15 px-4 py-2 text-sm text-[#f3e3b5] transition hover:bg-legacy/30"
          >
            ⚔ Play the Game
          </Link>
        </nav>

        <main>
          <ChapterContent ch={ch} />
        </main>

        {/* Handy prev/next so a reader can walk the story in order. */}
        <nav className="mt-12 flex items-center justify-between border-t border-white/10 pt-6 text-sm">
          {(() => {
            const i = PORTFOLIO_CHAPTERS.indexOf(ch);
            const prev = PORTFOLIO_CHAPTERS[i - 1];
            const next = PORTFOLIO_CHAPTERS[i + 1];
            return (
              <>
                {prev ? (
                  <Link href={`/portfolio/${prev.id}`} style={{ color: prev.accent }} className="hover:underline">
                    ← {prev.region}
                  </Link>
                ) : <span />}
                {next ? (
                  <Link href={`/portfolio/${next.id}`} style={{ color: next.accent }} className="hover:underline">
                    {next.region} →
                  </Link>
                ) : <span />}
              </>
            );
          })()}
        </nav>
      </div>
    </div>
  );
}
