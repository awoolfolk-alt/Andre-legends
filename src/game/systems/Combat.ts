import * as Phaser from "phaser";
import { Player } from "../entities/Player";
import { Damageable } from "../entities/Damageable";
import { CombatInput } from "./CombatInput";
import { slashArc, shockwave, verticalSlash } from "../effects/SlashFX";
import { spawnAfterImage } from "../effects/AfterImage";
// The floating numbers that pop out of whatever the sword hits
import { spawnDamageNumber } from "../effects/DamageNumbers";
// Screen-wide shader flashes for the biggest moments (Legacy Surge)
import { ScreenFX } from "../effects/ScreenFX";
// All sound effects (synthesized; see audio/Sfx.ts)
import { sfx } from "../audio/Sfx";
import {
  ABILITIES, BASIC_TIMING, HEAVY_STRIKE_DAMAGE, HEAVY_TIMING, HITBOX, basicDamage,
} from "../data/combatData";
import { EventBus, EVT } from "./EventBus";

// ─────────────────────────────────────────────────────────────
// COMBAT SYSTEM: a "state machine".
// The hero is always in exactly ONE state:
//   idle → basic (startup → active → recovery) → idle
//   idle → heavy (raise → overhead → upward → recovery) → idle
// WHY a state machine? It answers "can I do X right now?" in one
// place. Without it you get bugs like attacking while dashing or
// starting two combos at once.
//
// Every attack has 3 phases (the language of action games):
//   STARTUP  = wind-up, no damage yet (lets enemies/players read it)
//   ACTIVE   = the hit happens
//   RECOVERY = can't move freely, BUT can chain into the next attack
// ─────────────────────────────────────────────────────────────

type State = "idle" | "basic" | "heavy" | "courage";
type Phase = "startup" | "active" | "recovery";

// Basic combo directions relative to where the hero faces:
// slash 1 left→right, slash 2 right→left, slash 3 left→right.
const COMBO_ARCS: [number, number][] = [
  [-70, 70],
  [70, -70],
  [-80, 80],
];

const BLUE = 0x4fd1ff;
const GOLD = 0xffd75e;

export class CombatSystem {
  state: State = "idle";
  phase: Phase = "recovery";
  comboIndex = 0; // which slash comes next (0, 1, 2)
  private lastAttackEnd = -9999;
  private attackId = 0; // bumps on every new attack; stale timers check it and quit
  private cooldownUntil: Record<"courage" | "aura" | "legacy", number> = { courage: 0, aura: 0, legacy: 0 };

  constructor(
    private scene: Phaser.Scene,
    private player: Player,
    private input: CombatInput,
    private getTargets: () => Damageable[],
  ) {
    input.on("basic", () => this.requestBasic());
    input.on("heavy", () => this.requestHeavy());
    input.on("courage", () => this.requestCourage());
    input.on("aura", () => this.requestAura());
    input.on("legacy", () => this.requestLegacy());
  }

  /** True while an attack controls the hero's movement. */
  get busy() { return this.state !== "idle"; }

  /** Dash may interrupt an attack only during recovery (or when idle). */
  get canCancel() { return this.state === "idle" || this.phase === "recovery"; }

  cancel() {
    this.attackId++; // invalidates every pending timer from the old attack
    this.state = "idle";
    this.lastAttackEnd = this.scene.time.now;
  }

  cooldownRemaining(which: "courage" | "aura" | "legacy") {
    return Math.max(0, this.cooldownUntil[which] - this.scene.time.now);
  }

  // ── BASIC ATTACK (N) ─────────────────────────────────────────
  requestBasic() {
    const now = this.scene.time.now;
    if (this.state === "idle") {
      // Waited too long since the last slash? The combo starts over.
      if (now - this.lastAttackEnd > BASIC_TIMING.comboWindow) this.comboIndex = 0;
      this.startSlash(this.comboIndex);
    } else if (this.state === "basic" && this.phase === "recovery" && this.comboIndex < 3) {
      this.startSlash(this.comboIndex); // chain straight into the next slash
    }
    // Otherwise we're busy. CombatInput remembered the press time, and
    // checkBuffer() will use it when recovery starts.
  }

