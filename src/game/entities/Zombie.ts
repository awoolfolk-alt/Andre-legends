import * as Phaser from "phaser";
import { Damageable, HitInfo } from "./Damageable";
import { Player } from "./Player";
import { sparks } from "../effects/SlashFX";
import { clampToWorld, isInsideSafeTown } from "../systems/WorldRules";

export class Zombie implements Damageable {
  sprite: Phaser.GameObjects.Image;
  hp = 70;
  radius = 20;
  alive = true;
  private nextAttackAt = 0;

  constructor(
    private scene: Phaser.Scene,
    x: number,
    y: number,
    private onPlayerHit: (damage: number) => void,
    private onDefeated: () => void,
  ) {
    this.sprite = scene.add.image(x, y, "zombie").setOrigin(0.5, 0.86).setDepth(y);
  }

  get x() { return this.sprite.x; }
  get y() { return this.sprite.y; }

  update(time: number, delta: number, player: Player, playerIsInteracting: boolean) {
    if (!this.alive) return;
    if (playerIsInteracting) {
      this.nextAttackAt = time + 900;
      return;
    }
    if (isInsideSafeTown(player.x, player.y)) return;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distance = Math.hypot(dx, dy);

    if (distance > this.radius + 18) {
      const step = Math.min(distance - this.radius - 18, (75 * delta) / 1000);
      const next = clampToWorld(this.x + (dx / distance) * step, this.y + (dy / distance) * step, this.radius);
      if (!isInsideSafeTown(next.x, next.y)) this.sprite.setPosition(next.x, next.y);
      this.sprite.setFlipX(dx < 0);
    } else if (time >= this.nextAttackAt) {
      this.nextAttackAt = time + 900;
      this.onPlayerHit(5);
    }

    this.sprite.setDepth(this.y);
  }

  takeHit(hit: HitInfo) {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - hit.damage);
    // Damage numbers come from the Combat system (single source); sparks stay local.
    sparks(this.scene, this.x, this.y - 24, hit.heavy ? 0xffd75e : 0xc44a67);
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => {
      if (this.sprite.active) this.sprite.clearTint();
    });

    if (this.hp === 0) {
      this.alive = false;
      this.onDefeated();
      this.scene.tweens.add({
        targets: this.sprite,
        alpha: 0,
        scale: 0.3,
        duration: 220,
        onComplete: () => this.sprite.destroy(),
      });
    }
  }
}
