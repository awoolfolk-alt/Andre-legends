// ─────────────────────────────────────────────────────────────
// PROTOTYPE ORCHESTRATOR — Mock B-1 (the Walk) + B-2 (the Fight)
// ─────────────────────────────────────────────────────────────
// This file owns the game's BRAIN. It knows six states and moves
// the player between them:
//
//   title → play → pause ─┐
//             ↓    ↑      │  (ESC / button)
//           word phase    │  (the Shadow hits a 1/8 threshold)
//             ↓           │
//           dead ─────────┘  (hp 0 → "DISCOURAGED" → respawn)
//             ↓
//           victory          (the 8th word lands)
//
// React (the page shell) owns the DOM overlays; this file owns the
// 3D world. They talk through one small hooks object — imperative
// game code never touches React state directly, and React never
// reaches into the scene. That wall keeps both sides simple.
// ─────────────────────────────────────────────────────────────

import * as THREE from "three";
import { FirstPersonRig } from "./rig";
import { buildWorld, type BossArenaId, type World, type Interactable } from "./world";
import { Shadow } from "./shadow";
import { AFFIRMATIONS, gradeAttempt, isExact, type LetterState } from "./words";
import { armAudio, sfx } from "./sfx";

// The states React needs to know about. "word" is a sub-state of play
// but the UI treats it as its own screen, so it gets its own name.
export type ProtoState = "title" | "play" | "pause" | "word" | "dead" | "victory";

export interface WordPhaseInfo {
  index: number; // 0-based: which affirmation
  total: number;
  word: string;
  timeLimit: number; // seconds; Infinity when "Untimed Words" is on
}

export interface HudState {
  hp: number;
  maxHp: number;
  bossId: BossArenaId;
  bossName: string;
  shadowHp: number;
  shadowMax: number;
  wordsSpoken: number;
  inCastle: boolean;
  prompt: string | null; // "E — Read the Memory Stone" etc.
}

export interface ProtoHooks {
  onState(s: ProtoState): void;
  onHud(h: HudState): void;
  onAnnouncement(text: string): void;
  onWordPhase(info: WordPhaseInfo | null): void;
  onWordCountdown(secondsLeft: number): void;
  onWordTimer(secondsLeft: number): void;
  onWordResult(letters: LetterState[], ok: boolean): void;
  onPlaque(stoneId: string | null): void;
  onPortalConfirm(open: boolean): void;
  onDeath(line: string): void;
  onVictory(stats: { seconds: number; misses: number }): void;
}

// Death lines rotate by context — short, in Andre's voice, always
// pointed at getting back up. Falling isn't failing.
const DEATH_LINES = [
  "Rest. Then rise. The forest remembers those who return.",
  "You've told a hundred nervous new hires they were ready. Now tell yourself.",
  "67th to Navy Pier. You've walked farther than this.",
];
const SHADOW_DEATH_LINE = "Doubt only wins if you stay down.";

const WORD_TIME_LIMIT = 20; // seconds per spell (toggleable off)

const BOSS_ARENAS: Record<BossArenaId, { name: string; lesson: string }> = {
  empire: { name: "THE EMPIRE REVENANT", lesson: "ADVOCATE FOR YOURSELF" },
  nike: { name: "THE NIKE NIGHTSTALKER", lesson: "THE COST OF EVERY YES" },
  self: { name: "THE SHADOW OF ANDRE", lesson: "SELF DOUBT, AT THE SUMMIT" },
};

export class Prototype {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private rig: FirstPersonRig;
  private world: World;
  private shadow: Shadow;
  private hooks: ProtoHooks;
  private readonly bossId: BossArenaId;
  private readonly bossName: string;
  private readonly bossLesson: string;
  private readonly autoStartBoss: boolean;

  state: ProtoState = "title";
  private paused = false;

