import Link from "next/link";
import { PORTFOLIO_CHAPTERS, PORTFOLIO_PROFILE } from "@/game/data/portfolioChapters";

// ─────────────────────────────────────────────────────────────
// PORTFOLIO VIEW — Andre's living portfolio, chapter by chapter.
// Renders in two places: the standalone /portfolio page, and the
// in-game overlay (embedded = true, reached with the P key).
// The content mirrors the standalone portfolio site, so the altar
// in Safe Town and the website always tell the same story.
// ─────────────────────────────────────────────────────────────

interface PortfolioViewProps {
  embedded?: boolean;
  onClose?: () => void;
}

// A quest with text is CLEAR; an empty one is IN PROGRESS.
// Showing both is deliberate: the portfolio is a work in progress
// and says so honestly, the same way the live site does.
function QuestCard({ quest }: { quest: (typeof PORTFOLIO_CHAPTERS)[number]["groups"][number]["quests"][number] }) {
  const done = quest.text.trim().length > 0;
  return (
    <article className={`rounded-xl border p-5 ${done ? "border-white/10 bg-white/[0.04]" : "border-dashed border-white/15 bg-black/20"}`}>
      <span className={`text-[10px] font-bold tracking-[0.25em] ${quest.bonus ? "text-[#b48cff]" : done ? "text-[#7be8a8]" : "text-white/40"}`}>
        {quest.bonus ? "BONUS" : done ? "CLEAR" : "IN PROGRESS"}
      </span>
      <h4 className="mt-1.5 font-display text-lg font-bold text-legacy">{quest.title}</h4>
      {done ? (
        // Andre's own static words include small formatting tags
        // (<b>, <i>, <ul>) — never user input, so this is safe.
        <div
          className="portfolio-quest-text mt-2 text-sm leading-7 text-white/75 [&_b]:text-white [&_i]:text-energy [&_ul]:list-disc [&_ul]:pl-5 [&_p]:mb-2"
          dangerouslySetInnerHTML={{ __html: quest.text }}
        />
      ) : (
        <p className="mt-2 text-sm italic leading-7 text-white/40">{quest.prompt}</p>
      )}
      {quest.links && quest.links.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {quest.links.map((l) => (
            <a key={l.label} href={l.url} target="_blank" rel="noreferrer" className="text-sm text-energy underline decoration-energy/50 underline-offset-4 hover:text-white">
              {l.label} →
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

/** One chapter's full content (tag line, region, intro, boss, quest
    groups). Shared by the main portfolio page (all chapters stacked)
    and the per-chapter pages at /portfolio/[chapter] — same words,
    two doors in. */
export function ChapterContent({ ch }: { ch: (typeof PORTFOLIO_CHAPTERS)[number] }) {
  return (
    <>
      <p className="text-xs font-bold tracking-[0.3em]" style={{ color: ch.accent }}>
        {ch.tag} · {ch.section}
      </p>
      <h2 className="mt-2 font-display text-3xl font-bold text-[#fff3c4] sm:text-4xl">
        {ch.region}
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-white/65">{ch.intro}</p>

      {ch.boss && (
        <div className="mt-5 rounded-xl border border-[#b3263a]/50 bg-[#b3263a]/10 p-5">
          <p className="font-display text-sm font-bold tracking-widest text-[#ff8f9d]">💀 {ch.boss.name}</p>
          <p className="mt-2 text-sm leading-7 text-white/75">{ch.boss.text}</p>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {ch.groups.map((g, gi) => (
          <div key={g.name ?? gi}>
            {g.name && (
              <h3 className="mb-3 font-display text-lg font-bold" style={{ color: ch.accent }}>
                {g.name} <span className="ml-1 text-sm font-normal text-white/50">· {g.sub}</span>
              </h3>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {g.quests.map((q) => <QuestCard key={q.title} quest={q} />)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function PortfolioView({ embedded = false, onClose }: PortfolioViewProps) {
  return (
    <div className={`portfolio-scroll ${embedded ? "portfolio-embedded" : ""}`}>
      <div className="mx-auto max-w-5xl px-5 py-7 sm:px-10 sm:py-12">
        {/* ── HEADER: who this is + how to reach him + PLAY THE GAME ── */}
        <header className="relative overflow-hidden rounded-3xl border border-legacy/40 bg-gradient-to-br from-[#17213b] via-[#11182b] to-[#321327] p-7 shadow-2xl sm:p-12">
          <div aria-hidden="true" className="absolute -right-12 -top-16 h-64 w-64 rounded-full bg-legacy/10 blur-3xl" />
          <div className="relative">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              {embedded ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:border-legacy hover:text-legacy"
                >
                  ← Return to the game
                </button>
              ) : (
                <Link
                  href="/"
                  className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:border-legacy hover:text-legacy"
                >
                  ← The Legend of Andre
                </Link>
              )}
            </div>
            <p className="text-xs font-bold tracking-[0.35em] text-energy">A LIVING PORTFOLIO</p>
            <h1 className="mt-3 font-display text-4xl font-black text-[#fff3c4] sm:text-6xl">
              {PORTFOLIO_PROFILE.name}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/80">
              {PORTFOLIO_PROFILE.title}
            </p>
            {/* The main doors: play the game, or reach Andre directly. */}
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/game"
                className="rounded-full border border-legacy bg-legacy/25 px-5 py-2.5 font-display text-sm font-bold text-[#fff3c4] transition hover:bg-legacy/40 hover:shadow-[0_0_24px_rgba(212,167,44,0.5)]"
              >
                ⚔ Play the Game
              </Link>
              <a href={PORTFOLIO_PROFILE.linkedin} target="_blank" rel="noreferrer" className="rounded-full border border-white/20 px-5 py-2.5 text-sm text-white/80 transition hover:border-energy hover:text-energy">
                LinkedIn ↗
              </a>
              <a href={PORTFOLIO_PROFILE.github} target="_blank" rel="noreferrer" className="rounded-full border border-white/20 px-5 py-2.5 text-sm text-white/80 transition hover:border-energy hover:text-energy">
                GitHub ↗
              </a>
              <a href={`mailto:${PORTFOLIO_PROFILE.email}`} className="rounded-full border border-white/20 px-5 py-2.5 text-sm text-white/80 transition hover:border-energy hover:text-energy">
                {PORTFOLIO_PROFILE.email}
              </a>
            </div>
            {/* Chapter quick-nav, each chip in its chapter's color.
                On the standalone page each chip opens the chapter's OWN
                page; embedded in the game (P key) it just scrolls, so
                the player is never yanked out of the world. */}
            <nav aria-label="Portfolio chapters" className="mt-7 flex flex-wrap gap-2">
              {PORTFOLIO_CHAPTERS.map((ch) =>
                embedded ? (
                  <a
                    key={ch.id}
                    href={`#${ch.id}`}
                    className="rounded-full border px-3.5 py-1.5 text-xs transition hover:bg-white/10"
                    style={{ borderColor: `${ch.accent}66`, color: ch.accent }}
                  >
                    {ch.tag}
                  </a>
                ) : (
                  <Link
                    key={ch.id}
                    href={`/portfolio/${ch.id}`}
                    className="rounded-full border px-3.5 py-1.5 text-xs transition hover:bg-white/10"
                    style={{ borderColor: `${ch.accent}66`, color: ch.accent }}
                  >
                    {ch.tag}
                  </Link>
                ),
              )}
            </nav>
          </div>
        </header>

        {/* ── CHAPTERS ── */}
        <main className="py-12">
          {PORTFOLIO_CHAPTERS.map((ch) => (
            <section key={ch.id} id={ch.id} aria-label={`${ch.tag} ${ch.region}`} className="mb-14 scroll-mt-6">
              <ChapterContent ch={ch} />
            </section>
          ))}
        </main>

        <footer className="border-t border-white/10 py-6 text-center text-xs text-white/45">
          This portfolio is a work in progress. The next chapter is still being written. ·{" "}
          <a href={PORTFOLIO_PROFILE.site} target="_blank" rel="noreferrer" className="text-energy/70 hover:text-energy">
            Visit the standalone portfolio site ↗
          </a>
        </footer>
      </div>
    </div>
  );
}
