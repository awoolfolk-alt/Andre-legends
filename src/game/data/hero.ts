// ─────────────────────────────────────────────────────────────
// HERO CUSTOMIZATION: who the player sees in the mirror.
//
// The player builds their hero on the /create page (name, gender,
// skin tone, hair, clothes). That choice is stored in the save file
// as `hero`, and BootScene draws the in-game sprite from it.
//
// THE BIG IDEA — one drawing, two canvases:
// The hero is drawn ONCE here, against a tiny "Painter" interface
// (rect, circle, line, ...). Two adapters implement that interface:
//   - BootScene wraps a Phaser Graphics object  -> the in-game sprite
//   - the /create page wraps a 2D <canvas>      -> the live preview
// Because both sides run THE SAME drawing code, the preview can never
// drift away from what the game shows. One source of truth.
//
// Everything stays code-drawn (no image files), so the pixel-Zelda
// style matches the rest of the game perfectly.
// ─────────────────────────────────────────────────────────────

import type { DialogueLine } from "./story";

export type Gender = "male" | "female";

/** The player's appearance choices. Indexes point into the lists below. */
export interface HeroConfig {
  gender: Gender;
  skin: number; // index into SKIN_TONES
  hairStyle: number; // index into HAIR_STYLES
  hairColor: number; // index into HAIR_COLORS
  clothes: number; // index into CLOTHES
}

/** Andre's own look — also the fallback for old saves made before
    customization existed (backward compatibility). */
export const DEFAULT_HERO: HeroConfig = {
  gender: "male",
  skin: 2, // Deep Bronze — Andre's tone
  hairStyle: 0, // Hero Locks
  hairColor: 0, // Midnight Black
  clothes: 0, // Royal Navy
};

// ── The options (8 each, so every player can find themselves) ────────

export interface SkinTone { name: string; color: number; shade: number }
export const SKIN_TONES: SkinTone[] = [
  { name: "Ebony", color: 0x3b2314, shade: 0x2a180d },
  { name: "Mahogany", color: 0x4e2f1b, shade: 0x3a2212 },
  { name: "Deep Bronze", color: 0x6b4226, shade: 0x523218 },
  { name: "Bronze", color: 0x8a5a33, shade: 0x6b4424 },
  { name: "Amber", color: 0xa9744c, shade: 0x875a38 },
  { name: "Sand", color: 0xc78e63, shade: 0xa06f4a },
  { name: "Ivory", color: 0xe0aa7e, shade: 0xbb8a5f },
  { name: "Pearl", color: 0xf3cdb0, shade: 0xd4ad8d },
];

export interface HairColor { name: string; color: number; shine: number }
export const HAIR_COLORS: HairColor[] = [
  { name: "Midnight Black", color: 0x1a1110, shine: 0x3b2a1c },
  { name: "Dark Brown", color: 0x3b2a1c, shine: 0x57402c },
  { name: "Chestnut", color: 0x6e4a2a, shine: 0x8f6538 },
  { name: "Golden Blonde", color: 0xd9a94e, shine: 0xf0cc7e },
  { name: "Auburn Flame", color: 0x8a3b22, shine: 0xb0552f },
  { name: "Crimson Red", color: 0xb43a2a, shine: 0xd95a41 },
  { name: "Silver Sage", color: 0x9aa0ad, shine: 0xc9cdd6 },
  { name: "Mystic Violet", color: 0x5e4a8a, shine: 0x8571b5 },
];

export interface Outfit { name: string; main: number; secondary: number }
export const CLOTHES: Outfit[] = [
  { name: "Royal Navy", main: 0x281426, secondary: 0x24375e }, // Andre's battle coat
  { name: "Crimson Guard", main: 0x4a1a1e, secondary: 0x6e2a30 },
  { name: "Emerald Ranger", main: 0x1d3d2b, secondary: 0x2b5540 },
  { name: "Royal Violet", main: 0x322348, secondary: 0x473363 },
  { name: "Golden Knight", main: 0x54401c, secondary: 0x6e5728 },
  { name: "Tidecaller Teal", main: 0x1a3d40, secondary: 0x275457 },
  { name: "Storm Silver", main: 0x333845, secondary: 0x495065 },
  { name: "Rose Dawn", main: 0x4d2433, secondary: 0x6b3448 },
];

