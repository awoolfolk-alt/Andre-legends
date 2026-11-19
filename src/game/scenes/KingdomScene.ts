import * as Phaser from "phaser";
// The hero and the things you can talk to
import { Player } from "../entities/Player";
import { Interactable } from "../entities/NPC";
import { Damageable } from "../entities/Damageable";
// The same systems that run the forest: input, combat, movement, quests
import { CombatInput } from "../systems/CombatInput";
import { CombatSystem } from "../systems/Combat";
import { MovementSystem } from "../systems/Movement";
import { EventBus, EVT } from "../systems/EventBus";
import { QuestLog } from "../systems/Quests";
import { STORY, DialogueLine } from "../data/story";
import { ABILITIES, PLAYER_BASE, xpToNext } from "../data/combatData";
import { ScreenFX, addGlow } from "../effects/ScreenFX";
import { freshSave, loadSave, writeSave, SaveData } from "../save";
import type { HudState } from "./UIScene";

// ─────────────────────────────────────────────────────────────
// THE FUTURE KINGDOM (Chapter 1 finale)
// A golden field east of the forest, reached through the gate after
// the three vampire lords fall (or after three hard attempts — asking
// for another path is a strength, not a failure). No bosses here —
// this is the reward:
//   - The Future Self, who unlocks LEGACY SURGE (R)
//   - The Monument of Legacy: the mission, carved in gold
//   - A portal west, back to the Forest of Origins
// The scene reuses the same systems as the forest (input, combat,
// movement, dialogue, save). Only the world and its people are new.
// ─────────────────────────────────────────────────────────────

const WORLD = { w: 1600, h: 1000 };
// The hero arrives from the west (the gate he just walked through)
const SPAWN = { x: 220, y: 500 };
// The monument at the heart of the kingdom, and the Future Self beside it
const MONUMENT = { x: 1050, y: 470 };

export class KingdomScene extends Phaser.Scene {
  private player!: Player;
  private input2!: CombatInput;
  private combat!: CombatSystem;
  private movement!: MovementSystem;
  private interactables: Interactable[] = [];
  private colliders!: Phaser.Physics.Arcade.StaticGroup;

  // Save state (same shape as the forest's; the two scenes share one file)
  private heroName = "Traveler";
  private quests = new QuestLog();
  private unlockedLegacy = false;
  private resumeContext: "gameplay" | "dialogue" | "locked" = "gameplay";
  // True once we've announced ourselves to the HUD (worldReady + quest tracker)
  private announced = false;

  constructor() { super("Kingdom"); }

  create() {
    const save = loadSave() ?? freshSave(this.heroName);
    this.heroName = save.name || "Traveler";
    this.quests = new QuestLog(save.questsDone);
    this.unlockedLegacy = save.unlocked.includes("legacy");

    this.physics.world.setBounds(0, 0, WORLD.w, WORLD.h);
    this.buildWorld();

    // CHECKPOINT: resume exactly where the hero last saved in this scene.
    const startPos = save.pos?.scene === "Kingdom" ? save.pos : SPAWN;
    this.player = new Player(this, startPos.x, startPos.y);
    this.input2 = new CombatInput(this);
    this.combat = new CombatSystem(this, this.player, this.input2, () => this.targets());
    this.movement = new MovementSystem(this, this.player, this.input2, this.combat);

    // Restore the hero's growth from the save
    this.player.level = save.level;
    this.player.xp = save.xp;
    this.player.maxHealth = PLAYER_BASE.health + 5 * (save.level - 1);
    this.player.health = this.player.maxHealth;
    save.unlocked.forEach((p) => this.player.unlocked.add(p));

    this.input2.on("interact", () => this.tryInteract());
    this.input2.on("advance", () => EventBus.emit(EVT.dialogueAdvance));

    this.buildCharacters(save);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD.w, WORLD.h);
    cam.startFollow(this.player.sprite, true, 0.1, 0.1);
    cam.fadeIn(800, 255, 215, 94); // arrive through a golden light

    EventBus.emit(EVT.worldReady, "Kingdom");
    EventBus.emit(EVT.bossBar, null);
    this.quests.push();

    // First visit: jv-marc's voice on the wind points the way to the monument
    if (!this.unlockedLegacy) {
      this.time.delayedCall(1000, () => this.talk(STORY.kingdom.arrival));
    }

