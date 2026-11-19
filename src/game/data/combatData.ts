// ─────────────────────────────────────────────────────────────
// COMBAT NUMBERS
// All damage + timing values in one place ("tuning table").
// WHY: game feel is tuned by changing numbers, not logic.
// If the combo feels slow, change BASIC_TIMING, not Combat.ts.
//
// Combat.ts imports these values and uses them. Want the hero to hit harder,
// dash farther, or swing faster? Change a number here and reload the game.
// ─────────────────────────────────────────────────────────────

/** Basic attack (N): 45 at level 1, 65 at level 5, and 85 at level 10+. */
// This is an "if-ladder": it checks from the HIGHEST level down and returns
// at the first match. Checking from the top down matters: level 12 is also
// >= 5, so if we checked ">= 5" first, a level 12 hero would only deal 65.
export function basicDamage(level: number): number {
  if (level >= 10) return 85;
  if (level >= 5) return 65;
  return 45;
}

/** Thief companion's automatic basic strike: 25 | 35 | 45 | 55 by level. */
export function thiefBasicDamage(level: number): number {
  if (level >= 15) return 55;
  if (level >= 10) return 45;
  if (level >= 5) return 35;
  return 25;
}

/** Each strike in the heavy attack (M) deals 55 damage before bonuses. */
export const HEAVY_STRIKE_DAMAGE = 55;

// Timings in milliseconds (1000ms = 1 second). Every swing goes through
// 3 phases in order:
//   startup  -> the sword is moving into position; no damage yet
//   active   -> the moment the sword can actually hit enemies
//   recovery -> the hero finishes the swing; a new attack can't start fresh
//               yet, but pressing N here continues the combo to the next slash
export const BASIC_TIMING = {
  startup: 60,
  active: 90,
  recovery: 140,
  finisherRecovery: 260, // after slash #3 the combo resets with a longer pause
  // comboWindow: after a slash ends, you have this long to press N again and get
  // the next slash (left -> right -> left). Wait longer and the combo restarts.
  comboWindow: 320,
  // bufferWindow: if you press N a little too early (mid-swing), the game
  // remembers the press for this long and fires it as soon as it's allowed.
  // This makes the controls feel responsive instead of "eating" your presses.
  bufferWindow: 200,
};

// The heavy attack is two parts: an overhead slam, then an upward slash.
export const HEAVY_TIMING = {
  raise: 300, // the "pause" with the sword overhead (telegraph)
  slamHold: 170, // gap between the overhead hit and the upward slash
  upward: 110, // how long the upward slash is active
  recovery: 360, // longer than basic recovery: heavy attacks leave you open
};

// Hitboxes: the area in front of the hero where a swing can hit.
// range = how far it reaches (in pixels). arcDeg = how wide the swing is.
// 360 means a full circle, so Courage Strike hits everything around the hero.
export const HITBOX = {
  basic: { range: 78, arcDeg: 130 },
  overhead: { range: 92, arcDeg: 150 },
  upward: { range: 86, arcDeg: 90 },
  courage: { range: 60, arcDeg: 360 },
};

// Dash (SHIFT): a quick burst forward with after-images.
// invulnerable = the hero can't be hurt for this long ("i-frames").
export const DASH = {
  speed: 900,
  duration: 160,
  invulnerable: 250, // 0.25s i-frames
  cooldown: 1500,
};

// Powers unlocked through the story.
// courage (Q): dash through an enemy and slash. Unlocked by the Empire Revenant.
// aura (E): Leadership Aura. +20% damage, +15% speed, 3 HP/s for 10s.
//   Unlocked by the Nike Nightstalker.
// legacy (R): Legacy Surge, a golden nova that hits everything nearby.
//   Unlocked by meeting the Future Self in the Future Kingdom.
export const ABILITIES = {
  courage: { cooldown: 6000, distance: 220, multiplier: 2 }, // 2x basic damage
  aura: { cooldown: 18000, duration: 10000, damageBonus: 0.2, speedBonus: 0.15, regenPerSec: 3 },
  // radius = how far the nova reaches, multiplier = times (2x basic) damage.
  legacy: { cooldown: 20000, radius: 260, multiplier: 1.5, recovery: 500 },
};

// The hero's starting health and walking speed (pixels per second).
export const PLAYER_BASE = { health: 100, speed: 220 };

// MAX POWER: at this level the Tracking Laser holds the most shots and the
// zombie waves arrive faster, so the endgame keeps a little bite.
export const MAX_POWER_LEVEL = 15;
export const ZOMBIE_WAVES = {
  count: 11,
  normalInterval: 45_000,
  maxPowerInterval: 25_000,
};

export function zombieWaveInterval(level: number): number {
  return level >= MAX_POWER_LEVEL
    ? ZOMBIE_WAVES.maxPowerInterval
    : ZOMBIE_WAVES.normalInterval;
}

// How much XP is needed to reach the next level. It grows by 20 each level,
// so level 1 needs 100 XP, level 2 needs 120, and so on.
export const xpToNext = (level: number) => 80 + level * 20;