  private startSlash(index: number) {
    const id = ++this.attackId;
    this.state = "basic";
    this.phase = "startup";
    this.input.consume("basic");

    // Small forward step: "plants his feet and attacks with confidence"
    const step = this.player.facingVector.scale(110);
    this.player.sprite.setVelocity(step.x, step.y);

    this.after(BASIC_TIMING.startup, id, () => {
      this.phase = "active";
      const [from, to] = COMBO_ARCS[index];
      const isFinisher = index === 2;
      slashArc(this.scene, this.player.x, this.player.y - 24, this.player.facing, from, to, isFinisher ? 62 : 54, BLUE, isFinisher ? 12 : 9);

      const dmg = Math.round(basicDamage(this.player.level) * this.player.damageMultiplier);
      sfx.slash();
      const hits = this.hitTargets(HITBOX.basic.range, HITBOX.basic.arcDeg, dmg, { heavy: false });
      if (hits > 0) {
        this.scene.cameras.main.shake(70, isFinisher ? 0.006 : 0.003);
        sfx.hit(false);
      }

      this.after(BASIC_TIMING.active, id, () => {
        this.phase = "recovery";
        this.comboIndex = index + 1;
        if (this.checkBuffer()) return; // a buffered press chained into the next attack

        const recovery = isFinisher ? BASIC_TIMING.finisherRecovery : BASIC_TIMING.recovery;
        this.after(recovery, id, () => {
          this.state = "idle";
          this.lastAttackEnd = this.scene.time.now;
          if (this.comboIndex >= 3) this.comboIndex = 0;
        });
      });
    });
  }

  /** Uses a press that arrived too early. Returns true if it started something. */
  private checkBuffer(): boolean {
    if (this.input.wasPressedWithin("heavy", BASIC_TIMING.bufferWindow)) {
      this.startHeavy();
      return true;
    }
    if (this.comboIndex < 3 && this.input.wasPressedWithin("basic", BASIC_TIMING.bufferWindow)) {
      this.startSlash(this.comboIndex);
      return true;
    }
    return false;
  }

  // ── HEAVY ATTACK (M / LEFT CLICK) ──────────────────────────
  // Part 1: overhead slash (raise → pause → slam, wide arc)
  // Part 2: upward slash (launches the target)
  requestHeavy() {
    if (this.state === "idle" || (this.state === "basic" && this.phase === "recovery")) this.startHeavy();
  }

  private startHeavy() {
    const id = ++this.attackId;
    this.state = "heavy";
    this.phase = "startup";
    this.input.consume("heavy");
    this.input.consume("basic");
    this.comboIndex = 0;
    this.player.sprite.setVelocity(0, 0);

    // RAISE: the telegraph. A golden glint above the hero = "big hit coming".
    const glint = this.scene.add.image(this.player.x, this.player.y - 80, "spark").setScale(0.5).setTint(GOLD)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(99990);
    this.scene.tweens.add({ targets: glint, scale: 3, alpha: 0, duration: HEAVY_TIMING.raise, onComplete: () => glint.destroy() });
    this.scene.tweens.add({ targets: this.player.sprite, scaleY: 1.08, yoyo: true, duration: HEAVY_TIMING.raise / 2 });

    const strikeDamage = Math.round(HEAVY_STRIKE_DAMAGE * this.player.damageMultiplier);
    sfx.heavyRaise();

    this.after(HEAVY_TIMING.raise, id, () => {
      // PART 1: OVERHEAD SLAM
      this.phase = "active";
      const tip = this.player.facingVector.scale(40);
      verticalSlash(this.scene, this.player.x, this.player.y - 20, this.player.facing, false, BLUE);
      shockwave(this.scene, this.player.x + tip.x, this.player.y + tip.y, BLUE);
      this.scene.cameras.main.shake(120, 0.01);
      sfx.heavySlam();
      this.hitTargets(HITBOX.overhead.range, HITBOX.overhead.arcDeg, strikeDamage, { heavy: true });

      this.after(HEAVY_TIMING.slamHold, id, () => {
        // PART 2: UPWARD SLASH
        verticalSlash(this.scene, this.player.x, this.player.y - 20, this.player.facing, true, GOLD);
        this.scene.cameras.main.shake(80, 0.005);
        this.hitTargets(HITBOX.upward.range, HITBOX.upward.arcDeg, strikeDamage, { heavy: true, launch: true });

        this.after(HEAVY_TIMING.upward, id, () => {
          this.phase = "recovery";
          this.after(HEAVY_TIMING.recovery, id, () => {
            this.state = "idle";
            this.lastAttackEnd = this.scene.time.now;
          });
        });
      });
    });
  }

