import * as Phaser from "phaser";
import {
  DEFAULT_HERO,
  drawHeroBody,
  drawHeroHair,
  sanitizeHero,
  type HeroConfig,
} from "../data/hero";
import { phaserPainter } from "../painter";
import type { RemoteState } from "../net/presence";

// ─────────────────────────────────────────────────────────────
// REMOTE PLAYERS — the other travelers sharing Safe Town.
//
// Each visitor is pure decoration: a hero sprite + hair + name
// label, NO physics body. They can't be hit, can't block you,
// can't trigger anything. Their hero look is minted on demand by
// the SAME drawing code as the local hero (drawHeroBody /
// drawHeroHair via phaserPainter), cached under a key built from
// their customization — two visitors with different looks get two
// different sprites, identical twins share one texture.
//
// Movement: visitors teleport in ~8 updates a second; we smooth
// that into gliding with frame-rate-independent catch-up, and
// reuse the hero's bob / hair-sway math so they feel alive.
// ─────────────────────────────────────────────────────────────

function heroKeys(cfg: HeroConfig) {
  const id = `${cfg.gender}-${cfg.skin}-${cfg.hairStyle}-${cfg.hairColor}-${cfg.clothes}`;
  return { body: `remote-hero-${id}`, hair: `remote-locks-${id}` };
}

function ensureHeroTextures(scene: Phaser.Scene, cfg: HeroConfig) {
  const keys = heroKeys(cfg);
  if (!scene.textures.exists(keys.body)) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    drawHeroBody(phaserPainter(g), cfg);
    g.generateTexture(keys.body, 48, 64); // same box as the local "hero"
    g.destroy();
  }
  if (!scene.textures.exists(keys.hair)) {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    drawHeroHair(phaserPainter(g), cfg);
    g.generateTexture(keys.hair, 44, 40); // same box as the local "locks"
    g.destroy();
  }
  return keys;
}

interface RemoteAvatar {
  sprite: Phaser.GameObjects.Image;
  locks: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  target: RemoteState;
}

export class RemotePlayers {
  private avatars = new Map<string, RemoteAvatar>();

  constructor(private scene: Phaser.Scene) {}

  /** First sighting spawns the avatar; later calls just retarget it. */
  upsert(id: string, state: RemoteState) {
    const existing = this.avatars.get(id);
    if (existing) {
      existing.target = state;
      return;
    }
    const cfg = state.hero ? sanitizeHero(state.hero) : DEFAULT_HERO;
    const keys = ensureHeroTextures(this.scene, cfg);
    // Origins and offsets mirror Player.ts exactly, so a visitor's look
    // and proportions are identical to a local hero with the same config.
    const sprite = this.scene.add.image(state.x, state.y, keys.body).setOrigin(0.5, 0.85);
    const locks = this.scene.add.image(state.x, state.y - 52, keys.hair).setOrigin(0.5, 0.1);
    const label = this.scene.add
      .text(state.x, state.y - 78, state.name, {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: "#f3e3b5",
        stroke: "#24101c",
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1);
    sprite.setAlpha(0);
    locks.setAlpha(0);
    label.setAlpha(0);
    this.scene.tweens.add({ targets: [sprite, locks, label], alpha: 1, duration: 300 });
    this.avatars.set(id, { sprite, locks, label, target: state });
  }

  /** A traveler left the square: fade them out, then destroy. */
  remove(id: string) {
    const avatar = this.avatars.get(id);
    if (!avatar) return;
    this.avatars.delete(id);
    this.scene.tweens.add({
      targets: [avatar.sprite, avatar.locks, avatar.label],
      alpha: 0,
      duration: 250,
      onComplete: () => {
        avatar.sprite.destroy();
        avatar.locks.destroy();
        avatar.label.destroy();
      },
    });
  }

  /** How many visitors are on screen right now. */
  get count(): number {
    return this.avatars.size;
  }

  /** Glide everyone toward their latest broadcast position. */
  update(time: number, delta: number) {
    // Frame-rate-independent catch-up: ~11% of the gap closed per 60fps
    // frame, so 8Hz broadcasts read as smooth walking, not teleporting.
    const t = 1 - Math.pow(0.89, delta / 16.7);
    this.avatars.forEach((avatar) => {
      const s = avatar.sprite;
      s.x = Phaser.Math.Linear(s.x, avatar.target.x, t);
      s.y = Phaser.Math.Linear(s.y, avatar.target.y, t);
      s.setFlipX(avatar.target.flipX);

      // Same idle-breathing / running-bob / wind-sway math as Player.ts.
      const moving = avatar.target.moving;
      const bob = moving ? Math.sin(time / 70) * 2 : Math.sin(time / 400) * 1;
      s.setScale(1, 1 + (moving ? 0 : Math.sin(time / 400) * 0.015));
      const wind = Math.sin(time / 500) * 4;
      avatar.locks
        .setPosition(s.x, s.y - 52 + bob)
        .setAngle(wind)
        .setFlipX(avatar.target.flipX);
      avatar.label.setPosition(s.x, s.y - 78);

      // Depth by feet position — visitors sort correctly behind/in
      // front of buildings, trees, and the local hero.
      s.setDepth(s.y);
      avatar.locks.setDepth(s.y + 1);
      avatar.label.setDepth(s.y + 2);
    });
  }
}
