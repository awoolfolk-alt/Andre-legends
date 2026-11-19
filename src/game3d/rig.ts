// ─────────────────────────────────────────────────────────────
// RIG — the first-person body: eyes, legs, and collision
// ─────────────────────────────────────────────────────────────
// "Minecraft-light" means the MOVEMENT stays simple on purpose:
// walk, look, interact. No jumping physics, no crouch, no sliding —
// the complexity of this game lives in its story and lessons, not
// in the engine. Simple controls, deep content.
//
// One rig, three input sources:
//   Desktop:  WASD + mouse (pointer lock), arrow keys as fallback look
//   Mobile:   left joystick = move, drag on right half = look
//   Testing:  arrow keys + probe hooks (headless browsers have no
//             pointer lock, so the fallbacks double as test hooks)
// ─────────────────────────────────────────────────────────────

import * as THREE from "three";

export interface CircleCollider {
  x: number;
  z: number;
  r: number;
}

// The world is two separate "islands" of walkable ground: the forest
// clearing and the castle platform. A list of allowed circles means
// the boundary check is "am I inside ANY of these?" — which makes
// adding a third area later a one-line change.
export interface WalkRegion {
  x: number;
  z: number;
  r: number;
}

export class FirstPersonRig {
  readonly camera: THREE.PerspectiveCamera;

  // position = the feet. The camera rides at feet + eyeHeight.
  readonly position = new THREE.Vector3(0, 0, 6);
  yaw = Math.PI; // facing -Z (into the forest) at spawn... see note below
  pitch = 0;

  // WHY these numbers? 4.2 m/s is a brisk walk; Minecraft walks at
  // ~4.3. The eye at 1.7m reads as "adult standing height".
  readonly speed = 4.2;
  readonly eyeHeight = 1.7;
  readonly radius = 0.45; // the body is a cylinder, for collision

  private colliders: CircleCollider[] = [];
  private regions: WalkRegion[] = [];

