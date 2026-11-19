// ─────────────────────────────────────────────────────────────
// WORLD — the forest clearing and the Floating Castle
// ─────────────────────────────────────────────────────────────
// Two walkable "islands" in one scene, 300 meters apart:
//   THE FOREST  (near z=0)     — the overworld. Dense, green, low
//                                light. The path leads to the arch.
//   THE CASTLE  (near z=-300)  — the Shadow's world: a stone disc
//                                floating above the clouds.
// Keeping both in ONE scene means "entering the boss world" is a
// teleport, not a load — instant, and the forest keeps living while
// you fight.
//
// Art direction (locked before building, carried through everything):
//   flat-shaded low-poly (Wind Waker's lesson: style > polygons),
//   forest = warm greens + gold light, castle = cold blues + one
//   warm rim light (hope inside the cold).
// ─────────────────────────────────────────────────────────────

import * as THREE from "three";
import type { CircleCollider, WalkRegion } from "./rig";

// mulberry32: a tiny seeded random number generator.
// WHY seeded? Bare Math.random() places trees differently every load,
// which makes screenshots, testing, and "that one tree by the arch"
// conversations impossible. Seed 7 = the same forest every time.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Interactable {
  id: string;
  x: number;
  z: number;
  radius: number; // how close you must stand
  label: string; // HUD prompt: "E — Read the Memory Stone"
  kind: "stone" | "portal-in" | "portal-out";
}

export interface World {
  colliders: CircleCollider[];
  regions: WalkRegion[];
  interactables: Interactable[];
  archPos: THREE.Vector3; // the boss threshold in the forest
  castleEntry: THREE.Vector3; // where you land in the castle
  castleExit: THREE.Vector3; // the portal home
  shadowSpawn: THREE.Vector3;
  update(t: number, dt: number, playerZ: number): void;
}

const FOREST_R = 52;
const CASTLE_Z = -300;
const CASTLE_R = 15;

// Palette endpoints. The scene lerps between them based on the
// player's z, so walking through the portal literally feels like the
// sky changing its mind.
const FOREST_SKY = new THREE.Color("#1a2f1e");
const FOREST_FOG = new THREE.Color("#223c26");
const CASTLE_SKY = new THREE.Color("#0d1230");
const CASTLE_FOG = new THREE.Color("#141b3f");

export type BossArenaId = "empire" | "nike" | "self";

const ARENA_STYLE: Record<BossArenaId, {
  sky: THREE.Color;
  fog: THREE.Color;
  fogFar: number;
  floor: number;
  ring: number;
  radius: number;
}> = {
  empire: {
    sky: new THREE.Color("#180b14"),
    fog: new THREE.Color("#38120e"),
    fogFar: 72,
    floor: 0x33262b,
    ring: 0xff6a2d,
    radius: 22,
  },
  nike: {
    sky: new THREE.Color("#100b15"),
    fog: new THREE.Color("#241522"),
    fogFar: 48,
    floor: 0x38271f,
    ring: 0xd4a72c,
    radius: 34,
  },
  self: {
    sky: CASTLE_SKY,
    fog: CASTLE_FOG,
    fogFar: 160,
    floor: 0x5a5f7a,
    ring: 0xd4a72c,
    radius: CASTLE_R,
  },
};

