// ─────────────────────────────────────────────────────────────────────────────
// MOCK SCENE KIT — the shared toolbox every first-person mock page builds with.
//
// WHY does this file exist? All seven mock pages (forest, three arenas, the
// word duel, death, kingdom) need the SAME basics: a renderer, a camera that
// obeys one contract, a sky, a ground, low-poly nature, and a deterministic
// clock. Writing those seven times would guarantee they drift apart. So every
// shared idea lives here ONCE, and each page only describes what makes it
// unique. (This is the same reason the 2D game has one Combat.ts.)
//
// TWO RULES this kit enforces everywhere:
//  1. SEEDED randomness only. `mulberry32(seed)` gives a repeatable stream of
//     "random" numbers, so the forest you see is the forest the user sees —
//     same trees, same rocks, every visit, every machine. A bare Math.random()
//     would make screenshots unrepeatable and bugs unreproducible.
//  2. ONE clock. Every moving thing derives from a single time value `t`.
//     `window.__seek(t)` can jump the whole scene to any moment, which is how
//     automated screenshots (and future cutscenes) stay deterministic.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";

// ── Seeded PRNG ──────────────────────────────────────────────────────────────
// mulberry32: tiny, fast, good-enough distribution. Feed it a seed, get back a
// function that returns the SAME sequence of floats in [0,1) forever.
export function mulberry32(seed: number) {
  let a = seed >>> 0; // force to unsigned 32-bit int
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Convenience: pull a float in [min,max) from the stream.
export function range(rng: () => number, min: number, max: number) {
  return min + rng() * (max - min);
}

// ── Palette ──────────────────────────────────────────────────────────────────
// One place for the world's colors so every mock speaks the same language as
// the 2D game (deep night blues + legend gold) while the first-person world
// adds its own saturated, flat-shaded "storybook" tones.
export const PAL = {
  gold: 0xffd75e,
  goldDeep: 0xd4a72c,
  nightTop: 0x0b1026,
  nightHorizon: 0x1c2b4a,
  forestSkyTop: 0x9fd6ff,
  forestHorizon: 0xd8f2c8,
  grass: 0x4e9b47,
  grassDark: 0x2f6b34,
  trunk: 0x6b4a2f,
  leaf: 0x3f8f3f,
  leafLight: 0x63b34d,
  stone: 0x8b8fa3,
  stoneDark: 0x555a70,
  lava: 0xff5a1f,
  lavaHot: 0xffc23d,
  caveRock: 0x2b2233,
  cloud: 0xffffff,
  blueprint: 0x7fd8ff,
  blueprintGold: 0xffd75e,
  shadowBody: 0x11131f,
};

// ── Scene scaffold ───────────────────────────────────────────────────────────
// Everything a page needs to start: renderer + camera + sky + fog + lights,
// all obeying ONE camera/world contract:
//   • fog color === horizon color (the world fades into the sky, no hard edge)
//   • far plane ≥ 5× the subject distance (nothing pops out of existence)
//   • the ground is huge, so the player never sees its rim
//   • distant masses (hills/trees/towers) sit beyond the fog for depth
export interface MockWorld {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  /** Advance (or jump) the single clock. Every animated thing reads `t`. */
  render: (t: number) => void;
  /** Free GPU resources when the React component unmounts. */
  dispose: () => void;
  /** Eye-level rig: drag to look, gentle idle sway. */
  rig: {
    yaw: number;
    pitch: number;
    baseYaw: number;
    basePitch: number;
    sway: boolean;
  };
  setEye: (x: number, y: number, z: number, yawDeg?: number, pitchDeg?: number) => void;
}

export interface WorldOpts {
  skyTop: number;
  horizon: number;
  ground: number;
  /** Fog density feel: distance where fog starts / fully opaque. */
  fogNear: number;
  fogFar: number;
  /** Key light direction and mood. */
  sun: { dir: [number, number, number]; color: number; intensity: number };
  ambient: { sky: number; ground: number; intensity: number };
  groundRadius?: number;
}

// A vertical-gradient sky dome: a huge sphere viewed from the inside, colored
// by a tiny shader that blends zenith → horizon by height. Cheaper and softer
// than any texture, and it guarantees fog === horizon with zero art assets.
export function makeSky(top: number, horizon: number) {
  const geo = new THREE.SphereGeometry(900, 24, 12);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, // we live INSIDE the sphere
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(top) },
      bottom: { value: new THREE.Color(horizon) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 top; uniform vec3 bottom; varying vec3 vPos;
      void main() {
        float h = clamp(normalize(vPos).y * 1.6 + 0.18, 0.0, 1.0);
        gl_FragColor = vec4(mix(bottom, top, pow(h, 0.75)), 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -10; // always behind everything
  return mesh;
}

export function createWorld(canvas: HTMLCanvasElement, opts: WorldOpts): MockWorld {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // retina but sane
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(opts.horizon, opts.fogNear, opts.fogFar); // fog == horizon
  scene.add(makeSky(opts.skyTop, opts.horizon));

  // One lighting model for the whole scene: a hemisphere wash (sky bouncing
  // onto ground) + a single directional "sun". Same rules on every page.
  const hemi = new THREE.HemisphereLight(opts.ambient.sky, opts.ambient.ground, opts.ambient.intensity);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(opts.sun.color, opts.sun.intensity);
  sun.position.set(...opts.sun.dir);
  scene.add(sun);

  // The ground: a giant disc. So large its rim hides past the fog — rule: the
  // player must NEVER see the edge of the world.
  const groundR = opts.groundRadius ?? 400;
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(groundR, 48),
    new THREE.MeshStandardMaterial({ color: opts.ground, roughness: 1, flatShading: true })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, Math.max(900, opts.fogFar * 5));

  // ── First-person rig ──
  // yaw = look left/right, pitch = look up/down. Pointer drag steers; a soft
  // idle sway keeps the frame alive when nobody touches it. This is the mock
  // of "Minecraft-light" feel without any movement code.
  const rig = { yaw: 0, pitch: 0, baseYaw: 0, basePitch: 0, sway: true };
  let dragX = 0,
    dragY = 0,
    dragging = false;
  const onDown = (e: PointerEvent) => {
    dragging = true;
    dragX = e.clientX;
    dragY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    rig.baseYaw -= (e.clientX - dragX) * 0.0035;
    rig.basePitch -= (e.clientY - dragY) * 0.0028;
    rig.basePitch = Math.max(-1.1, Math.min(1.1, rig.basePitch)); // can't somersault
    dragX = e.clientX;
    dragY = e.clientY;
  };
  const onUp = () => (dragging = false);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);

  const setEye = (x: number, y: number, z: number, yawDeg = 0, pitchDeg = 0) => {
    camera.position.set(x, y, z);
    rig.baseYaw = THREE.MathUtils.degToRad(yawDeg);
    rig.basePitch = THREE.MathUtils.degToRad(pitchDeg);
  };

  // Keep the canvas honest when the window changes shape.
  const fit = () => {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(fit);
  ro.observe(canvas);
  fit();

  const render = (t: number) => {
    // Idle sway: a slow breathing figure-8, ±~1°. Off during drag... actually
    // keep it always — it reads as "alive", and drag offsets simply add on top.
    rig.yaw = rig.baseYaw + (rig.sway ? Math.sin(t * 0.35) * 0.017 : 0);
    rig.pitch = rig.basePitch + (rig.sway ? Math.sin(t * 0.53) * 0.011 : 0);
    camera.rotation.set(0, 0, 0);
    camera.rotateY(rig.yaw);
    camera.rotateX(rig.pitch);
    renderer.render(scene, camera);
  };

  const dispose = () => {
    ro.disconnect();
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    renderer.dispose();
  };

  return { scene, camera, renderer, render, dispose, rig, setEye };
}

// ── Shared canvas textures ───────────────────────────────────────────────────
// A soft radial dot — used for particle points (fireflies, embers, motes).
let _dotTex: THREE.CanvasTexture | null = null;
export function dotTexture() {
  if (_dotTex) return _dotTex;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.5, "rgba(255,255,255,0.4)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  _dotTex = new THREE.CanvasTexture(c);
  return _dotTex;
}

// A soft dark ellipse — the contact shadow. Content-creation rule: EVERY
// grounded object gets one, or it looks pasted onto the world.
let _shadowTex: THREE.CanvasTexture | null = null;
export function shadowTexture() {
  if (_shadowTex) return _shadowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 6, 64, 64, 62);
  grad.addColorStop(0, "rgba(0,0,0,0.42)");
  grad.addColorStop(0.7, "rgba(0,0,0,0.18)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  _shadowTex = new THREE.CanvasTexture(c);
  return _shadowTex;
}

export function blobShadow(radius: number) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.02; // hair above ground so it never z-fights
  return m;
}

// ── Low-poly nature ──────────────────────────────────────────────────────────
// One family = one function + per-instance seeded variation. Never hand-place
// fifty trees by coordinate — call the family fifty times with the rng.
export function makeTree(rng: () => number, opts?: { leaf?: number; leaf2?: number; s?: number }) {
  const s = opts?.s ?? range(rng, 0.8, 1.5); // overall scale varies per tree
  const leaf = opts?.leaf ?? PAL.leaf;
  const leaf2 = opts?.leaf2 ?? PAL.leafLight;
  const tree = new THREE.Group();

  const trunkH = range(rng, 1.6, 2.6);
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14 * s, 0.22 * s, trunkH, 5),
    new THREE.MeshStandardMaterial({ color: PAL.trunk, roughness: 1, flatShading: true })
  );
  trunk.position.y = trunkH / 2;
  tree.add(trunk);

  // 2–3 stacked canopy blobs, lighter toward the top (the key light lives up
  // there — same value rule as the rest of the world).
  const tiers = 2 + Math.floor(rng() * 2);
  let y = trunkH * 0.75;
  for (let i = 0; i < tiers; i++) {
    const r = (1.15 - i * 0.28) * s;
    const blob = new THREE.Mesh(
      new THREE.IcosahedronGeometry(Math.max(0.35, r), 0),
      new THREE.MeshStandardMaterial({
        color: i === tiers - 1 ? leaf2 : leaf,
        roughness: 1,
        flatShading: true,
      })
    );
    blob.position.set(range(rng, -0.12, 0.12), y, range(rng, -0.12, 0.12));
    blob.scale.y = 0.82;
    tree.add(blob);
    y += r * 0.85;
  }
  tree.rotation.y = rng() * Math.PI * 2;
  tree.rotation.z = range(rng, -0.03, 0.03); // a whisper of lean
  tree.add(blobShadow(1.3 * s));
  return tree;
}

