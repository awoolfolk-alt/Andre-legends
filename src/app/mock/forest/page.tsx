"use client";
// ─────────────────────────────────────────────────────────────────────────────
// MOCK B-1 — THE WALK. The overworld, first person.
//
// What this mock must prove before the real build:
//   1. FEEL — eye-height camera, drag-look, gentle idle sway ("alive, not dizzy")
//   2. READABILITY — a winding path pulls the eye to the goal (the Watchtower)
//   3. DENSITY — trees form walls that guide you without fences or minimaps
//   4. THE EVENT — the boss announcement (letterbox + banner) over a live world
//
// Everything is generated from seed 7: same forest on every machine, so notes
// like "the gap after the third left tree" mean the same thing to both of us.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import * as THREE from "three";
import MockShell from "@/components/mock/MockShell";
import { Announce, Cross, Hint, MockNote, MockTag, NameBars, Prompt, Quest, Skills } from "@/components/mock/hud";
import { PAL, blobShadow, makeCloud, makeMotes, makePath, makeRock, makeTree, mulberry32, range } from "@/game/mock/kit";

export default function ForestMock() {
  // The announcement is React state: the world renders below it, unchanged.
  // (In the real game the EventBus would fire this; here a button plays it.)
  const [announce, setAnnounce] = useState(false);

  return (
    <MockShell
      opts={{
        skyTop: PAL.forestSkyTop,
        horizon: PAL.forestHorizon,
        ground: PAL.grass,
        fogNear: 26,
        fogFar: 130,
        sun: { dir: [30, 60, 20], color: 0xfff2d0, intensity: 1.5 },
        ambient: { sky: 0xbfe3ff, ground: 0x3f6b3a, intensity: 0.9 },
      }}
      build={(world) => {
        const rng = mulberry32(7); // THE forest. Change the seed, get a new one.
        const { scene, setEye } = world;
        setEye(0, 1.7, 9, 4, -2); // eye height 1.7m, looking down the path

        // The path: a handful of waypoints, the stones follow the curve.
        // It bends left so the Watchtower reveals itself slowly — that's the
        // "emergence" trick reused from the Kingdom design.
        const path = makePath([
          new THREE.Vector3(0, 0, 12),
          new THREE.Vector3(1.5, 0, -4),
          new THREE.Vector3(-2.5, 0, -20),
          new THREE.Vector3(-4, 0, -40),
          new THREE.Vector3(-6, 0, -66),
        ]);
        scene.add(path);

        // Tree walls: two loose columns flanking the path. Density falls off
        // with distance — near trees are individuals, far trees are a mass.
        for (let i = 0; i < 90; i++) {
          const t = makeTree(rng);
          const z = range(rng, -95, 16);
          const side = rng() > 0.5 ? 1 : -1;
          // keep a clear corridor around the path (path x ≈ -z/9, loosely)
          const corridor = 4.5 + Math.abs(z) * 0.02;
          const x = -z / 10 + side * range(rng, corridor, corridor + 26);
          t.position.set(x, 0, z);
          scene.add(t);
        }
        // Distant masses beyond the fog line — the world must not END at fog.
        for (let i = 0; i < 14; i++) {
          const t = makeTree(rng, { s: range(rng, 2.2, 3.6) });
          const a = range(rng, Math.PI * 0.6, Math.PI * 1.4);
          const d = range(rng, 120, 190);
          t.position.set(Math.sin(a) * d, 0, -Math.abs(Math.cos(a)) * d - 40);
          scene.add(t);
        }
        // Rolling hills on the horizon (flattened spheres, fog does the rest).
        const hillMat = new THREE.MeshStandardMaterial({ color: PAL.grassDark, roughness: 1, flatShading: true });
        for (let i = 0; i < 5; i++) {
          const hill = new THREE.Mesh(new THREE.SphereGeometry(range(rng, 30, 55), 8, 5), hillMat);
          hill.scale.y = 0.22;
          hill.position.set(range(rng, -140, 140), -2, range(rng, -220, -140));
          scene.add(hill);
        }
        // Rocks + undergrowth near the path: "traces of use".
        for (let i = 0; i < 16; i++) {
          const r = makeRock(rng);
          r.position.set(range(rng, -14, 14), 0, range(rng, -60, 12));
          if (Math.abs(r.position.x + r.position.z / 10) < 2.5) r.position.x += 5; // off the path
          scene.add(r);
        }

        // ── The Watchtower (the SOC desk, on the horizon) ──
        // A dark silhouette with lit windows: the goal reads from 70m away.
        const tower = new THREE.Group();
        const twMat = new THREE.MeshStandardMaterial({ color: 0x1a2138, roughness: 0.9, flatShading: true });
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3, 16, 6), twMat);
        shaft.position.y = 8;
        const deck = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.4, 6.4), twMat);
        deck.position.y = 17.5;
        const roof = new THREE.Mesh(new THREE.ConeGeometry(4.6, 3, 4), new THREE.MeshStandardMaterial({ color: 0x1c2238, flatShading: true }));
        roof.position.y = 20.8;
        roof.rotation.y = Math.PI / 4;
        tower.add(shaft, deck, roof);
        // Lit windows: tiny emissive planes — the tower is AWAKE.
        const winMat = new THREE.MeshBasicMaterial({ color: 0x9fe8ff });
        for (const dx of [-1.6, 0, 1.6]) {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.1), winMat);
          win.position.set(dx, 17.6, 3.25);
          tower.add(win);
        }
        tower.position.set(-6, 0, -72);
        scene.add(tower);

        // ── The Shrine (boss threshold) ──
        // Where you choose the fight. Slab + floating rune + stone ring.
        const shrine = new THREE.Group();
        const slab = new THREE.Mesh(
          new THREE.CylinderGeometry(1.5, 1.8, 0.5, 7),
          new THREE.MeshStandardMaterial({ color: PAL.stoneDark, roughness: 1, flatShading: true })
        );
        slab.position.y = 0.25;
        const rune = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.45, 0),
          new THREE.MeshStandardMaterial({ color: 0x7a4de8, emissive: 0x5a2ed8, emissiveIntensity: 1.4, flatShading: true })
        );
        rune.position.y = 1.8;
        shrine.add(slab, rune, blobShadow(2));
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          const stone = new THREE.Mesh(
            new THREE.BoxGeometry(0.34, range(rng, 0.7, 1.3), 0.3),
            new THREE.MeshStandardMaterial({ color: PAL.stone, roughness: 1, flatShading: true })
          );
          stone.position.set(Math.cos(a) * 2.4, 0.45, Math.sin(a) * 2.4);
          stone.rotation.y = a;
          shrine.add(stone);
        }
        shrine.position.set(3.5, 0, -4);
        scene.add(shrine);

        // Clouds drift; fireflies hover. Both read the one clock.
        const clouds: THREE.Group[] = [];
        for (let i = 0; i < 4; i++) {
          const c = makeCloud(rng);
          c.position.set(range(rng, -60, 60), range(rng, 26, 40), range(rng, -90, -30));
          scene.add(c);
          clouds.push(c);
        }
        const motes = makeMotes(rng, {
          count: 70,
          area: [16, 2.2, 30],
          center: [0, 1.6, -20],
          color: 0xffe9a0,
          size: 0.16,
        });
        scene.add(motes);

        return [
          (t) => {
            (motes as any).userData.update(t);
            rune.position.y = 1.8 + Math.sin(t * 1.6) * 0.15; // the rune breathes
            rune.rotation.y = t * 0.8;
            clouds.forEach((c, i) => (c.position.x += Math.sin(t * 0.05 + i) * 0.004));
          },
        ];
      }}
    >
      <div className="hud">
        <MockTag label="MOCK B-1 · THE WALK" />
        <NameBars />
        <Quest title="Answer the Call" hint="Follow the path north. The Watchtower waits." count="1 / 7 quests" />
        <Cross />
        <Prompt k="E">Read the Shrine of the Machine</Prompt>
        <Skills />
        <Hint />
        <MockNote title="WHAT TO JUDGE">
          First-person feel: drag to look, watch the path pull you toward the
          Watchtower. The shrine (right, purple rune) is where a boss would be
          chosen — read it, confirm, get pulled into their world.
          <div className="row">
            <button onClick={() => { setAnnounce(true); window.setTimeout(() => setAnnounce(false), 4200); }}>
              ▶ Demo: boss announcement
            </button>
          </div>
        </MockNote>
        <Announce on={announce} sub="A LESSON STIRS" title="THE EMPIRE REVENANT" />
      </div>
    </MockShell>
  );
}