export function buildWorld(scene: THREE.Scene, arenaId: BossArenaId = "self"): World {
  const rand = mulberry32(7);
  const colliders: CircleCollider[] = [];
  const interactables: Interactable[] = [];
  const arenaStyle = ARENA_STYLE[arenaId];

  scene.fog = new THREE.Fog(FOREST_FOG.clone(), 12, 90);
  scene.background = FOREST_SKY.clone();

  // One shared light rig for both islands. Hemisphere = sky color
  // bouncing onto ground color; Directional = the sun/moon that draws
  // shadows and gives flat-shaded faces their depth.
  const hemi = new THREE.HemisphereLight("#cfe8c0", "#1c2b18", 0.9);
  const sun = new THREE.DirectionalLight("#ffe9b0", 1.1);
  sun.position.set(30, 50, 20);
  scene.add(hemi, sun);

  // ─── THE FOREST ───────────────────────────────────────────
  // Ground: a big low-poly disc. Flat shading + slight vertex jitter
  // makes it read as "hand-crafted terrain" instead of a CD.
  const groundGeo = new THREE.CircleGeometry(FOREST_R + 8, 48);
  groundGeo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(
    groundGeo,
    new THREE.MeshStandardMaterial({ color: "#2e4d2a", flatShading: true })
  );
  scene.add(ground);

  // The path: a pale strip from spawn to the arch. It is the ONLY
  // navigation aid the player needs — a road is a tutorial that
  // doesn't feel like one.
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 46),
    new THREE.MeshStandardMaterial({ color: "#8a7a52", flatShading: true })
  );
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.02, -18);
  scene.add(path);

  // Trees: TWO InstancedMesh draws (one for all trunks, one for all
  // canopies) render the entire forest in 2 GPU draw calls instead of
  // 400. Instancing is the single biggest performance lever for
  // repeated low-poly props.
  const TREE_COUNT = 240;
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.34, 2.2, 6);
  trunkGeo.translate(0, 1.1, 0); // pivot at the base
  const canopyGeo = new THREE.ConeGeometry(1.7, 4.2, 7);
  canopyGeo.translate(0, 4.1, 0);
  const trunks = new THREE.InstancedMesh(
    trunkGeo,
    new THREE.MeshStandardMaterial({ color: "#4a3524", flatShading: true }),
    TREE_COUNT
  );
  const canopies = new THREE.InstancedMesh(
    canopyGeo,
    new THREE.MeshStandardMaterial({ color: "#3e6b2f", flatShading: true }),
    TREE_COUNT
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  let placed = 0;
  let guard = 0;
  while (placed < TREE_COUNT && guard++ < 4000) {
    // Scatter in an annulus around the clearing...
    const ang = rand() * Math.PI * 2;
    const dist = 7 + rand() * (FOREST_R - 6);
    const x = Math.cos(ang) * dist;
    const z = Math.sin(ang) * dist;
    // ...but never on the path corridor (|x| < 3.5 between spawn & arch).
    if (Math.abs(x) < 3.5 && z < 6 && z > -42) continue;
    const scale = 0.8 + rand() * 0.9;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2);
    s.setScalar(scale);
    m.compose(new THREE.Vector3(x, 0, z), q, s);
    trunks.setMatrixAt(placed, m);
    canopies.setMatrixAt(placed, m);
    // Only big trees block movement — brushing past a sapling is fine.
    colliders.push({ x, z, r: 0.5 * scale });
    placed++;
  }
  trunks.count = placed;
  canopies.count = placed;
  scene.add(trunks, canopies);

  // Fireflies: 60 drifting points of gold light. They cost one draw
  // call and make the "vast forest" feel alive while idle.
  const flyGeo = new THREE.BufferGeometry();
  const flyPos = new Float32Array(60 * 3);
  for (let i = 0; i < 60; i++) {
    flyPos[i * 3] = (rand() - 0.5) * 80;
    flyPos[i * 3 + 1] = 0.8 + rand() * 3.2;
    flyPos[i * 3 + 2] = (rand() - 0.5) * 80;
  }
  flyGeo.setAttribute("position", new THREE.BufferAttribute(flyPos, 3));
  const fireflies = new THREE.Points(
    flyGeo,
    new THREE.PointsMaterial({ color: "#ffd76a", size: 0.14, transparent: true, opacity: 0.9 })
  );
  scene.add(fireflies);

  // ─── MEMORY STONES ────────────────────────────────────────
  // Whisper-stones along the path: the inner chapters (doubt,
  // discipline, patience), not the resume ones. Each is a small
  // glowing monolith; its text lives in the page shell's plaque data.
  const STONE_SPOTS: { x: number; z: number; id: string }[] = [
    { x: 3.2, z: -8, id: "stone-doubt" },
    { x: -3.4, z: -20, id: "stone-discipline" },
    { x: 3.0, z: -31, id: "stone-patience" },
  ];
  const stoneMat = new THREE.MeshStandardMaterial({
    color: "#3a4a5e",
    flatShading: true,
    emissive: "#4fd1ff",
    emissiveIntensity: 0.35,
  });
  for (const spot of STONE_SPOTS) {
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8, 0), stoneMat);
    stone.position.set(spot.x, 0.9, spot.z);
    scene.add(stone);
    colliders.push({ x: spot.x, z: spot.z, r: 0.9 });
    interactables.push({
      id: spot.id,
      x: spot.x,
      z: spot.z,
      radius: 2.6,
      label: "Read the Memory Stone",
      kind: "stone",
    });
  }

  // ─── THE ARCH (boss threshold) ────────────────────────────
  // Two pillars + a lintel + a sheet of darkness. The dark portal is
  // deliberately plain — the mystery IS the design. Approaching it
  // triggers the announcement; pressing E steps through.
  const ARCH = new THREE.Vector3(0, 0, -40);
  const pillarGeo = new THREE.BoxGeometry(1.2, 6, 1.2);
  const stoneDark = new THREE.MeshStandardMaterial({ color: "#2b3242", flatShading: true });
  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(pillarGeo, stoneDark);
    pillar.position.set(side * 2.4, 3, ARCH.z);
    scene.add(pillar);
    colliders.push({ x: side * 2.4, z: ARCH.z, r: 0.9 });
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1, 1.4), stoneDark);
  lintel.position.set(0, 6.2, ARCH.z);
  scene.add(lintel);
  // The portal membrane: additive-blended dark violet, gently pulsing.
  const membrane = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 5.4),
    new THREE.MeshBasicMaterial({
      color: "#1a0533",
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    })
  );
  membrane.position.set(0, 2.9, ARCH.z);
  scene.add(membrane);
  interactables.push({
    id: "portal-in",
    x: ARCH.x,
    z: ARCH.z + 1.5,
    radius: 3.2,
    label: "Approach the Arch",
    kind: "portal-in",
  });

  // ─── THE FLOATING CASTLE ──────────────────────────────────
  // The arena: a stone disc, broken edge chunks, and floating islands
  // drifting around it. All of it hangs above a sea of clouds.
  const arena = new THREE.Mesh(
    new THREE.CylinderGeometry(arenaStyle.radius, arenaStyle.radius - 2.5, 2.4, 24),
    new THREE.MeshStandardMaterial({ color: arenaStyle.floor, flatShading: true })
  );
  arena.position.set(0, -1.2, CASTLE_Z);
  scene.add(arena);

  // Gold ring inlay: the arena's "stage mark", and the visual anchor
  // for the duel. One flat torus lying on the floor.
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(arenaStyle.radius - 3, 0.12, 6, 48),
    new THREE.MeshBasicMaterial({ color: arenaStyle.ring })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 0.06, CASTLE_Z);
  scene.add(ring);

  // Broken floor tiles radiating from center — "castle" is a ruin
  // here, which suits a boss made of doubt: imposing, but cracked.
  const tileGeo = new THREE.BoxGeometry(1.9, 0.18, 1.9);
  const tileMat = new THREE.MeshStandardMaterial({
    color: arenaId === "empire" ? "#4a3435" : arenaId === "nike" ? "#593d34" : "#6d7392",
    flatShading: true,
  });
  const tileCapacity = arenaId === "nike" ? 900 : arenaId === "empire" ? 450 : 60;
  const tileExtent = arenaId === "self" ? 3 : Math.ceil((arenaStyle.radius - 2) / 2.1);
  const tiles = new THREE.InstancedMesh(tileGeo, tileMat, tileCapacity);
  let ti = 0;
  for (let gx = -tileExtent; gx <= tileExtent && ti < tileCapacity; gx++) {
    for (let gz = -tileExtent; gz <= tileExtent && ti < tileCapacity; gz++) {
      const x = gx * 2.1 + (rand() - 0.5) * 0.3;
      const z = CASTLE_Z + gz * 2.1 + (rand() - 0.5) * 0.3;
      if (Math.hypot(x, z - CASTLE_Z) > arenaStyle.radius - 2) continue;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (rand() - 0.5) * 0.2);
      s.setScalar(0.9 + rand() * 0.2);
      m.compose(new THREE.Vector3(x, 0.09, z), q, s);
      tiles.setMatrixAt(ti++, m);
    }
  }
  tiles.count = ti;
  scene.add(tiles);

  const arenaLights: THREE.PointLight[] = [];
  if (arenaId === "empire") {
    const lava = new THREE.Mesh(
      new THREE.CircleGeometry(5.5, 24),
      new THREE.MeshBasicMaterial({ color: 0xff4b1f })
    );
    lava.rotation.x = -Math.PI / 2;
    lava.position.set(-8, 0.15, CASTLE_Z - 3);
    scene.add(lava);
    const glow = new THREE.PointLight(0xff5a1f, 65, 34);
    glow.position.set(-8, 1.4, CASTLE_Z - 3);
    scene.add(glow);
    arenaLights.push(glow);

    const rockMat = new THREE.MeshStandardMaterial({ color: 0x251a22, flatShading: true });
    for (let i = 0; i < 24; i++) {
      const a = rand() * Math.PI * 2;
      const d = 8 + rand() * 12;
      const x = Math.cos(a) * d;
      const z = CASTLE_Z + Math.sin(a) * d;
      if (Math.abs(x) < 5 && z > CASTLE_Z - 14 && z < CASTLE_Z + 10) continue;
      const height = 2 + rand() * 4;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.7 + rand() * 0.6, height, 5), rockMat);
      spike.position.set(x, height / 2, z);
      scene.add(spike);
    }
  }

  if (arenaId === "nike") {
    const wood = new THREE.MeshStandardMaterial({ color: 0x3a2418, flatShading: true });
    const wall = new THREE.MeshStandardMaterial({ color: 0x4a3040, flatShading: true });
    const trim = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, flatShading: true });
    const carpet = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 62),
      new THREE.MeshStandardMaterial({ color: 0x6d1f2a, flatShading: true })
    );
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.12, CASTLE_Z - 4);
    scene.add(carpet);

    for (const x of [-6, 6]) {
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 62), wall);
      sideWall.position.set(x, 3.5, CASTLE_Z - 4);
      scene.add(sideWall);
    }
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.5, 62), wood);
    ceiling.position.set(0, 7, CASTLE_Z - 4);
    scene.add(ceiling);

    for (let i = 0; i < 8; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = CASTLE_Z + 10 - i * 7.5;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.4, 2.2), trim);
      frame.position.set(side * 5.6, 1.7, z);
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 2.9, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x241428, flatShading: true })
      );
      door.position.set(side * 5.45, 1.55, z - 0.35);
      door.rotation.y = side * 0.22;
      scene.add(frame, door);
    }

    for (let i = 0; i < 4; i++) {
      const z = CASTLE_Z + 10 - i * 12;
      const light = new THREE.PointLight(0xffb46a, 22, 16);
      light.position.set(0, 4.9, z);
      scene.add(light);
      arenaLights.push(light);
    }
  }

  // Floating islands: inverted cones with tufts of dead grass, each
  // drifting on its own slow sine wave. Stored so update() can bob them.
  const islands: { mesh: THREE.Group; baseY: number; phase: number }[] = [];
  const rockMat = new THREE.MeshStandardMaterial({ color: "#4b5170", flatShading: true });
  const deadGrass = new THREE.MeshStandardMaterial({ color: "#7a6a3a", flatShading: true });
  for (let i = 0; i < (arenaId === "self" ? 9 : 0); i++) {
    const g = new THREE.Group();
    const rock = new THREE.Mesh(new THREE.ConeGeometry(2 + rand() * 2.5, 3.5 + rand() * 3, 6), rockMat);
    rock.rotation.x = Math.PI; // point down = floating-island silhouette
    const top = new THREE.Mesh(new THREE.CylinderGeometry(2 + rand() * 2, 2 + rand() * 2, 0.5, 7), deadGrass);
    top.position.y = 1.6;
    g.add(rock, top);
    const ang = (i / 9) * Math.PI * 2 + rand();
    const dist = CASTLE_R + 9 + rand() * 14;
    g.position.set(Math.cos(ang) * dist, -1 + rand() * 6, CASTLE_Z + Math.sin(ang) * dist);
    scene.add(g);
    islands.push({ mesh: g, baseY: g.position.y, phase: rand() * Math.PI * 2 });
  }

  // Clouds: soft translucent discs far below. MeshBasicMaterial
  // (unlit) + low opacity reads as "mist" without any shader work.
  const cloudMat = new THREE.MeshBasicMaterial({ color: "#cfd8ff", transparent: true, opacity: 0.32 });
  const clouds: { mesh: THREE.Mesh; speed: number }[] = [];
  for (let i = 0; i < (arenaId === "self" ? 22 : 0); i++) {
    const c = new THREE.Mesh(new THREE.CircleGeometry(4 + rand() * 7, 12), cloudMat);
    c.rotation.x = -Math.PI / 2;
    const ang = rand() * Math.PI * 2;
    const dist = rand() * 55;
    c.position.set(Math.cos(ang) * dist, -9 - rand() * 7, CASTLE_Z + Math.sin(ang) * dist);
    scene.add(c);
    clouds.push({ mesh: c, speed: 0.3 + rand() * 0.7 });
  }

  // The way home: a green portal on the arena's south rim. A visit,
  // not a trap — leaving is always allowed.
  const EXIT = new THREE.Vector3(0, 0, CASTLE_Z + arenaStyle.radius - 2);
  const exitMembrane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 4),
    new THREE.MeshBasicMaterial({ color: "#0d3a1a", transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  exitMembrane.position.set(EXIT.x, 2.2, EXIT.z);
  scene.add(exitMembrane);
  const exitFrame = new THREE.Mesh(new THREE.BoxGeometry(3.4, 4.6, 0.4), stoneDark);
  exitFrame.position.set(EXIT.x, 2.2, EXIT.z + 0.25);
  scene.add(exitFrame);
  interactables.push({
    id: "portal-out",
    x: EXIT.x,
    z: EXIT.z,
    radius: 2.8,
    label: "Return to the Forest",
    kind: "portal-out",
  });

  // ─── Per-frame life + the sky-lerp ────────────────────────
  // Reuse these scratch colors every frame — allocating in the hot
  // loop is how you get GC stutter on phones.
  const sky = new THREE.Color();
  const fog = new THREE.Color();

  return {
    colliders,
    regions: [
      { x: 0, z: 0, r: FOREST_R },
      { x: 0, z: CASTLE_Z, r: arenaStyle.radius },
    ],
    interactables,
    archPos: ARCH,
    castleEntry: new THREE.Vector3(0, 0, CASTLE_Z + arenaStyle.radius - 4),
    castleExit: EXIT,
    shadowSpawn: new THREE.Vector3(0, 0, CASTLE_Z - 5),

    update(t: number, dt: number, playerZ: number) {
      // Sky crossfade: 0 = deep forest, 1 = high castle. Driven by the
      // player's z so the portal trip is a gradient, not a jump cut.
      const mix = THREE.MathUtils.clamp((-playerZ - 60) / 200, 0, 1);
      sky.copy(FOREST_SKY).lerp(arenaStyle.sky, mix);
      fog.copy(FOREST_FOG).lerp(arenaStyle.fog, mix);
      (scene.background as THREE.Color).copy(sky);
      const f = scene.fog as THREE.Fog;
      f.color.copy(fog);
      // The castle is more open — let the player SEE the void below.
      f.far = THREE.MathUtils.lerp(90, arenaStyle.fogFar, mix);

      // Idle motion: fireflies shimmer, membrane breathes, islands bob.
      fireflies.rotation.y = t * 0.02;
      (fireflies.material as THREE.PointsMaterial).opacity = 0.6 + Math.sin(t * 2.1) * 0.3;
      membrane.scale.setScalar(1 + Math.sin(t * 1.7) * 0.04);
      for (const isl of islands) isl.mesh.position.y = isl.baseY + Math.sin(t * 0.5 + isl.phase) * 0.8;
      arenaLights.forEach((light, i) => {
        light.intensity = arenaId === "nike"
          ? 20 + Math.sin(t * 7 + i * 2.1) * 3
          : 58 + Math.sin(t * 1.8) * 12;
      });
      for (const c of clouds) {
        c.mesh.position.x += c.speed * dt;
        if (c.mesh.position.x > 60) c.mesh.position.x = -60; // wrap the drift
      }
    },
  };
}