  // ── COURAGE STRIKE (Q): unlocked by defeating the Empire Revenant ──
  requestCourage() {
    if (!this.player.unlocked.has("courage")) return this.toast("Locked. Learn the lesson of the Empire Revenant.");
    if (!this.canCancel) return;
    const cd = this.cooldownRemaining("courage");
    if (cd > 0) return this.toast(`Courage Strike ready in ${(cd / 1000).toFixed(1)}s`);

    const id = ++this.attackId;
    this.state = "courage";
    this.phase = "active";
    this.cooldownUntil.courage = this.scene.time.now + ABILITIES.courage.cooldown;
    this.player.invulnerableUntil = this.scene.time.now + 300;
    sfx.courage();

    const start = new Phaser.Math.Vector2(this.player.x, this.player.y);
    const dir = this.player.facingVector;
    const end = start.clone().add(dir.clone().scale(ABILITIES.courage.distance));
    const bounds = this.scene.physics.world.bounds;
    end.x = Phaser.Math.Clamp(end.x, bounds.left + 30, bounds.right - 30);
    end.y = Phaser.Math.Clamp(end.y, bounds.top + 60, bounds.bottom - 10);
    this.player.sprite.setVelocity(0, 0);
    const dmg = Math.round(basicDamage(this.player.level) * ABILITIES.courage.multiplier * this.player.damageMultiplier);

    // Blink through: leave a line of ghosts, appear at the end
    for (let i = 0; i <= 5; i++) {
      this.scene.time.delayedCall(i * 18, () => spawnAfterImage(this.scene, this.player.parts, BLUE, 0.6, 320));
    }
    this.scene.tweens.add({
      targets: this.player.sprite, x: end.x, y: end.y, duration: 110, ease: "Cubic.easeOut",
      onComplete: () => {
        if (id !== this.attackId) return;
        this.scene.cameras.main.zoomTo(1.08, 80, "Linear", true);
        this.scene.time.delayedCall(160, () => this.scene.cameras.main.zoomTo(1, 200));
        slashArc(this.scene, end.x, end.y - 24, this.player.facing + Math.PI, -100, 100, 70, BLUE, 14, 120);
        // Hit everything along the path
        const line = new Phaser.Geom.Line(start.x, start.y, end.x, end.y);
        for (const t of this.getTargets()) {
          if (!t.alive) continue;
          const nearest = Phaser.Geom.Line.GetNearestPoint(line, new Phaser.Geom.Point(t.x, t.y));
          if (Phaser.Math.Distance.Between(nearest.x, nearest.y, t.x, t.y) <= HITBOX.courage.range + t.radius) {
            t.takeHit({ damage: dmg, from: start, heavy: true });
          }
        }
        this.scene.cameras.main.shake(100, 0.008);
        this.after(200, id, () => { this.state = "idle"; this.lastAttackEnd = this.scene.time.now; });
      },
    });
  }

  // ── LEADERSHIP AURA (E): unlocked by defeating the Nike Nightstalker ──
  requestAura() {
    if (!this.player.unlocked.has("aura")) return this.toast("Locked. Learn the lesson of the Nike Nightstalker.");
    const cd = this.cooldownRemaining("aura");
    if (cd > 0) return this.toast(`Leadership Aura ready in ${(cd / 1000).toFixed(1)}s`);
    this.cooldownUntil.aura = this.scene.time.now + ABILITIES.aura.cooldown;
    this.player.auraUntil = this.scene.time.now + ABILITIES.aura.duration;
    sfx.aura();

    const ring = this.scene.add.circle(this.player.x, this.player.y - 20, 20).setStrokeStyle(5, GOLD).setDepth(99990);
    this.scene.tweens.add({ targets: ring, radius: 140, alpha: 0, duration: 500, onComplete: () => ring.destroy() });
    const em = this.scene.add.particles(0, 0, "spark", {
      follow: this.player.sprite, followOffset: { x: 0, y: -20 },
      speedY: { min: -120, max: -40 }, speedX: { min: -30, max: 30 },
      lifespan: 700, frequency: 40, scale: { start: 0.8, end: 0 }, tint: GOLD, blendMode: "ADD",
      emitZone: { type: "random", source: new Phaser.Geom.Circle(0, 0, 26) } as Phaser.Types.GameObjects.Particles.ParticleEmitterRandomZoneConfig,
    }).setDepth(99989);
    this.scene.time.delayedCall(ABILITIES.aura.duration, () => em.destroy());
    this.toast("Leadership Aura: you and your allies gain +20% damage, faster movement, and regeneration");
  }

