import * as Phaser from "phaser";
import { Player } from "../entities/Player";
import { TrainingDummy } from "../entities/TrainingDummy";
import { Zombie } from "../entities/Zombie";
import { Boss, BossConfig } from "../entities/Boss";
import { Interactable } from "../entities/NPC";
import { Damageable } from "../entities/Damageable";
import { Companion } from "../entities/Companion";
import { CombatInput } from "../systems/CombatInput";
import { CombatSystem } from "../systems/Combat";
import { MovementSystem } from "../systems/Movement";
import { EventBus, EVT } from "../systems/EventBus";
import { QuestLog } from "../systems/Quests";
import { STORY, DialogueLine } from "../data/story";
import { ABILITIES, MAX_POWER_LEVEL, thiefBasicDamage, xpToNext, zombieWaveInterval, ZOMBIE_WAVES } from "../data/combatData";
import { COMPANIONS, COMPANION_BASE_HEALTH, CompanionId, GUNSLINGER_TRACKING_LASER, SHIELD_HERO, trackingLaserShots, WIZARD_AREA_ATTACK } from "../data/companions";
import { PORTFOLIO_CLOSE_EVENT, PORTFOLIO_OPEN_EVENT } from "../data/portfolio";
import {
  WORLD_BOUNDS,
  SAFE_TOWN,
  STUDY_SAFE_ZONE,
  isInsideSafeTown,
  isInsideSafeZone,
  isInsideStudySafeZone,
} from "../systems/WorldRules";
import { slashArc } from "../effects/SlashFX";
// Safe Town multiplayer: presence broadcasts + visitor avatars
import { SafeTownPresence } from "../net/presence";
import { RemotePlayers } from "../entities/RemotePlayers";
// The browser-local save: name, level, powers, bosses beaten, quests done
import { SaveData, freshSave, loadSave, writeSave } from "../save";
import type { HudState } from "./UIScene";
import type { RoomData } from "./RoomScene";
// Synthesized sound effects (see audio/Sfx.ts)
import { sfx } from "../audio/Sfx";
import { STUDY_BUILDINGS } from "../data/securityPlus";

// ─────────────────────────────────────────────────────────────
// CHAPTER 1: THE FOREST OF ORIGINS
// The scene is the "director": it builds the world, creates the
// systems, wires them together, and runs the game loop (update).
// Notice how little game LOGIC lives here. It's mostly wiring.
//
// Map of the forest:
//   Safe Town (west) - spawn, jv-marc, the Legend book, buildings,
//     the Wayfinder mentor and 2 Doubt Totems (practice dummies)
//   The wilds - 4 memory stones, 2 vision stones, 4 ally companions,
//     and waves of zombies under the blood moon
//   South-east arena - The Empire Revenant (unlocks Courage Strike, Q)
//   North-east arena - The Nike Nightstalker (unlocks Leadership Aura, E)
//   Far south-east - The Shadow of Andre (the final lesson)
//   East - the Future Kingdom gate (opens after all three lords,
//     or after three hard attempts at one boss)
// ─────────────────────────────────────────────────────────────

const WORLD = { w: WORLD_BOUNDS.width, h: WORLD_BOUNDS.height };
const SPAWN = { x: 1120, y: 930 };

// The three vampire lords. Each one is a BossConfig PLUS an x/y position.
// Changing these numbers is how you tune each fight.
const BOSSES: (BossConfig & { x: number; y: number })[] = [
  { id: "empire", name: "The Empire Revenant", texture: "bloodCount", maxHp: 900, color: 0xff365c, pattern: "slam", attackEvery: 2600, moveSpeed: 70, xpReward: 300, x: 2460, y: 1780 },
  { id: "nike", name: "The Nike Nightstalker", texture: "crimsonOracle", maxHp: 1100, color: 0xff3b5c, pattern: "barrage", attackEvery: 2200, moveSpeed: 90, xpReward: 400, x: 3190, y: 620 },
  { id: "self", name: "The Shadow of Andre", texture: "darkHero", maxHp: 1800, color: 0x9b48bb, pattern: "legacy", attackEvery: 1900, moveSpeed: 105, xpReward: 600, x: 3290, y: 2040 },
];

const STUDY_DISTRICT = [
  { subject: "a-plus", x: 620, y: 2440 },
  { subject: "network-plus", x: 1240, y: 2440 },
  { subject: "security-plus", x: 1860, y: 2440 },
] as const;

// The buildings of Safe Town. Each one opens a Room (an interior scene).
const BUILDINGS: { x: number; y: number; texture: string; room: RoomData }[] = [
  {
    x: 690, y: 860, texture: "building0",
    room: {
      title: "About Andre",
      subtitle: "A life story written one lesson at a time",
      details: [
        "Andre Woolfolk is a driven developer growing his technical skills and leadership through i.c.stars.",
        "He is building toward a career in cybersecurity and wants to bring knowledge, resources, and opportunity back to Chicago's South Side.",
      ],
    },
  },
  {
    x: 1120, y: 860, texture: "building1",
    room: {
      title: "Project Hall",
      subtitle: "Things Andre is building right now",
      details: [
        "The Legend of Andre: Rise of Legacy — this very game. A top-down pixel adventure (Next.js + Phaser) where his life story is the world, complete with cloud saves and a character creator.",
        "The Portfolio Site — a living, game-styled portfolio at awoolfolk-alt.github.io/awoolfolk that grows chapter by chapter, with this game linked straight from the top.",
        "The Mini-Game Arcade — four playable JavaScript builds: Tic-Tac-Toe (with an AI opponent), Snake, Breakout, and Arena Survival. Visit the Mini-Game Arcade building here in Safe Town to play them.",
        "Each one started as a small JavaScript exercise and grew into a piece of the legend.",
      ],
    },
  },
  {
    x: 1550, y: 860, texture: "building2",
    room: {
      title: "Interests",
      subtitle: "The things that keep the curiosity alive",
      details: [
        "Cybersecurity, technology, and leadership.",
        "Community rebuilding and creating opportunity on the South Side.",
        "Wellness walks along Chicago's lakefront, from 67th Street to Navy Pier.",
      ],
    },
  },
  {
    x: 690, y: 1180, texture: "building3",
    room: {
      title: "Mini-Game Arcade",
      subtitle: "A small corner for playful experiments",
      details: [
        "Take a break from the vampire hunt and try two quick arcade challenges.",
      ],
      miniGames: true,
    },
  },
  {
    x: 1120, y: 1180, texture: "building4",
    room: {
      title: "The Vinyl Lounge",
      subtitle: "A quiet room for music and favorite records",
      details: [
        "Explore the original album-cover wall and click a vinyl record to play its YouTube reference.",
        "YouTube playback needs an internet connection. The Make It To The Morning record opens a YouTube search so you can choose a video.",
      ],
      musicLounge: true,
    },
  },
];

export class ForestScene extends Phaser.Scene {
  private player!: Player;
  private input2!: CombatInput; // ("input" is already taken by Phaser)
  private combat!: CombatSystem;
  private movement!: MovementSystem;
  private dummies: TrainingDummy[] = [];
  private zombies: Zombie[] = [];
  private zombieWave = 0;
  private zombieWaveTimer?: Phaser.Time.TimerEvent;
  private bosses: Boss[] = [];
  private activeBoss: Boss | null = null;
  private defeated = new Set<string>();
  private bossFailures = new Map<BossConfig["id"], number>();
  private companions = new Map<CompanionId, Companion>();
  private companionThreatReadyAt = new Map<CompanionId, number>();
  private resurrectionOrbs: { companion: Companion; sprite: Phaser.GameObjects.Container; x: number; y: number }[] = [];
  private deathScreen?: Phaser.GameObjects.GameObject[];
  private nextHealthRegenAt = 0;
  private hudUpdateElapsed = 0;
  private interactables: Interactable[] = [];
  private gate!: Phaser.GameObjects.Image;
  private gateBars!: Phaser.GameObjects.Rectangle;
  private gateOpen = false;
  private dead = false;

