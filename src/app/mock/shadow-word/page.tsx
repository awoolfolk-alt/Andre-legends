"use client";
// ─────────────────────────────────────────────────────────────────────────────
// THE WORD DUEL — the mechanic only this story could have.
//
// The Shadow of Andre cannot be killed by swinging harder. The fight
// alternates: MELEE (the sword wounds it, one segment at a time) ⇄ WORD (the
// world freezes, an affirmation appears, and you TYPE it). Spelling is the
// spell: every correct letter ignites; a wrong one fizzles. Each completed
// word cracks the Shadow's dark form and white light seeps through. The
// eighth word doesn't destroy him — it transforms him. Doubt becomes
// Confidence.
//
// THIS MOCK IS FULLY PLAYABLE. Type with your keyboard, or tap the letter
// tiles (the mobile scheme). The words are Andre's own affirmation list.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import MockShell from "@/components/mock/MockShell";
import { BossBar, Cross, MockNote, MockTag } from "@/components/mock/hud";
import { PAL, dotTexture, makeCloud, makeMotes, mulberry32, range } from "@/game/mock/kit";

// The eight thresholds, in story order: you start by PROVING
// (capable/brave/strong) and end by ACCEPTING (loved/confident).
const WORDS = [
  { w: "CAPABLE", m: "You can handle challenges and succeed" },
  { w: "BRAVE", m: "Face fears with courage" },
  { w: "STRONG", m: "Inner resilience and strength" },
  { w: "WORTHY", m: "You are valued and deserving of good things" },
  { w: "GROUNDED", m: "Connected to reality and yourself" },
  { w: "RESILIENT", m: "Bouncing back from setbacks" },
  { w: "LOVED", m: "You are cherished and valued" },
  { w: "CONFIDENT", m: "Trust in your abilities and decisions" },
];

// Scramble the word's letters + a few decoys into tappable tiles.
// Deterministic-ish per attempt is fine here (UI only, not the world).
function makeTiles(word: string) {
  const pool = "ETAOINSHRDLU";
  const letters = word.split("");
  while (letters.length < word.length + 4) letters.push(pool[Math.floor(Math.random() * pool.length)]);
  return letters.sort(() => Math.random() - 0.5);
}

type Phase = "word" | "melee" | "done";

