"use client"
// ─────────────────────────────────────────────────────────────────────────────
// THE FALL — the DISCOURAGED death screen.
//
// GTA has WASTED: the city's verdict on you. This game has DISCOURAGED —
// because the entire story is the rebuttal to that word. HP hits zero, the
// world desaturates, the word slams down, and then one short line — Andre's
// own history talking — before the rise. Falling isn't failing.
//
// Mock scope: the beat itself. Timing, weight, tone. Press the button, die,
// watch the rhythm: darken → slam → line → respawn.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from "react";
import MockShell from "@/components/mock/MockShell";
import { MockNote, MockTag } from "@/components/mock/hud";
import { makeMotes, makeTree, mulberry32, range } from "@/game/mock/kit";

// The lines rotate — short, in Andre's voice, always about getting back up.
// Boss kills would swap in the boss-specific line (listed in the note below).
const LINES = [
  "Rest. Then rise. The forest remembers those who return.",
  "You've told a hundred nervous new hires they were ready. Now tell yourself.",
  "67th to Navy Pier. You've walked farther than this.",
];

export default function DeathMock() {
  const [dead, setDead] = useState(false);
  const [line, setLine] = useState(0);

  // Rotate the line while the veil is up — each visit to the dirt teaches
  // something slightly different.
  useEffect(() => {
    if (!dead) return;
    const id = window.setInterval(() => setLine((l) => (l + 1) % LINES.length), 4600);
    return () => window.clearInterval(id);
  }, [dead]);

  return (
    <MockShell
      className={dead ? "dead" : ""}
      opts={{
        skyTop: 0x0b1026,
        horizon: 0x1c2b4a,
        ground: 0x1d3323,
        fogNear: 14,
        fogFar: 70,
        sun: { dir: [20, 40, 10], color: 0x8fa1d6, intensity: 0.5 },
        ambient: { sky: 0x2a3a5a, ground: 0x0d1410, intensity: 0.6 },
      }}
      build={(world) => {
        // The same forest, at night, viewed from the ground — you fell here.
        const rng = mulberry32(7); // same seed as the walk: same forest, darker
        const { scene, setEye } = world;
        setEye(0, 0.9, 8, 6, 10); // low, tilted up a touch: the fallen view
        for (let i = 0; i < 70; i++) {
          const t = makeTree(rng);
          const z = range(rng, -70, 14);
          const side = rng() > 0.5 ? 1 : -1;
          t.position.set(-z / 10 + side * range(rng, 4, 26), 0, z);
          scene.add(t);
        }
        const motes = makeMotes(rng, {
          count: 40,
          area: [14, 2, 24],
          center: [0, 1.4, -14],
          color: 0x9fb8ff,
          size: 0.12,
        });
        scene.add(motes);
        return [(t) => (motes as any).userData.update(t)];
      }}
    >
      <div className="hud">
        <MockTag label="THE FALL · DEATH SCREEN" />
        <MockNote title="WHAT TO JUDGE">
          The rhythm: world drains → the word lands → your line finds you → the
          rise is one tap away. Boss deaths swap the line: the Revenant says
          “Three months of training. You still learned the machine.”
          <div className="row">
            {!dead && <button onClick={() => setDead(true)}>▶ Simulate death</button>}
          </div>
        </MockNote>
      </div>

      {/* The veil: desaturates the world behind it (CSS on .dead .mock-canvas),
          slams the verdict, then offers the way back up. */}
      <div className={`death-veil ${dead ? "on" : ""}`}>
        <div className="death-word">DISCOURAGED</div>
        <div className="death-line">{LINES[line]}</div>
        <button className="death-respawn" onClick={() => setDead(false)}>
          RISE ↻
        </button>
      </div>
    </MockShell>
  );
}
