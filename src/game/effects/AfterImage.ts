import * as Phaser from "phaser";

// ─────────────────────────────────────────────────────────────
// AFTER-IMAGE (ghost trail)
// Copy the hero's current look → make it transparent → fade → delete.
// WHY: it sells speed without changing gameplay at all, and
// symbolically: every step forward carries what came before.
// ─────────────────────────────────────────────────────────────

export function spawnAfterImage(
  scene: Phaser.Scene,
  parts: Phaser.GameObjects.Image[], // body + locks, so the ghost looks like the hero
  tint = 0x4fd1ff,
  startAlpha = 0.45,
  duration = 260,
) {
  for (const src of parts) {
    const ghost = scene.add
      .image(src.x, src.y, src.texture.key)
      .setOrigin(src.originX, src.originY)
      .setFlipX(src.flipX)
      .setAngle(src.angle)
      .setScale(src.scaleX, src.scaleY)
      .setTintFill(tint)
      .setAlpha(startAlpha)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(src.depth - 1);

    scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration,
      onComplete: () => ghost.destroy(), // always clean up, or memory grows forever
    });
  }
}