export const HAIR_STYLE_NAMES = [
  "Hero Locks", // Andre's signature look
  "Short Crop",
  "Full Afro",
  "Warrior Braids",
  "High Ponytail",
  "Taper Fade",
  "Curly Crown",
  "Long Flow",
] as const;

export const GENDERS: { id: Gender; label: string }[] = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
];

/** Clamp every index into range, so a hand-edited or old save can
    never crash the drawing code. */
export function sanitizeHero(cfg: Partial<HeroConfig> | undefined): HeroConfig {
  const c = cfg ?? {};
  const pick = (n: unknown, max: number, fallback: number) =>
    typeof n === "number" && Number.isInteger(n) && n >= 0 && n < max ? n : fallback;
  return {
    gender: c.gender === "female" ? "female" : "male",
    skin: pick(c.skin, SKIN_TONES.length, DEFAULT_HERO.skin),
    hairStyle: pick(c.hairStyle, HAIR_STYLE_NAMES.length, DEFAULT_HERO.hairStyle),
    hairColor: pick(c.hairColor, HAIR_COLORS.length, DEFAULT_HERO.hairColor),
    clothes: pick(c.clothes, CLOTHES.length, DEFAULT_HERO.clothes),
  };
}

// ── The Painter: the smallest drawing language we need ───────────────
// Both renderers (Phaser in-game, <canvas> on the create page) speak it.

export interface Painter {
  rect(x: number, y: number, w: number, h: number, color: number, alpha?: number): void;
  circle(cx: number, cy: number, r: number, color: number, alpha?: number): void;
  ellipse(cx: number, cy: number, rx: number, ry: number, color: number, alpha?: number): void;
  line(x1: number, y1: number, x2: number, y2: number, color: number, width: number, alpha?: number): void;
  poly(points: readonly { x: number; y: number }[], color: number, alpha?: number): void;
  rounded(x: number, y: number, w: number, h: number, r: number, color: number, alpha?: number): void;
}

const GOLD = 0xd4a72c; // legacy gold — trim, belt, sword guard
const TECH = 0xc44a67; // future-tech shoulder glow (Andre's signature)

/** The hero's body in a 48×64 box — the SAME box the original "hero"
    texture used, so physics, origin and collisions never change. */
export function drawHeroBody(p: Painter, cfg: HeroConfig) {
  const skin = SKIN_TONES[cfg.skin];
  const outfit = CLOTHES[cfg.clothes];
  const female = cfg.gender === "female";

  p.ellipse(24, 59, 15, 4, 0x000000, 0.28); // shadow
  p.rect(16, 46, 6, 11, 0x14141c); // legs
  p.rect(26, 46, 6, 11, 0x14141c);
  p.rect(15, 55, 8, 4, 0x3a2a1a); // boots
  p.rect(25, 55, 8, 4, 0x3a2a1a);

  // sword hilt over the right shoulder (sword carried on the back)
  p.line(31, 26, 40, 6, 0xc9d3e0, 3);
  p.line(36, 13, 42, 15, GOLD, 4);

  // Battle coat. Female cut: narrower shoulders, fuller skirt flare.
  const coat = female
    ? [{ x: 15, y: 25 }, { x: 33, y: 25 }, { x: 42, y: 52 }, { x: 6, y: 52 }]
    : [{ x: 13, y: 25 }, { x: 35, y: 25 }, { x: 40, y: 52 }, { x: 8, y: 52 }];
  p.poly(coat, outfit.main);
  p.poly(
    female
      ? [{ x: 24, y: 27 }, { x: 33, y: 25 }, { x: 42, y: 52 }, { x: 26, y: 52 }]
      : [{ x: 24, y: 27 }, { x: 35, y: 25 }, { x: 40, y: 52 }, { x: 26, y: 52 }],
    outfit.secondary,
  );
  // gold trim down the front and along the hem
  p.line(24, 27, 24, 51, GOLD, 2);
  p.line(female ? 6 : 8, 51, female ? 42 : 40, 51, GOLD, 2);
  p.rect(13, 37, 22, 3, GOLD); // belt

  // arms + future-tech shoulder pads
  if (female) {
    p.rect(9, 30, 4, 11, skin.color);
    p.rect(35, 30, 4, 11, skin.color);
    p.rounded(8, 23, 10, 6, 3, TECH);
    p.rounded(30, 23, 10, 6, 3, TECH);
  } else {
    p.rect(7, 30, 5, 12, skin.color);
    p.rect(36, 30, 5, 12, skin.color);
    p.rounded(7, 23, 11, 7, 3, TECH);
    p.rounded(30, 23, 11, 7, 3, TECH);
  }

  // head + face
  p.circle(24, 17, 10, skin.color);
  p.circle(20, 18, 1.6, 0x111111); // eyes
  p.circle(28, 18, 1.6, 0x111111);
  if (female) {
    p.line(21, 23.5, 27, 23.5, 0x8a3b3b, 1.5); // softer smile
  } else {
    p.line(21, 23, 27, 23, skin.shade, 1.5); // determined mouth
  }
}

