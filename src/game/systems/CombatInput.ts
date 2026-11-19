import * as Phaser from "phaser";

// ─────────────────────────────────────────────────────────────
// COMBAT INPUT SYSTEM
// Turns raw keys ("N was pressed") into game ACTIONS ("basic").
//
// WHY a separate system instead of checking keys inside Player?
//  1. Remapping: change a key here, nothing else breaks.
//  2. Contexts: F means "enter/talk" in gameplay but "next line" in
//     dialogue. SPACE advances dialogue; N and M attack in gameplay.
//  3. Buffering: we remember WHEN each action was pressed, so a press
//     slightly too early still counts (this is why fighting games feel
//     responsive).
// ─────────────────────────────────────────────────────────────

export type Action =
  | "basic" // N
  | "heavy" // M
  | "dash" // SHIFT
  | "courage" // Q
  | "aura" // E
  | "legacy" // R
  | "ally1"
  | "ally2"
  | "ally3"
  | "ally4"
  | "ally5"
  | "interact" // F
  | "advance" // SPACE / F while talking
  | "debugLevel"; // L (testing only)

export type InputContext = "gameplay" | "dialogue" | "locked";

type Handler = () => void;

export class CombatInput {
  context: InputContext = "gameplay";
  private handlers = new Map<Action, Handler[]>();
  private lastPressed = new Map<Action, number>();
  private keys: Record<string, Phaser.Input.Keyboard.Key>;

  constructor(private scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb.addKeys({
      up: K.W, down: K.S, left: K.A, right: K.D,
      upArrow: K.UP, downArrow: K.DOWN, leftArrow: K.LEFT, rightArrow: K.RIGHT,
      space: K.SPACE, n: K.N, m: K.M, shift: K.SHIFT, q: K.Q, e: K.E, r: K.R,
      one: K.ONE, two: K.TWO, three: K.THREE, four: K.FOUR, five: K.FIVE, f: K.F, l: K.L,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    // Keyboard → actions (context decides the meaning)
    this.keys.space.on("down", () => {
      if (this.context === "dialogue") this.fire("advance");
    });
    this.keys.n.on("down", () => this.fire("basic"));
    this.keys.m.on("down", () => this.fire("heavy"));
    this.keys.f.on("down", () => this.fire(this.context === "dialogue" ? "advance" : "interact"));
    this.keys.shift.on("down", () => this.fire("dash"));
    this.keys.q.on("down", () => this.fire("courage"));
    this.keys.e.on("down", () => this.fire("aura"));
    this.keys.r.on("down", () => this.fire("legacy"));
    this.keys.one.on("down", () => this.fire("ally1"));
    this.keys.two.on("down", () => this.fire("ally2"));
    this.keys.three.on("down", () => this.fire("ally3"));
    this.keys.four.on("down", () => this.fire("ally4"));
    this.keys.five.on("down", () => this.fire("ally5"));
    this.keys.l.on("down", () => this.fire("debugLevel"));

    // Mouse remains an optional heavy-attack shortcut; clicks advance dialogue.
    scene.input.mouse?.disableContextMenu();
    scene.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (p.leftButtonDown()) this.fire(this.context === "dialogue" ? "advance" : "heavy");
    });
  }

  /** Subscribe to an action: input.on("basic", () => combat.requestBasic()) */
  on(action: Action, handler: Handler) {
    const list = this.handlers.get(action) ?? [];
    list.push(handler);
    this.handlers.set(action, list);
  }

  private fire(action: Action) {
    if (this.context === "locked") return;
    if (this.context === "dialogue" && action !== "advance") return;
    this.lastPressed.set(action, this.scene.time.now);
    this.handlers.get(action)?.forEach((h) => h());
  }

  /** True if the action was pressed within the last `windowMs`. Used for buffering. */
  wasPressedWithin(action: Action, windowMs: number): boolean {
    const t = this.lastPressed.get(action);
    return t !== undefined && this.scene.time.now - t <= windowMs;
  }

  consume(action: Action) {
    this.lastPressed.delete(action);
  }

  /** WASD / arrows as a normalized direction vector (length 0 or 1). */
  getMoveVector(): Phaser.Math.Vector2 {
    const v = new Phaser.Math.Vector2(0, 0);
    if (this.context !== "gameplay") return v;
    const k = this.keys;
    if (k.left.isDown || k.leftArrow.isDown) v.x -= 1;
    if (k.right.isDown || k.rightArrow.isDown) v.x += 1;
    if (k.up.isDown || k.upArrow.isDown) v.y -= 1;
    if (k.down.isDown || k.downArrow.isDown) v.y += 1;
    // normalize() scales a diagonal (1,1) down to length 1 so diagonal
    // movement isn't faster than straight movement.
    return v.length() > 1 ? v.normalize() : v;
  }
}