export function makeRock(rng: () => number, color = PAL.stone) {
  const r = range(rng, 0.3, 1.1);
  const rock = new THREE.Mesh(
    new THREE.IcosahedronGeometry(r, 0),
    new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true })
  );
  rock.scale.set(range(rng, 0.8, 1.3), range(rng, 0.5, 0.9), range(rng, 0.8, 1.3));
  rock.rotation.set(rng() * 3, rng() * 3, rng() * 3);
  rock.position.y = r * 0.25;
  const g = new THREE.Group();
  g.add(rock, blobShadow(r * 1.2));
  return g;
}

// A winding dirt path: flattened boxes laid segment by segment along a curve.
// Function-generated — the curve is the input, the stones are the output.
export function makePath(points: THREE.Vector3[], width = 1.6, color = 0xb99a68) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true });
  const curve = new THREE.CatmullRomCurve3(points);
  const n = Math.max(8, points.length * 6);
  for (let i = 0; i < n; i++) {
    const t0 = i / n;
    const p = curve.getPoint(t0);
    const seg = new THREE.Mesh(new THREE.BoxGeometry(width * (0.9 + 0.2 * Math.sin(i * 7)), 0.06, 1.35), mat);
    seg.position.set(p.x, 0.035, p.z);
    const ahead = curve.getPoint(Math.min(1, t0 + 0.02));
    seg.rotation.y = Math.atan2(ahead.x - p.x, ahead.z - p.z);
    group.add(seg);
  }
  return group;
}