/** The hero's hair in a 44×40 box — the SAME box the original "locks"
    texture used, so the Player's sway/attachment math never changes.
    (In this box the head's center sits at about 22, 18.5, radius 10.) */
export function drawHeroHair(p: Painter, cfg: HeroConfig) {
  const hair = HAIR_COLORS[cfg.hairColor];
  const c = hair.color;
  const shine = hair.shine;

  switch (cfg.hairStyle) {
    case 0: {
      // Hero Locks — Andre's crown of locks with gold cuffs
      p.ellipse(22, 7, 13, 6, c);
      const strands: [number, number, number, number][] = [
        [10, 5, 6, 30], [13, 3, 9, 33], [16, 2, 12, 26],
        [34, 5, 38, 30], [31, 3, 35, 33], [28, 2, 32, 26],
      ];
      for (const [x1, y1, x2, y2] of strands) {
        p.line(x1, y1, x2, y2, c, 4.5);
        p.line(x1, y1 + 4, x2, y2 - 2, shine, 2);
        p.circle(x2, y2 - 6, 1.6, GOLD); // gold cuffs on the locks
      }
      p.rect(18, 3, 3, 2, shine);
      p.rect(24, 4, 3, 2, shine);
      break;
    }
    case 1: {
      // Short Crop — neat cap with a crisp hairline
      p.ellipse(22, 9, 11, 6, c);
      p.rect(11, 8, 22, 4, c);
      p.rect(15, 5, 14, 2, shine);
      p.line(12, 12, 32, 12, shine, 1);
      break;
    }
    case 2: {
      // Full Afro — bold rounded cloud
      p.circle(22, 7, 11, c);
      p.circle(12, 10, 6, c);
      p.circle(32, 10, 6, c);
      p.circle(17, 3, 5, shine);
      p.circle(27, 2, 4, shine, 0.7);
      p.rect(13, 12, 18, 3, c); // blends into the forehead line
      p.rect(16, 5, 2, 2, shine);
      p.rect(25, 4, 2, 2, shine);
      break;
    }
    case 3: {
      // Warrior Braids — thick roped strands with bands
      p.ellipse(22, 7, 12, 6, c);
      const braids: [number, number, number, number][] = [
        [11, 5, 7, 32], [16, 3, 13, 35], [28, 3, 31, 35], [33, 5, 37, 32],
      ];
      for (const [x1, y1, x2, y2] of braids) {
        p.line(x1, y1, x2, y2, c, 4.5);
        p.line(x1, y1 + 5, x2, y2 - 2, shine, 1);
        p.circle(x2, y2 - 4, 1.8, TECH); // tech bands on the braid tips
      }
      break;
    }
    case 4: {
      // High Ponytail — cap plus a tail that swings to the hero's left
      p.ellipse(22, 7, 11, 6, c);
      p.circle(31, 5, 3, TECH); // hair tie
      p.line(31, 6, 38, 26, c, 5);
      p.line(31, 8, 36, 24, shine, 2);
      p.circle(38, 27, 2.5, c);
      p.rect(17, 4, 4, 2, shine);
      p.rect(24, 5, 3, 2, shine);
      break;
    }
    case 5: {
      // Taper Fade — crisp textured top, closely tapered temples.
      p.poly([
        { x: 12, y: 12 }, { x: 13, y: 8 }, { x: 16, y: 5 },
        { x: 20, y: 4 }, { x: 25, y: 4 }, { x: 29, y: 6 },
        { x: 32, y: 9 }, { x: 33, y: 12 },
      ], c);
      p.rect(13, 12, 3, 4, c);
      p.rect(28, 12, 3, 4, c);
      p.rect(16, 7, 3, 2, shine);
      p.rect(21, 5, 3, 2, shine);
      p.rect(26, 7, 3, 2, shine);
      p.line(15, 13, 16, 16, shine, 1);
      p.line(29, 13, 28, 16, shine, 1);
      break;
    }
    case 6: {
      // Curly Crown — a lively cluster of curls on top
      p.ellipse(22, 9, 10, 5, c);
      const curls: [number, number][] = [
        [13, 7], [17, 4], [22, 3], [27, 4], [31, 7], [15, 10], [29, 10], [22, 6],
      ];
      for (const [x, y] of curls) p.circle(x, y, 3.2, c);
      p.rect(17, 2, 2, 2, shine);
      p.rect(25, 2, 2, 2, shine);
      p.rect(13, 8, 2, 2, shine);
      p.rect(29, 8, 2, 2, shine);
      break;
    }
    case 7: {
      // Long Flow — hair down both sides, past the shoulders
      p.ellipse(22, 7, 12, 6, c);
      p.line(12, 6, 8, 38, c, 5);
      p.line(32, 6, 36, 38, c, 5);
      p.line(14, 8, 11, 34, shine, 1.5);
      p.line(30, 8, 33, 34, shine, 1.5);
      p.line(22, 2, 22, 6, shine, 1.5); // center parting glint
      p.rect(16, 5, 3, 2, shine);
      p.rect(25, 5, 3, 2, shine);
      p.rect(9, 20, 2, 4, shine);
      p.rect(33, 25, 2, 4, shine);
      break;
    }
  }
}