  // ── SAVE STATE ──
  // The hero's chosen name (jv-marc greets them with it)
  private heroName = "Traveler";
  // The hero's look, chosen on /create. We carry it through every save
  // we write — otherwise the first in-game save would erase it.
  private heroConfig?: SaveData["hero"];
  // Which memory stones have been read
  private memoriesRead = new Set<string>();
  // The quest tracker: which goals are done, which one is current
  private quests = new QuestLog();
  // ── SAFE TOWN MULTIPLAYER ──
  // While the hero stands inside Safe Town, we broadcast our look and
  // position and draw the other travelers doing the same. Offline? This
  // whole layer stays silent and the adventure is unchanged.
  private presence = new SafeTownPresence();
  private remotePlayers!: RemotePlayers;
  private netInTown = false;
  // The input context to return to after a pause (so pausing mid-dialogue is safe)
  private resumeContext: "gameplay" | "dialogue" | "locked" = "gameplay";
  // True once we've announced ourselves to the HUD (worldReady + quest tracker)
  private announced = false;

  constructor() { super("Forest"); }

  create() {
    // Load the save FIRST so the world can reflect past progress
    // (beaten bosses stay beaten, the gate stays open, powers stay unlocked).
    const save = loadSave() ?? freshSave("Traveler");
    this.heroName = save.name || "Traveler";
    this.heroConfig = save.hero;
    this.memoriesRead = new Set(save.memoriesRead);
    this.quests = new QuestLog(save.questsDone);

    this.physics.world.setBounds(0, 0, WORLD.w, WORLD.h);
    this.buildWorld();

    // 1) Create the hero  2) create the systems  3) connect them
    // CHECKPOINT: if the last save happened in THIS scene, the hero
    // stands back up exactly where they were. Otherwise, the spawn point.
    const startPos = save.pos?.scene === "Forest" ? save.pos : SPAWN;
    this.player = new Player(this, startPos.x, startPos.y);
    this.remotePlayers = new RemotePlayers(this);
    this.nextHealthRegenAt = this.time.now + 5000;
    this.input2 = new CombatInput(this);
    this.combat = new CombatSystem(this, this.player, this.input2, () => this.targets());
    this.movement = new MovementSystem(this, this.player, this.input2, this.combat);

    // Restore the hero's growth from the save: level, XP, max health, powers.
    this.player.level = save.level;
    this.player.xp = save.xp;
    this.player.maxHealth = 100 + 5 * (save.level - 1);
    this.player.health = this.player.maxHealth;
    save.unlocked.forEach((p) => this.player.unlocked.add(p));

    this.input2.on("interact", () => this.tryInteract());
    this.input2.on("advance", () => EventBus.emit(EVT.dialogueAdvance));
    this.input2.on("debugLevel", () => this.levelUp(xpToNext(this.player.level) - this.player.xp));
    this.input2.on("ally1", () => this.useCompanionAbility("wizard"));
    this.input2.on("ally2", () => this.useCompanionAbility("shield"));
    this.input2.on("ally3", () => this.useCompanionAbility("gunslinger"));
    this.input2.on("ally4", () => this.useCompanionAbility("thief"));
    this.input2.on("ally5", () => this.useGunslingerTrackingLaser());
    const onPortfolioClosed = () => {
      if (!this.dead) this.input2.context = "gameplay";
    };
    window.addEventListener(PORTFOLIO_CLOSE_EVENT, onPortfolioClosed);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener(PORTFOLIO_CLOSE_EVENT, onPortfolioClosed);
    });
    this.events.on(Phaser.Scenes.Events.RESUME, () => {
      this.input2.context = "gameplay";
    });

    this.buildCharacters(save);
    this.physics.add.collider(this.player.sprite, this.colliders);

    // Camera: follow with smoothing + slight cursor parallax ("feels alive")
    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD.w, WORLD.h);
    cam.startFollow(this.player.sprite, true, 0.1, 0.1);
    cam.fadeIn(800, 0, 0, 0);

    // Tell the HUD which world is live (for the pause menu), and the current quest
    EventBus.emit(EVT.worldReady, "Forest");
    this.quests.push();

    // After the fade-in, jv-marc greets you BY NAME: "Welcome, Andre..."
    this.time.delayedCall(900, () => {
      const [first, ...rest] = STORY.elderIntro;
      this.talk([{ speaker: first.speaker, text: `Welcome, ${this.heroName}.` }, ...rest], () => {
        this.quests.complete("meet-elder");
        this.save();
        this.startZombieWaves();
      });
    });

    // ── PAUSE + SAVE-ON-EXIT WIRING ──
    // The HUD owns the ESC key and tells us over the EventBus. We lock input
    // while paused and restore whatever context we were in afterwards.
    const onPause = (paused: boolean) => {
      if (paused) {
        this.resumeContext = this.input2.context;
        this.input2.context = "locked";
      } else {
        this.input2.context = this.resumeContext;
      }
    };
    // "Save & Exit" in the pause menu: save, then leave the page for the menu.
    // NOTE: must be "../", not "./" — the game lives at "/game/" (trailing
    // slash), where "./" would just resolve back to "/game/" and reload it.
    const onQuit = () => {
      this.save();
      window.location.href = "../";
    };
    EventBus.on(EVT.pause, onPause);
    EventBus.on(EVT.pauseQuit, onQuit);
    const startBossIn2d = (request: { id: BossConfig["id"] }) => {
      const boss = this.activeBoss;
      if (!boss || boss.cfg.id !== request.id) return;
      this.scene.resume();
      this.input2.context = "gameplay";
      boss.start();
    };
    const finishBossIn3d = (request: { id: BossConfig["id"] }) => {
      const boss = this.activeBoss;
      if (!boss || boss.cfg.id !== request.id) return;
      this.scene.resume();
      this.input2.context = "gameplay";
      boss.start();
      boss.takeHit({
        damage: boss.cfg.maxHp,
        from: new Phaser.Math.Vector2(this.player.x, this.player.y),
        heavy: true,
      });
    };
    EventBus.on(EVT.boss3dCancel, startBossIn2d);
    EventBus.on(EVT.boss3dComplete, finishBossIn3d);
    // When this scene shuts down (leaving for the menu or the Future Kingdom),
    // remove our listeners and autosave, so no progress is ever lost.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off(EVT.pause, onPause);
      EventBus.off(EVT.pauseQuit, onQuit);
      EventBus.off(EVT.boss3dCancel, startBossIn2d);
      EventBus.off(EVT.boss3dComplete, finishBossIn3d);
      this.presence.leave(); // walk out of the shared town square
      this.save();
    });
  }

  // ── SAFE TOWN PRESENCE ──
  // Entering the town square joins the shared channel; stepping into the
  // wilds leaves it. Visitors appear/disappear through the callbacks.
  private updatePresence() {
    const inside = isInsideSafeTown(this.player.x, this.player.y);
    if (inside !== this.netInTown) {
      this.netInTown = inside;
      if (inside) {
        void this.presence.join({
          onJoin: (id, state) => {
            this.remotePlayers.upsert(id, state);
            EventBus.emit(EVT.toast, `${state.name} wanders into Safe Town.`);
          },
          onUpdate: (id, state) => this.remotePlayers.upsert(id, state),
          onLeave: (id) => this.remotePlayers.remove(id),
        });
      } else {
        this.presence.leave();
      }
    }
    if (this.presence.active) {
      this.presence.update({
        name: this.heroName,
        ...(this.heroConfig ? { hero: this.heroConfig } : {}),
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        flipX: this.player.sprite.flipX,
        moving: (this.player.sprite.body?.velocity.length() ?? 0) > 10,
      });
    }
    this.remotePlayers.update(this.time.now, this.game.loop.delta);
  }

  // Write the current progress to the browser's localStorage.
  // Called after every meaningful moment: level up, boss beaten, memory read...
  private save() {
    const data: SaveData = {
      name: this.heroName,
      level: this.player.level,
      xp: this.player.xp,
      unlocked: [...this.player.unlocked],
      defeated: [...this.defeated],
      gateOpen: this.gateOpen,
      memoriesRead: [...this.memoriesRead],
      questsDone: this.quests.completedIds,
      savedAt: Date.now(),
      // The checkpoint: this scene, this exact spot.
      pos: { scene: "Forest", x: Math.round(this.player.x), y: Math.round(this.player.y) },
      // Carry the hero's look forward so it survives every save.
      ...(this.heroConfig ? { hero: this.heroConfig } : {}),
    };
    writeSave(data);
    // The HUD shows a small "Saved ✓" flash so the player trusts it
    EventBus.emit(EVT.saved);
  }

  private openPortfolio() {
    this.input2.context = "locked";
    window.dispatchEvent(new Event(PORTFOLIO_OPEN_EVENT));
  }

  // ── WORLD BUILDING ───────────────────────────────────────────
  private colliders!: Phaser.Physics.Arcade.StaticGroup;

  private buildWorld() {
    this.add.tileSprite(0, 0, WORLD.w, WORLD.h, "grass").setOrigin(0).setDepth(-10);

    // Dirt paths connecting the areas
    const path = this.add.graphics().setDepth(-9);
    path.fillStyle(0x542633, 0.72);
    const pathPoints = [[SPAWN.x, SPAWN.y], [1600, 950], [2050, 950], [2460, 1780], [2050, 950], [2850, 620], [2050, 950], [3200, 950], [3520, 1280]];
    for (let i = 0; i < pathPoints.length - 1; i++) {
      const [x1, y1] = pathPoints[i]; const [x2, y2] = pathPoints[i + 1];
      const steps = Math.ceil(Phaser.Math.Distance.Between(x1, y1, x2, y2) / 20);
      for (let s = 0; s <= steps; s++) path.fillCircle(Phaser.Math.Linear(x1, x2, s / steps), Phaser.Math.Linear(y1, y2, s / steps), 38);
    }
    // Arenas (boss clearings) and the origin clearing
    path.fillStyle(0x321923, 0.72).fillEllipse(2460, 1780, 700, 460).fillEllipse(3190, 620, 700, 460);
    path.fillStyle(0x3a2935, 0.65).fillEllipse(SPAWN.x, SPAWN.y, 1000, 760);
    path.fillStyle(0x6c5138, 0.75);
    const studyRoad = [[1120, 1320], [1120, 1740], [1120, 2050], [1240, 2320]];
    for (let i = 0; i < studyRoad.length - 1; i++) {
      const [x1, y1] = studyRoad[i];
      const [x2, y2] = studyRoad[i + 1];
      const steps = Math.ceil(Phaser.Math.Distance.Between(x1, y1, x2, y2) / 20);
      for (let step = 0; step <= steps; step++) {
        path.fillCircle(Phaser.Math.Linear(x1, x2, step / steps), Phaser.Math.Linear(y1, y2, step / steps), 44);
      }
    }
    path.fillStyle(0x392d2b, 0.82).fillEllipse(1240, 2440, 2070, 520);
    path.lineStyle(4, 0x9e4256, 0.55).strokeEllipse(2460, 1780, 660, 420).strokeEllipse(3190, 620, 660, 420);
    this.add.rectangle(
      (SAFE_TOWN.left + SAFE_TOWN.right) / 2,
      (SAFE_TOWN.top + SAFE_TOWN.bottom) / 2,
      SAFE_TOWN.right - SAFE_TOWN.left,
      SAFE_TOWN.bottom - SAFE_TOWN.top,
      0xe2be72,
      0.08,
    ).setStrokeStyle(5, 0xf1c66e, 0.65).setDepth(-8);
    this.add.text(SAFE_TOWN.left + 26, SAFE_TOWN.top + 20, "SAFE TOWN", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#f1c66e",
      stroke: "#24101c",
      strokeThickness: 4,
    }).setDepth(1);
    this.add.text(1240, 2120, "STUDY DISTRICT  ·  A+  ·  NETWORK+  ·  SECURITY+", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#b9e8ff",
      stroke: "#101522",
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(1);
    this.add.rectangle(
      (STUDY_SAFE_ZONE.left + STUDY_SAFE_ZONE.right) / 2,
      (STUDY_SAFE_ZONE.top + STUDY_SAFE_ZONE.bottom) / 2,
      STUDY_SAFE_ZONE.right - STUDY_SAFE_ZONE.left,
      STUDY_SAFE_ZONE.bottom - STUDY_SAFE_ZONE.top,
      0x78bde8,
      0.07,
    ).setStrokeStyle(5, 0x9bdcff, 0.7).setDepth(-7);
    this.add.text(STUDY_SAFE_ZONE.left + 26, STUDY_SAFE_ZONE.top + 16, "SAFE STUDY ZONE  ·  NO ENEMIES OR DAMAGE", {
      fontFamily: "Georgia, serif",
      fontSize: "16px",
      color: "#c5eaff",
      stroke: "#101522",
      strokeThickness: 4,
    }).setDepth(1);

    this.colliders = this.physics.add.staticGroup();

    // Trees: a border around the world + scattered clusters, kept out of clearings
    const clear = (x: number, y: number) =>
      Phaser.Math.Distance.Between(x, y, SPAWN.x, SPAWN.y) < 420 ||
      isInsideSafeTown(x, y) ||
      isInsideStudySafeZone(x, y) ||
      BUILDINGS.some((building) => Phaser.Math.Distance.Between(x, y, building.x, building.y - 80) < 250) ||
      STUDY_DISTRICT.some((building) => Phaser.Math.Distance.Between(x, y, building.x, building.y - 80) < 300) ||
      (y > 1850 && y < 2730 && x > 300 && x < 2200) ||
      Phaser.Math.Distance.Between(x, y, 2460, 1780) < 400 ||
      Phaser.Math.Distance.Between(x, y, 3190, 620) < 400 ||
      (y > 850 && y < 1050 && x > 1000 && x < 3600);
    const rnd = new Phaser.Math.RandomDataGenerator(["forest-of-origins"]);
    for (let x = 60; x < WORLD.w; x += 110) { this.tree(x, 90); this.tree(x, WORLD.h - 20); }
    for (let y = 200; y < WORLD.h - 60; y += 120) { this.tree(50, y); this.tree(WORLD.w - 40, y); }
    for (let i = 0; i < 140; i++) {
      const x = rnd.between(160, WORLD.w - 300), y = rnd.between(220, WORLD.h - 120);
      if (!clear(x, y)) this.tree(x, y);
    }

    // Glowing Tree of Origins, where the journey begins
    const glow = this.add.circle(2020, 710, 140, 0xe34262, 0.12).setBlendMode(Phaser.BlendModes.ADD).setDepth(500);
    this.tweens.add({ targets: glow, alpha: 0.28, scale: 1.1, yoyo: true, repeat: -1, duration: 1800, ease: "Sine.easeInOut" });
    const gt = this.add.image(2020, 810, "glowtree").setOrigin(0.5, 0.95).setDepth(810);
    this.physics.add.existing(gt, true);
    (gt.body as Phaser.Physics.Arcade.StaticBody).setSize(50, 20, false).setOffset(55, 160);
    this.colliders.add(gt);

    // Fireflies drifting across the forest.
    // PERFORMANCE: frequency 90 (not 40) halves the number of live particles
    // while keeping the same look, which matters on older laptops.
    this.add.particles(0, 0, "spark", {
      x: { min: 0, max: WORLD.w }, y: { min: 0, max: WORLD.h },
      lifespan: 4000, speed: { min: 5, max: 25 }, scale: { start: 0.5, end: 0 },
      alpha: { start: 0.9, end: 0 }, tint: [0xe34262, 0xb876c4], blendMode: "ADD", frequency: 90,
    }).setDepth(5000);

    this.buildBuildings();
  }

  private tree(x: number, y: number) {
    const t = this.add.image(x, y, "tree").setOrigin(0.5, 0.95).setDepth(y);
    this.physics.add.existing(t, true);
    (t.body as Phaser.Physics.Arcade.StaticBody).setSize(30, 16, false).setOffset(40, 106);
    this.colliders.add(t);
  }

  private buildBuildings() {
    BUILDINGS.forEach(({ x, y, texture, room }) => {
      this.add.image(x, y, texture).setOrigin(0.5, 1).setScale(1.35).setDepth(y);
      this.blockBuilding(x - 142, y - 65, 34, 125);
      this.blockBuilding(x + 142, y - 65, 34, 125);
      this.blockBuilding(x, y - 160, 245, 28);

      const entrance = new Interactable(this, x, y + 16, "spark", room.title, () => this.enterBuilding(room), 100);
      entrance.sprite.setVisible(false);
      entrance.setLabel("[F] Enter");
      this.interactables.push(entrance);
    });
    STUDY_DISTRICT.forEach(({ subject, x, y }, index) => {
      const building = STUDY_BUILDINGS[subject];
      const sprite = this.add.image(x, y, `building${index + 1}`).setOrigin(0.5, 1).setScale(1.4).setDepth(y);
      sprite.setTint(index === 2 ? 0xb9d8ff : index === 1 ? 0xd6c49c : 0xb6c4a0);
      this.blockBuilding(x - 160, y - 70, 38, 135);
      this.blockBuilding(x + 160, y - 70, 38, 135);
      this.blockBuilding(x, y - 174, 280, 30);
      this.add.rectangle(x, y - 188, 240, 40, 0x101522, 0.96)
        .setStrokeStyle(2, index === 2 ? 0x7dc7ff : 0xd4a72c)
        .setDepth(y + 1);
      this.add.text(x, y - 188, building.subject, {
        fontFamily: "Georgia, serif",
        fontSize: "16px",
        color: index === 2 ? "#b9e8ff" : "#f1c66e",
        align: "center",
        wordWrap: { width: 220 },
      }).setOrigin(0.5).setDepth(y + 2);
      const entrance = new Interactable(this, x, y + 18, "spark", building.name, () => {
        this.enterBuilding({
          title: building.name,
          subtitle: `${building.subject} · Four focused study stations`,
          studySubject: subject,
        });
      }, 110);
      entrance.sprite.setVisible(false);
      entrance.setLabel("[F] Enter");
      this.interactables.push(entrance);
    });
  }

  private blockBuilding(x: number, y: number, width: number, height: number) {
    const block = this.add.rectangle(x, y, width, height, 0x000000, 0);
    this.physics.add.existing(block, true);
    this.colliders.add(block);
  }

  private enterBuilding(room: RoomData) {
    this.input2.context = "locked";
    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.pause("Forest");
      this.scene.launch("Room", room);
    });
    this.cameras.main.fadeOut(1500, 0, 0, 0);
  }

  private startZombieWaves() {
    this.spawnZombieWave();
    this.scheduleZombieWaves();
  }

  private scheduleZombieWaves() {
    this.zombieWaveTimer = this.time.addEvent({
      delay: zombieWaveInterval(this.player.level),
      loop: true,
      callback: () => this.spawnZombieWave(),
    });
  }

  private updateZombieWaveInterval() {
    if (!this.zombieWaveTimer) return;
    const delay = zombieWaveInterval(this.player.level);
    if (this.zombieWaveTimer.delay === delay) return;
    this.zombieWaveTimer.remove(false);
    this.scheduleZombieWaves();
  }

  private spawnZombieWave() {
    if (isInsideStudySafeZone(this.player.x, this.player.y)) return;
    this.zombieWave++;
    let spawned = 0;
    let attempts = 0;
    while (spawned < ZOMBIE_WAVES.count && attempts < ZOMBIE_WAVES.count * 10) {
      attempts++;
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(440, 720);
      const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * distance, 60, WORLD.w - 60);
      const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * distance, 140, WORLD.h - 60);
      if (isInsideSafeZone(x, y)) continue;
      this.zombies.push(new Zombie(
        this,
        x,
        y,
        (damage) => this.hurtPlayer(damage),
        () => this.levelUp(8),
      ));
      spawned++;
    }
    while (spawned < ZOMBIE_WAVES.count) {
      const index = spawned;
      const x = Phaser.Math.Clamp(SAFE_TOWN.left - 250 - index * 18, 90, WORLD.w - 60);
      const y = Phaser.Math.Clamp(SAFE_TOWN.top + 120 + index * 28, 140, WORLD.h - 60);
      this.zombies.push(new Zombie(
        this,
        x,
        y,
        (damage) => this.hurtPlayer(damage),
        () => this.levelUp(8),
      ));
      spawned++;
    }
    EventBus.emit(EVT.toast, `Wave ${this.zombieWave}: ${spawned} zombies have risen`);
  }

  // ── CHARACTERS ───────────────────────────────────────────────
  private buildCharacters(save: SaveData) {
    // Two Doubt Totems on the town's east edge. Each hit gives 60 XP so you
    // can practice the combo and level up before facing a lord.
    // Breaking one also completes the "Sharpen the Sword" quest.
    this.dummies.push(
      new TrainingDummy(this, 1770, 1180, () => { this.levelUp(60); this.quests.complete("train"); this.save(); }),
      new TrainingDummy(this, 1900, 1280, () => { this.levelUp(60); this.quests.complete("train"); this.save(); }),
    );
    this.dummies.forEach((d) => this.colliders.add(d.sprite));

    for (const cfg of BOSSES) {
      this.bosses.push(new Boss(this, cfg, cfg.x, cfg.y, this.player, (dmg) => this.hurtPlayer(dmg, true), (b) => this.onBossDefeated(b)));
    }
    // If the save says a lord was already beaten, it stays beaten: remove it
    // quietly (no intro, no fight) so the world remembers your progress.
    for (const b of this.bosses) {
      if (save.defeated.includes(b.cfg.id)) {
        this.defeated.add(b.cfg.id);
        b.state = "defeated";
        b.sprite.setVisible(false);
      }
    }
    // If some (but not all) lords were beaten earlier, wake the next one.
    if (this.defeated.size > 0 && this.defeated.size < 3) {
      this.bosses.find((candidate) => !this.defeated.has(candidate.cfg.id))?.activate();
    }

    COMPANIONS.forEach((cfg, index) => {
      const companion = new Companion(this, cfg, index, (fallen, x, y) => this.spawnResurrectionOrb(fallen, x, y));
      this.companions.set(cfg.id, companion);
      let station: Interactable | undefined;
      const recruit = new Interactable(this, cfg.x, cfg.y, cfg.texture, cfg.title, () => {
        if (companion.isFallen) {
          EventBus.emit(EVT.toast, `Find the resurrection orb to bring ${cfg.title} back`);
          return;
        }
        if (companion.sprite.visible) {
          EventBus.emit(EVT.toast, `${cfg.title} is already traveling with you`);
          return;
        }
        this.talk([{ speaker: cfg.name, text: cfg.intro }], () => {
          companion.recruit();
          station?.setVisible(false);
          EventBus.emit(EVT.toast, `${cfg.title} joined your team · ability ${cfg.key}`);
          this.save();
        });
      }, 105);
      station = recruit;
      recruit.setScale(1 / 3);
      recruit.setLabel(`[F] Meet ${cfg.title}`);
      this.interactables.push(recruit);
    });

    // Helper to place something you can press F on.
    // "lines" is a FUNCTION that returns the dialogue, so the text can change
    // later (jv-marc says something new after all three lords are beaten).
    // memoryId (optional) = remember this stone as "read" in the save file.
    const add = (x: number, y: number, tex: string, name: string, lines: () => readonly DialogueLine[], label = "[F] Talk", memoryId?: string) => {
      const it = new Interactable(this, x, y, tex, name, () => {
        // First read of a memory/vision stone: remember it and save.
        if (memoryId && !this.memoriesRead.has(memoryId)) {
          this.memoriesRead.add(memoryId);
          this.save();
        }
        this.talk(lines());
      });
      it.setLabel(label);
      this.interactables.push(it);
      return it;
    };
    // jv-marc, next to spawn. After all three lords he says the "after" lines;
    // otherwise he repeats the intro (with the hero's name).
    add(SPAWN.x + 110, SPAWN.y - 20, "elder", "jv-marc", () => {
      if (this.defeated.size >= 3) return STORY.elderAfterBosses;
      const [first, ...rest] = STORY.elderIntro;
      return [{ speaker: first.speaker, text: `Welcome, ${this.heroName}.` }, ...rest];
    });
    // The Wayfinder: a mentor by the Doubt Totems who teaches combat rhythm.
    add(1700, 1110, "wayfinder", "Wayfinder", () => STORY.wayfinder, "[F] Learn");
    // The Legend book: Andre's About Me story. Reading it the first time
    // completes the "Know the Legend" quest; afterwards it also opens the
    // portfolio overlay (the same pages a recruiter would read).
    const legendBook = new Interactable(this, SPAWN.x - 180, SPAWN.y + 10, "book", "The Legend", () => {
      if (!this.memoriesRead.has("legend")) {
        this.memoriesRead.add("legend");
        this.quests.complete("read-legend");
        this.save();
      }
      // After the book's words, the altar opens the FULL portfolio page.
      // (The quick in-game overlay still exists on the P key.)
      // The play page sits at {base}/game/ and the portfolio at
      // {base}/portfolio/, so we go one level up then into portfolio/.
      // The URL dance guarantees a trailing slash first, so this works
      // whether the host redirected to /game/ or not.
      this.talk(STORY.legendBook, () => {
        const here = new URL(window.location.href);
        here.hash = "";
        here.search = "";
        if (!here.pathname.endsWith("/")) here.pathname += "/";
        window.location.href = new URL("../portfolio/", here).toString();
      });
    });
    legendBook.setLabel("[F] Read");
    this.interactables.push(legendBook);
    // Memory stones: moments from Andre's life
    add(1850, 1430, "stone", "Memory", () => STORY.memories.nike, "[F] Remember", "nike");
    add(2120, 1510, "stone", "Memory", () => STORY.memories.rebuild, "[F] Remember", "rebuild");
    add(1880, 1220, "stone", "Memory", () => STORY.memories.marathon, "[F] Remember", "marathon");
    add(2780, 1040, "stone", "Memory", () => STORY.memories.empire, "[F] Remember", "empire");
    // Vision stones: where the road leads next
    add(3400, 1230, "stone", "Vision", () => STORY.visions.icstars, "[F] Envision", "icstars");
    add(1240, 1080, "stone", "Vision", () => STORY.visions.southside, "[F] Envision", "southside");

    // The Future Kingdom gate: opens after all three lords fall, or after
    // three hard attempts at one boss (asking for another path is a strength).
    this.gate = this.add.image(3520, 1320, "gate").setOrigin(0.5, 1).setDepth(1320);
    this.gateBars = this.add.rectangle(3520, 1255, 100, 120, 0xc44a67, 0.22).setDepth(1321);
    const block = this.add.rectangle(3520, 1300, 120, 40);
    this.physics.add.existing(block, true);
    this.colliders.add(block);
    this.gate.setData("block", block);
    const gateNpc = new Interactable(this, 3520, 1340, "spark", "Future Kingdom", () => {
      if (this.gateOpen) {
        // Save first: the Future Kingdom scene (and any future visit) reads it.
        this.quests.complete("gate");
        this.save();
        EventBus.emit(EVT.bossBar, null);
        this.cameras.main.fadeOut(600, 255, 215, 94); // a golden fade into the future
        this.time.delayedCall(650, () => this.scene.start("Kingdom"));
      } else {
        this.talk(STORY.futureGateLocked);
      }
    }, 110);
    gateNpc.sprite.setVisible(false);
    gateNpc.setLabel("[F] Inspect");
    this.interactables.push(gateNpc);

    // If the save says the gate was already opened, restore that (quietly).
    if (save.gateOpen) this.openGate(true);
  }

  // ── GAME LOOP ────────────────────────────────────────────────
  update(time: number, delta: number) {
    if (this.dead) return;
    // On the very first frame, re-announce ourselves to the HUD. The HUD scene
    // may have been created after us, so create()'s announcement can be missed.
    if (!this.announced) {
      this.announced = true;
      EventBus.emit(EVT.worldReady, "Forest");
      this.quests.push();
    }
    this.collectResurrectionOrbs();
    this.movement.update(time);
    this.player.updateVisuals(time);

    // Cursor parallax: world shifts slightly toward the mouse
    const p = this.input.activePointer;
    const cam = this.cameras.main;
    cam.setFollowOffset(-(p.x - cam.width / 2) * 0.04, -(p.y - cam.height / 2) * 0.04);

    // Leadership Aura regeneration
    if (this.player.auraActive) {
      const regen = (ABILITIES.aura.regenPerSec * delta) / 1000;
      this.player.heal(regen);
      this.companions.forEach((companion) => companion.recoverHealth(regen));
    }
    if (time >= this.nextHealthRegenAt) {
      this.player.heal(2);
      this.companions.forEach((companion) => companion.recoverHealth(2));
      this.nextHealthRegenAt = time + 5000;
    }

    this.bosses.forEach((b) => b.update(time));
    const playerIsInteracting = this.input2.context !== "gameplay";
    this.zombies.forEach((zombie) => zombie.update(time, delta, this.player, playerIsInteracting));
    if (!playerIsInteracting) this.updateCompanionThreats(time);
    this.companions.forEach((companion) => companion.update(this.player, time));
    this.updateThiefBasicAttack(time);
    this.zombies = this.zombies.filter((zombie) => zombie.alive);
    this.checkBossTriggers();

    const near = this.input2.context === "gameplay" ? this.nearestInteractable() : null;
    this.interactables.forEach((i) => i.showPrompt(i === near));

    if (this.activeBoss) EventBus.emit(EVT.bossBar, { name: this.activeBoss.cfg.name, hp: this.activeBoss.hp, max: this.activeBoss.cfg.maxHp });
    this.hudUpdateElapsed += delta;
    if (this.hudUpdateElapsed >= 100) {
      this.hudUpdateElapsed %= 100;
      EventBus.emit(EVT.hud, this.hudState());
    }

    this.updatePresence();
  }

  private targets(): Damageable[] {
    return [...this.dummies, ...this.bosses.filter((b) => b.alive), ...this.zombies.filter((z) => z.alive)];
  }

  // ── STORY & BOSS FLOW ────────────────────────────────────────
  /** Opens dialogue, freezes gameplay input, and resumes when closed. */
  private talk(lines: readonly DialogueLine[], onDone?: () => void) {
    this.input2.context = "dialogue";
    this.player.sprite.setVelocity(0, 0);
    EventBus.once(EVT.dialogueClosed, () => {
      this.input2.context = "gameplay";
      onDone?.();
    });
    EventBus.emit(EVT.dialogueOpen, lines);
  }

  private nearestInteractable() {
    return this.interactables.find((i) => i.isNear(this.player.x, this.player.y)) ?? null;
  }

  private updateCompanionThreats(time: number) {
    const enemies = [
      ...this.bosses.filter((boss) => boss.alive),
      ...this.zombies.filter((zombie) => zombie.alive),
    ];
    if (!enemies.length) return;

    this.companions.forEach((companion) => {
      if (!companion.sprite.visible || isInsideSafeZone(companion.sprite.x, companion.sprite.y)) return;
      if (time < (this.companionThreatReadyAt.get(companion.config.id) ?? 0)) return;

      const nearby = enemies
        .map((enemy) => ({
          enemy,
          distance: Phaser.Math.Distance.Between(companion.sprite.x, companion.sprite.y, enemy.x, enemy.y),
        }))
        .sort((a, b) => a.distance - b.distance)[0];
      if (!nearby || nearby.distance > nearby.enemy.radius + 22) return;

      companion.takeDamage(this.bosses.includes(nearby.enemy as Boss) ? 12 : 5);
      this.companionThreatReadyAt.set(companion.config.id, time + 1200);
    });
  }

  private spawnResurrectionOrb(companion: Companion, x: number, y: number) {
    const orb = this.add.container(x, y - 18).setDepth(y + 5);
    orb.add(this.add.circle(0, 0, 22, 0x58ddff, 0.22).setStrokeStyle(2, 0xb8f5ff));
    orb.add(this.add.circle(0, 0, 12, 0x147db8).setStrokeStyle(2, 0xe3fdff));
    orb.add(this.add.text(0, -1, "✦", {
      fontFamily: "Georgia, serif",
      fontSize: "22px",
      color: "#ffffff",
      stroke: "#1484bd",
      strokeThickness: 3,
    }).setOrigin(0.5));
    orb.setSize(52, 52);
    const item = { companion, sprite: orb, x, y };
    this.resurrectionOrbs.push(item);
    this.tweens.add({ targets: orb, y: orb.y - 9, angle: 360, alpha: 0.72, duration: 1000, yoyo: true, repeat: -1 });
    EventBus.emit(EVT.toast, `${companion.config.title} fell! A resurrection orb appeared`);
  }

  private collectResurrectionOrbs() {
    for (let index = this.resurrectionOrbs.length - 1; index >= 0; index--) {
      const orb = this.resurrectionOrbs[index];
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, orb.x, orb.y) > 48) continue;
      this.resurrectionOrbs.splice(index, 1);
      if (orb.companion.revive()) {
        this.tweens.killTweensOf(orb.sprite);
        this.tweens.add({
          targets: orb.sprite,
          scale: 1.8,
          alpha: 0,
          duration: 260,
          onComplete: () => orb.sprite.destroy(),
        });
        this.playRevivalPowerUp(orb.x, orb.y);
        EventBus.emit(EVT.toast, `${orb.companion.config.title} revived!`);
      } else {
        orb.sprite.destroy();
      }
    }
  }

  private playRevivalPowerUp(x: number, y: number) {
    this.cameras.main.flash(260, 100, 220, 255);
    for (let ringIndex = 0; ringIndex < 3; ringIndex++) {
      const ring = this.add.circle(x, y - 20, 12, 0x58ddff, 0)
        .setStrokeStyle(4 - ringIndex, 0x9cf0ff, 0.9)
        .setDepth(y + 20 + ringIndex);
      this.tweens.add({
        targets: ring,
        radius: 70 + ringIndex * 24,
        alpha: 0,
        delay: ringIndex * 100,
        duration: 650,
        onComplete: () => ring.destroy(),
      });
    }
  }

  private tryInteract() {
    this.nearestInteractable()?.onInteract();
  }

  private updateThiefBasicAttack(time: number) {
    if (this.input2.context !== "gameplay") return;
    const thief = this.companions.get("thief");
    if (!thief?.sprite.visible) return;

    const target = [...this.bosses.filter((boss) => boss.alive), ...this.zombies.filter((zombie) => zombie.alive)]
      .filter((enemy) => Phaser.Math.Distance.Between(thief.sprite.x, thief.sprite.y, enemy.x, enemy.y) <= 190)
      .sort((a, b) =>
        Phaser.Math.Distance.Between(thief.sprite.x, thief.sprite.y, a.x, a.y) -
        Phaser.Math.Distance.Between(thief.sprite.x, thief.sprite.y, b.x, b.y))[0];
    if (!target || !thief.basicAttackReady(time, 1100)) return;

    const origin = new Phaser.Math.Vector2(thief.sprite.x, thief.sprite.y);
    const angle = Math.atan2(target.y - origin.y, target.x - origin.x);
    slashArc(this, origin.x, origin.y - 24, angle, -50, 50, 48, thief.config.color, 8, 100);
    target.takeHit({
      damage: Math.round(thiefBasicDamage(this.player.level) * this.player.damageMultiplier),
      from: origin,
    });
  }

  private useCompanionAbility(id: CompanionId) {
    const companion = this.companions.get(id);
    if (!companion) return;
    if (!companion.sprite.visible) {
      EventBus.emit(EVT.toast, `Find ${companion.config.title} to recruit them first`);
      return;
    }
    if (id === "wizard" && !companion.canUseSacrificeAttack()) {
      EventBus.emit(EVT.toast, "The wizard needs at least 2 HP for the first cast, or more than 10 HP for a repeat cast");
      return;
    }
    const enemies = [...this.bosses.filter((boss) => boss.alive), ...this.zombies.filter((zombie) => zombie.alive)];
    const target = enemies.sort((a, b) =>
      Phaser.Math.Distance.Between(this.player.x, this.player.y, a.x, a.y) -
      Phaser.Math.Distance.Between(this.player.x, this.player.y, b.x, b.y))[0];

    if (id !== "shield" && (!target || Phaser.Math.Distance.Between(this.player.x, this.player.y, target.x, target.y) > 760)) {
      EventBus.emit(EVT.toast, "There is no enemy close enough for that ally ability");
      return;
    }
    if (!companion.useAbility(this.time.now, companion.config.cooldown)) {
      EventBus.emit(EVT.toast, `${companion.config.title} needs a moment to recover`);
      return;
    }

    if (id === "shield") {
      companion.activateHolyProtection(this.time.now);
      const ward = this.add.circle(this.player.x, this.player.y - 30, 60, companion.config.color, 0.28)
        .setStrokeStyle(4, 0xb6e6ff).setDepth(this.player.y + 5);
      this.tweens.add({
        targets: ward,
        radius: SHIELD_HERO.protectionRadius,
        alpha: 0,
        duration: SHIELD_HERO.protectionDuration,
        onComplete: () => ward.destroy(),
      });
      EventBus.emit(EVT.toast, `Holy Protection: ${companion.maxArmor} armor guards nearby allies`);
      return;
    }

    const hit = (victim: Damageable, damage: number) => victim.takeHit({
      damage: Math.round(damage * this.player.damageMultiplier),
      from: new Phaser.Math.Vector2(this.player.x, this.player.y),
    });
    const burst = this.add.circle(target!.x, target!.y - 30, id === "wizard" ? 28 : 12, companion.config.color, 0.8)
      .setStrokeStyle(3, 0xf3e3b5).setDepth(target!.y + 10);
    this.tweens.add({
      targets: burst,
      radius: id === "wizard" ? WIZARD_AREA_ATTACK.radius : 44,
      alpha: 0,
      duration: 450,
      onComplete: () => burst.destroy(),
    });

    if (id === "wizard") {
      enemies.filter((enemy) => Phaser.Math.Distance.Between(target!.x, target!.y, enemy.x, enemy.y) <= WIZARD_AREA_ATTACK.radius)
        .forEach((enemy) => enemy.takeHit({
          damage: WIZARD_AREA_ATTACK.damage,
          from: new Phaser.Math.Vector2(companion.sprite.x, companion.sprite.y),
        }));
      const castCost = companion.spendSacrificeHealth();
      if (castCost) {
        EventBus.emit(EVT.toast, castCost.firstCast
          ? `Arcane Cataclysm: 165 area damage · wizard health halved to ${castCost.remainingHealth} HP`
          : `Arcane Cataclysm: 165 area damage · wizard health drops to ${castCost.remainingHealth} HP`);
      }
    } else if (id === "gunslinger") {
      hit(target!, 82);
      EventBus.emit(EVT.toast, "True Sight: a precise shot finds its mark");
    } else {
      const offset = new Phaser.Math.Vector2(target!.x - this.player.x, target!.y - this.player.y).normalize().scale(72);
      const destination = {
        x: Phaser.Math.Clamp(target!.x + offset.x, 40, WORLD.w - 40),
        y: Phaser.Math.Clamp(target!.y + offset.y, 40, WORLD.h - 40),
      };
      if (!isInsideSafeZone(destination.x, destination.y)) {
        this.player.sprite.setPosition(destination.x, destination.y).setVelocity(0, 0);
      }
      hit(target!, 85);
      EventBus.emit(EVT.toast, "Backstab: strike from behind for 85 damage");
    }
  }

  private useGunslingerTrackingLaser() {
    const companion = this.companions.get("gunslinger");
    if (!companion?.sprite.visible) {
      EventBus.emit(EVT.toast, "Find the Gunslinger to recruit them before using Tracking Laser");
      return;
    }
    const targets = [...this.bosses.filter((boss) => boss.alive), ...this.zombies.filter((zombie) => zombie.alive)];
    if (!targets.length) {
      EventBus.emit(EVT.toast, "Tracking Laser needs a living boss or monster to target");
      return;
    }
    const cooldown = companion.config.secondaryCooldown ?? GUNSLINGER_TRACKING_LASER.cooldown;
    if (!companion.useSecondaryAbility(this.time.now, cooldown)) {
      const seconds = Math.ceil((companion.secondaryAbilityReadyAt - this.time.now) / 1000);
      EventBus.emit(EVT.toast, `Tracking Laser recharging: ${seconds}s`);
      return;
    }

    const shotCapacity = trackingLaserShots(this.player.level);
    const shotTargets = targets
      .sort((a, b) =>
        Phaser.Math.Distance.Between(companion.sprite.x, companion.sprite.y, a.x, a.y) -
        Phaser.Math.Distance.Between(companion.sprite.x, companion.sprite.y, b.x, b.y))
      .slice(0, shotCapacity);
    shotTargets.forEach((target, index) => {
      const laser = this.add.graphics().setDepth(Math.max(companion.sprite.y, target.y) + 20);
      const progress = { value: 0 };
      const origin = { x: companion.sprite.x, y: companion.sprite.y - 28 };
      this.tweens.add({
        targets: progress,
        value: 1,
        delay: index * GUNSLINGER_TRACKING_LASER.targetStagger,
        duration: 240,
        onUpdate: () => {
          if (!target.alive) return;
          const endX = Phaser.Math.Linear(origin.x, target.x, progress.value);
          const endY = Phaser.Math.Linear(origin.y, target.y - 28, progress.value);
          laser.clear();
          laser.lineStyle(8, 0xffd166, 0.35).lineBetween(origin.x, origin.y, endX, endY);
          laser.lineStyle(3, 0x83efff, 0.95).lineBetween(origin.x, origin.y, endX, endY);
        },
        onComplete: () => {
          if (target.alive) {
            target.takeHit({
              damage: GUNSLINGER_TRACKING_LASER.damage,
              from: new Phaser.Math.Vector2(origin.x, origin.y),
            });
          }
          this.tweens.add({ targets: laser, alpha: 0, duration: 180, onComplete: () => laser.destroy() });
        },
      });
    });
    EventBus.emit(EVT.toast, `Tracking Laser: fired ${shotTargets.length}/${shotCapacity} shots · 110 damage per target`);
  }

  // Starts a boss fight when the hero walks close to a sleeping lord.
  private checkBossTriggers() {
    if (this.activeBoss || this.input2.context !== "gameplay") return;
    const boss = this.bosses.find((candidate) => !this.defeated.has(candidate.cfg.id));
    if (boss && boss.state === "dormant" && boss.sprite.visible &&
      Phaser.Math.Distance.Between(this.player.x, this.player.y, boss.x, boss.y) < 280) {
      this.activeBoss = boss;
      this.companions.get("shield")?.resetBossDefense();
      this.cameras.main.shake(300, 0.004);
      this.talk(STORY.bosses[boss.cfg.id].intro, () => {
        this.scene.pause();
        EventBus.emit(EVT.boss3dStart, { id: boss.cfg.id, name: boss.cfg.name });
      });
    }
  }

  // Runs when a lord's health hits 0. This is where a lesson becomes a power.
  private onBossDefeated(b: Boss) {
    sfx.bossDown();
    this.defeated.add(b.cfg.id);
    this.activeBoss = null;
    EventBus.emit(EVT.bossBar, null);
    this.levelUp(b.cfg.xpReward);
    // GROWTH: each lesson becomes a power
    // Beat the Empire Revenant -> Courage Strike (Q). Beat the Nike
    // Nightstalker -> Leadership Aura (E). The Shadow unlocks the gate.
    if (b.cfg.id === "empire") this.player.unlocked.add("courage");
    else if (b.cfg.id === "nike") this.player.unlocked.add("aura");
    // Each lord is also a quest on the main path
    this.quests.complete(b.cfg.id);
    const nextBoss = this.bosses.find((candidate) => !this.defeated.has(candidate.cfg.id));
    if (nextBoss) {
      nextBoss.activate();
      EventBus.emit(EVT.toast, `${nextBoss.cfg.name} has appeared`);
    }
    this.time.delayedCall(900, () =>
      this.talk(STORY.bosses[b.cfg.id].lesson, () => {
        if (this.defeated.size >= 3) this.openGate();
        this.save();
      }),
    );
  }

  // Unlocks the path east to the Future Kingdom.
  // quiet = true when restoring from a save (no flash or toast, it was always open).
  private openGate(quiet = false) {
    if (this.gateOpen) return;
    this.gateOpen = true;
    const block = this.gate.getData("block") as Phaser.GameObjects.Rectangle;
    (block.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    this.tweens.add({ targets: this.gateBars, alpha: 0, duration: quiet ? 0 : 800 });
    this.gate.setTint(0xffe9a8);
    if (quiet) return;
    sfx.gate();
    this.cameras.main.flash(500, 255, 215, 94);
    EventBus.emit(EVT.toast, "The Future Kingdom gate has opened (east)");
  }

  private levelUp(xp: number) {
    const before = this.player.level;
    if (this.player.gainXp(xp)) {
      sfx.levelup();
      this.updateZombieWaveInterval();
      EventBus.emit(EVT.toast, before < MAX_POWER_LEVEL && this.player.level >= MAX_POWER_LEVEL
        ? `MAX POWER! Level ${MAX_POWER_LEVEL}: Tracking Laser holds ${trackingLaserShots(MAX_POWER_LEVEL)} shots · zombie waves every 25s`
        : `LEVEL UP! Lv ${before} → Lv ${this.player.level}`);
      const ring = this.add.circle(this.player.x, this.player.y - 24, 10).setStrokeStyle(4, 0xffd75e).setDepth(99999);
      this.tweens.add({ targets: ring, radius: 90, alpha: 0, duration: 600, onComplete: () => ring.destroy() });
      // New level = new stats worth remembering
      this.save();
    }
  }

  private hurtPlayer(dmg: number, fromBoss = false) {
    if (this.dead || this.player.isInvulnerable || isInsideSafeZone(this.player.x, this.player.y)) return;
    const shieldHero = this.companions.get("shield");

    if (fromBoss && this.activeBoss?.isTaunting() && shieldHero?.canDefend) {
      shieldHero.absorbDamage(dmg);
      this.player.invulnerableUntil = this.time.now + 600;
      return;
    }

    let damage = dmg;
    if (shieldHero?.isDefending && shieldHero.canDefend &&
      Phaser.Math.Distance.Between(this.player.x, this.player.y, shieldHero.sprite.x, shieldHero.sprite.y) <= SHIELD_HERO.protectionRadius) {
      damage = shieldHero.absorbDamage(damage);
      if (damage === 0) {
        this.player.invulnerableUntil = this.time.now + 600;
        return;
      }
    }

    if (fromBoss && this.activeBoss?.alive && damage >= this.player.health && shieldHero?.useRescueTaunt()) {
      this.activeBoss.taunt(shieldHero.sprite, SHIELD_HERO.tauntDuration);
      shieldHero.absorbDamage(damage);
      this.player.invulnerableUntil = this.time.now + 600;
      EventBus.emit(EVT.toast, "Holy Protection: the Shield Hero draws the boss's attention!");
      return;
    }

    if (!this.player.takeDamage(damage)) return;
    this.cameras.main.shake(100, 0.005);
    if (this.player.health <= 0) this.playerFell();
  }

  /** Falling isn't failing: respawn at the Tree of Origins and try again. */
  private playerFell() {
    const failedBoss = this.activeBoss?.alive ? this.activeBoss : null;
    const failures = failedBoss
      ? (this.bossFailures.get(failedBoss.cfg.id) ?? 0) + 1
      : 0;
    if (failedBoss) this.bossFailures.set(failedBoss.cfg.id, failures);
    this.dead = true;
    sfx.fell();
    this.input2.context = "locked";
    this.player.sprite.setVelocity(0, 0);
    this.combat.cancel();
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.time.delayedCall(420, () => {
      const { width, height } = this.scale;
      const shade = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.86)
        .setScrollFactor(0).setDepth(999990);
      const box = this.add.rectangle(width / 2, height / 2, 760, 190, 0x020304, 1)
        .setStrokeStyle(3, 0x7f8791).setScrollFactor(0).setDepth(999991);
      const heading = this.add.text(width / 2, height / 2 - 36, "SYSTEM RECOVERY", {
        fontFamily: "Consolas, monospace",
        fontSize: "16px",
        color: "#a8b0ba",
        letterSpacing: 4,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(999992);
      const message = this.add.text(width / 2, height / 2 + 12, "FAILURE IS THE FIRST STEP TO SUCCESS", {
        fontFamily: "Georgia, serif",
        fontSize: "26px",
        color: "#f3f3f3",
        stroke: "#111111",
        strokeThickness: 3,
        align: "center",
      }).setOrigin(0.5).setScrollFactor(0).setDepth(999992);
      const recovery = this.add.text(width / 2, height / 2 + 60, "RESTORING HEALTH · RESTARTING", {
        fontFamily: "Consolas, monospace",
        fontSize: "13px",
        color: "#8eefff",
        letterSpacing: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(999992);
      this.deathScreen = [shade, box, heading, message, recovery];

      this.time.delayedCall(1500, () => {
        this.deathScreen?.forEach((object) => object.destroy());
        this.deathScreen = undefined;
        this.activeBoss?.reset();
        this.activeBoss = null;
        EventBus.emit(EVT.bossBar, null);
        this.player.health = this.player.maxHealth;
        this.player.sprite.setPosition(SPAWN.x, SPAWN.y).setAlpha(0);
        this.player.locks.setPosition(SPAWN.x, SPAWN.y - 52).setAlpha(0);
        this.cameras.main.fadeIn(600);
        this.playRevivalPowerUp(SPAWN.x, SPAWN.y);
        this.tweens.add({
          targets: [this.player.sprite, this.player.locks],
          alpha: 1,
          duration: 650,
          ease: "Cubic.easeOut",
        });
        this.player.sprite.setTint(0x9cf0ff);
        this.time.delayedCall(700, () => {
          this.player.sprite.clearTint();
          this.dead = false;
          this.input2.context = "gameplay";
          if (failedBoss && failures >= 3) {
            if (!this.gateOpen && failures === 3) {
              this.openGate();
              this.talk(STORY.futureGateAssisted);
              this.save();
            } else {
              EventBus.emit(EVT.toast, "The Future Kingdom gate is open if you want another path.");
            }
          } else {
            EventBus.emit(EVT.toast, failedBoss
              ? `Every setback is a setup. Boss attempt ${failures} of 3. Rise and try again.`
              : "Every setback is a setup. Rise and try again.");
          }
        });
      });
    });
  }

  // Packs all the numbers the HUD needs into one HudState object.
  private hudState(): HudState {
    const p = this.player;
    return {
      hp: p.health, maxHp: p.maxHealth, level: p.level, xp: p.xp, xpNext: xpToNext(p.level),
      // The hero's name, shown next to the level in the HUD
      name: this.heroName,
      combo: this.combat.state === "basic" ? this.combat.comboIndex : 0,
      dashCd: this.movement.dashCooldown,
      courageCd: this.combat.cooldownRemaining("courage"),
      auraCd: this.combat.cooldownRemaining("aura"),
      legacyCd: this.combat.cooldownRemaining("legacy"),
      courageUnlocked: p.unlocked.has("courage"), auraUnlocked: p.unlocked.has("aura"),
      legacyUnlocked: p.unlocked.has("legacy"), auraActive: p.auraActive,
      allies: COMPANIONS.filter((cfg) => this.companions.get(cfg.id)?.sprite.visible)
        .map(({ id, key, title, ability }) => ({ id, key, title, ability })),
      allyCooldowns: Object.fromEntries(COMPANIONS.map((cfg) => [
        cfg.id,
        Math.max(0, (this.companions.get(cfg.id)?.abilityReadyAt ?? 0) - this.time.now),
      ])) as Record<CompanionId, number>,
      trackingLaserCooldown: Math.max(
        0,
        (this.companions.get("gunslinger")?.secondaryAbilityReadyAt ?? 0) - this.time.now,
      ),
      trackingLaserShots: trackingLaserShots(p.level),
      shieldArmor: this.companions.get("shield")?.armor ?? 0,
      shieldMaxArmor: this.companions.get("shield")?.maxArmor ?? SHIELD_HERO.armor,
      shieldHealth: this.companions.get("shield")?.health ?? 0,
      shieldMaxHealth: this.companions.get("shield")?.maxHealth ?? SHIELD_HERO.health,
      wizardHealth: this.companions.get("wizard")?.health ?? 0,
      wizardMaxHealth: this.companions.get("wizard")?.maxHealth ?? COMPANION_BASE_HEALTH,
      holyProtection: this.companions.get("shield")?.isDefending ?? false,
      resurrectionOrbs: this.resurrectionOrbs.length,
      wave: this.zombieWave, zombies: this.zombies.length,
    };
  }
}
