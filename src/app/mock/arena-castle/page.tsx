"use client";
// ─────────────────────────────────────────────────────────────────────────────
// ARENA III — THE FLOATING CASTLE. Home of the Shadow of Andre.
//
// WHY above the clouds? The final boss waits at the height you're reaching
// for. No ground below, no walls around you — just sky, wind, the ruin of a
// castle that was never finished, and a figure standing on the dais who has
// your face. Self Doubt doesn't ambush you in the dark. It meets you in the
// light, at the top, and asks if you're sure.
//
// Mock scope: verticality + isolation. The island floats; pieces of the
// castle drift nearby; below is nothing but cloud. Melee HUD with the
// 8-segment boss bar — each segment is one sword⇄word cycle (see the
// Word Duel mock for the other half of this fight).
// ─────────────────────────────────────────────────────────────────────────────
import * as THREE from "three";
import MockShell from "@/components/mock/MockShell";
import { BossBar, Cross, Hint, MockNote, MockTag, NameBars, Prompt, Skills } from "@/components/mock/hud";
import { PAL, blobShadow, makeCloud, makeFigure, makeMotes, mulberry32, range } from "@/game/mock/kit";

export default function CastleArena() {
  return (
    <MockShell
      className="with-boss"
      opts={{
        skyTop: 0x3d7bd9,
        horizon: 0xdfeaff, // high-altitude white-out at the rim
        ground: PAL.grass,
        fogNear: 40,
        fogFar: 180,
        sun: { dir: [-40, 50, 30], color: 0xfff6e0, intensity: 1.7 },
        ambient: { sky: 0xbfd9ff, ground: 0x6a7a9a, intensity: 1.0 },
        groundRadius: 18, // the "ground" is just the island top — small!
      }}
      build={(world) => {
        const rng = mulberry32(55);
        const { scene, setEye } = world;
        setEye(0, 1.9, 8, 0, -4);

        // ── The island: a floating disc of grass over a rock root ──
        // The underside: an inverted rough cone — the torn-out-of-the-earth look.
        const root = new THREE.Mesh(
          new THREE.ConeGeometry(13, 16, 9),
          new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 1, flatShading: true })
        );
        root.rotation.x = Math.PI;
        root.position.y = -8.2;
        scene.add(root);
        // A few jutting rocks on the underside for silhouette.
        for (let i = 0; i < 6; i++) {
          const a = rng() * Math.PI * 2;
          const spike = new THREE.Mesh(
            new THREE.ConeGeometry(range(rng, 0.8, 1.6), range(rng, 3, 7), 5),
            root.material
          );
          spike.rotation.x = Math.PI + range(rng, -0.3, 0.3);
          spike.position.set(Math.cos(a) * range(rng, 6, 10), range(rng, -9, -3), Math.sin(a) * range(rng, 6, 10));
          scene.add(spike);
        }

        // ── The castle: elegant ruin, pale stone ──
        // Broken ring wall + two standing towers + one fallen column. It was
        // never finished — like the confidence it's supposed to represent.
        const stoneMat = new THREE.MeshStandardMaterial({ color: 0xc9c2b8, roughness: 0.95, flatShading: true });
        const darkStone = new THREE.MeshStandardMaterial({ color: 0x8a8496, roughness: 1, flatShading: true });
        for (const [x, z, h] of [[-9, -14, 14], [8, -16, 10]] as const) {
          const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.2, h, 7), stoneMat);
          tower.position.set(x, h / 2, z);
          const sh = blobShadow(2.4); // contact shadow, or the tower floats visually
          sh.position.set(x, 0.02, z);
          scene.add(tower, sh);
          const crown = new THREE.Mesh(new THREE.ConeGeometry(2.3, 2.6, 7), darkStone);
          crown.position.set(x, h + 1.2, z);
          scene.add(crown);
        }
        // Broken wall arc between the towers.
        for (let i = 0; i < 5; i++) {
          const seg = new THREE.Mesh(new THREE.BoxGeometry(range(rng, 2.5, 4), range(rng, 1.5, 4.5), 1), stoneMat);
          seg.position.set(-6 + i * 2.8, seg.geometry.parameters.height / 2, -15 + Math.sin(i) * 0.8);
          scene.add(seg);
        }
        // Fallen column near the dais. Its contact shadow must sit UNDER it —
        // a blob shadow left at the origin is a giant dark ellipse mid-island.
        const fallen = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 5, 7), stoneMat);
        fallen.rotation.z = Math.PI / 2 - 0.12;
        fallen.position.set(-4, 0.5, -6);
        const fallenShadow = blobShadow(2.6);
        fallenShadow.position.set(-4, 0.02, -6);
        scene.add(fallen, fallenShadow);

        // ── The dais + the Shadow ──
        const dais = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 0.6, 8), darkStone);
        dais.position.set(0, 0.3, -9);
        scene.add(dais);
        const shadow = makeFigure({ body: PAL.shadowBody, head: PAL.shadowBody, s: 1.35 });
        shadow.position.set(0, 0.6, -9);
        scene.add(shadow);
        // Faint dark aura so it reads against the bright sky.
        const aura = new THREE.PointLight(0x4a3a8a, 18, 10);
        aura.position.set(0, 2.4, -8);
        scene.add(aura);

        // ── The sky ocean: clouds BELOW and around, not above ──
        // This is the whole "floating" trick — clouds underneath the island.
        const clouds: THREE.Group[] = [];
        for (let i = 0; i < 26; i++) {
          const c = makeCloud(rng);
          const a = rng() * Math.PI * 2;
          const d = range(rng, 30, 120);
          c.position.set(Math.cos(a) * d, range(rng, -18, -6), Math.sin(a) * d);
          c.scale.setScalar(range(rng, 1.5, 3.5));
          scene.add(c);
          clouds.push(c);
        }
        // Drifting castle shards: the ruin slowly coming apart.
        const shards: THREE.Mesh[] = [];
        for (let i = 0; i < 7; i++) {
          const shard = new THREE.Mesh(
            new THREE.IcosahedronGeometry(range(rng, 0.4, 1.3), 0),
            i % 2 ? stoneMat : darkStone
          );
          shard.position.set(range(rng, -20, 20), range(rng, 2, 14), range(rng, -30, -14));
          shard.userData = { baseY: shard.position.y, ph: rng() * Math.PI * 2 };
          scene.add(shard);
          shards.push(shard);
        }
        // Gold-white sparkles: this fight is not evil — it's honest.
        const motes = makeMotes(rng, {
          count: 50,
          area: [14, 3, 14],
          center: [0, 2.4, -8],
          color: 0xfff3c0,
          size: 0.12,
        });
        scene.add(motes);

        return [
          (t) => {
            (motes as any).userData.update(t);
            clouds.forEach((c, i) => (c.position.x += Math.sin(t * 0.04 + i * 1.7) * 0.006));
            shards.forEach((s) => {
              s.position.y = s.userData.baseY + Math.sin(t * 0.5 + s.userData.ph) * 0.8;
              s.rotation.y = t * 0.2 + s.userData.ph;
            });
            aura.intensity = 15 + Math.sin(t * 1.4) * 5;
          },
        ];
      }}
    >
      <div className="hud">
        <MockTag label="ARENA III · FLOATING CASTLE" />
        <NameBars hp={1} />
        <BossBar name="THE SHADOW OF ANDRE" lost={1} />
        <Cross />
        <Prompt k="SPACE">Strike — the sword only wounds it</Prompt>
        <Skills />
        <Hint text="8 segments · each one ends in a Word" />
        <MockNote title="WHAT TO JUDGE">
          Above the clouds, facing yourself. One bar, eight segments: melee
          spends a segment, then the fight switches to the Word Duel (next
          mock). The Shadow mirrors your moves — he is you.
          <div className="row" />
        </MockNote>
      </div>
    </MockShell>
  );
}