// ── Name personalization ─────────────────────────────────────────────
// The story still walks through Andre's life, but the hero is addressed
// by the PLAYER's name. Two funnels use these: UIScene runs every
// dialogue line through personalizeLines, and RoomScene runs its wall
// plaques through personalizeText — so no scene has to think about it.

export function personalizeText(s: string, heroName: string): string {
  const name = heroName.trim();
  if (!name || name === "Andre") return s;
  // Order matters, longest first:
  //   1. "Andre Woolfolk" -> the name exactly as typed (first, or first+last)
  //   2. "Andre" alone    -> same thing (the player IS Andre in the story)
  //   3. "Woolfolk" alone -> the player's last word (their surname),
  //      or their single name if they only gave a first name.
  // So "Maya" gives "the path of Maya", and "Maya Jones" gives
  // "the path of Maya Jones" — never "Maya Jones Woolfolk".
  const surname = name.split(/\s+/).pop()!;
  return s
    .replace(/\bAndre Woolfolk\b/g, name)
    .replace(/\bAndre\b/g, name)
    .replace(/\bWoolfolk\b/g, surname);
}

export function personalizeLines(
  lines: readonly DialogueLine[],
  heroName: string,
): DialogueLine[] {
  const name = heroName.trim();
  if (!name || name === "Andre") return [...lines];
  return lines.map((l) => ({
    ...l,
    speaker: personalizeText(l.speaker, name),
    text: personalizeText(l.text, name),
  }));
}