  // ── LEGACY SURGE (R): unlocked by meeting the Future Self ──
  // A golden nova that bursts out in every direction, hitting ALL nearby
  // enemies. Story meaning: everything Andre has learned, given back at
  // once — a surge meant to lift a whole neighborhood.
  requestLegacy() {
    if (!this.player.unlocked.has("legacy")) return this.toast("Legacy Surge is sealed. It awakens in the Future Kingdom, built to lift a whole neighborhood.");
    if (!this.canCancel) return;
    const cd = this.cooldownRemaining("legacy");
    if (cd > 0) return this.toast(`Legacy Surge ready in ${(cd / 1000).toFixed(1)}s`);

    const id = ++this.attackId;
    this.state = "courage"; // reuse the "special move" state: body is committed briefly
    this.phase = "active";
    this.cooldownUntil.legacy = this.scene.time.now + ABILITIES.legacy.cooldown;
    // A short moment of invulnerability while the surge charges
    this.player.invulnerableUntil = this.scene.time.now + 400;
    this.player.sprite.setVelocity(0, 0);
    sfx.gate(); // a slow golden shimmer: the sound of the future opening

    const cx = this.player.x;
    const cy = this.player.y - 20;
    // Three golden rings expanding one after another, like ripples of impact
    for (let i = 0; i < 3; i++) {
      this.scene.time.delayedCall(i * 90, () => {
        if (id !== this.attackId) return;
        const ring = this.scene.add.circle(cx, cy, 30).setStrokeStyle(6 - i, GOLD, 0.9).setDepth(99990)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.scene.tweens.add({ targets: ring, radius: ABILITIES.legacy.radius, alpha: 0, duration: 420, ease: "Cubic.easeOut", onComplete: () => ring.destroy() });
      });
    }
    // Golden flash + bloom: the biggest moment the hero can create
    this.scene.cameras.main.flash(250, 255, 233, 168);
    this.scene.cameras.main.shake(200, 0.01);
    ScreenFX.for(this.scene).bloomPulse(1.6, 600);

    // The hit lands as the first ring reaches full size.
    // Damage = (2x basic) times the legacy multiplier, plus any Aura bonus.
    this.after(220, id, () => {
      const dmg = Math.round(basicDamage(this.player.level) * 2 * ABILITIES.legacy.multiplier * this.player.damageMultiplier);
      // Hit EVERYTHING within the radius, in every direction (360 degrees)
      const hits = this.hitTargets(ABILITIES.legacy.radius, 360, dmg, { heavy: true, launch: true });
      if (hits > 0) this.scene.cameras.main.shake(120, 0.008);
      this.after(ABILITIES.legacy.recovery, id, () => {
        this.state = "idle";
        this.lastAttackEnd = this.scene.time.now;
      });
    });
  }

  // ── HIT DETECTION ────────────────────────────────────────────
  // A target is hit if it's within range AND inside the slash's arc
  // (a cone in front of the hero). Returns how many targets were hit.
  private hitTargets(range: number, arcDeg: number, damage: number, opts: { heavy: boolean; launch?: boolean }) {
    const origin = new Phaser.Math.Vector2(this.player.x, this.player.y - 10);
    let hits = 0;
    for (const t of this.getTargets()) {
      if (!t.alive) continue;
      const dist = Phaser.Math.Distance.Between(origin.x, origin.y, t.x, t.y - 10);
      if (dist > range + t.radius) continue;
      const angleTo = Math.atan2(t.y - 10 - origin.y, t.x - origin.x);
      const diff = Math.abs(Phaser.Math.Angle.Wrap(angleTo - this.player.facing));
      if (dist > t.radius && diff > Phaser.Math.DegToRad(arcDeg / 2)) continue;
      t.takeHit({ damage, from: origin, heavy: opts.heavy, launch: opts.launch });
      spawnDamageNumber(this.scene, t.x, t.y - 30, damage, { heavy: opts.heavy });
      hits++;
    }
    return hits;
  }

  /** delayedCall that silently skips if a newer attack (or a dash) replaced this one. */
  private after(ms: number, id: number, fn: () => void) {
    this.scene.time.delayedCall(ms, () => { if (id === this.attackId) fn(); });
  }

  private toast(msg: string) {
    EventBus.emit(EVT.toast, msg);
  }
}