  // Input accumulators. Keyboard writes to `keys`, touch writes to
  // `joy`, pointer writes to look deltas. update() drains them each
  // fixed step. Accumulate-then-drain means no source can "win" —
  // they add up.
  private keys = new Set<string>();
  private joy = { x: 0, z: 0 }; // joystick, -1..1
  private lookDX = 0;
  private lookDY = 0;
  private disposed = false;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(72, aspect, 0.1, 600);
    this.attach();
  }

  setWorld(colliders: CircleCollider[], regions: WalkRegion[]) {
    this.colliders = colliders;
    this.regions = regions;
  }

  teleport(x: number, z: number, yaw: number) {
    this.position.set(x, 0, z);
    this.yaw = yaw;
    this.pitch = 0;
    this.syncCamera();
  }

  // ─── Input wiring ─────────────────────────────────────────
  // Listeners live on `window` so the rig keeps working no matter
  // which DOM element has focus — important when a React overlay
  // (like the word prompt) appears and disappears.

  private onKeyDown = (e: KeyboardEvent) => {
    // Don't hijack typing inside the affirmation input — the spell
    // needs those letters more than the legs do.
    if ((e.target as HTMLElement)?.tagName === "INPUT") return;
    this.keys.add(e.code);
    // Arrow keys would otherwise scroll the page.
    if (e.code.startsWith("Arrow")) e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  // Mouse look comes in through pointer-lock movement events...
  private onMouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement) {
      this.lookDX += e.movementX;
      this.lookDY += e.movementY;
    } else if (this.dragging) {
      // ...or through click-drag, which also works in iframes,
      // touch-emulation, and headless test browsers.
      this.lookDX += e.clientX - this.dragX;
      this.lookDY += e.clientY - this.dragY;
      this.dragX = e.clientX;
      this.dragY = e.clientY;
    }
  };

  private dragging = false;
  private dragX = 0;
  private dragY = 0;

  private onMouseDown = (e: MouseEvent) => {
    if (document.pointerLockElement) return;
    // Only the canvas itself starts a drag-look; clicks on HUD
    // buttons must not spin the camera.
    if ((e.target as HTMLElement)?.tagName !== "CANVAS") return;
    this.dragging = true;
    this.dragX = e.clientX;
    this.dragY = e.clientY;
  };

  private onMouseUp = () => {
    this.dragging = false;
  };

  private attach() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
  }

  // The React shell feeds touch through these two doors.
  setJoystick(x: number, z: number) {
    this.joy.x = x;
    this.joy.z = z;
  }
  addLook(dx: number, dy: number) {
    this.lookDX += dx;
    this.lookDY += dy;
  }

  requestPointerLock(canvas: HTMLCanvasElement) {
    // Pointer lock only exists on desktop mice; guard for touch.
    if (canvas.requestPointerLock) canvas.requestPointerLock();
  }

  // ─── Per-frame update (called at a FIXED timestep) ────────
  // WHY fixed timestep? If physics ran "however long the last frame
  // took", a lag spike would teleport you through walls. Fixed steps
  // make movement identical on a 30fps phone and a 144hz monitor.

  update(dt: number) {
    // --- Look ---
    // 0.0022 rad/px ≈ a medium mouse sensitivity.
    this.yaw -= this.lookDX * 0.0022;
    this.pitch -= this.lookDY * 0.0022;
    this.lookDX = 0;
    this.lookDY = 0;

    // Arrow-key look fallback (also the test hook). ~1.9 rad/s.
    const TURN = 1.9 * dt;
    if (this.keys.has("ArrowLeft")) this.yaw += TURN;
    if (this.keys.has("ArrowRight")) this.yaw -= TURN;
    if (this.keys.has("ArrowUp")) this.pitch += TURN * 0.6;
    if (this.keys.has("ArrowDown")) this.pitch -= TURN * 0.6;

    // Clamp pitch: you can't somersault your neck. ±85°.
    const PITCH_MAX = 1.48;
    this.pitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, this.pitch));

    // --- Move ---
    // Keyboard: W forward / S back / A left / D right, relative to
    // where you face. In three.js, yaw=0 faces -Z, and the forward
    // vector is (-sin(yaw), 0, -cos(yaw)).
    let mx = 0;
    let mz = 0;
    if (this.keys.has("KeyW")) mz += 1;
    if (this.keys.has("KeyS")) mz -= 1;
    if (this.keys.has("KeyA")) mx -= 1;
    if (this.keys.has("KeyD")) mx += 1;
    // Touch joystick adds on top (values already -1..1).
    mx += this.joy.x;
    mz += this.joy.z;

    // Normalize diagonal so W+D isn't 41% faster — but preserve
    // partial joystick pushes (a gentle push = a slow walk).
    const mag = Math.hypot(mx, mz);
    if (mag > 1) {
      mx /= mag;
      mz /= mag;
    }

    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    // Rotate input into world space: forward = (-sin, -cos), and the
    // RIGHT hand is (cos, -sin) — at yaw 0 you face -Z and your right
    // hand points +X. Getting this wrong swaps A and D, which every
    // player on earth will notice in the first five seconds.
    const dx = (-sin * mz + cos * mx) * this.speed * dt;
    const dz = (-cos * mz - sin * mx) * this.speed * dt;

    // Axis-separated collision: try X, then Z. If a tree blocks one
    // axis you SLIDE along it instead of stopping dead — the cheap
    // trick that makes circle collision feel smooth.
    this.tryMove(dx, 0);
    this.tryMove(0, dz);

    this.syncCamera();
  }

  private tryMove(dx: number, dz: number) {
    if (dx === 0 && dz === 0) return;
    const nx = this.position.x + dx;
    const nz = this.position.z + dz;

    // Walkable-region check: must stay inside at least one region,
    // shrunk by the body radius so you can't hang half off the edge.
    const inRegion = this.regions.some(
      (r) => Math.hypot(nx - r.x, nz - r.z) <= r.r - this.radius
    );
    if (!inRegion) return;

    // Tree/rock push-out: if the new spot overlaps a collider, refuse it.
    for (const c of this.colliders) {
      const minDist = c.r + this.radius;
      if (Math.hypot(nx - c.x, nz - c.z) < minDist) return;
    }

    this.position.x = nx;
    this.position.z = nz;
  }

  private syncCamera() {
    this.camera.position.set(
      this.position.x,
      this.position.y + this.eyeHeight,
      this.position.z
    );
    // YXZ order = yaw around the world-up axis first, then pitch on
    // the new local X — exactly how a head on a neck works.
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
  }

  // Where the eyes are looking, as a unit vector on the ground plane.
  // The melee hit-check and the "what am I facing" prompt both use it.
  forwardXZ(out: THREE.Vector3): THREE.Vector3 {
    return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
  }

  // Melee aim-assist: rotate the body toward (x, z), at most maxStep
  // radians. Facing convention: forward = (-sin yaw, -cos yaw), so the
  // yaw that looks at a point is atan2(-dx, -dz).
  faceToward(x: number, z: number, maxStep: number) {
    const target = Math.atan2(-(x - this.position.x), -(z - this.position.z));
    // Wrap the difference to [-π, π] so we take the short way around.
    let diff = target - this.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.yaw += Math.max(-maxStep, Math.min(maxStep, diff));
    this.syncCamera();
  }
}
