"use client";
// ─────────────────────────────────────────────────────────────────────────────
// THE EMERGENCE — the Future Kingdom as an interactive blueprint.
//
// The walk out of the deep forest ends here: the trees break, the light comes
// up, and the future stands on a hill — DRAWN, NOT BUILT. Every structure is
// a wireframe, because none of it has happened yet. That's the meaning: the
// drawing is the commitment. Walk close and each outline tells you what it
// is. (In this mock the plaques are always on, so you can read them all.)
//
// The quote belongs to the reveal — it would be carved on the last stone
// before the trees break: "If you have the courage to speak it, you have the
// power to create it."
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef } from "react";
import * as THREE from "three";
import MockShell from "@/components/mock/MockShell";
import { Hint, MockNote, MockTag } from "@/components/mock/hud";
import { PAL, makeCloud, makeMotes, makeTree, mulberry32, projectToScreen, range } from "@/game/mock/kit";

// A blueprint building: glowing edges over a ghost of a fill.
// fillOpacity ~0.05 keeps it "not built yet"; edges carry the drawing.
function blueprint(w: number, h: number, d: number, color: number) {
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(w, h, d);
  const fill = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.05, depthWrite: false })
  );
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95 })
  );
  fill.position.y = h / 2;
  edges.position.y = h / 2;
  g.add(fill, edges);
  g.userData.edges = edges;
  return g;
}

interface PlaqueDef {
  key: string;
  title: string;
  body: string;
  gold?: boolean;
  anchor: THREE.Vector3;
  /** Extra screen-space nudge [dx, dy] px so neighbouring plaques never stack. */
  nudge: [number, number];
}