export function makeCloud(rng: () => number) {
  const cloud = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: PAL.cloud,
    roughness: 1,
    flatShading: true,
    transparent: true,
    opacity: 0.92,
  });
  const puffs = 3 + Math.floor(rng() * 3);
  for (let i = 0; i < puffs; i++) {
    const r = range(rng, 1.6, 3.4);
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat);
    puff.position.set(i * range(rng, 1.8, 2.6) - puffs, range(rng, -0.4, 0.6), range(rng, -0.8, 0.8));
    puff.scale.y = 0.55; // clouds are wide, not tall
    cloud.add(puff);
  }
  return cloud;
}

// Fireflies / embers / dust motes — one Points cloud, drift derived from t.
export function makeMotes(rng: () => number, opts: {
  count: number; area: [number, number, number]; center: [number, number, number];
  color: number; size: number; rise?: boolean;
}) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(opts.count * 3);
  const phase = new Float32Array(opts.count); // each mote gets its own rhythm
  for (let i = 0; i < opts.count; i++) {
    pos[i * 3] = opts.center[0] + range(rng, -opts.area[0], opts.area[0]);
    pos[i * 3 + 1] = opts.center[1] + range(rng, -opts.area[1], opts.area[1]);
    pos[i * 3 + 2] = opts.center[2] + range(rng, -opts.area[2], opts.area[2]);
    phase[i] = rng() * Math.PI * 2;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("phase", new THREE.BufferAttribute(phase, 1));
  const mat = new THREE.PointsMaterial({
    color: opts.color,
    size: opts.size,
    map: dotTexture(),
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  // The drift: gentle sine wander + optional slow rise, all from t + phase.
  pts.userData.update = (t: number) => {
    const p = geo.attributes.position as THREE.BufferAttribute;
    const ph = geo.attributes.phase as THREE.BufferAttribute;
    for (let i = 0; i < opts.count; i++) {
      const w = ph.getX(i);
      p.setX(i, p.getX(i) + Math.sin(t * 0.6 + w) * 0.004);
      p.setY(i, p.getY(i) + (opts.rise ? 0.006 : Math.sin(t * 0.8 + w * 2) * 0.003));
      if (opts.rise && p.getY(i) > opts.center[1] + opts.area[1]) p.setY(i, opts.center[1] - opts.area[1]);
    }
    p.needsUpdate = true;
  };
  return pts;
}

// A hooded humanoid silhouette — the Elder, a shrine statue, or the Shadow.
// Deliberately simple: the SHAPE reads "person" at any distance; detail would
// fight the low-poly style.
export function makeFigure(opts: { body: number; head?: number; glowEyes?: boolean; s?: number }) {
  const s = opts.s ?? 1;
  const fig = new THREE.Group();
  const robe = new THREE.Mesh(
    new THREE.ConeGeometry(0.55 * s, 1.7 * s, 7),
    new THREE.MeshStandardMaterial({ color: opts.body, roughness: 1, flatShading: true })
  );
  robe.position.y = 0.85 * s;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.26 * s, 8, 6),
    new THREE.MeshStandardMaterial({ color: opts.head ?? opts.body, roughness: 1, flatShading: true })
  );
  head.position.y = 1.78 * s;
  fig.add(robe, head, blobShadow(0.7 * s));
  if (opts.glowEyes) {
    // Two tiny emissive dots — the cheapest possible "it is watching you".
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfff3c0 });
    for (const dx of [-0.09, 0.09]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035 * s, 6, 6), eyeMat);
      eye.position.set(dx * s, 1.8 * s, 0.22 * s);
      fig.add(eye);
    }
  }
  return fig;
}

