"use client";
// ─────────────────────────────────────────────────────────────────────────────
// ARENA II — THE DEATH-TRAPPED MANSION. Home of the Nike Nightstalker.
//
// WHY a mansion? The Nike chapter: a beautiful place full of traps. Two
// departments carried at once; every open door another "yes" that cost you.
// So the arena is a grand hallway lined with doors — gorgeous, warm,
// flattering light... and every door is a mouth. The Nightstalker waits at
// the far end where the candles don't reach.
//
// Mock scope: interior mood. Close fog (you cannot see the end at first —
// that's the trap), warm chandelier pools against dark wood, door after door
// after door.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";
import MockShell from "@/components/mock/MockShell";
import { BossBar, Cross, Hint, MockNote, MockTag, NameBars, Skills } from "@/components/mock/hud";
import { makeFigure, makeMotes, mulberry32, range } from "@/game/mock/kit";

export default function MansionArena() {
  return (
    <MockShell
      className="with-boss"
      opts={{
        skyTop: 0x05040a,
        horizon: 0x120a14, // indoors: the "sky" is just the dark above you
        ground: 0x2e1d16, // dark wood
        fogNear: 6,
        fogFar: 46, // SHORT fog — the hall swallows its own far end
        sun: { dir: [0, 20, 10], color: 0xffd9a0, intensity: 0.25 },
        ambient: { sky: 0x3a2a3a, ground: 0x140c08, intensity: 0.55 },
      }}
      build={(world) => {
        const rng = mulberry32(33);
        const { scene, setEye } = world;
        setEye(0, 1.7, 10, 0, -1);

        const woodMat = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.95, flatShading: true });
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a3040, roughness: 1, flatShading: true });
        const trimMat = new THREE.MeshStandardMaterial({ color: 0x8a6a3a, roughness: 0.8, flatShading: true });

        // ── The hallway: floor runner, walls, ceiling ──
        // The runner: a deep red carpet pulling you toward the boss — the one
        // clear "path" in a house of false choices.
        const carpet = new THREE.Mesh(
          new THREE.PlaneGeometry(3, 60),
          new THREE.MeshStandardMaterial({ color: 0x6d1f2a, roughness: 1 })
        );
        carpet.rotation.x = -Math.PI / 2;
        carpet.position.set(0, 0.02, -18);
        scene.add(carpet);
        // Carpet trim lines.
        for (const dx of [-1.55, 1.55]) {
          const trim = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 60), new THREE.MeshBasicMaterial({ color: 0xd4a72c }));
          trim.rotation.x = -Math.PI / 2;
          trim.position.set(dx, 0.03, -18);
          scene.add(trim);
        }
        // Walls + ceiling.
        for (const dx of [-6, 6]) {
          const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 64), wallMat);
          wall.position.set(dx, 3.5, -18);
          scene.add(wall);
        }
        const ceiling = new THREE.Mesh(new THREE.BoxGeometry(12.5, 0.5, 64), woodMat);
        ceiling.position.set(0, 7, -18);
        scene.add(ceiling);

        // ── The doors: the trap made architecture ──
        // Door after door, alternating sides, each slightly ajar with darkness
        // behind it. Every one is a "yes you shouldn't have said."
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x241428, roughness: 1, flatShading: true });
        const voidMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        for (let i = 0; i < 10; i++) {
          const side = i % 2 === 0 ? -1 : 1;
          const z = 4 - i * 5.2 + range(rng, -0.8, 0.8);
          const ajar = range(rng, 0.1, 0.5);
          const frame = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.4, 2.2), trimMat);
          frame.position.set(side * 5.6, 1.7, z);
          scene.add(frame);
          // The black void behind the door.
          const void_ = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 2.9), voidMat);
          void_.position.set(side * 5.5, 1.55, z);
          void_.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
          scene.add(void_);
          const door = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.9, 1.6), doorMat);
          door.position.set(side * (5.5 - ajar * 0.8), 1.55, z + ajar * (side > 0 ? 1 : -1));
          door.rotation.y = (side > 0 ? -1 : 1) * ajar;
          scene.add(door);
        }

        // ── Chandeliers: warm pools of flattering light ──
        const flames: THREE.PointLight[] = [];
        for (let i = 0; i < 4; i++) {
          const z = -2 - i * 11; // first chandelier starts DOWN the hall, never on the camera
          const chand = new THREE.Group();
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.62, 0.06, 5, 10),
            new THREE.MeshStandardMaterial({ color: 0x8a6a3a, metalness: 0.6, roughness: 0.4, flatShading: true })
          );
          ring.rotation.x = Math.PI / 2;
          chand.add(ring);
          const candleMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
          for (let c = 0; c < 5; c++) {
            const a = (c / 5) * Math.PI * 2;
            const candle = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), candleMat);
            candle.position.set(Math.cos(a) * 0.62, 0.12, Math.sin(a) * 0.62);
            chand.add(candle);
          }
          const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.6, 4), trimMat);
          chain.position.y = 0.9;
          chand.add(chain);
          chand.position.set(0, 5.4, z);
          scene.add(chand);
          const light = new THREE.PointLight(0xffb46a, 26, 16);
          light.position.set(0, 4.9, z);
          scene.add(light);
          flames.push(light);
        }

        // ── The Nightstalker: a figure at the fog line, eyes first ──
        // You see the eyes before the body. That's deliberate.
        const stalker = makeFigure({ body: 0x14091c, head: 0x14091c, glowEyes: true, s: 1.5 });
        stalker.position.set(0, 0, -34);
        scene.add(stalker);
        // Its cold violet aura: the anti-chandelier.
        const aura = new THREE.PointLight(0x7a4de8, 30, 14);
        aura.position.set(0, 2.2, -33);
        scene.add(aura);

        // Dust motes in the candlelight — even beauty here is tired.
        const dust = makeMotes(rng, {
          count: 60,
          area: [5, 2.5, 20],
          center: [0, 2.4, -10],
          color: 0xd8b88a,
          size: 0.07,
        });
        scene.add(dust);

        return [
          (t) => {
            (dust as any).userData.update(t);
            // Candle flames flicker: each light breathes on its own rhythm.
            flames.forEach((f, i) => (f.intensity = 24 + Math.sin(t * 7 + i * 2.1) * 4 + Math.sin(t * 13 + i) * 2));
            // The Nightstalker's aura pulses slow — patient, not raging.
            aura.intensity = 26 + Math.sin(t * 1.1) * 8;
          },
        ];
      }}
    >
      <div className="hud">
        <MockTag label="ARENA II · THE MANSION" />
        <NameBars hp={0.64} />
        <BossBar name="THE NIKE NIGHTSTALKER" lost={0} />
        <Cross />
        <Skills />
        <Hint text="Every door is a yes you shouldn't have said" />
        <MockNote title="WHAT TO JUDGE">
          Beautiful, warm, and wrong. Fog hides the far end — the Nightstalker
          is eyes before it is a body. In the real fight, doors would swing
          shut to box you in; here, just judge the dread.
          <div className="row" />
        </MockNote>
      </div>
    </MockShell>
  );
}
