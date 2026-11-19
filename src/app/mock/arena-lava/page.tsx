"use client";
// ─────────────────────────────────────────────────────────────────────────────
// ARENA I — THE LAVA CAVE. Home of the Empire Revenant.
//
// WHY a lava cave? The Empire Cooler chapter: an unknown machine, pressure,
// heat, "figure it out." The arena IS the memory — dark rock closing in, one
// pool of molten light, and the Machine waiting at the center of it. The boss
// isn't a creature; it's the machine you had to learn in three months
// instead of six. Beating it is advocacy: Courage, unlocked.
//
// Mock scope: mood + readability only. One light story (molten orange vs.
// cold dark rock), the boss readable as a silhouette at a glance.
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";
import MockShell from "@/components/mock/MockShell";
import { BossBar, Cross, Hint, MockNote, MockTag, NameBars, Skills } from "@/components/mock/hud";
import { PAL, makeMotes, makeRock, mulberry32, range } from "@/game/mock/kit";

export default function LavaArena() {
  return (
    <MockShell
      className="with-boss"
      opts={{
        skyTop: 0x0d070f,
        horizon: 0x38120e, // the whole cave breathes molten red at the rim
        ground: 0x241a24,
        fogNear: 10,
        fogFar: 70,
        sun: { dir: [-10, 30, 10], color: 0xff7a3d, intensity: 0.7 },
        ambient: { sky: 0x4a2338, ground: 0x1a0f14, intensity: 0.7 },
      }}
      build={(world) => {
        const rng = mulberry32(21);
        const { scene, setEye } = world;
        setEye(0, 1.7, 11, 0, -3);

        // ── The Machine (the Revenant itself) ──
        // Assembled from industrial primitives: a furnace body, exhaust pipes,
        // a grinding gear, vent slits that glow like a furnace door.
        const boss = new THREE.Group();
        const iron = new THREE.MeshStandardMaterial({ color: 0x1a1620, roughness: 0.85, metalness: 0.35, flatShading: true });
        const body = new THREE.Mesh(new THREE.BoxGeometry(4.6, 4.2, 3.6), iron);
        body.position.y = 2.4;
        boss.add(body);
        // Pipes: two stacks reaching up, slightly different heights.
        for (const [dx, h] of [[-1.5, 3.4], [1.2, 2.6]] as const) {
          const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, h, 6), iron);
          pipe.position.set(dx, 4.4 + h / 2 - 1, -0.8);
          boss.add(pipe);
        }
        // The gear: a torus with teeth (boxes around the rim) that turns
        // forever — the grind that never stops unless you stop it.
        const gear = new THREE.Group();
        const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.3, 6, 12), iron);
        gear.add(ring);
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.42), iron);
          tooth.position.set(Math.cos(a) * 1.75, Math.sin(a) * 1.75, 0);
          tooth.rotation.z = a;
          gear.add(tooth);
        }
        gear.position.set(0, 2.6, 1.95);
        boss.add(gear);
        // Furnace vents: five emissive slits across the body — the heat inside.
        const ventMat = new THREE.MeshBasicMaterial({ color: PAL.lavaHot });
        for (let i = 0; i < 5; i++) {
          const vent = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 1.5), ventMat);
          vent.position.set(-1.4 + i * 0.7, 2.2, 1.82);
          boss.add(vent);
        }
        // Furnace mouth: the wide glow at the base.
        const mouth = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.8), new THREE.MeshBasicMaterial({ color: PAL.lava }));
        mouth.position.set(0, 0.9, 1.82);
        boss.add(mouth);
        boss.position.set(0, 0, -7);
        scene.add(boss);

        // The boss's own light: a molten point light that makes the cave
        // walls near it glow — the Revenant illuminates its lair.
        const glow = new THREE.PointLight(0xff6a2d, 60, 34);
        glow.position.set(0, 2.5, -4);
        scene.add(glow);

        // ── Lava pool ──
        // An emissive disc with a slow breathing pulse (see updater below).
        const lavaMat = new THREE.MeshBasicMaterial({ color: PAL.lava });
        const lava = new THREE.Mesh(new THREE.CircleGeometry(5.5, 24), lavaMat);
        lava.rotation.x = -Math.PI / 2;
        lava.position.set(-8, 0.03, -3);
        scene.add(lava);
        const crustMat = new THREE.MeshBasicMaterial({ color: 0x2b1010 });
        for (let i = 0; i < 8; i++) {
          // Floating crust plates: dark islands drifting on the melt.
          const plate = new THREE.Mesh(new THREE.CircleGeometry(range(rng, 0.4, 1.1), 6), crustMat);
          plate.rotation.x = -Math.PI / 2;
          const a = rng() * Math.PI * 2;
          const d = range(rng, 1, 4.6);
          plate.position.set(-8 + Math.cos(a) * d, 0.045, -3 + Math.sin(a) * d);
          scene.add(plate);
        }
        const lavaLight = new THREE.PointLight(0xff5a1f, 80, 30);
        lavaLight.position.set(-8, 1.4, -3);
        scene.add(lavaLight);

        // ── Cave dressing: stalagmites + stalactites, a rock ring ──
        const rockMat = new THREE.MeshStandardMaterial({ color: PAL.caveRock, roughness: 1, flatShading: true });
        for (let i = 0; i < 26; i++) {
          const a = rng() * Math.PI * 2;
          const d = range(rng, 12, 30);
          const x = Math.cos(a) * d;
          const z = Math.sin(a) * d - 6;
          // SIGHTLINE RULE: never plant a spike on the camera→boss axis.
          // The Revenant must be readable the instant you walk in.
          if (Math.abs(x) < 5 && z > -14 && z < 12) continue;
          const spike = new THREE.Mesh(new THREE.ConeGeometry(range(rng, 0.5, 1.4), range(rng, 2, 6.5), 5), rockMat);
          spike.position.set(x, spike.geometry.parameters.height / 2 - 0.2, z);
          scene.add(spike);
        }
        for (let i = 0; i < 14; i++) {
          const a = rng() * Math.PI * 2;
          const d = range(rng, 6, 24);
          const spike = new THREE.Mesh(new THREE.ConeGeometry(range(rng, 0.4, 1), range(rng, 1.5, 4), 5), rockMat);
          spike.rotation.x = Math.PI; // hanging down
          spike.position.set(Math.cos(a) * d, range(rng, 8, 12), Math.sin(a) * d - 6);
          scene.add(spike);
        }
        for (let i = 0; i < 10; i++) {
          const r = makeRock(rng, 0x3a2b38);
          r.position.set(range(rng, -14, 14), 0, range(rng, -16, 8));
          scene.add(r);
        }

        // Embers rising off the lava — the one living motion in a dead place.
        const embers = makeMotes(rng, {
          count: 90,
          area: [9, 3, 9],
          center: [-3, 2.5, -4],
          color: 0xffa54d,
          size: 0.14,
          rise: true,
        });
        scene.add(embers);

        return [
          (t) => {
            (embers as any).userData.update(t);
            gear.rotation.z = t * 0.5; // the grind
            // The lava breathes: emissive pulses slowly, like a sleeping thing.
            const pulse = 0.85 + Math.sin(t * 1.8) * 0.15;
            lavaMat.color.setHex(PAL.lava).multiplyScalar(pulse);
            lavaLight.intensity = 70 + Math.sin(t * 1.8) * 18;
            glow.intensity = 55 + Math.sin(t * 2.3) * 10;
          },
        ];
      }}
    >
      <div className="hud">
        <MockTag label="ARENA I · LAVA CAVE" />
        <NameBars hp={0.82} />
        <BossBar name="THE EMPIRE REVENANT" lost={0} />
        <Cross />
        <Skills />
        <Hint text="SPACE strike · SHIFT dash · Q Courage" />
        <MockNote title="WHAT TO JUDGE">
          The Machine: furnace vents, the turning gear, heat off the lava. One
          boss at a time — you arrive through its shrine, the announcement
          plays, and the cave is the whole world until one of you falls.
          <div className="row" />
        </MockNote>
      </div>
    </MockShell>
  );
}
