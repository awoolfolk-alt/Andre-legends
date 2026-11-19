import * as Phaser from "phaser";
import { Damageable, HitInfo } from "./Damageable";
import { Player } from "./Player";
import { shockwave, sparks } from "../effects/SlashFX";
import { clampToWorld, isInsideSafeZone, isWithinWorld } from "../systems/WorldRules";

// ─────────────────────────────────────────────────────────────
// BOSS = a LESSON LEARNED.
// One Boss class, many bosses. Each boss is just a CONFIG object
// (name, health, attack pattern). WHY: to add a new life lesson as a
// boss later, you write data, not a new class.
// ─────────────────────────────────────────────────────────────

export type BossPattern = "slam" | "barrage" | "legacy";

export interface BossConfig {
  id: "empire" | "nike" | "self";
  name: string;
  texture: string;
  maxHp: number;
  color: number;
  pattern: BossPattern;
  attackEvery: number; // ms between attacks
  moveSpeed: number;
  xpReward: number;
}

type BossState = "dormant" | "fighting" | "defeated";

interface Projectile { obj: Phaser.GameObjects.Text; vx: number; vy: number; born: number; }

export class Boss implements Damageable {
  sprite: Phaser.GameObjects.Image;
  hp: number;
  radius = 44;
  state: BossState = "dormant";
  private nextAttackAt = 0;
  private shieldUntil = 0;
  private tauntUntil = 0;
  private tauntTarget: Phaser.GameObjects.Image | null = null;
  private projectiles: Projectile[] = [];
  private home: Phaser.Math.Vector2;

  constructor(
    private scene: Phaser.Scene,
    public cfg: BossConfig,
    x: number,
    y: number,
    private player: Player,
    private onPlayerHit: (dmg: number) => void,
    private onDefeated: (boss: Boss) => void,
  ) {
    this.hp = cfg.maxHp;
    this.home = new Phaser.Math.Vector2(x, y);
    this.sprite = scene.add.image(x, y, cfg.texture).setOrigin(0.5, 0.9).setDepth(y);
    this.sprite.setVisible(cfg.id === "empire");
    // Dormant bosses breathe slowly so players notice them
    scene.tweens.add({ targets: this.sprite, scaleY: 1.04, yoyo: true, repeat: -1, duration: 900, ease: "Sine.easeInOut" });
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }
  get alive() { return this.state === "fighting"; }
  isTaunting(time = this.scene.time.now) {
    return time < this.tauntUntil && Boolean(this.tauntTarget?.active && this.tauntTarget.visible);
  }

  taunt(target: Phaser.GameObjects.Image, duration: number) {
    this.tauntTarget = target;
    this.tauntUntil = this.scene.time.now + duration;
  }

  start() {
    this.state = "fighting";
    this.nextAttackAt = this.scene.time.now + 1200;
  }

  activate() {
    if (this.state !== "dormant" || this.sprite.visible) return;
    this.sprite.setVisible(true).setAlpha(0).setScale(0.45);
    this.scene.tweens.add({ targets: this.sprite, alpha: 1, scale: 1, duration: 700, ease: "Back.easeOut" });
  }

  /** Called when the player falls: boss heals and waits again. */
  reset() {
    this.state = "dormant";
    this.hp = this.cfg.maxHp;
    this.shieldUntil = 0;
    this.tauntUntil = 0;
    this.tauntTarget = null;
    this.sprite.setPosition(this.home.x, this.home.y).setAlpha(1);
    this.projectiles.forEach((p) => p.obj.destroy());
    this.projectiles = [];
  }

  takeHit(hit: HitInfo) {
    if (this.state !== "fighting") return;
    const damage = this.scene.time.now < this.shieldUntil ? Math.ceil(hit.damage * 0.45) : hit.damage;
    this.hp = Math.max(0, this.hp - damage);
    // Damage numbers come from the Combat system (single source); sparks stay local.
    sparks(this.scene, this.x, this.y - 50, hit.heavy ? 0xffd75e : 0x4fd1ff);
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => this.sprite.clearTint());
    if (hit.launch) {
      const liftY = clampToWorld(this.x, this.y - 20, this.radius).y;
      this.scene.tweens.add({ targets: this.sprite, y: liftY, yoyo: true, duration: 150 });
    }

