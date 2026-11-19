"use client";

// ─────────────────────────────────────────────────────────────
// THE VISION ("/vision")
// The story bible made visible: where Andre's journey started, what each
// chapter teaches, and the kingdom the whole road leads to.
//
// WHY pull content from game/data/story.ts? One source of truth: when the
// story grows, this page and the game update together. The game says the
// lines; this page shows the shape of the whole road.
//
// Sections:
//   1. Hero          — the mission in one breath
//   2. The Road      — the three chapters, past → present → future
//   3. Lesson Codex  — every boss is a lesson; every lesson is a power
//   4. Memory Stones — the true moments the world is built from
//   5. Roadmap       — what's built, what's next
// ─────────────────────────────────────────────────────────────

import Link from "next/link";
import { motion } from "framer-motion";
// The same story data the game itself reads. (story.ts is pure data — no
// Phaser inside — so it's safe to use on a web page.)
import { STORY } from "@/game/data/story";

// ── shared animation ─────────────────────────────────────────
// "reveal" = fade + rise as a section scrolls into view. once: true means
// it animates the first time only, not on every scroll-by.
const reveal = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7 },
} as const;

// A small gold section heading with the wide letter-spacing of the title screen.
function SectionTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <motion.div {...reveal} className="mb-10 text-center">
      <p className="text-xs tracking-[0.5em] text-energy">{kicker}</p>
      <h2 className="mt-2 bg-gradient-to-b from-[#fff3c4] to-legacy bg-clip-text font-display text-4xl font-bold text-transparent sm:text-5xl">
        {title}
      </h2>
    </motion.div>
  );
}

// ── data for the three chapters ──────────────────────────────
// status: "done" = playable today, "now" = being built, "sealed" = locked in-story.
const CHAPTERS = [
  {
    numeral: "I",
    name: "The Forest of Origins",
    status: "done" as const,
    statusLabel: "Playable now",
    summary:
      "Where the path begins. Memory stones hold six years at Nike, a block rebuilt wall by wall, the annual lakefront walk, and the ice machines of Empire Cooler. Two lesson-bosses wait in the clearings: The Overload and The Unknown Machine.",
    lesson: "Lessons: boundaries · the courage to ask",
  },
  {
    numeral: "II",
    name: "The Internship Kingdom",
    status: "now" as const,
    statusLabel: "In development",
    summary:
      "The i.c.stars chapter. Technology and leadership training — JavaScript, React, SQL, APIs, Agile — where raw determination is forged into a developer's craft, and a cohort becomes a community.",
    lesson: "Lesson in progress: growth is a team sport",
  },
  {
    numeral: "III",
    name: "The Future Kingdom",
    status: "sealed" as const,
    statusLabel: "Sealed — the destination",
    summary:
      "A career in cybersecurity — SOC analyst, defender of networks — and the road home. The final boss is Self Doubt, and the sealed power Legacy Surge (R) awakens here: not built for one hero, but to lift a whole neighborhood.",
    lesson: "Lesson awaiting: bring everyone with you",
  },
];

// status → color coding, shared by the chapter cards and the roadmap
const STATUS_STYLE = {
  done: "border-energy/50 text-energy",
  now: "border-legacy/60 text-legacy",
  sealed: "border-white/20 text-white/50",
};

// ── the lesson codex ─────────────────────────────────────────
const LESSONS = [
  {
    boss: "The Overload",
    origin: "Nike · 2017–2023",
    lesson: "Helping others is leadership. Carrying everything alone is not. Set expectations early; keep your boundaries.",
    power: "Leadership Aura",
    key: "E",
    effect: "+20% damage, +15% speed, regeneration",
    color: "#ffd75e",
  },
  {
    boss: "The Unknown Machine",
    origin: "Empire Cooler · 2023–2025",
    lesson: "Not knowing is not failing. Staying silent is. Speak up, and everyone gets better.",
    power: "Courage Strike",
    key: "Q",
    effect: "Blink through danger and strike for 2× damage",
    color: "#4fd1ff",
  },
  {
    boss: "Self Doubt",
    origin: "The Future Kingdom",
    lesson: "Sealed. The hardest boss is the one inside — and it is beaten by every step that came before it.",
    power: "Legacy Surge",
    key: "R",
    effect: "Awakens in the Future Kingdom. Built to lift a whole neighborhood.",
    color: "#c084fc",
  },
];