    // Pause + save-on-exit wiring (same pattern as the forest)
    const onPause = (paused: boolean) => {
      if (paused) {
        this.resumeContext = this.input2.context;
        this.input2.context = "locked";
      } else {
        this.input2.context = this.resumeContext;
      }
    };
    // Same "../" note as ForestScene: "./" would reload /game/ instead of
    // leaving for the menu.
    const onQuit = () => {
      this.save();
      window.location.href = "../";
    };
    EventBus.on(EVT.pause, onPause);
    EventBus.on(EVT.pauseQuit, onQuit);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off(EVT.pause, onPause);
      EventBus.off(EVT.pauseQuit, onQuit);
      this.save();
    });
  }

  // Write progress to the browser save (same file the forest writes).
  private save() {
    const prev = loadSave();
    const data: SaveData = {
      // Keep everything the forest knows; update what the kingdom can change
      name: this.heroName,
      level: this.player.level,
      xp: this.player.xp,
      unlocked: [...this.player.unlocked],
      defeated: prev?.defeated ?? ["empire", "nike", "self"],
      gateOpen: true, // you can only BE here if the gate opened
      memoriesRead: prev?.memoriesRead ?? [],
      questsDone: this.quests.completedIds,
      savedAt: Date.now(),
      // The checkpoint: this scene, this exact spot.
      pos: { scene: "Kingdom", x: Math.round(this.player.x), y: Math.round(this.player.y) },
      // Carry the hero's look forward so it survives every save.
      ...(prev?.hero ? { hero: prev.hero } : {}),
    };
    writeSave(data);
    EventBus.emit(EVT.saved);
  }

  // ── WORLD ────────────────────────────────────────────────────
  private buildWorld() {
    // Golden grass: the same tiling idea as the forest, but the kingdom's color
    this.add.tileSprite(0, 0, WORLD.w, WORLD.h, "goldgrass").setOrigin(0).setDepth(-10);

    // A golden road from the western gate to the monument
    const path = this.add.graphics().setDepth(-9);
    path.fillStyle(0x9a7a3a, 0.55);
    const stops = [[120, 500], [500, 500], [800, 480], [MONUMENT.x, MONUMENT.y + 40]];
    for (let i = 0; i < stops.length - 1; i++) {
      const [x1, y1] = stops[i]; const [x2, y2] = stops[i + 1];
      const steps = Math.ceil(Phaser.Math.Distance.Between(x1, y1, x2, y2) / 20);
      for (let s = 0; s <= steps; s++) path.fillCircle(Phaser.Math.Linear(x1, x2, s / steps), Phaser.Math.Linear(y1, y2, s / steps), 34);
    }
    // A radiant clearing around the monument
    path.fillStyle(0xc9a94e, 0.35).fillEllipse(MONUMENT.x, MONUMENT.y + 40, 520, 320);
    path.lineStyle(4, 0xffe9a8, 0.4).strokeEllipse(MONUMENT.x, MONUMENT.y + 40, 500, 300);

    this.colliders = this.physics.add.staticGroup();

    // Ring of glowing trees around the edges (the kingdom is luminous)
    for (let x = 60; x < WORLD.w; x += 130) { this.glowTreeAt(x, 70); this.glowTreeAt(x, WORLD.h - 40); }
    for (let y = 200; y < WORLD.h - 80; y += 140) { this.glowTreeAt(WORLD.w - 50, y); if (Math.abs(y - 500) > 140) this.glowTreeAt(50, y); }

    // Golden "fireflies" — rising embers of hope instead of drifting fireflies
    this.add.particles(0, 0, "spark", {
      x: { min: 0, max: WORLD.w }, y: { min: 0, max: WORLD.h },
      lifespan: 4500, speedY: { min: -30, max: -8 }, speedX: { min: -8, max: 8 },
      scale: { start: 0.6, end: 0 }, alpha: { start: 0.9, end: 0 },
      tint: [0xffe9a8, 0xffd75e], blendMode: "ADD", frequency: 110,
    }).setDepth(5000);
  }

  private glowTreeAt(x: number, y: number) {
    const t = this.add.image(x, y, "glowtree").setOrigin(0.5, 0.95).setDepth(y);
    this.physics.add.existing(t, true);
    (t.body as Phaser.Physics.Arcade.StaticBody).setSize(50, 20, false).setOffset(55, 160);
    this.colliders.add(t);
  }

  // ── CHARACTERS ───────────────────────────────────────────────
  private buildCharacters(save: SaveData) {
    const add = (x: number, y: number, tex: string, name: string, lines: () => readonly DialogueLine[], label = "[F] Talk", glow?: number) => {
      const it = new Interactable(this, x, y, tex, name, () => this.talk(lines()));
      it.setLabel(label);
      if (glow !== undefined) addGlow(it.sprite, glow, 2);
      this.interactables.push(it);
      return it;
    };

    // The way back west
    const portal = add(90, 500, "gate", "Way Back West", () => STORY.kingdom.arrival, "[F] Return", 0x4fd1ff);
    // Override: returning does NOT re-read the arrival lines; it walks back through
    portal.onInteract = () => {
      this.save();
      this.cameras.main.fadeOut(600, 11, 18, 32);
      this.time.delayedCall(650, () => this.scene.start("Forest"));
    };

    // The Monument of Legacy: the mission, carved in gold
    const mon = this.add.image(MONUMENT.x, MONUMENT.y, "monument").setOrigin(0.5, 1).setDepth(MONUMENT.y);
    this.physics.add.existing(mon, true);
    (mon.body as Phaser.Physics.Arcade.StaticBody).setSize(90, 30, false).setOffset(35, 130);
    this.colliders.add(mon);
    addGlow(mon, 0xffd75e, 2);
    add(MONUMENT.x, MONUMENT.y + 30, "spark", "Monument of Legacy", () => STORY.kingdom.monument, "[F] Read", 0xffd75e)
      .sprite.setVisible(false);

    // The Future Self: the hero, further down the road. Talking to him the first
    // time unlocks LEGACY SURGE (R).
    const self = add(MONUMENT.x + 120, MONUMENT.y + 60, "hero", "Future Self", () => STORY.kingdom.futureSelf, "[F] Meet", 0xffe9a8);
    self.sprite.setTint(0xffe0a0); // bathed in golden light
    self.onInteract = () => {
      if (this.unlockedLegacy) {
        // After the unlock, he just repeats his welcome
        this.talk(STORY.kingdom.futureSelf);
        return;
      }
      this.talk(STORY.kingdom.futureSelf, () => {
        this.unlockedLegacy = true;
        this.player.unlocked.add("legacy");
        this.quests.complete("legacy");
        // Celebration: gold flash, bloom, and a ring of light around the hero
        this.cameras.main.flash(600, 255, 233, 168);
        ScreenFX.for(this).bloomPulse(1.5, 800);
        const ring = this.add.circle(this.player.x, this.player.y - 24, 14).setStrokeStyle(5, 0xffd75e).setDepth(99999);
        this.tweens.add({ targets: ring, radius: 160, alpha: 0, duration: 900, onComplete: () => ring.destroy() });
        EventBus.emit(EVT.toast, "LEGACY SURGE (R) unlocked!");
        this.save();
      });
    };
  }

  // ── GAME LOOP ────────────────────────────────────────────────
  update(time: number, delta: number) {
    // On the very first frame, re-announce ourselves to the HUD. The HUD scene
    // may have been created after us, so create()'s announcement can be missed.
    if (!this.announced) {
      this.announced = true;
      EventBus.emit(EVT.worldReady, "Kingdom");
      EventBus.emit(EVT.bossBar, null);
      this.quests.push();
    }
    this.movement.update(time);
    this.player.updateVisuals(time);

    // Same gentle cursor parallax as the forest
    const p = this.input.activePointer;
    const cam = this.cameras.main;
    cam.setFollowOffset(-(p.x - cam.width / 2) * 0.04, -(p.y - cam.height / 2) * 0.04);

    if (this.player.auraActive) this.player.heal((ABILITIES.aura.regenPerSec * delta) / 1000);

    const near = this.input2.context === "gameplay" ? this.nearestInteractable() : null;
    this.interactables.forEach((i) => i.showPrompt(i === near));

    EventBus.emit(EVT.hud, this.hudState());
  }

  // No bosses here: only the practice of swinging at the air (and the peace of it)
  private targets(): Damageable[] {
    return [];
  }

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

  private tryInteract() {
    this.nearestInteractable()?.onInteract();
  }

  private hudState(): HudState {
    const p = this.player;
    return {
      hp: p.health, maxHp: p.maxHealth, level: p.level, xp: p.xp, xpNext: xpToNext(p.level),
      name: this.heroName,
      combo: this.combat.state === "basic" ? this.combat.comboIndex : 0,
      dashCd: this.movement.dashCooldown,
      courageCd: this.combat.cooldownRemaining("courage"),
      auraCd: this.combat.cooldownRemaining("aura"),
      legacyCd: this.combat.cooldownRemaining("legacy"),
      courageUnlocked: p.unlocked.has("courage"), auraUnlocked: p.unlocked.has("aura"),
      legacyUnlocked: p.unlocked.has("legacy"), auraActive: p.auraActive,
      // No companions or zombies in the kingdom: the HUD hides those panels
      // when the fields are missing.
    };
  }
}