export default function KingdomMock() {
  const plaqueRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const anchorsRef = useRef<PlaqueDef[]>([]);

  const plaques: PlaqueDef[] = [
    {
      key: "odc",
      title: "THE OPEN DOOR CENTER",
      body: "The abandoned factory on the far South Side, rebuilt — cybersecurity classes, mentoring, wellness, recreation. The door I needed, built for kids who don't have one.",
      gold: true,
      anchor: new THREE.Vector3(0, 14.5, -48),
      nudge: [0, -24],
    },
    {
      key: "watch",
      title: "THE WATCHTOWER",
      body: "The career that funds it: SOC Analyst → Threat Intel → Security Engineer → CISO by 2038. Each floor is one role — you can see the climb.",
      anchor: new THREE.Vector3(-16, 20, -47),
      nudge: [-170, 6],
    },
    {
      key: "pillars",
      title: "THE FIVE PILLARS",
      body: "The five gifts of encouragement: empathy, confidence, trust, knowledge, plain language. Touch a pillar and it inscribes its gift.",
      anchor: new THREE.Vector3(15, 12, -45),
      nudge: [80, 10],
    },
    {
      key: "lake",
      title: "THE LAKEFRONT PATH",
      body: "67th to Navy Pier. The discipline that keeps it all standing.",
      anchor: new THREE.Vector3(23, 9.5, -54),
      nudge: [90, 30],
    },
    {
      key: "plots",
      title: "UNFINISHED PLOT",
      body: "Reserved. The story isn't finished. (Buffalo Solide lands here.)",
      anchor: new THREE.Vector3(-9, 9.5, -40),
      nudge: [-60, 40],
    },
  ];
  anchorsRef.current = plaques;

  return (
    <MockShell
      opts={{
        skyTop: 0x3a5a9a,
        horizon: 0xffd9a0, // sunrise: the future is literally lit gold
        ground: PAL.grassDark,
        fogNear: 45,
        fogFar: 190,
        sun: { dir: [0, 18, -40], color: 0xffd9a0, intensity: 1.9 },
        ambient: { sky: 0x9fb8e8, ground: 0x3a5a3a, intensity: 0.95 },
      }}
      build={(world) => {
        const rng = mulberry32(99);
        const { scene, setEye, camera, renderer } = world;
        setEye(0, 1.7, 6, 0, 2);

        // ── The forest BEHIND and BESIDE you: the way you came ──
        // Dark, close trees frame the shot — the contrast is the emergence.
        for (let i = 0; i < 40; i++) {
          const t = makeTree(rng, { s: range(rng, 1.2, 2) });
          const side = rng() > 0.5 ? 1 : -1;
          t.position.set(side * range(rng, 7, 30), 0, range(rng, -18, 14));
          scene.add(t);
        }
        // Two near guardians: big, close, one each side — the last trees
        // before the world opens. THESE are what make it an emergence.
        for (const side of [-1, 1] as const) {
          const t = makeTree(rng, { s: range(rng, 2.2, 2.6), leaf: 0x2a5a30, leaf2: 0x35703a });
          t.position.set(side * range(rng, 7.5, 9.5), 0, range(rng, 1, 4));
          scene.add(t);
        }

        // ── The hill the future stands on ──
        // COMPOSITION MATH, not vibes: the hill is a dome 60m wide, 6.6m tall,
        // far enough (z=-48) that the forest floor stays flat under the trees.
        // Every structure asks hillY() for the exact surface height at its
        // spot — buildings sit ON the dome, never inside it.
        const HILL_R = 30;
        const HILL_H = 6.6;
        const HILL_C = { x: 0, z: -48, base: -1.2 };
        const hillY = (x: number, z: number) => {
          const d = Math.hypot(x - HILL_C.x, z - HILL_C.z);
          const k = Math.max(0, 1 - (d / HILL_R) ** 2);
          return HILL_C.base + Math.sqrt(k) * HILL_H;
        };
        const hill = new THREE.Mesh(
          new THREE.SphereGeometry(HILL_R, 12, 8),
          new THREE.MeshStandardMaterial({ color: PAL.grass, roughness: 1, flatShading: true })
        );
        hill.scale.y = HILL_H / HILL_R;
        hill.position.set(HILL_C.x, HILL_C.base, HILL_C.z);
        scene.add(hill);

        // ── The blueprint city ──
        const wireMats: THREE.LineBasicMaterial[] = [];
        const place = (b: THREE.Group, x: number, z: number) => {
          b.position.set(x, hillY(x, z), z);
          scene.add(b);
          wireMats.push(b.userData.edges.material as THREE.LineBasicMaterial);
        };
        // The Open Door Center: the centerpiece, drawn in gold.
        const odc = blueprint(13, 7.5, 9, PAL.blueprintGold);
        place(odc, 0, -48);
        // Its door: a second, smaller frame — the door is the point.
        const door = blueprint(2.8, 4.2, 1, PAL.blueprintGold);
        place(door, 0, -43.3);
        // The Watchtower: tallest line in the drawing.
        const watch = blueprint(3.6, 15, 3.6, PAL.blueprint);
        place(watch, -16, -47);
        // The Five Pillars in an arc.
        for (let i = 0; i < 5; i++) {
          const a = -0.5 + i * 0.25;
          const p = blueprint(1, 5, 1, PAL.blueprint);
          place(p, 15 + Math.sin(a) * 6, -44 - Math.cos(a) * 3.5);
        }
        // The Lakefront Path: a long low ribbon along the right.
        const lake = blueprint(14, 0.3, 2.6, PAL.blueprint);
        place(lake, 21, -54);
        // Two unfinished plots: knee-high walls, so "empty" still reads as
        // a drawn lot from the forest floor (a flat square vanishes at range).
        for (const [x, z] of [[-9, -40], [8, -39]] as const) {
          const plot = blueprint(4.5, 0.9, 4.5, 0x5a7a9a);
          place(plot, x, z);
        }

        // Sunrise motes + two low clouds.
        const motes = makeMotes(rng, { count: 60, area: [18, 4, 16], center: [0, 4, -40], color: 0xffe9c0, size: 0.13 });
        scene.add(motes);
        for (let i = 0; i < 3; i++) {
          const c = makeCloud(rng);
          c.position.set(range(rng, -50, 50), range(rng, 22, 30), range(rng, -80, -50));
          scene.add(c);
        }

        return [
          (t) => {
            (motes as any).userData.update(t);
            // The drawing is alive: every wire pulses gently, out of phase.
            wireMats.forEach((m, i) => (m.opacity = 0.75 + Math.sin(t * 1.3 + i * 0.9) * 0.2));
            // Project each plaque's 3D anchor onto the screen each frame, so
            // the DOM labels ride their buildings while you look around.
            const size = renderer.getSize(new THREE.Vector2());
            for (const p of anchorsRef.current) {
              const el = plaqueRefs.current[p.key];
              if (!el) continue;
              const pt = projectToScreen(p.anchor, camera, size.x, size.y);
              if (!pt) {
                el.style.display = "none";
              } else {
                el.style.display = "block";
                el.style.left = `${pt.x + p.nudge[0]}px`;
                el.style.top = `${pt.y + p.nudge[1]}px`;
              }
            }
          },
        ];
      }}
    >
      <div className="hud">
        <MockTag label="THE EMERGENCE · FUTURE KINGDOM" />
        <Hint text="DRAG to look across the grounds" />
        <MockNote title="WHAT TO JUDGE">
          Drawn, not built — every structure is a wireframe because none of it
          has happened yet. The drawing is the commitment. In the real level
          you'd walk up to each outline to open its plaque; here they ride
          their buildings so you can read every meaning at once.
          <div className="row" />
        </MockNote>
        {/* The reveal line — in the real level it's carved on the last stone
            before the trees break. */}
        <div className="hud-prompt" style={{ bottom: "12%", borderColor: "#ffd75e" }}>
          “If you have the courage to speak it, you have the power to create it.”
        </div>
      </div>

      {/* The plaques: plain DOM, positioned onto their buildings every frame */}
      {plaques.map((p) => (
        <div
          key={p.key}
          ref={(el) => {
            plaqueRefs.current[p.key] = el;
          }}
          className={`plaque ${p.gold ? "gold" : ""}`}
          style={{ display: "none" }}
        >
          <b>{p.title}</b>
          {p.body}
        </div>
      ))}
    </MockShell>
  );
}
