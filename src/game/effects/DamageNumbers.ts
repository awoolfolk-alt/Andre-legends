import * as Phaser from "phaser";

// ─────────────────────────────────────────────────────────────
// DAMAGE NUMBERS: the little numbers that pop out of an enemy when
// your sword connects ("25", "65!"). They make every hit feel counted.
//
// WHY a pool? Fights spawn dozens of these per minute. Instead of
// creating and destroying text objects (which causes stutters), we
// keep a small pile of reusable ones and recycle them (same idea as
// the after-image pool in effects/Pool.ts).
// ─────────────────────────────────────────────────────────────

// One pooled text object plus the time it becomes free again.
interface Pooled {
  text: Phaser.GameObjects.Text;
  busyUntil: number;
}

// One pool per scene. A Map is a lookup table: scene -> its pool.
// (When you leave /game and come back, the new scene gets a fresh pool.)
const pools = new Map<string, Pooled[]>();

// How many numbers can be on screen at once per scene. 12 is plenty;
// the oldest one gets stolen if we ever run out.
const POOL_SIZE = 12;

/**
 * Pop a damage number at (x, y).
 * tint: a CSS color. White-blue = normal hit, gold = heavy/finisher,
 * red = damage TO the hero (so the player reads the difference instantly).
 */
export function spawnDamageNumber(
  scene: Phaser.Scene,
  x: number,
  y: number,
  amount: number,
  opts: { heavy?: boolean; playerHurt?: boolean } = {},
) {
  // Find (or start) this scene's pool. "??" = use the right side if the left is missing.
  const key = scene.scene.key;
  let pool = pools.get(key);
  if (!pool) {
    pool = [];
    pools.set(key, pool);
    // When the scene shuts down, throw its pool away so nothing leaks.
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => pools.delete(key));
  }

  const now = scene.time.now;
  // Find a free number, or steal the oldest one if all are busy.
  let slot = pool.find((p) => now >= p.busyUntil);
  if (!slot) {
    if (pool.length < POOL_SIZE) {
      // Pool not full yet: make a new text object and add it to the pool.
      const text = scene.add
        .text(0, 0, "", {
          fontFamily: "Cinzel, Georgia, serif",
          fontSize: "20px",
          color: "#cfe8ff",
          stroke: "#000000",
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(99995) // above the world, under the dialogue box
        .setVisible(false);
      slot = { text, busyUntil: 0 };
      pool.push(slot);
    } else {
      // All busy: reuse whichever has been flying the longest.
      slot = pool.reduce((oldest, p) => (p.busyUntil < oldest.busyUntil ? p : oldest));
      scene.tweens.killTweensOf(slot.text);
    }
  }

  // Dress it up: heavy hits are bigger and gold; hero damage is red.
  const color = opts.playerHurt ? "#ff7b7b" : opts.heavy ? "#ffd75e" : "#cfe8ff";
  slot.text
    .setText(String(Math.round(amount)))
    .setColor(color)
    .setFontSize(opts.heavy ? 26 : 19)
    .setPosition(x + Phaser.Math.Between(-10, 10), y)
    .setAlpha(1)
    .setScale(0.6)
    .setVisible(true);

  // Reserve the slot for the length of the animation
  slot.busyUntil = now + 650;

  // The motion: "pop" big, then float upward and fade away.
  scene.tweens.add({ targets: slot.text, scale: 1, duration: 120, ease: "Back.easeOut" });
  scene.tweens.add({
    targets: slot.text,
    y: y - 46,
    alpha: 0,
    duration: 520,
    delay: 120,
    ease: "Sine.easeIn",
    onComplete: () => slot!.text.setVisible(false),
  });
}
