import * as Phaser from "phaser";
import type { Painter } from "./data/hero";

// ─────────────────────────────────────────────────────────────
// PHASER PAINTER — shared by BootScene (local hero) and
// RemotePlayers (visitors' heroes). Lives in its own module so
// ANY scene can mint hero textures, not just the boot scene.
// Same drawing code everywhere = every sprite matches the
// /create page preview exactly.
// ─────────────────────────────────────────────────────────────

/** Wraps a Phaser Graphics object so it speaks the shared Painter
    language (see data/hero.ts). */
export function phaserPainter(g: Phaser.GameObjects.Graphics): Painter {
  return {
    rect: (x, y, w, h, color, alpha = 1) => g.fillStyle(color, alpha).fillRect(x, y, w, h),
    circle: (cx, cy, r, color, alpha = 1) => g.fillStyle(color, alpha).fillCircle(cx, cy, r),
    ellipse: (cx, cy, rx, ry, color, alpha = 1) => g.fillStyle(color, alpha).fillEllipse(cx, cy, rx * 2, ry * 2),
    line: (x1, y1, x2, y2, color, width, alpha = 1) => g.lineStyle(width, color, alpha).lineBetween(x1, y1, x2, y2),
    poly: (points, color, alpha = 1) => g.fillStyle(color, alpha).fillPoints([...points], true),
    rounded: (x, y, w, h, r, color, alpha = 1) => g.fillStyle(color, alpha).fillRoundedRect(x, y, w, h, r),
  };
}