  // Player combat numbers. 100 hp, 25 dmg per slash: 4 clean hits
  // per Shadow segment — short enough to keep the rhythm moving.
  private hp = 100;
  private readonly maxHp = 100;
  private readonly slashDamage = 25;
  private swingT = -1; // -1 = not swinging; else seconds since swing start
  private swingDidCheck = false;
  private shake = 0; // camera shake energy, decays each frame

  // Fight bookkeeping
  private announced = false; // the "HE HAS APPEARED" banner fires once
  private fightStarted = false;
  private fightClock = 0;
  private misses = 0;
  private wordFails = 0; // failed spells in the CURRENT word phase
  private wordTimer = 0; // seconds left in the current word phase
  private wordCountdown = 0;
  private heartbeatT = 0;
  private untimedWords = false;

  // The sword you see in first person. A viewmodel = a mesh glued to
  // the camera, animated by timers, never by physics.
  private sword = new THREE.Group();

  private timeScale = 1; // slow-mo dial: 1 normal, ~0.15 during spells
  private clock = 0; // world time (scaled), drives idle animations
  private acc = 0; // fixed-timestep accumulator
  private lastFrame = 0;
  private raf = 0;
  private disposed = false;

  // Scratch vectors — reused every frame. Never allocate in the loop.
  private tmpA = new THREE.Vector3();
  private tmpB = new THREE.Vector3();

  constructor(
    canvas: HTMLCanvasElement,
    hooks: ProtoHooks,
    opts: { untimed: boolean; bossId?: BossArenaId }
  ) {
    this.hooks = hooks;
    this.untimedWords = opts.untimed;
    this.bossId = opts.bossId ?? "self";
    this.autoStartBoss = opts.bossId !== undefined;
    this.bossName = BOSS_ARENAS[this.bossId].name;
    this.bossLesson = BOSS_ARENAS[this.bossId].lesson;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    // Cap DPR at 2: retina phones push 3x, which is 2.25x the pixels
    // for a difference nobody can see mid-swing.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.rig = new FirstPersonRig(1);
    this.world = buildWorld(this.scene, this.bossId);
    this.rig.setWorld(this.world.colliders, this.world.regions);
    // yaw = 0 faces -Z (the arch is north at z=-40); yaw = π would
    // turn your back to it. Convention check: forward = (-sin, -cos).
    this.rig.teleport(0, 6, 0);

    this.shadow = new Shadow(this.world.shadowSpawn, this.bossId);
    this.scene.add(this.shadow.group);

    this.buildSword();
    this.resize();
    window.addEventListener("resize", this.resize);

    // Test/verification hooks: tiny, documented, and harmless in
    // production. verify passes drive the game through these + real
    // key events.
    const probe = () => ({
      state: this.state,
      x: this.rig.position.x,
      z: this.rig.position.z,
      yaw: this.rig.yaw,
      hp: this.hp,
      shadowHp: this.shadow.hp,
      shadowState: this.shadow.state,
      wordsSpoken: this.shadow.wordsSpoken,
      // Performance counters: draw calls + triangles per frame. The
      // budget for this low-poly world is <50 calls / <100k tris.
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
    });
    (window as unknown as Record<string, unknown>).__gameProbe = probe;
    (window as unknown as Record<string, unknown>).__protoDebug = {
      teleportToCastle: () => this.enterCastle(),
      hurtPlayer: (n: number) => this.damagePlayer(n),
      hurtShadow: (n: number) => this.applySlashDamage(n),
      faceShadow: () =>
        this.rig.faceToward(this.shadow.position.x, this.shadow.position.z, Math.PI),
      probe,
    };
  }