    if (this.hp <= 0) this.defeat();
  }

  private defeat() {
    this.state = "defeated";
    this.projectiles.forEach((p) => p.obj.destroy());
    this.projectiles = [];
    this.scene.cameras.main.flash(400, 255, 230, 160);
    this.scene.tweens.add({ targets: this.sprite, alpha: 0, scale: 1.4, angle: 8, duration: 900, ease: "Cubic.easeIn" });
    this.onDefeated(this);
  }

  update(time: number) {
    // Move projectiles even between attacks
    this.updateProjectiles(time);
    if (this.state !== "fighting") return;

    const target = this.getAttackTarget(time);
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const enraged = this.hp < this.cfg.maxHp / 2; // phase 2 at half health
    if (isInsideSafeZone(this.player.x, this.player.y)) return;

    // Slow chase (barrage boss keeps its distance instead)
    const wantClose = this.cfg.pattern !== "barrage";
    if ((wantClose && dist > 70) || (!wantClose && Math.abs(dist - 260) > 30)) {
      const sign = wantClose || dist > 260 ? 1 : -1;
      const step = (this.cfg.moveSpeed * sign * this.scene.game.loop.delta) / 1000;
      const next = clampToWorld(this.x + (dx / dist) * step, this.y + (dy / dist) * step, this.radius);
      if (!isInsideSafeZone(next.x, next.y)) this.sprite.setPosition(next.x, next.y);
    }
    this.sprite.setDepth(this.y).setFlipX(dx < 0);

    // Touching the boss hurts
    if (dist < this.radius + 14) this.onPlayerHit(8);

    if (time >= this.nextAttackAt) {
      this.nextAttackAt = time + this.cfg.attackEvery * (enraged ? 0.75 : 1);
      if (this.cfg.pattern === "slam") this.slamAttack(enraged, target);
      else if (this.cfg.pattern === "barrage") this.barrageAttack(enraged, target);
      else this.legacyAttack(enraged, target);
    }
  }

  private getAttackTarget(time = this.scene.time.now) {
    if (this.isTaunting(time) && this.tauntTarget) {
      return { x: this.tauntTarget.x, y: this.tauntTarget.y };
    }
    return { x: this.player.x, y: this.player.y };
  }

  // The Empire Warden and dark Andre mark a dangerous area before striking.
  // Phase 2: drops extra weights around you ("more and more tasks").
  private slamAttack(enraged: boolean, target: { x: number; y: number }) {
    const targets = [new Phaser.Math.Vector2(target.x, target.y)];
    if (enraged) {
      for (let i = 0; i < 3; i++) {
        const a = (Math.PI * 2 * i) / 3 + Math.random();
        targets.push(new Phaser.Math.Vector2(target.x + Math.cos(a) * 120, target.y + Math.sin(a) * 90));
      }
    }
    for (const t of targets) {
      const warn = this.scene.add.ellipse(t.x, t.y, 20, 14, 0xff3b3b, 0.25).setStrokeStyle(3, 0xff3b3b, 0.9).setDepth(1);
      const label = this.scene.add.text(t.x, t.y - 10, "BURDEN", { fontFamily: "Georgia", fontSize: "14px", color: "#ffb3b3", stroke: "#000", strokeThickness: 3 })
        .setOrigin(0.5).setDepth(99990);
      this.scene.tweens.add({ targets: warn, width: 180, height: 120, duration: 900, ease: "Quad.easeOut" });
      this.scene.time.delayedCall(950, () => {
        warn.destroy(); label.destroy();
        if (this.state !== "fighting") return;
        shockwave(this.scene, t.x, t.y, 0xff6b6b, 100);
        this.scene.cameras.main.shake(120, 0.006);
        const liveTarget = this.getAttackTarget();
        const inside = ((liveTarget.x - t.x) / 90) ** 2 + ((liveTarget.y - t.y) / 60) ** 2 <= 1;
        if (inside) this.onPlayerHit(18);
      });
    }
  }

  // THE CRIMSON ORACLE: fires blood-red projectiles in readable spreads.
  private barrageAttack(enraged: boolean, target: { x: number; y: number }) {
    const base = Math.atan2(target.y - (this.y - 40), target.x - this.x);
    const count = enraged ? 12 : 5;
    const spread = enraged ? Math.PI * 2 : Phaser.Math.DegToRad(60);
    this.scene.tweens.add({ targets: this.sprite, scaleX: 1.12, yoyo: true, duration: 120 });
    for (let i = 0; i < count; i++) {
      const a = enraged ? (spread * i) / count : base - spread / 2 + (spread * i) / (count - 1);
      const obj = this.scene.add.text(this.x, this.y - 40, "✦", {
        fontFamily: "Georgia", fontSize: "24px", color: "#ff365c", stroke: "#2a0a0a", strokeThickness: 3,
      }).setOrigin(0.5).setDepth(99980);
      const speed = enraged ? 170 : 220;
      this.projectiles.push({ obj, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, born: this.scene.time.now });
    }
  }

  private legacyAttack(enraged: boolean, target: { x: number; y: number }) {
    this.scene.cameras.main.shake(160, 0.008);
    this.shieldUntil = this.scene.time.now + 1400;
    const shield = this.scene.add.circle(this.x, this.y - 54, 78, 0x6b75ff, 0.22)
      .setStrokeStyle(4, 0xa9b0ff, 0.8).setDepth(this.y + 2);
    this.scene.tweens.add({
      targets: shield,
      alpha: 0,
      scale: 1.18,
      duration: 1400,
      onComplete: () => shield.destroy(),
    });

    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.hypot(dx, dy) || 1;
    const shadowstep = clampToWorld(this.x + (dx / distance) * 120, this.y + (dy / distance) * 120, this.radius);
    if (!isInsideSafeZone(shadowstep.x, shadowstep.y)) this.sprite.setPosition(shadowstep.x, shadowstep.y);

    const angle = Math.atan2(target.y - this.y, target.x - this.x);
    const orb = this.scene.add.text(this.x, this.y - 48, "✦", {
      fontFamily: "Georgia", fontSize: "30px", color: "#c6a2ff", stroke: "#301640", strokeThickness: 4,
    }).setOrigin(0.5).setDepth(99980);
    this.projectiles.push({
      obj: orb,
      vx: Math.cos(angle) * 190,
      vy: Math.sin(angle) * 190,
      born: this.scene.time.now,
    });
    this.barrageAttack(enraged, target);
    this.slamAttack(true, target);
    const echo = this.scene.add.image(target.x, target.y, "darkHero")
      .setOrigin(0.5, 0.85).setAlpha(0.55).setTint(0xff365c).setDepth(target.y - 2);
    this.scene.tweens.add({
      targets: echo,
      x: this.x,
      y: this.y,
      alpha: 0,
      duration: 450,
      onComplete: () => echo.destroy(),
    });
  }

  private updateProjectiles(time: number) {
    const dt = this.scene.game.loop.delta / 1000;
    this.projectiles = this.projectiles.filter((p) => {
      p.obj.x += p.vx * dt;
      p.obj.y += p.vy * dt;
      const outOfBounds = !isWithinWorld(p.obj.x, p.obj.y);
      const enteredSafeZone = isInsideSafeZone(p.obj.x, p.obj.y);
      if (outOfBounds || enteredSafeZone) {
        p.obj.destroy();
        return false;
      }
      const target = this.getAttackTarget(time);
      const hitPlayer = !isInsideSafeZone(this.player.x, this.player.y) &&
        Phaser.Math.Distance.Between(p.obj.x, p.obj.y, target.x, target.y - 24) < 26;
      if (hitPlayer) this.onPlayerHit(12);
      if (hitPlayer || time - p.born > 3500) { p.obj.destroy(); return false; }
      return true;
    });
  }
}
