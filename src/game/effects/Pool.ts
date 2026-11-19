import * as Phaser from "phaser";

// ─────────────────────────────────────────────────────────────
// OBJECT POOLING (optimization)
// Creating and deleting game objects costs time, and the browser has to
// clean up the deleted ones later ("garbage collection"), which can cause
// little stutters. While running, the hero makes an after-image every 90ms
// (2 images each), and every hit makes a damage number and a spark burst.
//
// A POOL keeps finished objects in a box instead of deleting them.
// Next time we need one, we take it out of the box and reuse it.
//   get()     -> hand me an object (reuse one if the box has any)
//   release() -> I'm done, hide it and put it back in the box
// ─────────────────────────────────────────────────────────────

// Anything we pool must be a Phaser object that can be turned on/off and hidden.
// "&" combines two types: it must be BOTH of these.
type Poolable = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible;

export class Pool<T extends Poolable> {
  // Objects waiting to be reused
  private free: T[] = [];
  // How many objects this pool ever had to create (the test checks this stays small)
  created = 0;

  // factory = a function that builds a brand new object when the box is empty
  constructor(private factory: () => T) {}

  /** Take an object out of the pool (or build one if none are free). */
  get(): T {
    // pop() removes and returns the last item, or undefined if the list is empty.
    // "??" means: if that was undefined, build a new one instead.
    const obj = this.free.pop() ?? this.build();
    obj.setActive(true);
    obj.setVisible(true);
    return obj;
  }

  /** Put an object back. It's hidden and switched off until someone needs it again. */
  release(obj: T) {
    obj.setActive(false);
    obj.setVisible(false);
    this.free.push(obj);
  }

  private build(): T {
    this.created++;
    return this.factory();
  }
}

// ── One set of pools per scene ─────────────────────────────────
// Pools belong to a scene (its objects live there). A WeakMap is a lookup
// table that lets the scene be cleaned up normally when the game closes.
// unknown = "some type, we'll say which when we use it" (safer than any).
const registry = new WeakMap<Phaser.Scene, Map<string, unknown>>();

/**
 * Get (or create on first use) the shared thing called `key` for this scene.
 * Used for pools AND for reusable particle emitters.
 */
export function sharedFor<T>(scene: Phaser.Scene, key: string, make: () => T): T {
  let table = registry.get(scene);
  if (!table) {
    table = new Map();
    registry.set(scene, table);
    // When the scene shuts down its objects are destroyed, so forget the pools too
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => registry.delete(scene));
  }
  if (!table.has(key)) table.set(key, make());
  // "as T" tells TypeScript which type this stored value is
  return table.get(key) as T;
}

/** Shortcut for a pool: poolFor(scene, "ghost", () => scene.add.image(...)) */
export function poolFor<T extends Poolable>(scene: Phaser.Scene, key: string, factory: () => T): Pool<T> {
  return sharedFor(scene, `pool:${key}`, () => new Pool<T>(factory));
}

/**
 * A reusable particle emitter. Instead of creating a new emitter for every
 * spark burst and deleting it after, we keep one per color and call
 * explode(count, x, y) on it wherever the hit lands.
 */
export function burstEmitter(
  scene: Phaser.Scene,
  key: string,
  config: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig,
  depth = 99998,
): Phaser.GameObjects.Particles.ParticleEmitter {
  return sharedFor(scene, `emitter:${key}`, () =>
    // emitting: false = never spray on its own; we fire bursts with explode()
    scene.add.particles(0, 0, "spark", { ...config, emitting: false }).setDepth(depth),
  );
}
