import * as Phaser from "phaser";

// ─────────────────────────────────────────────────────────────
// SHADER EFFECTS (the "high quality" visual pass)
// A SHADER is a tiny program that runs on the graphics card (GPU) for
// every pixel. Phaser 3.60+ ships ready-made shader effects, so we can
// use them without writing shader code:
//   GLOW     -> a soft colored light around one object (hero's Aura)
//   BLOOM    -> bright things "bleed" light across the screen (big hits)
//   VIGNETTE -> darkened screen edges that focus attention (boss fights)
//   PIXELATE -> breaks an image into blocks (the boss "dissolving")
//
// preFX  = an effect on ONE object (glow on the hero)
// postFX = an effect on the WHOLE camera view (bloom, vignette)
//
// IMPORTANT: shader FX only exist in WebGL. On old devices Phaser falls
// back to Canvas, where preFX is null. Every function here checks first,
// so the game still works (just without the extra shine).
// ─────────────────────────────────────────────────────────────

/** True when the game is drawing with WebGL (so shader FX are available). */
export function hasShaders(scene: Phaser.Scene): boolean {
  return scene.game.renderer.type === Phaser.WEBGL;
}

/**
 * Adds a glow to an image. Returns the glow so you can animate or remove it,
 * or undefined if shaders aren't available.
 */
export function addGlow(
  obj: Phaser.GameObjects.Image,
  color: number,
  strength = 3,
): Phaser.FX.Glow | undefined {
  // preFX is null on Canvas. If it's missing, give back "no glow" and stop.
  if (!obj.preFX) return undefined;
  // Padding gives the glow room to spread past the edges of the picture,
  // otherwise it gets cut off at the image's rectangle.
  obj.preFX.setPadding(14);
  // addGlow(color, outerStrength, innerStrength, knockout, quality, distance)
  return obj.preFX.addGlow(color, strength, 0, false, 0.1, 12);
}

/** Removes a glow (or any preFX) that addGlow() returned. Safe to call with undefined. */
export function removeGlow(obj: Phaser.GameObjects.Image, fx: Phaser.FX.Glow | undefined) {
  if (fx && obj.preFX) obj.preFX.remove(fx);
}

/**
 * Screen-wide effects for one scene's main camera.
 * Get it with ScreenFX.for(scene) from anywhere (Combat, Boss, the scene).
 */
export class ScreenFX {
  // One ScreenFX per scene, stored in a WeakMap lookup table
  private static instances = new WeakMap<Phaser.Scene, ScreenFX>();

  /** "static" = called on the class itself: ScreenFX.for(scene). */
  static for(scene: Phaser.Scene): ScreenFX {
    let fx = ScreenFX.instances.get(scene);
    if (!fx) {
      fx = new ScreenFX(scene);
      ScreenFX.instances.set(scene, fx);
    }
    return fx;
  }

  private bloom?: Phaser.FX.Bloom;
  private bloomTween?: Phaser.Tweens.Tween;
  private vignette?: Phaser.FX.Vignette;
  private vignetteTween?: Phaser.Tweens.Tween;

  // "private constructor" = only ScreenFX.for() may create one
  private constructor(private scene: Phaser.Scene) {}

  private get cam() {
    return this.scene.cameras.main;
  }

  /**
   * A quick flash of bloom for big moments (heavy slam, Courage Strike, level up).
   * We ADD the bloom only for the flash and REMOVE it after, because a bloom
   * that sits on screen all the time costs GPU work every single frame.
   */
  bloomPulse(strength = 1.2, durationMs = 280) {
    if (!hasShaders(this.scene)) return;
    // Create the bloom the first time. addBloom(color, offsetX, offsetY, blur, strength, steps)
    if (!this.bloom) this.bloom = this.cam.postFX.addBloom(0xffffff, 1, 1, 1.2, 0, 4);
    // If a pulse is already fading, stop it and start a fresh one
    this.bloomTween?.stop();
    // Never make an ongoing flash weaker; take the bigger of the two
    this.bloom.strength = Math.max(this.bloom.strength, strength);
    // Tween the strength down to 0, then remove the effect entirely
    this.bloomTween = this.scene.tweens.add({
      targets: this.bloom,
      strength: 0,
      duration: durationMs,
      ease: "Quad.easeOut",
      onComplete: () => {
        if (this.bloom) this.cam.postFX.remove(this.bloom);
        this.bloom = undefined;
      },
    });
  }

  /** Darken the screen edges during a boss fight (on = true), or fade it away (on = false). */
  bossVignette(on: boolean) {
    if (!hasShaders(this.scene)) return;
    this.vignetteTween?.stop();
    if (on) {
      // addVignette(x, y, radius, strength). x/y 0.5 = centered on screen.
      if (!this.vignette) this.vignette = this.cam.postFX.addVignette(0.5, 0.5, 0.9, 0);
      this.vignetteTween = this.scene.tweens.add({ targets: this.vignette, strength: 0.45, duration: 700 });
    } else if (this.vignette) {
      const v = this.vignette;
      this.vignetteTween = this.scene.tweens.add({
        targets: v, strength: 0, duration: 900,
        onComplete: () => {
          this.cam.postFX.remove(v);
          if (this.vignette === v) this.vignette = undefined;
        },
      });
    }
  }
}

/**
 * The boss "dissolves" into light when its lesson is learned:
 * the picture breaks into bigger and bigger pixels, fades out, and
 * gold sparks rise from where it stood. Without shaders it just fades.
 */
export function dissolve(scene: Phaser.Scene, img: Phaser.GameObjects.Image, onDone?: () => void) {
  // Stop any old tweens on the boss (like its idle breathing) so they don't fight this one
  scene.tweens.killTweensOf(img);

  // Rising gold sparks over the boss's body for about a second
  const rise = scene.add.particles(img.x, img.y - 60, "spark", {
    speedY: { min: -160, max: -60 }, speedX: { min: -40, max: 40 },
    lifespan: 900, frequency: 20, scale: { start: 1.1, end: 0 },
    tint: [0xffd75e, 0xfff3c4], blendMode: "ADD",
    emitZone: { type: "random", source: new Phaser.Geom.Rectangle(-50, -60, 100, 120) } as Phaser.Types.GameObjects.Particles.ParticleEmitterRandomZoneConfig,
  }).setDepth(99990);
  scene.time.delayedCall(1000, () => rise.stop()); // stop spawning new sparks
  scene.time.delayedCall(2000, () => rise.destroy()); // remove once the last ones fade

  // preFX pixelate: amount 1 = normal, bigger = chunkier blocks
  const pix = img.preFX ? img.preFX.addPixelate(1) : undefined;
  scene.tweens.add({
    targets: img,
    alpha: 0,
    scaleX: 1.15,
    scaleY: 1.15,
    duration: 1100,
    ease: "Cubic.easeIn",
    // Every frame of this tween, push the pixel size up as the alpha goes down
    onUpdate: (tw) => {
      if (pix) pix.amount = 1 + tw.progress * 18;
    },
    onComplete: () => {
      if (pix && img.preFX) img.preFX.remove(pix);
      onDone?.();
    },
  });
}
