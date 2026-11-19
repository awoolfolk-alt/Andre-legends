// ─────────────────────────────────────────────────────────────
// THE SHADOW OF ANDRE — boss avatar, mirrored AI, and the cracks
// ─────────────────────────────────────────────────────────────
// He is you. That's the whole fight. So he moves like you (same
// speed family, same lunge), he guards the summit you're reaching
// for, and he cannot be killed by the sword — only WOUNDED. Words
// break him: every landed affirmation adds a glowing crack, and the
// eighth word doesn't destroy him — it turns him into light.
//
// "Self Doubt doesn't die. It becomes Confidence."
//
// The avatar is flat-shaded primitives like everything else, but
// with three readable signals the player learns instantly:
//   violet eyes  = he's watching / about to move
//   red flare    = TELEGRAPH — his strike is coming, back off
//   white cracks = your words living in his body
// ─────────────────────────────────────────────────────────────

import * as THREE from "three";
import type { BossArenaId } from "./world";

export type ShadowState =
  | "dormant" // standing at the spawn, waiting for the player to arrive
  | "approach" // closing the distance
  | "telegraph" // winding up — the dodge window
  | "strike" // lunging — the damage window
  | "recover" // brief vulnerability after a swing
  | "stagger" // word phase: frozen while the player spells
  | "broken" // the word just landed; crack animation playing
  | "defeated"; // dissolving into light

// WHY a state machine? It answers "can he do X right now?" in one
// place. Without it you get bugs like striking while staggered — the
// same lesson the 2D Combat.ts taught, one dimension up.
export class Shadow {
  readonly group = new THREE.Group();
  state: ShadowState = "dormant";

  readonly maxHP: number;
  hp: number;
  wordsSpoken = 0;
  private readonly wordDuel: boolean;

  private stateT = 0; // seconds spent in the current state
  private strikeDidHit = false; // one strike = one hit, max
  private body!: THREE.Mesh;
  private head!: THREE.Mesh;
  private eyes!: THREE.Mesh[];
  private eyeMat!: THREE.MeshBasicMaterial;
  private innerLight!: THREE.PointLight;
  private cracks: THREE.Mesh[] = [];
  private crackScales: number[] = []; // current scale per crack (tweened)
  private dissolveT = -1; // >=0 while the defeat animation plays
  private readonly baseBodyColor: string;

  constructor(spawn: THREE.Vector3, arenaId: BossArenaId = "self") {
    this.wordDuel = arenaId === "self";
    this.maxHP = this.wordDuel ? 800 : arenaId === "empire" ? 400 : 500;
    this.hp = this.maxHP;
    this.baseBodyColor = arenaId === "empire" ? "#1a1620" : arenaId === "nike" ? "#14091c" : "#0a0a12";
    this.buildBody(arenaId);
    this.group.position.copy(spawn);
  }