export default function WordDuel() {
  const [wordIdx, setWordIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<Phase>("word");
  const [err, setErr] = useState(false);
  const [tiles, setTiles] = useState<string[]>(() => makeTiles(WORDS[0].w));
  // The bridge into the WebGL world: React writes, the render loop reads.
  // (Never the reverse — the world stays dumb about React state.)
  const fx = useRef({ stage: 0, flash: 0 });

  const target = WORDS[wordIdx].w;

  const press = useCallback(
    (letter: string) => {
      if (phase !== "word") return;
      const need = target[typed.length];
      if (letter === need) {
        const next = typed + letter;
        setTyped(next);
        if (next === target) {
          // The word lands: a crack, a segment spent, then melee or the end.
          fx.current.flash = 1;
          fx.current.stage = wordIdx + 1;
          if (wordIdx + 1 >= WORDS.length) {
            setPhase("done");
          } else {
            setPhase("melee");
            window.setTimeout(() => {
              setWordIdx(wordIdx + 1);
              setTyped("");
              setTiles(makeTiles(WORDS[wordIdx + 1].w));
              setPhase("word");
            }, 2600);
          }
        }
      } else {
        // Misspelling works against you: the slot line shakes, nothing ignites.
        setErr(true);
        window.setTimeout(() => setErr(false), 420);
      }
    },
    [phase, target, typed, wordIdx]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toUpperCase();
      if (/^[A-Z]$/.test(k)) press(k);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  const reset = () => {
    setWordIdx(0);
    setTyped("");
    setPhase("word");
    setTiles(makeTiles(WORDS[0].w));
    fx.current.stage = 0;
    fx.current.flash = 0;
  };

  return (
    <MockShell
      className="with-boss"
      opts={{
        skyTop: 0x3d7bd9,
        horizon: 0xdfeaff,
        ground: PAL.grass,
        fogNear: 40,
        fogFar: 160,
        sun: { dir: [-40, 50, 30], color: 0xfff6e0, intensity: 1.6 },
        ambient: { sky: 0xbfd9ff, ground: 0x6a7a9a, intensity: 1.0 },
        groundRadius: 14,
      }}
      build={(world) => {
        const rng = mulberry32(77);
        const { scene, setEye } = world;
        setEye(0, 1.55, 1.2, 0, -6); // close — this is a duel, not a vista

        // Island root underfoot (same trick as the castle arena).
        const root = new THREE.Mesh(
          new THREE.ConeGeometry(10, 12, 9),
          new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 1, flatShading: true })
        );
        root.rotation.x = Math.PI;
        root.position.y = -6.3;
        scene.add(root);
        const dais = new THREE.Mesh(
          new THREE.CylinderGeometry(2.4, 2.8, 0.5, 8),
          new THREE.MeshStandardMaterial({ color: 0x8a8496, roughness: 1, flatShading: true })
        );
        dais.position.set(0, 0.25, -3.5);
        scene.add(dais);

        // ── The Shadow: custom build (we need its materials for the cracks) ──
        const shadowMat = new THREE.MeshStandardMaterial({
          color: PAL.shadowBody,
          roughness: 1,
          flatShading: true,
          emissive: 0xffffff,
          emissiveIntensity: 0, // the light seeping out starts at zero
        });
        const shadow = new THREE.Group();
        const robe = new THREE.Mesh(new THREE.ConeGeometry(0.75, 2.3, 7), shadowMat);
        robe.position.y = 1.15;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), shadowMat);
        head.position.y = 2.42;
        shadow.add(robe, head);
        shadow.position.set(0, 0.5, -3.5);
        scene.add(shadow);

        // ── The cracks: 8 pre-generated fracture groups on the robe ──
        // Each completed word reveals one group: thin white splinters that
        // glow additively. Pre-generating keeps the reveal INSTANT (no
        // geometry allocation mid-fight).
        const cracks: THREE.Group[] = [];
        const crackMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        for (let c = 0; c < 8; c++) {
          const crack = new THREE.Group();
          const segs = 3 + Math.floor(rng() * 3);
          // A jagged walk up the robe: each segment veers from the last.
          let px = range(rng, -0.3, 0.3);
          let py = range(rng, 0.3, 0.9);
          for (let s = 0; s < segs; s++) {
            const nx = px + range(rng, -0.22, 0.22);
            const ny = py + range(rng, 0.18, 0.34);
            const len = Math.hypot(nx - px, ny - py);
            const seg = new THREE.Mesh(new THREE.BoxGeometry(0.03, len, 0.03), crackMat);
            seg.position.set((px + nx) / 2, (py + ny) / 2, 0.62 - py * 0.24); // hug the cone's front
            seg.rotation.z = Math.atan2(nx - px, ny - py) * -1;
            crack.add(seg);
            px = nx;
            py = ny;
          }
          crack.visible = false;
          shadow.add(crack);
          cracks.push(crack);
        }
        // The inner light: grows with every word — what the cracks let OUT.
        const inner = new THREE.PointLight(0xfff6d8, 0, 9);
        inner.position.set(0, 1.6, -3);
        scene.add(inner);
        // White flash BURST behind the shadow for the "word lands" beat.
        // A radial texture, not a bare quad — a hard rectangle reads as a
        // sheet of paper; a soft disc reads as light.
        const flashMat = new THREE.MeshBasicMaterial({
          color: 0xfff6d8,
          map: dotTexture(),
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const flashPlane = new THREE.Mesh(new THREE.PlaneGeometry(11, 8), flashMat);
        flashPlane.position.set(0, 2.4, -6.5);
        scene.add(flashPlane);

        // Sky dressing: slow clouds + gold motes.
        const clouds: THREE.Group[] = [];
        for (let i = 0; i < 8; i++) {
          const c = makeCloud(rng);
          const a = rng() * Math.PI * 2;
          c.position.set(Math.cos(a) * range(rng, 30, 70), range(rng, -10, 6), Math.sin(a) * range(rng, 30, 70));
          c.scale.setScalar(range(rng, 1.5, 3));
          scene.add(c);
          clouds.push(c);
        }
        const motes = makeMotes(rng, { count: 40, area: [8, 3, 8], center: [0, 2, -3], color: 0xfff3c0, size: 0.1 });
        scene.add(motes);

        return [
          (t) => {
            (motes as any).userData.update(t);
            clouds.forEach((c, i) => (c.position.x += Math.sin(t * 0.03 + i) * 0.004));
            // Read the React bridge: how many words have landed (stage),
            // and decay the white flash.
            const { stage, flash } = fx.current;
            cracks.forEach((c, i) => (c.visible = i < stage));
            shadowMat.emissiveIntensity = stage * 0.1 + flash * 1.2;
            inner.intensity = stage * 6 + flash * 60;
            flashMat.opacity = flash * 0.55;
            fx.current.flash = Math.max(0, flash - 0.03); // flash always cools
            // In the end state the Shadow is gentle light, breathing.
            if (stage >= 8) {
              shadowMat.color.setHex(0xf8f4e8);
              shadow.position.y = 0.5 + Math.sin(t * 0.9) * 0.08;
            }
          },
        ];
      }}
    >
      <div className="hud">
        <MockTag label="THE HYBRID · WORD DUEL" />
        <BossBar name="THE SHADOW OF ANDRE" lost={wordIdx} />

        {/* The word phase UI */}
        {phase === "word" && (
          <div className={`word-phase ${err ? "shake" : ""}`}>
            <div className="word-slots">
              {target.split("").map((ch, i) => (
                <i key={i} className={i < typed.length ? "lit" : err && i === typed.length ? "err" : ""}>
                  {ch}
                </i>
              ))}
            </div>
            <div className="word-caption">
              Type the word. Spelling is the spell — <b>{WORDS[wordIdx].m}</b>
            </div>
            <div className="word-keys">
              {tiles.map((ch, i) => (
                <button key={`${ch}-${i}`} onClick={() => press(ch)}>
                  {ch}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* The melee interlude */}
        {phase === "melee" && (
          <div className="word-phase">
            <div className="word-caption" style={{ fontSize: 17, letterSpacing: "0.3em", color: "#ffd75e" }}>
              ⚔ THE WORD LANDS — MELEE RESUMES
            </div>
            <div className="word-caption" style={{ marginTop: 8 }}>
              (In the real fight: 20 seconds of swordwork against a cracking, desperate Shadow)
            </div>
          </div>
        )}

        {/* The transformation */}
        {phase === "done" && (
          <div className="word-phase">
            <div className="word-caption" style={{ fontSize: 20, letterSpacing: "0.2em", color: "#fff" }}>
              DOUBT DOESN'T DIE. IT TRANSFORMS.
            </div>
            <div className="word-caption" style={{ marginTop: 8 }}>
              CONFIDENCE unlocked — the aura carries his face, no longer shadowed.
            </div>
            <div className="word-keys">
              <button style={{ width: "auto", padding: "0 18px" }} onClick={reset}>
                ↻ Fight again
              </button>
            </div>
          </div>
        )}

        <Cross />
        <MockNote title="WHAT TO JUDGE">
          Fully playable: type the affirmation (keyboard or tiles). Watch the
          Shadow crack and leak light with each word — 8 words, sword between
          each. Wrong letters only stall you; they never punish. "Untimed
          Words" would be a settings toggle in the real build.
          <div className="row" />
        </MockNote>
      </div>
    </MockShell>
  );
}
