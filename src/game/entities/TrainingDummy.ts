import * as Phaser from "phaser";
import { Damageable, HitInfo } from "./Damageable";
import { sparks } from "../effects/SlashFX";

// "Doubt Totem": a practice target. Breaks after enough hits,
// gives XP, then rebuilds itself. Lets players feel the combo and
// watch the hero's basic damage scale 45 → 65 → 85 as they level up.
export class TrainingDummy implements Damageable {
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  radius = 22;
  maxHp = 300;
  hp = 300;
  alive = true;

  constructor(private scene: Phaser.Scene, public x: number, public y: number, private onBreak: () => void) {
    this.sprite = scene.add.image(x, y, "dummy").setOrigin(0.5, 0.9).setDepth(y);
    this.label = scene.add
      .text(x, y - 86, "Doubt Totem", { fontFamily: "Georgia", fontSize: "13px", color: "#cfd8ff", stroke: "#000", strokeThickness: 3 })
      .setOrigin(0.5).setDepth(y + 1);
    scene.physics.add.existing(this.sprite, true);
    (this.sprite.body as Phaser.Physics.Arcade.StaticBody).setSize(30, 16).setOffset(17, 74);
  }

  takeHit(hit: HitInfo) {
    if (!this.alive) return;
    this.hp -= hit.damage;
    // Damage numbers come from the Combat system (single source);
    // here we only add the impact sparks.
    sparks(this.scene, this.x, this.y - 40, hit.heavy ? 0xffd75e : 0x4fd1ff);

    // Hit flash + wobble away from the attacker
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => this.sprite.clearTint());
    const dir = Math.sign(this.x - hit.from.x) || 1;
    this.scene.tweens.add({ targets: this.sprite, angle: dir * (hit.heavy ? 14 : 7), yoyo: true, duration: 80 });
    if (hit.launch) this.scene.tweens.add({ targets: this.sprite, y: this.y - 26, yoyo: true, duration: 160, ease: "Quad.easeOut" });

    if (this.hp <= 0) this.break();
  }

  private break() {
    this.alive = false;
    this.onBreak();
    this.scene.tweens.add({ targets: this.sprite, alpha: 0.15, scaleY: 0.4, duration: 250 });
    this.scene.time.delayedCall(2500, () => {
      this.hp = this.maxHp;
      this.alive = true;
      this.scene.tweens.add({ targets: this.sprite, alpha: 1, scaleY: 1, duration: 300 });
    });
  }
}
