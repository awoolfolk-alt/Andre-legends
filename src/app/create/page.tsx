"use client";

// ─────────────────────────────────────────────────────────────
// CREATE YOUR HERO (/create)
// The page BETWEEN the main menu and the game: New Adventure sends
// the player here; "Begin the Legend" writes the save and opens /game.
//
// The preview is drawn with THE SAME code the game uses
// (data/hero.ts → drawHeroBody / drawHeroHair). Here the Painter is
// backed by a plain 2D canvas; in BootScene it's backed by Phaser.
// Same instructions, two brushes — the preview can never lie.
//
// Pixel-Zelda vibe: chunky gold frame, night-forest gradient, and a
// canvas scaled 6× with image-rendering: pixelated (no smoothing).
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CLOTHES,
  DEFAULT_HERO,
  GENDERS,
  HAIR_COLORS,
  HAIR_STYLE_NAMES,
  SKIN_TONES,
  drawHeroBody,
  drawHeroHair,
  sanitizeHero,
  type HeroConfig,
  type Painter,
} from "@/game/data/hero";
import { freshSave, listSlots, setActiveSlot, setPendingMode, writeSlot, type SlotId } from "@/game/save";

const SCALE = 5; // Keep the preview at the same crisp scale as the game sprite.
const GOLD = "#d4a72c";

/** hex number (0xd4a72c) → css string ("#d4a72c") */
const css = (color: number) => `#${color.toString(16).padStart(6, "0")}`;

/** The <canvas> half of the Painter contract (see data/hero.ts). */
function canvasPainter(ctx: CanvasRenderingContext2D, s: number): Painter {
  return {
    rect: (x, y, w, h, color, alpha = 1) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = css(color);
      ctx.fillRect(x * s, y * s, w * s, h * s);
      ctx.globalAlpha = 1;
    },
    circle: (cx, cy, r, color, alpha = 1) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = css(color);
      ctx.beginPath();
      ctx.arc(cx * s, cy * s, r * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    },
    ellipse: (cx, cy, rx, ry, color, alpha = 1) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = css(color);
      ctx.beginPath();
      ctx.ellipse(cx * s, cy * s, rx * s, ry * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    },
    line: (x1, y1, x2, y2, color, width, alpha = 1) => {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = css(color);
      ctx.lineWidth = width * s;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x1 * s, y1 * s);
      ctx.lineTo(x2 * s, y2 * s);
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
    poly: (points, color, alpha = 1) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = css(color);
      ctx.beginPath();
      points.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x * s, pt.y * s) : ctx.lineTo(pt.x * s, pt.y * s)));
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    },
    rounded: (x, y, w, h, r, color, alpha = 1) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = css(color);
      ctx.beginPath();
      ctx.roundRect(x * s, y * s, w * s, h * s, r * s);
      ctx.fill();
      ctx.globalAlpha = 1;
    },
  };
}

