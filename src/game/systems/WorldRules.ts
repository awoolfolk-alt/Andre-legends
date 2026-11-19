import * as Phaser from "phaser";

export const WORLD_BOUNDS = { width: 3800, height: 2600 };

export const SAFE_TOWN = {
  left: 420,
  right: 1810,
  top: 470,
  bottom: 1540,
};

export function isWithinWorld(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x <= WORLD_BOUNDS.width && y <= WORLD_BOUNDS.height;
}

export function isInsideSafeTown(x: number, y: number): boolean {
  return x >= SAFE_TOWN.left && x <= SAFE_TOWN.right &&
    y >= SAFE_TOWN.top && y <= SAFE_TOWN.bottom;
}

export function clampToWorld(x: number, y: number, margin = 40): Phaser.Math.Vector2 {
  return new Phaser.Math.Vector2(
    Phaser.Math.Clamp(x, margin, WORLD_BOUNDS.width - margin),
    Phaser.Math.Clamp(y, margin, WORLD_BOUNDS.height - margin),
  );
}
