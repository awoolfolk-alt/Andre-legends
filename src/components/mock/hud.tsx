"use client";
// ─────────────────────────────────────────────────────────────────────────────
// HUD components for the mock pages.
//
// WHY separate tiny components instead of one big block? Because the real
// game will compose the HUD the same way — a boss bar only exists during a
// boss, the prompt only near something interactable. The mock proves each
// piece in isolation, exactly where it will sit in the real build.
// Everything is pointer-events:none (read-only) except things you can click.
// ─────────────────────────────────────────────────────────────────────────────
import Link from "next/link";

export function NameBars({ hp = 1, xp = 0.4, name = "ANDRE", level = 12 }: { hp?: number; xp?: number; name?: string; level?: number }) {
  return (
    <>
      <div className="hud-name">
        {name} · Lv {level}
      </div>
      <div className="hud-bars">
        <div className="bar hp">
          <i style={{ width: `${Math.round(hp * 100)}%` }} />
        </div>
        <div className="bar xp">
          <i style={{ width: `${Math.round(xp * 100)}%` }} />
        </div>
      </div>
    </>
  );
}

export function Quest({ title, hint, count }: { title: string; hint: string; count: string }) {
  return (
    <div className="hud-quest">
      <small>CURRENT QUEST</small>
      <b>{title}</b>
      <span>{hint}</span>
      <em>{count}</em>
    </div>
  );
}

export function Skills({ legacy = true }: { legacy?: boolean }) {
  return (
    <div className="hud-skills">
      <span className="skill-chip">
        <b>SHIFT</b>Dash
      </span>
      <span className="skill-chip">
        <b>Q</b>Courage
      </span>
      <span className="skill-chip">
        <b>E</b>Aura
      </span>
      {legacy && (
        <span className="skill-chip">
          <b>R</b>Legacy
        </span>
      )}
    </div>
  );
}

export function Hint({ text = "DRAG look · WASD move · E interact" }: { text?: string }) {
  return <div className="hud-hint">{text}</div>;
}

export function Cross() {
  return <div className="hud-cross" />;
}

export function Prompt({ k = "E", children }: { k?: string; children: React.ReactNode }) {
  return (
    <div className="hud-prompt">
      <b>{k}</b>
      {children}
    </div>
  );
}

/** Boss health as 8 segments — the Shadow fight spends one per melee⇄word cycle. */
export function BossBar({ name, lost = 0, of = 8 }: { name: string; lost?: number; of?: number }) {
  return (
    <div className="boss-bar">
      <div className="boss-name">{name}</div>
      <div className="segments">
        {Array.from({ length: of }, (_, i) => (
          <i key={i} className={i < lost ? "lost" : ""} />
        ))}
      </div>
    </div>
  );
}

/** The "a boss has appeared" letterbox event. Toggle with the `on` prop. */
export function Announce({ on, title, sub }: { on: boolean; title: string; sub: string }) {
  return (
    <div className={`announce ${on ? "on" : ""}`}>
      <div className="lb top" />
      <div className="lb bot" />
      <div className="banner">
        <small>{sub}</small>
        <b>{title}</b>
      </div>
    </div>
  );
}

/** The gold MOCK ribbon — every review page is labeled so nobody mistakes it
 *  for a finished build. */
export function MockTag({ label = "DESIGN MOCK" }: { label?: string }) {
  return <div className="mock-tag">{label}</div>;
}

/** The review panel: what you're looking at + what to judge + navigation. */
export function MockNote({
  title,
  children,
  back = true,
}: {
  title: string;
  children?: React.ReactNode;
  back?: boolean;
}) {
  return (
    <div className="mock-note">
      <b>{title}</b>
      {children}
      <div className="row">
        {back && <Link href="/mock/">← All mocks</Link>}
        <Link href="/">Main menu</Link>
      </div>
    </div>
  );
}