// ── Deterministic animation host ─────────────────────────────────────────────
// useMockScene owns the clock. Pages register updaters; each frame (or each
// __seek) every updater receives the same t. window.__SCENE_READY__ flips true
// after the first real render so screenshot tools know the world exists.
export function startLoop(world: MockWorld, updaters: Array<(t: number) => void>) {
  let raf = 0;
  let t = 0;
  let last = performance.now();
  const step = (now: number) => {
    // Clamp huge gaps (tab was hidden) so nothing lurches.
    t += Math.min(0.1, (now - last) / 1000);
    last = now;
    for (const u of updaters) u(t);
    world.render(t);
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  (window as any).__seek = (jump: number) => {
    t = jump;
    for (const u of updaters) u(t);
    world.render(t);
  };
  (window as any).__SCENE_READY__ = false;
  requestAnimationFrame(() => {
    (window as any).__SCENE_READY__ = true;
  });
  return () => cancelAnimationFrame(raf);
}

// Project a 3D anchor to screen space — for DOM plaques that float over
// blueprint buildings in the Kingdom mock. Returns null when behind camera.
export function projectToScreen(
  v: THREE.Vector3,
  camera: THREE.Camera,
  w: number,
  h: number
): { x: number; y: number } | null {
  const p = v.clone().project(camera);
  if (p.z > 1) return null;
  return { x: (p.x * 0.5 + 0.5) * w, y: (-p.y * 0.5 + 0.5) * h };
}