// ── the roadmap (mirrors the project's README) ───────────────
const ROADMAP: { done: boolean; label: string }[] = [
  { done: true, label: "Playable world, combat, story, lesson bosses" },
  { done: true, label: "State machines, components, pooling, shader FX" },
  { done: true, label: "Music player: playlist, credits, official embeds" },
  { done: true, label: "Touch controls, synthesized sound FX, pause" },
  { done: true, label: "The Vision page: storyline & roadmap (you are here)" },
  { done: false, label: "Internship Kingdom (the i.c.stars chapter)" },
  { done: false, label: "Future Kingdom + Legacy Surge + final boss: Self Doubt" },
  { done: false, label: "Real pixel-art sprites" },
  { done: false, label: "Multiplayer travelers (Socket.io)" },
  { done: false, label: "Logins and saved progress (Supabase)" },
];

export default function VisionPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#070d1d] via-[#0b1430] to-[#141021] font-serif text-white/90">
      {/* ── 1. HERO ─────────────────────────────────────────── */}
      <section className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-4 text-center">
        {/* Starfield (deterministic, same trick as the main menu) */}
        {Array.from({ length: 60 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-white"
            style={{ left: `${(i * 53) % 100}%`, top: `${(i * 29) % 70}%` }}
            animate={{ opacity: [0.15, 0.9, 0.15] }}
            transition={{ duration: 2.5 + (i % 5), repeat: Infinity, delay: i * 0.08 }}
          />
        ))}
        <div className="absolute left-1/2 top-1/3 h-[60vh] w-[60vh] -translate-x-1/2 rounded-full bg-legacy/10 blur-3xl" />

        <motion.div initial={{ opacity: 0, y: -24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
          <p className="text-xs tracking-[0.5em] text-energy sm:text-sm">THE LEGEND OF ANDRE</p>
          <h1 className="mt-3 bg-gradient-to-b from-[#fff3c4] to-legacy bg-clip-text font-display text-6xl font-black text-transparent drop-shadow-[0_4px_24px_rgba(212,167,44,0.35)] sm:text-8xl">
            THE VISION
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="mt-8 max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl"
        >
          A playable legend with a real destination: a career in cybersecurity, and then home —
          a South Side of Chicago with the knowledge, resources, and opportunity to let every kid
          see a world bigger than the walls around them.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="mt-10 flex flex-col gap-3 sm:flex-row"
        >
          <Link
            href="/game"
            className="rounded-lg border-2 border-legacy bg-legacy/20 px-8 py-3 font-display text-lg text-[#f3e3b5] transition hover:bg-legacy/35 active:scale-95"
          >
            ⚔ Play Chapter One
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-white/25 px-8 py-3 font-display text-lg text-white/70 transition hover:bg-white/10 active:scale-95"
          >
            ◂ Main Menu
          </Link>
        </motion.div>

        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-6 text-white/40"
        >
          ▾ scroll
        </motion.div>
      </section>

      {/* ── 2. THE ROAD: three chapters ─────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-24">
        <SectionTitle kicker="THE STORYLINE" title="The Road" />
        <div className="relative flex flex-col gap-10">
          {/* The road itself: a gold line running down the chapter list (desktop) */}
          <div className="absolute left-[27px] top-4 hidden h-[calc(100%-2rem)] w-px bg-gradient-to-b from-energy/60 via-legacy/60 to-white/10 sm:block" />
          {CHAPTERS.map((ch, i) => (
            <motion.article
              key={ch.numeral}
              {...reveal}
              transition={{ duration: 0.7, delay: i * 0.12 }}
              className="relative flex gap-6"
            >
              {/* Chapter marker on the road */}
              <div
                className={`hidden h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 bg-navy font-display text-xl sm:flex ${STATUS_STYLE[ch.status]}`}
              >
                {ch.numeral}
              </div>
              <div className="flex-1 rounded-xl border border-legacy/30 bg-navy/60 p-6 backdrop-blur sm:p-8">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display text-2xl text-[#f3e3b5]">
                    Chapter {ch.numeral}: {ch.name}
                  </h3>
                  <span className={`rounded-full border px-3 py-1 text-xs ${STATUS_STYLE[ch.status]}`}>
                    {ch.statusLabel}
                  </span>
                </div>
                <p className="mt-3 leading-relaxed text-white/75">{ch.summary}</p>
                <p className="mt-4 text-sm italic text-energy/80">{ch.lesson}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* ── 3. LESSON CODEX ─────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <SectionTitle kicker="EVERY BOSS IS A LESSON" title="Lesson Codex" />
        <div className="grid gap-6 md:grid-cols-3">
          {LESSONS.map((l, i) => (
            <motion.article
              key={l.boss}
              {...reveal}
              transition={{ duration: 0.7, delay: i * 0.12 }}
              className="flex flex-col rounded-xl border border-white/15 bg-navy/60 p-6 backdrop-blur"
            >
              <div className="mb-1 text-xs uppercase tracking-widest text-white/40">{l.origin}</div>
              <h3 className="font-display text-xl" style={{ color: l.color }}>
                {l.boss}
              </h3>
              <p className="mt-3 flex-1 leading-relaxed text-white/75">{l.lesson}</p>
              {/* The lesson becomes a power: shown as a skill chip */}
              <div className="mt-5 rounded-lg border border-white/10 bg-black/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-display text-sm" style={{ color: l.color }}>
                    {l.power}
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded border border-white/25 bg-white/5 font-display text-sm">
                    {l.key}
                  </span>
                </div>
                <div className="mt-1 text-xs text-white/55">{l.effect}</div>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* ── 4. MEMORY STONES ────────────────────────────────── */}
      {/* Pulled straight from the game's story data: what the stones say in the
          forest is what they say here. */}
      <section className="mx-auto max-w-6xl px-4 py-24">
        <SectionTitle kicker="TRUE MOMENTS" title="Memory Stones" />
        <div className="grid gap-6 sm:grid-cols-2">
          {Object.values(STORY.memories).map((memory, i) => (
            <motion.article
              key={memory[0].speaker}
              {...reveal}
              transition={{ duration: 0.7, delay: i * 0.1 }}
              className="rounded-xl border border-energy/25 bg-navy/50 p-6 backdrop-blur"
            >
              {/* Each memory's lines all share one "speaker" = the stone's title */}
              <h3 className="font-display text-lg text-energy">{memory[0].speaker}</h3>
              {/* Every line's text is part of the memory — show them all */}
              <div className="mt-3 space-y-2 text-sm leading-relaxed text-white/70">
                {memory.map((line, j) => (
                  <p key={j}>{line.text}</p>
                ))}
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* ── 5. ROADMAP ──────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 py-24">
        <SectionTitle kicker="THE BUILD CONTINUES" title="Roadmap" />
        <motion.ul {...reveal} className="space-y-3">
          {ROADMAP.map((item) => (
            <li
              key={item.label}
              className={`flex items-center gap-4 rounded-lg border px-5 py-3 backdrop-blur ${
                item.done ? "border-energy/30 bg-navy/50 text-white/80" : "border-white/10 bg-black/20 text-white/45"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs ${
                  item.done ? "border-energy bg-energy/20 text-energy" : "border-white/25"
                }`}
              >
                {item.done ? "✓" : ""}
              </span>
              {item.label}
            </li>
          ))}
        </motion.ul>

        {/* Closing CTA */}
        <motion.div {...reveal} className="mt-16 text-center">
          <p className="mx-auto max-w-xl leading-relaxed text-white/70">
            The career is the road, not the destination. The destination is home.
          </p>
          <Link
            href="/game"
            className="mt-6 inline-block rounded-lg border-2 border-legacy bg-legacy/20 px-8 py-3 font-display text-lg text-[#f3e3b5] transition hover:bg-legacy/35 active:scale-95"
          >
            Walk the path →
          </Link>
        </motion.div>
      </section>
    </main>
  );
}
