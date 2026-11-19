import * as Phaser from "phaser";

// Draws a glowing sword arc that sweeps from one angle to another.
// fromDeg/toDeg are relative to the hero's facing direction:
//   -60 → +60  = sweeps one way (e.g. left → right)
//   +60 → -60  = sweeps back    (right → left)
export function slashArc(
  scene: Phaser.Scene,
  x: number,
  y: number,
  facingRad: number,
  fromDeg: number,
  toDeg: number,
  radius: number,
  color: number,
  thickness = 10,
  sweepMs = 90,
) {
  const g = scene.add.graphics().setDepth(y + 50).setBlendMode(Phaser.BlendModes.ADD);
  const progress = { t: 0 };
  const from = facingRad + Phaser.Math.DegToRad(fromDeg);
  const to = facingRad + Phaser.Math.DegToRad(toDeg);

  const draw = () => {
    g.clear();
    const end = Phaser.Math.Linear(from, to, progress.t);
    const start = Phaser.Math.Linear(from, to, Math.max(0, progress.t - 0.55)); // trailing tail
    const anticlockwise = to < from;
    // outer glow + bright core = "energy" look
    g.lineStyle(thickness + 8, color, 0.25);
    g.beginPath(); g.arc(x, y, radius, start, end, anticlockwise); g.strokePath();
    g.lineStyle(thickness, color, 0.9);
    g.beginPath(); g.arc(x, y, radius, start, end, anticlockwise); g.strokePath();
    g.lineStyle(3, 0xffffff, 1);
    g.beginPath(); g.arc(x, y, radius, start, end, anticlockwise); g.strokePath();
  };

  scene.tweens.add({
    targets: progress, t: 1, duration: sweepMs, ease: "Cubic.easeOut",
    onUpdate: draw,
    onComplete: () => scene.tweens.add({ targets: g, alpha: 0, duration: 120, onComplete: () => g.destroy() }),
  });
}

/** Vertical slash (heavy attack): a bright line that grows down or up. */
export function verticalSlash(scene: Phaser.Scene, x: number, y: number, facingRad: number, upward: boolean, color: number) {
  const reach = 90;
  const tipX = x + Math.cos(facingRad) * reach * 0.6;
  const tipY = y + Math.sin(facingRad) * reach * 0.6;
  const g = scene.add.graphics().setDepth(y + 60).setBlendMode(Phaser.BlendModes.ADD);
  const p = { t: 0 };
  scene.tweens.add({
    targets: p, t: 1, duration: 110, ease: "Cubic.easeOut",
    onUpdate: () => {
      g.clear();
      const len = reach * p.t;
      const y1 = upward ? tipY + 30 : tipY - 70;
      const y2 = upward ? y1 - len : y1 + len;
      g.lineStyle(26, color, 0.25); g.lineBetween(tipX, y1, tipX, y2);
      g.lineStyle(12, color, 0.9); g.lineBetween(tipX, y1, tipX, y2);
      g.lineStyle(4, 0xffffff, 1); g.lineBetween(tipX, y1, tipX, y2);
    },
    onComplete: () => scene.tweens.add({ targets: g, alpha: 0, duration: 160, onComplete: () => g.destroy() }),
  });
}

/** Ground crack + shockwave ring for the overhead slam. */
export function shockwave(scene: Phaser.Scene, x: number, y: number, color: number, maxRadius = 110) {
  const ring = scene.add.circle(x, y, 10).setStrokeStyle(6, color, 1).setDepth(y - 1);
  scene.tweens.add({ targets: ring, radius: maxRadius, alpha: 0, duration: 380, ease: "Cubic.easeOut", onComplete: () => ring.destroy() });

  const crack = scene.add.graphics().setDepth(y - 2);
  crack.lineStyle(3, 0x1a1208, 0.8);
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6 + Math.random() * 0.4;
    let cx = x, cy = y;
    crack.beginPath(); crack.moveTo(cx, cy);
    for (let s = 0; s < 3; s++) {
      cx += Math.cos(a + (Math.random() - 0.5) * 0.8) * 16;
      cy += Math.sin(a + (Math.random() - 0.5) * 0.8) * 10;
      crack.lineTo(cx, cy);
    }
    crack.strokePath();
  }
  scene.tweens.add({ targets: crack, alpha: 0, delay: 700, duration: 600, onComplete: () => crack.destroy() });
}

/** Floating damage number. */
export function damageNumber(scene: Phaser.Scene, x: number, y: number, amount: number, big = false) {
  const t = scene.add
    .text(x + Phaser.Math.Between(-10, 10), y, String(amount), {
      fontFamily: "Cinzel, Georgia, serif",
      fontSize: big ? "30px" : "22px",
      color: big ? "#ffd75e" : "#ffffff",
      stroke: "#0d1830",
      strokeThickness: 5,
    })
    .setOrigin(0.5)
    .setDepth(99999);
  scene.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 750, ease: "Cubic.easeOut", onComplete: () => t.destroy() });
}

/** Little burst of sparks where a hit lands. */
export function sparks(scene: Phaser.Scene, x: number, y: number, color: number) {
  const em = scene.add.particles(x, y, "spark", {
    speed: { min: 120, max: 320 },
    lifespan: 260,
    scale: { start: 1, end: 0 },
    tint: color,
    blendMode: "ADD",
    emitting: false,
  }).setDepth(99998);
  em.explode(12);
  scene.time.delayedCall(400, () => em.destroy());
}
