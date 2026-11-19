import * as Phaser from "phaser";

// An INTERFACE is a promise: "anything that can be hit has these."
// Combat only talks to Damageable, so it can hit a dummy, a boss, or
// a future enemy without knowing which one it is.
export interface HitInfo {
  damage: number;
  from: Phaser.Math.Vector2; // where the hit came from (for knockback)
  launch?: boolean; // upward slash lifts the target
  heavy?: boolean;
}

export interface Damageable {
  x: number;
  y: number;
  radius: number; // rough body size, added to attack range
  alive: boolean;
  takeHit(hit: HitInfo): void;
}