  private buildBody(arenaId: BossArenaId) {
    const bodyGeometry = arenaId === "empire"
      ? new THREE.BoxGeometry(1.35, 1.9, 0.95)
      : new THREE.CylinderGeometry(0.42, 0.62, 1.7, 8);
    this.body = new THREE.Mesh(
      bodyGeometry,
      new THREE.MeshStandardMaterial({
        color: this.baseBodyColor,
        flatShading: true,
        emissive: arenaId === "empire" ? "#662311" : arenaId === "nike" ? "#331044" : "#221133",
        emissiveIntensity: 0.5,
      })
    );
    this.body.position.y = 1.05;
    this.group.add(this.body);

    this.head = new THREE.Mesh(
      arenaId === "empire"
        ? new THREE.BoxGeometry(0.7, 0.55, 0.7)
        : new THREE.SphereGeometry(0.34, 8, 6),
      (this.body.material as THREE.MeshStandardMaterial).clone()
    );
    this.head.position.y = 2.15;
    this.group.add(this.head);

    // Eyes: two small violet orbs. MeshBasicMaterial = unlit, so they
    // glow against the dark body even with no light pointed at them.
    this.eyeMat = new THREE.MeshBasicMaterial({
      color: arenaId === "empire" ? "#ff6a2d" : arenaId === "nike" ? "#d94cff" : "#a86bff",
    });
    this.eyes = [-1, 1].map((side) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), this.eyeMat);
      eye.position.set(side * 0.13, 2.2, 0.28);
      this.group.add(eye);
      return eye;
    });

    if (arenaId === "empire") {
      const ventMat = new THREE.MeshBasicMaterial({ color: "#ff5722" });
      for (let i = 0; i < 3; i++) {
        const vent = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.55, 0.035), ventMat);
        vent.position.set(-0.3 + i * 0.3, 1.05, 0.49);
        this.group.add(vent);
      }
      const pipeMat = new THREE.MeshStandardMaterial({ color: "#56515b", flatShading: true, metalness: 0.35 });
      for (const x of [-0.42, 0.42]) {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.8, 6), pipeMat);
        pipe.position.set(x, 2.45, -0.12);
        this.group.add(pipe);
      }
    }

    // The light INSIDE him. It starts off; every word turns it up.
    // At the end it does the dissolving.
    this.innerLight = new THREE.PointLight("#ffffff", 0, 9);
    this.innerLight.position.y = 1.4;
    this.group.add(this.innerLight);

    // Pre-build the 8 cracks at fixed spots on the torso/head, all
    // scale-0 (invisible). A crack is a thin stretched octahedron —
    // a shard of light pushing out through the skin. Pre-building
    // them means the mid-fight "add a crack" is a scale tween, not an
    // allocation.
    // z ≈ 0.5 = ON the skin, not inside it (the torso's radius is
    // ~0.42-0.62, so a smaller z buries the shard in the body and the
    // crack never shows — learned the hard way from a screenshot).
    const CRACK_SPOTS: [number, number, number][] = [
      [0.1, 1.7, 0.5], [-0.25, 1.35, 0.52], [0.3, 1.0, 0.5], [-0.1, 0.75, 0.55],
      [0.18, 1.95, 0.42], [-0.32, 1.6, 0.42], [0.02, 2.2, 0.34], [-0.05, 1.15, 0.54],
    ];
    const crackGeo = new THREE.OctahedronGeometry(0.16, 0);
    crackGeo.scale(0.35, 1.6, 0.35); // tall splinter shape
    const crackMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
    for (const [x, y, z] of CRACK_SPOTS) {
      const crack = new THREE.Mesh(crackGeo, crackMat);
      crack.position.set(x, y, z);
      crack.rotation.set(Math.random() * 0.6, Math.random() * Math.PI, Math.random() * 0.6);
      crack.scale.setScalar(0.0001); // invisible until its word lands
      this.group.add(crack);
      this.cracks.push(crack);
      this.crackScales.push(0.0001);
    }
  }

  // ─── Health / segment logic ───────────────────────────────
  // The sword can only wound him down to the NEXT threshold — then
  // the dark knits shut and only a word can break the segment. This
  // guarantees the melee ⇄ word rhythm: 8 segments, 8 spells.
  currentFloor(): number {
    if (!this.wordDuel) return 0;
    return Math.max(0, this.maxHP - (this.wordsSpoken + 1) * 100);
  }

  // Returns true when the hit drove him TO the floor (→ stagger).
  damage(amount: number): boolean {
    if (this.state === "stagger" || this.state === "defeated") return false;
    const floor = this.currentFloor();
    this.hp = Math.max(floor, this.hp - amount);
    this.flash();
    return this.hp <= floor;
  }

  // Two failed spells: he drags the current segment back together.
  healSegment() {
    if (!this.wordDuel) return;
    this.hp = Math.min(this.maxHP, this.currentFloor() + 100);
  }

  // A word landed. Crack i appears; his inner light climbs.
  speakWord() {
    if (!this.wordDuel) return;
    this.wordsSpoken = Math.min(8, this.wordsSpoken + 1);
    this.state = "broken";
    this.stateT = 0;
  }

  reset() {
    this.hp = this.maxHP;
    this.wordsSpoken = 0;
    this.state = "dormant";
    this.stateT = 0;
    this.dissolveT = -1;
    for (let i = 0; i < this.cracks.length; i++) this.crackScales[i] = 0.0001;
    this.setBodyColor(this.baseBodyColor);
    this.innerLight.intensity = 0;
    this.group.visible = true;
  }

  wake() {
    if (this.state === "dormant") {
      this.state = "approach";
      this.stateT = 0;
    }
  }

  stagger() {
    this.state = "stagger";
    this.stateT = 0;
  }

  resume() {
    this.state = "approach";
    this.stateT = 0;
  }

  defeat() {
    this.state = "defeated";
    this.dissolveT = 0;
  }

  private setBodyColor(hex: string) {
    (this.body.material as THREE.MeshStandardMaterial).color.set(hex);
    (this.head.material as THREE.MeshStandardMaterial).color.set(hex);
  }

  // Duel spacing: after lunges he can end up nose-to-nose with the
  // player, which in first person means a screen full of torso. In
  // the non-approach states he politely steps back to dueling range.
  private keepDistance(dist: number, toPlayer: THREE.Vector3, dt: number) {
    if (dist > 0.01 && dist < 1.8) {
      toPlayer.normalize().multiplyScalar(-1.6 * dt); // away from player
      this.group.position.add(toPlayer);
    }
  }

  // Quick white pop on both materials when the sword connects.
  private flashT = 0;
  private flash() {
    this.flashT = 0.12;
  }

  // ─── Per-frame behavior ───────────────────────────────────
  // Returns true on the exact frame his strike should test a hit on
  // the player — the orchestrator does the actual range check.
  update(dt: number, playerPos: THREE.Vector3, onStrike: () => void) {
    this.stateT += dt;
    const pos = this.group.position;
    const toPlayer = new THREE.Vector3().subVectors(playerPos, pos);
    toPlayer.y = 0;
    const dist = toPlayer.length();

    // Always face the player (except while dissolving). He is you —
    // he never looks away.
    if (this.state !== "defeated") {
      this.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
    }

    switch (this.state) {
      case "dormant":
        // Slow breathing bob. Alive, but waiting.
        pos.y = Math.sin(this.stateT * 1.4) * 0.05;
        break;

      case "approach": {
        pos.y = 0;
        // Same speed family as the player (4.2) but slower (2.7):
        // he pressures you without ever being uncatchable.
        if (dist > 2.0) {
          toPlayer.normalize().multiplyScalar(2.7 * dt);
          pos.add(toPlayer);
        }
        if (dist < 3.4 && this.stateT > 0.8) {
          this.state = "telegraph";
          this.stateT = 0;
        }
        break;
      }

      case "telegraph":
        // The wind-up: rear back, eyes flare RED. 0.6s — long enough
        // to read, short enough to demand attention.
        pos.y = 0.15;
        this.eyeMat.color.set("#ff4455");
        if (this.stateT >= 0.6) {
          this.state = "strike";
          this.stateT = 0;
          this.strikeDidHit = false;
        }
        break;

      case "strike": {
        // The lunge: cover ground fast for 0.28s, one hit check.
        this.eyeMat.color.set("#a86bff");
        if (dist > 0.9) {
          toPlayer.normalize().multiplyScalar(9 * dt);
          pos.add(toPlayer);
        }
        if (!this.strikeDidHit && this.stateT >= 0.12) {
          this.strikeDidHit = true;
          onStrike(); // orchestrator decides if it lands (range/angle)
        }
        if (this.stateT >= 0.28) {
          this.state = "recover";
          this.stateT = 0;
        }
        break;
      }

      case "recover":
        // Spent. This is the player's punish window — 1.1s of him
        // standing there. Skilled players learn to count it.
        pos.y = 0;
        this.keepDistance(dist, toPlayer, dt);
        if (this.stateT >= 1.1) {
          this.state = "approach";
          this.stateT = 0;
        }
        break;

      case "stagger":
        // Word phase: frozen mid-flinch, trembling. The world slows
        // around him (the orchestrator owns the time scale).
        pos.y = 0.3 + Math.sin(this.stateT * 18) * 0.03;
        break;

      case "broken":
        // The word just landed: knocked back a half-step, then the
        // duel resumes (unless that was the 8th word — the
        // orchestrator checks wordsSpoken and calls defeat()).
        pos.y = 0;
        this.keepDistance(dist, toPlayer, dt);
        if (this.stateT >= 1.4) this.resume();
        break;

      case "defeated":
        // Dissolution, not explosion. He rises slightly and the light
        // inside takes him apart. The orchestrator hides the group
        // when dissolveT crosses ~2.2s.
        this.dissolveT += dt;
        pos.y = this.dissolveT * 0.8;
        this.innerLight.intensity = 2 + this.dissolveT * 6;
        this.setBodyOpacity(Math.max(0, 1 - this.dissolveT / 2));
        break;
    }

    // Crack tweens: each crack eases toward its target scale (1 once
    // its word has landed, 0.0001 before). Doing it per-frame instead
    // of instantly is what makes a crack "spiderweb across" him.
    for (let i = 0; i < this.cracks.length; i++) {
      const target = i < this.wordsSpoken ? 1 : 0.0001;
      this.crackScales[i] += (target - this.crackScales[i]) * Math.min(1, dt * 6);
      this.cracks[i].scale.setScalar(this.crackScales[i]);
    }
    // The dark drains out as words land: body black -> pale grey.
    if (this.state !== "defeated") {
      const k = this.wordsSpoken / 8;
      this.innerLight.intensity = k * 2.2;
      const c = new THREE.Color("#0a0a12").lerp(new THREE.Color("#8f8fa8"), k * 0.7);
      (this.body.material as THREE.MeshStandardMaterial).color.copy(c);
      (this.head.material as THREE.MeshStandardMaterial).color.copy(c);
    }

    // Hit flash decay.
    if (this.flashT > 0) {
      this.flashT -= dt;
      const e = this.flashT > 0 ? 2.2 : 0.5;
      (this.body.material as THREE.MeshStandardMaterial).emissiveIntensity = e;
    }
  }

  private setBodyOpacity(o: number) {
    for (const mesh of [this.body, this.head]) {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.transparent = true;
      mat.opacity = o;
    }
    for (const eye of this.eyes) eye.visible = o > 0.5;
  }

  get position(): THREE.Vector3 {
    return this.group.position;
  }
}