  // ─── The sword viewmodel ──────────────────────────────────
  private buildSword() {
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.09, 0.85),
      new THREE.MeshStandardMaterial({ color: "#cfd6e6", flatShading: true, metalness: 0.6, roughness: 0.35 })
    );
    blade.position.z = -0.55;
    const guard = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.05, 0.06),
      new THREE.MeshStandardMaterial({ color: "#d4a72c", flatShading: true })
    );
    guard.position.z = -0.12;
    const grip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.035, 0.18, 6),
      new THREE.MeshStandardMaterial({ color: "#3a2a1a", flatShading: true })
    );
    grip.rotation.x = Math.PI / 2;
    // Held low-right, like a relaxed ready stance.
    this.sword.add(blade, guard, grip);
    this.sword.position.set(0.32, -0.28, -0.5);
    this.rig.camera.add(this.sword);
    this.scene.add(this.rig.camera); // camera must be in-scene for children to render
  }

  // ─── State changes (the only place state is written) ──────
  private setState(s: ProtoState) {
    this.state = s;
    this.hooks.onState(s);
  }

  start() {
    armAudio(); // the Start click is our legal audio unlock gesture
    this.setState("play");
    this.pushHud();
    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.frame);
    if (this.autoStartBoss) this.enterCastle();
  }

  togglePause(force?: boolean) {
    if (this.state !== "play" && this.state !== "pause") return;
    const wantPause = force ?? !this.paused;
    if (wantPause === this.paused) return;
    this.paused = wantPause;
    this.setState(this.paused ? "pause" : "play");
  }

  swing() {
    if (this.state !== "play" || this.paused) return;
    if (this.swingT >= 0) return; // one swing at a time (0.5s cooldown built into the anim)
    this.swingT = 0;
    this.swingDidCheck = false;
    // Melee magnetism: if the Shadow is close, the swing tugs your aim
    // toward him (max ~20°). First-person melee without lock-on must
    // forgive — on touch especially, pixel-aiming a duel is misery.
    const d = this.tmpA.subVectors(this.shadow.position, this.rig.position).length();
    if (d < 3.5) {
      this.rig.faceToward(this.shadow.position.x, this.shadow.position.z, 0.35);
    }
    sfx.swing();
  }

  // The hit check, separated from swing() so tests can call it too.
  // Range 2.6m, cone ±55° — generous, because first-person melee
  // with no lock-on must forgive.
  private trySlashHit(damage = this.slashDamage) {
    if (this.state !== "play") return;
    const toShadow = this.tmpA.subVectors(this.shadow.position, this.rig.position);
    toShadow.y = 0;
    const dist = toShadow.length();
    if (dist > 2.9) return;
    const fwd = this.rig.forwardXZ(this.tmpB);
    if (fwd.dot(toShadow.normalize()) < Math.cos((70 * Math.PI) / 180)) return;
    this.applySlashDamage(damage);
  }

  // Damage application lives apart from the geometry check so the
  // verification hook (__protoDebug.hurtShadow) can exercise the
  // exact production path without faking distances.
  private applySlashDamage(damage = this.slashDamage) {
    const hitFloor = this.shadow.damage(damage);
    sfx.hit();
    this.shake = Math.min(this.shake + 0.12, 0.3);
    if (hitFloor && this.bossId === "self") this.beginWordPhase();
    else if (this.shadow.hp <= 0) this.finishFight();
    this.pushHud();
  }

  // ─── The word phase ───────────────────────────────────────
  private beginWordPhase() {
    // The stagger knocks the PLAYER back a step too — the spell is
    // spoken at reading distance, not nose-to-nose.
    const away = this.tmpA.subVectors(this.rig.position, this.shadow.position);
    away.y = 0;
    if (away.lengthSq() > 0.01) {
      away.normalize().multiplyScalar(1.6);
      const r = this.world.regions[1]; // the castle platform
      const nx = this.rig.position.x + away.x;
      const nz = this.rig.position.z + away.z;
      if (Math.hypot(nx - r.x, nz - r.z) < r.r - 1) {
        this.rig.position.set(nx, 0, nz);
      }
    }
    this.shadow.stagger();
    this.setState("word");
    this.timeScale = 0.15; // the world holds its breath
    this.wordFails = 0;
    this.wordCountdown = 3;
    this.wordTimer = Infinity;
    this.hooks.onWordCountdown(this.wordCountdown);
    this.heartbeatT = 0;
    const i = this.shadow.wordsSpoken;
    this.hooks.onWordPhase({
      index: i,
      total: AFFIRMATIONS.length,
      word: AFFIRMATIONS[i].word,
      timeLimit: this.untimedWords ? Infinity : WORD_TIME_LIMIT,
    });
    document.exitPointerLock?.(); // free the cursor for the spell UI
  }

  // React calls this with the player's attempt (typed or tiled).
  submitWord(attempt: string): { ok: boolean; letters: LetterState[] } {
    const i = this.shadow.wordsSpoken;
    const target = AFFIRMATIONS[i].word;
    if (this.wordCountdown > 0) return { ok: false, letters: gradeAttempt("", target) };
    const ok = isExact(attempt, target);
    const letters = gradeAttempt(attempt, target);
    this.hooks.onWordResult(letters, ok);

    if (ok) {
      sfx.crack();
      this.shadow.speakWord();
      this.hooks.onWordPhase(null); // close the spell UI
      this.timeScale = 1;
      if (this.shadow.wordsSpoken >= AFFIRMATIONS.length) {
        // The final word: freeze the countdown so it can't "expire"
        // mid-dissolve and yank the fight back out of the victory.
        this.wordTimer = Infinity;
        this.finishFight();
      } else {
        this.setState("play");
      }
    } else {
      sfx.fail();
      this.misses++;
      this.wordFails++;
      // Two failed spells (or the timer ran out): he knits the
      // segment shut and the duel resumes. Pressure, not cruelty —
      // no HP loss for a misspelling.
      if (this.wordFails >= 2) {
        this.shadow.healSegment();
        this.shadow.resume();
        this.hooks.onWordPhase(null);
        this.timeScale = 1;
        this.setState("play");
      }
    }
    this.pushHud();
    return { ok, letters };
  }

  private wordTimeout() {
    this.misses++;
    this.shadow.healSegment();
    this.shadow.resume();
    this.hooks.onWordPhase(null);
    this.timeScale = 1;
    this.setState("play");
    this.pushHud();
  }

  // ─── Damage, death, rebirth ───────────────────────────────
  private damagePlayer(n: number) {
    if (this.state !== "play") return;
    this.hp = Math.max(0, this.hp - n);
    sfx.hurt();
    this.shake = Math.min(this.shake + 0.35, 0.6);
    if (this.hp <= 0) {
      sfx.deathThump();
      this.timeScale = 0.2; // GTA slow-mo
      // The Shadow's kills get HIS line; everything else rotates.
      const inCastle = this.rig.position.z < -200;
      const line = inCastle
        ? this.bossId === "self"
          ? SHADOW_DEATH_LINE
          : "Rest. The arena waits — return when you're ready."
        : DEATH_LINES[Math.floor(this.clock) % DEATH_LINES.length];
      this.setState("dead");
      this.hooks.onDeath(line);
    }
    this.pushHud();
  }

  respawn() {
    // Falling isn't failing: full health, the Shadow forgives (and
    // forgets) the fight, and you wake at the arch that called you.
    this.hp = this.maxHp;
    this.timeScale = 1;
    this.shadow.reset();
    this.fightStarted = false;
    this.misses = 0;
    const diedInCastle = this.rig.position.z < -200;
    if (diedInCastle) {
      this.rig.teleport(this.world.castleEntry.x, this.world.castleEntry.z, 0);
    } else {
      this.rig.teleport(0, 6, 0);
    }
    this.setState("play");
    this.pushHud();
    if (diedInCastle) window.setTimeout(() => this.awakenBoss(), 1200);
  }

  restartAll() {
    this.respawn();
    this.announced = false;
    this.rig.teleport(0, 6, 0);
  }

  // ─── Travel between worlds ────────────────────────────────
  enterCastle() {
    sfx.portal();
    // yaw 0 = facing -Z = facing the Shadow, waiting at the far rim.
    this.rig.teleport(this.world.castleEntry.x, this.world.castleEntry.z, 0);
    this.hooks.onPortalConfirm(false);
    // He wakes a beat after you arrive — the arena gets a moment to
    // be beautiful before it gets dangerous.
    window.setTimeout(() => this.awakenBoss(), 1200);
  }

  private awakenBoss() {
    if (this.state !== "play" || this.fightStarted) return;
    this.fightStarted = true;
    this.fightClock = 0;
    this.shadow.wake();
    sfx.announce();
    this.hooks.onAnnouncement(`${this.bossName} — ${this.bossLesson}`);
  }

  exitCastle() {
    sfx.portal();
    this.rig.teleport(this.world.archPos.x, this.world.archPos.z + 3, Math.PI);
  }

  interact() {
    const near = this.nearestInteractable();
    if (!near) return;
    sfx.blip();
    if (near.kind === "stone") this.hooks.onPlaque(near.id);
    if (near.kind === "portal-in") this.hooks.onPortalConfirm(true);
    if (near.kind === "portal-out") this.exitCastle();
  }

  closePlaque() {
    this.hooks.onPlaque(null);
  }

  private nearestInteractable(): Interactable | null {
    let best: Interactable | null = null;
    let bestD = Infinity;
    for (const it of this.world.interactables) {
      const d = Math.hypot(this.rig.position.x - it.x, this.rig.position.z - it.z);
      if (d < it.radius && d < bestD) {
        best = it;
        bestD = d;
      }
    }
    return best;
  }

  // ─── The frame loop (fixed timestep) ──────────────────────
  // WHY fixed step + accumulator? Rendering can happen at any rate
  // (144Hz monitor, 30Hz phone); the GAME must think at one rate or
  // collision and combat timing drift. We think at 60Hz always and
  // render whenever the browser asks.
  private frame = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    const elapsed = Math.min((now - this.lastFrame) / 1000, 0.1); // clamp lag spikes
    this.lastFrame = now;

    if (this.state === "title" || this.paused) {
      this.renderer.render(this.scene, this.rig.camera);
      return;
    }

    this.acc += elapsed;
    const STEP = 1 / 60;
    let steps = 0;
    while (this.acc >= STEP && steps++ < 5) {
      this.acc -= STEP;
      this.tick(STEP * this.timeScale, STEP); // scaled time for world, real time for timers
    }
    this.renderer.render(this.scene, this.rig.camera);
  };

  private tick(dt: number, realDt: number) {
    this.clock += dt;

    // The spoken-word countdown and timer use real time so slow motion
    // cannot make the typing window longer.
    if (this.state === "word" && this.wordCountdown > 0) {
      const before = Math.ceil(this.wordCountdown);
      this.wordCountdown = Math.max(0, this.wordCountdown - realDt);
      const after = Math.ceil(this.wordCountdown);
      if (after !== before) this.hooks.onWordCountdown(after);
      if (this.wordCountdown === 0) {
        this.wordTimer = this.untimedWords ? Infinity : WORD_TIME_LIMIT;
        this.hooks.onWordTimer(this.wordTimer);
      }
    } else if (this.state === "word" && this.wordTimer !== Infinity) {
      this.wordTimer -= realDt;
      this.hooks.onWordTimer(Math.max(0, this.wordTimer));
      if (this.wordTimer <= 0) this.wordTimeout();
    }
    // The heartbeat: one thump per second while you spell.
    if (this.state === "word" && this.wordCountdown <= 0) {
      this.heartbeatT -= realDt;
      if (this.heartbeatT <= 0) {
        this.heartbeatT = 1;
        sfx.heartbeat();
      }
    }

    // Movement only when actually playing.
    if (this.state === "play") {
      this.rig.update(dt);
      if (this.fightStarted) this.fightClock += dt;
    }

    // The Shadow thinks only when you're in his world — leaving the
    // arena mid-fight is allowed, and he simply waits for you.
    const inCastle = this.rig.position.z < -200;
    if (inCastle && this.shadow.state !== "dormant") {
      this.shadow.update(dt, this.rig.position, () => {
        // His strike: does it land? Range check only — he aims at you.
        const d = this.tmpA.subVectors(this.rig.position, this.shadow.position).length();
        if (d < 2.8) this.damagePlayer(18);
      });
    }

    // The announcement: approach the arch and the world tells you
    // what's coming. Fires ONCE per session.
    if (!this.announced && !inCastle) {
      const d = Math.hypot(this.rig.position.x - this.world.archPos.x, this.rig.position.z - this.world.archPos.z);
      if (d < 13) {
        this.announced = true;
        sfx.announce();
        this.hooks.onAnnouncement("THE SHADOW OF ANDRE HAS APPEARED — the Floating Castle calls");
      }
    }

    // Sword swing animation: a fast arc from ready to across the
    // body and back, 0.5s total, hit-check at the 0.18s apex.
    if (this.swingT >= 0) {
      this.swingT += dt;
      const t = this.swingT / 0.5;
      if (!this.swingDidCheck && this.swingT >= 0.18) {
        this.swingDidCheck = true;
        this.trySlashHit();
      }
      // Ease in-out: rotation.y sweeps -1.9 → 0 and back; rotation.x
      // dips. Numbers picked by eye — game feel is tuned, not derived.
      const arc = Math.sin(Math.min(t, 1) * Math.PI);
      this.sword.rotation.y = -1.9 * arc;
      this.sword.rotation.x = -0.5 * arc;
      if (this.swingT >= 0.5) {
        this.swingT = -1;
        this.sword.rotation.set(0, 0, 0);
      }
    }

    // Idle sword sway (breathing) when not swinging — scenes must
    // stay alive even when the player is still.
    if (this.swingT < 0) {
      this.sword.position.y = -0.28 + Math.sin(this.clock * 1.8) * 0.012;
    }

    // Camera shake: decay toward zero, applied as a tiny positional
    // jitter AFTER the rig syncs the camera.
    if (this.shake > 0.001) {
      this.shake *= 1 - Math.min(1, dt * 7);
      this.rig.camera.position.x += (Math.random() - 0.5) * this.shake * 0.15;
      this.rig.camera.position.y += (Math.random() - 0.5) * this.shake * 0.15;
    }

    this.world.update(this.clock, dt, this.rig.position.z);

    // HUD prompt refresh (cheap string compare, avoids spamming React).
    const near = this.nearestInteractable();
    const prompt = near ? `E — ${near.label}` : null;
    if (prompt !== this.lastPrompt) {
      this.lastPrompt = prompt;
      this.pushHud();
    }
  }

  private lastPrompt: string | null = null;

  private pushHud() {
    this.hooks.onHud({
      hp: this.hp,
      maxHp: this.maxHp,
      bossId: this.bossId,
      bossName: this.bossName,
      shadowHp: this.shadow.hp,
      shadowMax: this.shadow.maxHP,
      wordsSpoken: this.shadow.wordsSpoken,
      inCastle: this.rig.position.z < -200,
      prompt: this.lastPrompt,
    });
  }

  private finishFight() {
    sfx.victory();
    this.shadow.defeat();
    this.timeScale = 1;
    // Let the dissolution play before the victory screen lands.
    setTimeout(() => {
      this.setState("victory");
      this.hooks.onVictory({ seconds: Math.round(this.fightClock), misses: this.misses });
    }, 2400);
  }

  private resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.rig.camera.aspect = w / h;
    this.rig.camera.updateProjectionMatrix();
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    this.rig.dispose();
    this.renderer.dispose();
  }

  // Input doors for the React shell (touch controls, buttons).
  get input() {
    return this.rig;
  }
}
