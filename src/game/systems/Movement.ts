import * as Phaser from "phaser";
import { Player } from "../entities/Player";
import { CombatInput } from "./CombatInput";
import { CombatSystem } from "./Combat";
import { spawnAfterImage } from "../effects/AfterImage";
import { DASH } from "../data/combatData";
// Synthesized sound effects (see audio/Sfx.ts)
import { sfx } from "../audio/Sfx";

// ─────────────────────────────────────────────────────────────
// MOVEMENT SYSTEM: walking, running after-images, and the dash.
// WHY separate from Combat? Movement asks Combat "are you busy?"
// before moving. Each system has one job and they cooperate.
// ─────────────────────────────────────────────────────────────

export class MovementSystem {
  private dashingUntil = 0;
  private dashReadyAt = 0;
  private lastGhost = 0;

  constructor(
    private scene: Phaser.Scene,
    private player: Player,
    private input: CombatInput,
    private combat: CombatSystem,
  ) {
    input.on("dash", () => this.dash());
  }

  get dashing() { return this.scene.time.now < this.dashingUntil; }
  get dashCooldown() { return Math.max(0, this.dashReadyAt - this.scene.time.now); }

  update(time: number) {
    const body = this.player.sprite;

    if (this.dashing) {
      // Dense, bright ghosts during a dash
      if (time - this.lastGhost > 25) {
        spawnAfterImage(this.scene, this.player.parts, 0x4fd1ff, 0.55, 300);
        this.lastGhost = time;
      }
      return; // dash velocity was set once in dash(); don't override it
    }

    if (this.combat.busy) {
      // Attacks control the body; let the small attack lunge slow down
      body.setVelocity(body.body!.velocity.x * 0.82, body.body!.velocity.y * 0.82);
      return;
    }

    const dir = this.input.getMoveVector();
    body.setVelocity(dir.x * this.player.speed, dir.y * this.player.speed);
    this.player.face(dir);

    // Running after-images: faint, every 90ms. Gold while Leadership Aura is on (growth!)
    if (dir.lengthSq() > 0 && time - this.lastGhost > 90) {
      spawnAfterImage(this.scene, this.player.parts, this.player.auraActive ? 0xffd75e : 0x4fd1ff, 0.22, 220);
      this.lastGhost = time;
    }
  }

  dash() {
    const now = this.scene.time.now;
    if (now < this.dashReadyAt || !this.combat.canCancel) return;
    if (this.combat.busy) this.combat.cancel(); // dash out of attack recovery

    // Dash in the held direction, or the facing direction if standing still
    const held = this.input.getMoveVector();
    if (held.lengthSq() > 0) this.player.face(held);
    const v = this.player.facingVector.scale(DASH.speed);

    this.player.sprite.setVelocity(v.x, v.y);
    this.dashingUntil = now + DASH.duration;
    this.dashReadyAt = now + DASH.cooldown;
    this.player.invulnerableUntil = Math.max(this.player.invulnerableUntil, now + DASH.invulnerable);
    sfx.dash();

    // Dust kick-up at the start of the dash
    const dust = this.scene.add.particles(this.player.x, this.player.y, "spark", {
      speed: { min: 40, max: 140 }, lifespan: 300, scale: { start: 0.7, end: 0 }, tint: 0xb8c4d6, emitting: false,
    }).setDepth(this.player.y - 1);
    dust.explode(10);
    this.scene.time.delayedCall(400, () => dust.destroy());
  }
}