/** A labelled row of color swatches (skin, hair color, clothes). */
function Swatches({
  label,
  options,
  selected,
  onPick,
}: {
  label: string;
  options: { name: string; swatch: string }[];
  selected: number;
  onPick: (i: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs tracking-[0.25em] text-[#9db2d8]">{label}</span>
        <span className="text-sm text-[#ffd75e]">{options[selected].name}</span>
      </div>
      <div className="grid grid-cols-8 gap-2">
        {options.map((o, i) => (
          <button
            key={o.name}
            type="button"
            title={o.name}
            aria-label={`${label}: ${o.name}`}
            onClick={() => onPick(i)}
            className={`aspect-square rounded-sm border-2 transition-transform hover:scale-110 ${
              i === selected ? "border-[#ffd75e] shadow-[0_0_10px_#ffd75e88]" : "border-[#2a3a5e]"
            }`}
            style={{ backgroundColor: o.swatch }}
          />
        ))}
      </div>
    </div>
  );
}

export default function CreateHeroPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [name, setName] = useState("");
  const [cfg, setCfg] = useState<HeroConfig>(DEFAULT_HERO);
  // The two save slots and which one this new hero will live in.
  // Read after mount — localStorage doesn't exist while Next.js renders
  // on the server.
  const [slot, setSlot] = useState<SlotId>(1);
  const [slots, setSlots] = useState<{ slot: SlotId; name: string | null; level: number }[]>([
    { slot: 1, name: null, level: 1 },
    { slot: 2, name: null, level: 1 },
  ]);
  useEffect(() => {
    setSlots(listSlots().map(({ slot: id, save }) => ({
      slot: id,
      name: save?.name ?? null,
      level: save?.level ?? 1,
    })));
  }, []);
  const set = (patch: Partial<HeroConfig>) => setCfg((c) => ({ ...c, ...patch }));

  // Redraw the hero whenever any choice changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const p = canvasPainter(ctx, SCALE);
    // Body box is 48×64; the hair box floats at (+2, −1.6) over it
    // (the exact offset Player.ts uses in-game). Canvas is 288×408,
    // body drawn 12px down so the hair never clips at the top.
    ctx.save();
    ctx.translate(0, 12);
    drawHeroBody(p, cfg);
    ctx.translate(2 * SCALE, -1.6 * SCALE);
    drawHeroHair(p, cfg);
    ctx.restore();
  }, [cfg]);

  const begin = () => {
    // Write the fresh adventure into the CHOSEN slot (the picker below
    // shows what it overwrites), make that slot active, then depart.
    setActiveSlot(slot);
    writeSlot(slot, freshSave(name.trim() || "Traveler", sanitizeHero(cfg)));
    setPendingMode("new");
    router.push("/game");
  };

  const hairStyle = HAIR_STYLE_NAMES[cfg.hairStyle];

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0b1430] via-[#14203c] to-[#241a2e] p-4 font-display text-[#f2f4ff]">
      <div
        className="w-full max-w-3xl rounded-xl border-[3px] bg-[#0d1830]/95 p-5 shadow-[0_0_60px_#00000088]"
        style={{ borderColor: GOLD }}
      >
        <h1 className="text-center text-2xl tracking-[0.2em] text-[#ffd75e]">CREATE YOUR HERO</h1>
        <p className="mt-1 text-center text-sm text-[#9db2d8]">
          Every legend begins with a face in the mirror. This one is yours — the powers are the same.
        </p>

        <div className="mt-4 flex flex-row gap-5">
          {/* ── The mirror (live pixel preview) ── */}
          <div className="flex flex-col items-center justify-start">
            <div
              className="rounded-lg border-2 bg-gradient-to-b from-[#16233f] to-[#0a1120] p-2"
              style={{ borderColor: "#2a3a5e" }}
            >
              <canvas
                ref={canvasRef}
                width={48 * SCALE}
                height={68 * SCALE}
                style={{ imageRendering: "pixelated" }}
                className="block"
              />
            </div>
            <div className="mt-3 w-56">
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 16))}
                placeholder="Name your hero…"
                aria-label="Hero name"
                className="w-full rounded border-2 border-[#2a3a5e] bg-[#0a1120] px-3 py-2 text-center text-lg tracking-widest text-[#ffd75e] placeholder:text-[#4a5a7e] focus:border-[#ffd75e] focus:outline-none"
              />
            </div>
            {/* Gender */}
            <div className="mt-3 grid w-56 grid-cols-2 gap-2">
              {GENDERS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => set({ gender: g.id })}
                  className={`rounded border-2 px-2 py-2 text-sm tracking-widest transition-colors ${
                    cfg.gender === g.id
                      ? "border-[#ffd75e] bg-[#ffd75e22] text-[#ffd75e]"
                      : "border-[#2a3a5e] text-[#9db2d8] hover:border-[#4a5a7e]"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── The choices ── */}
          <div className="flex flex-1 flex-col gap-4">
            <Swatches
              label="SKIN TONE"
              options={SKIN_TONES.map((t) => ({ name: t.name, swatch: css(t.color) }))}
              selected={cfg.skin}
              onPick={(skin) => set({ skin })}
            />

            {/* Hair style: arrows + name, since styles can't be swatches */}
            <div>
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-xs tracking-[0.25em] text-[#9db2d8]">HAIR STYLE</span>
                <span className="text-sm text-[#ffd75e]">{hairStyle}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Previous hair style"
                  onClick={() => set({ hairStyle: (cfg.hairStyle + HAIR_STYLE_NAMES.length - 1) % HAIR_STYLE_NAMES.length })}
                  className="rounded border-2 border-[#2a3a5e] px-3 py-1 text-[#9db2d8] hover:border-[#ffd75e] hover:text-[#ffd75e]"
                >
                  ◀
                </button>
                <div className="flex-1 rounded border-2 border-[#2a3a5e] bg-[#0a1120] py-1 text-center text-[#f2f4ff]">
                  {cfg.hairStyle + 1} / {HAIR_STYLE_NAMES.length}
                </div>
                <button
                  type="button"
                  aria-label="Next hair style"
                  onClick={() => set({ hairStyle: (cfg.hairStyle + 1) % HAIR_STYLE_NAMES.length })}
                  className="rounded border-2 border-[#2a3a5e] px-3 py-1 text-[#9db2d8] hover:border-[#ffd75e] hover:text-[#ffd75e]"
                >
                  ▶
                </button>
              </div>
            </div>

            <Swatches
              label="HAIR COLOR"
              options={HAIR_COLORS.map((c) => ({ name: c.name, swatch: css(c.color) }))}
              selected={cfg.hairColor}
              onPick={(hairColor) => set({ hairColor })}
            />

            <Swatches
              label="CLOTHES"
              options={CLOTHES.map((o) => ({ name: o.name, swatch: css(o.secondary) }))}
              selected={cfg.clothes}
              onPick={(clothes) => set({ clothes })}
            />
{/* ── Choose the cartridge this hero lives in ── */}
    <div className="mt-4">
      <div className="mb-2 text-xs tracking-[0.25em] text-[#9db2d8]">SAVE SLOT</div>
      <div className="grid grid-cols-2 gap-3">
        {slots.map((s2) => (
          <button
            key={s2.slot}
            type="button"
            onClick={() => setSlot(s2.slot)}
            className={`rounded border-2 px-3 py-2 text-left transition-colors ${
              slot === s2.slot
                ? "border-[#ffd75e] bg-[#ffd75e22]"
                : "border-[#2a3a5e] hover:border-[#4a5a7e]"
            }`}
          >
            <span className="block text-xs tracking-[0.25em] text-[#9db2d8]">SLOT {s2.slot}</span>
            {s2.name ? (
              <span className="block text-sm text-[#ffb3b3]">
                Overwrites: {s2.name} · Lv {s2.level}
              </span>
            ) : (
              <span className="block text-sm italic text-[#7be8a8]">Empty</span>
            )}
          </button>
        ))}
      </div>
    </div>

          </div>
        </div>

        {/* ── Depart ── */}
        <div className="mt-4 flex items-center justify-between border-t-2 border-[#2a3a5e] pt-4">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded border-2 border-[#2a3a5e] px-4 py-2 text-sm tracking-widest text-[#9db2d8] hover:border-[#4a5a7e]"
          >
            ← BACK
          </button>
          <button
            type="button"
            onClick={begin}
            className="rounded border-2 border-[#ffd75e] bg-[#ffd75e22] px-6 py-2 text-lg tracking-[0.2em] text-[#ffd75e] transition-all hover:bg-[#ffd75e44] hover:shadow-[0_0_20px_#ffd75e66]"
          >
            ⚔ BEGIN THE LEGEND
          </button>
        </div>
      </div>
    </main>
  );
}
