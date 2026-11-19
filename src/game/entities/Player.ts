import * as Phaser from "phaser";
import { ABILITIES, PLAYER_BASE, xpToNext } from "../data/combatData";
// Synthesized sound effects (see audio/Sfx.ts)
import { sfx } from "../audio/Sfx";

// ─────────────────────────────────────────────────────────────
// PLAYER (the hero)
// Holds STATS and LOOKS. It does not decide when to attack or dash;
// systems (Combat, Movement) do that and tell the player what to do.
// WHY: "one job per file". Player = who you are. Systems = what you do.
// ─────────────────────────────────────────────────────────────

export type Power = "aura" | "courage" | "legacy";

export class Player {
  sprite: Phaser.Physics.Arcade.Sprite;
  locks: Phaser.GameObjects.Image; // separate image so the locks can sway on their own

  level = 1;
  xp = 0;
  maxHealth = PLAYER_BASE.health;
  health = PLAYER_BASE.health;
  facing = Math.PI / 2; // radians; PI/2 = facing down (toward the camera)

  invulnerableUntil = 0;
  auraUntil = 0;
  unlocked = new Set<Power>();

  constructor(private scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, "hero").setOrigin(0.5, 0.85);
    this.sprite.setCollideWorldBounds(true);
    // Small body at the feet = top-down "Zelda" collisions (head can overlap trees)
    this.sprite.body!.setSize(26, 16).setOffset(11, 50);

    this.locks = scene.add.image(x, y, "locks").setOrigin(0.5, 0.1);
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  get isInvulnerable() { return this.scene.time.now < this.invulnerableUntil; }
  get auraActive() { return this.scene.time.now < this.auraUntil; }

  /** Multiplies every hit. Leadership Aura adds +20%. */
  get damageMultiplier() { return this.auraActive ? 1 + ABILITIES.aura.damageBonus : 1; }
  get speed() { return PLAYER_BASE.speed * (this.auraActive ? 1 + ABILITIES.aura.speedBonus : 1); }

  /** Add XP and level up as many times as needed. Returns true if leveled. */
  gainXp(amount: number): boolean {
    this.xp += amount;
    let leveled = false;
    while (this.xp >= xpToNext(this.level)) {
      this.xp -= xpToNext(this.level);
      this.level++;
      this.maxHealth += 5;
      this.health = this.maxHealth;
      leveled = true;
    }
    return leveled;
  }

  takeDamage(amount: number): boolean {
    if (this.isInvulnerable) return false;
    this.health = Math.max(0, this.health - amount);
    this.invulnerableUntil = this.scene.time.now + 600; // brief mercy frames after a hit
    this.sprite.setTintFill(0xff4d4d);
    this.scene.time.delayedCall(90, () => this.sprite.clearTint());
    sfx.hurt();
    return true;
  }

  heal(amount: number) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  /** Called every frame: keeps the locks attached, swaying, and depth-sorted. */
  updateVisuals(time: number) {
    const s = this.sprite;
    const vx = s.body!.velocity.x;
    const moving = s.body!.velocity.length() > 10;

    if (Math.abs(vx) > 5) s.setFlipX(vx < 0);

    // Idle "breathing" vs running bob
    const bob = moving ? Math.sin(time / 70) * 2 : Math.sin(time / 400) * 1;
    s.setScale(1, 1 + (moving ? 0 : Math.sin(time / 400) * 0.015));

    // Locks: trail opposite to movement + gentle wind sway
    const wind = Math.sin(time / 500) * 4;
    const trail = Phaser.Math.Clamp(-vx * 0.05, -22, 22);
    this.locks
      .setPosition(s.x, s.y - 52 + bob)
      .setAngle(wind + trail + (this.auraActive ? Math.sin(time / 90) * 6 : 0))
      .setFlipX(s.flipX);

    // Depth by feet position: things lower on screen draw in front
    s.setDepth(s.y);
    this.locks.setDepth(s.y + 1);

    // Mercy-frame flicker
    s.setAlpha(this.isInvulnerable && !moving ? 0.6 + Math.sin(time / 30) * 0.3 : 1);
  }

  /** Points the hero toward a direction (used by movement and attacks). */
  face(vec: Phaser.Math.Vector2) {
    if (vec.lengthSq() > 0) this.facing = Math.atan2(vec.y, vec.x);
  }

  get facingVector() {
    return new Phaser.Math.Vector2(Math.cos(this.facing), Math.sin(this.facing));
  }

  /** Body + locks, so effects like after-images can copy the full look. */
  get parts(): Phaser.GameObjects.Image[] {
    return [this.sprite, this.locks];
  }
}
