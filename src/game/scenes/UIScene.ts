import * as Phaser from "phaser";
import { EventBus, EVT } from "../systems/EventBus";
import { Dialogue } from "../systems/Dialogue";
import type { DialogueLine } from "../data/story";
import { personalizeLines, personalizeText } from "../data/hero";
import { loadSave } from "../save";
import type { CompanionId } from "../data/companions";
import { sfx } from "../audio/Sfx";

// ─────────────────────────────────────────────────────────────
// UI SCENE (the HUD). Runs ON TOP of the world scene.
// WHY a separate scene? The world camera moves, shakes, and zooms.
// The HUD must stay still. Two scenes = two cameras.
// It never touches the player directly. It only listens to EventBus.
// It shows: health, XP, level, the hero's name, combo counter, skill
// cooldowns, ally powers, the boss health bar, the quest tracker,
// the pause menu, pop-up "toast" messages, and the dialogue box.
// ─────────────────────────────────────────────────────────────

// An "interface" describes the SHAPE of an object: which fields it has and
// their types. ForestScene and KingdomScene build one of these and send it
// here. The ally/zombie fields are optional ("?") because the Future Kingdom
// has no companions or zombies — the HUD hides those panels when missing.
export interface HudState {
  // Health, level, and experience points (XP needed for next level = xpNext)
  hp: number; maxHp: number; level: number; xp: number; xpNext: number;
  // The hero's chosen name, from the save file
  name: string;
  // combo = which hit of the N combo we're on; *Cd = cooldown time left in ms
  combo: number; dashCd: number; courageCd: number; auraCd: number; legacyCd: number;
  // Which powers have been earned, and whether the aura is glowing now
  courageUnlocked: boolean; auraUnlocked: boolean; legacyUnlocked: boolean; auraActive: boolean;
  // Ally party (Forest only)
  allies?: { id: CompanionId; key: string; title: string; ability: string }[];
  allyCooldowns?: Record<CompanionId, number>;
  trackingLaserCooldown?: number;
  trackingLaserShots?: number;
  shieldArmor?: number; shieldMaxArmor?: number; shieldHealth?: number; shieldMaxHealth?: number;
  wizardHealth?: number; wizardMaxHealth?: number;
  holyProtection?: boolean;
  resurrectionOrbs?: number;
  wave?: number; zombies?: number;
}

// What the quest tracker shows. Sent by the world's QuestLog when it changes.
interface QuestState {
  done: number; total: number; title: string; hint: string;
}

export class UIScene extends Phaser.Scene {
  private dialogue!: Dialogue;
  // One Graphics "pen" that redraws all the bars (health, XP, boss) each frame
  private bars!: Phaser.GameObjects.Graphics;
  private levelText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private allyText!: Phaser.GameObjects.Text;
  // The 4 skill buttons along the bottom (Dash, Courage, Aura, Legacy)
  private skillTexts: Phaser.GameObjects.Text[] = [];
  private toastText!: Phaser.GameObjects.Text;
  private bossName!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  // Current boss info, or null when no boss fight is happening
  private boss: { name: string; hp: number; max: number } | null = null;

  // Quest tracker (top-right) and its latest state
  private questTitle!: Phaser.GameObjects.Text;
  private questHint!: Phaser.GameObjects.Text;
  private questCount!: Phaser.GameObjects.Text;

  // "Saved ✓" flash (bottom-right, appears whenever progress is written)
  private savedText!: Phaser.GameObjects.Text;

  // Pause menu
  private pausePanel!: Phaser.GameObjects.Container;
  private paused = false;
  // Which world scene is live ("Forest" or "Kingdom"); the pause menu freezes it
  private worldKey = "Forest";

  // PERFORMANCE CACHE: the HUD is told new numbers many times a second, but
  // most frames nothing changed. We remember what we last drew and skip the
  // redraw when it's identical (setText() re-renders a little canvas, so
  // skipping it is a real saving).
  private lastBarsSig = "";
  private lastLevelText = "";
  private lastComboText = "";
  private lastAllyText = "";
  private lastWaveText = "";
  private lastSkillTexts: string[] = [];
  private lastSkillAlpha: number[] = [];
  private lastSkillColor: string[] = [];
  private lastBossName = "";

  constructor() { super("UI"); }

  create() {
    this.bars = this.add.graphics();
    // Level/HP/name text, top-left. stroke = black outline so it's readable anywhere.
    this.levelText = this.add.text(24, 18, "", { fontFamily: "Cinzel, Georgia, serif", fontSize: "18px", color: "#ffd75e", stroke: "#000", strokeThickness: 4 });
    // y=52 keeps it clear of the Menu link the page overlays at top-right
    this.waveText = this.add.text(this.scale.width - 24, 52, "", { fontFamily: "Georgia, serif", fontSize: "16px", color: "#f0a3b0", stroke: "#000", strokeThickness: 4 }).setOrigin(1, 0);
    this.comboText = this.add.text(this.scale.width / 2, 120, "", { fontFamily: "Cinzel, Georgia, serif", fontSize: "26px", color: "#4fd1ff", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5);
    // y=140 leaves room for the sound toggle button the page overlays top-left
    this.allyText = this.add.text(24, 140, "", {
      fontFamily: "Georgia, serif",
      fontSize: "13px",
      color: "#f1c66e",
      stroke: "#000",
      strokeThickness: 3,
      lineSpacing: 3,
    });

    // Make the 4 skill buttons along the bottom-left.
    const skills = ["SHIFT Dash", "Q Courage", "E Aura", "R Legacy"];
    skills.forEach((s, i) => {
      this.skillTexts.push(this.add.text(24 + i * 128, this.scale.height - 40, s, {
        fontFamily: "Georgia", fontSize: "14px", color: "#ffffff", backgroundColor: "#0d1830cc", padding: { x: 8, y: 6 },
      }));
    });
    // Controls reminder, bottom-right. setOrigin(1, 0) anchors it by its right edge.
    this.add.text(this.scale.width - 20, this.scale.height - 34,
      "WASD move · N quick · M heavy · 1-4 ally powers · 5 tracking laser · F interact · ESC menu", {
        fontFamily: "Georgia", fontSize: "13px", color: "#c8d2ff", stroke: "#000", strokeThickness: 3,
      }).setOrigin(1, 0);

    // Toast = short pop-up message near the top. Starts invisible (alpha 0).
    this.toastText = this.add.text(this.scale.width / 2, 70, "", {
      fontFamily: "Georgia", fontSize: "18px", color: "#ffffff", backgroundColor: "#0d1830e6", padding: { x: 12, y: 8 },
    }).setOrigin(0.5).setAlpha(0);
    // Boss name, shown above the boss bar during a fight
    this.bossName = this.add.text(this.scale.width / 2, 22, "", { fontFamily: "Cinzel, Georgia, serif", fontSize: "18px", color: "#ffb3b3", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5, 0);

    // ── QUEST TRACKER (top-right, BELOW the Jukebox music widget) ──
    // A small parchment-style card: quest title, what to do, and progress.
    // y=210 because the page overlays the Jukebox in the top-right corner.
    this.add.rectangle(this.scale.width - 16, 210, 300, 84, 0x0d1830, 0.82)
      .setOrigin(1, 0).setStrokeStyle(1, 0xd4a72c, 0.6);
    this.add.text(this.scale.width - 30, 218, "CURRENT QUEST", {
      fontFamily: "Cinzel, Georgia, serif", fontSize: "11px", color: "#8a94b8",
    }).setOrigin(1, 0);
    this.questTitle = this.add.text(this.scale.width - 30, 232, "", {
      fontFamily: "Cinzel, Georgia, serif", fontSize: "15px", color: "#ffd75e", stroke: "#000", strokeThickness: 3,
    }).setOrigin(1, 0);
    this.questHint = this.add.text(this.scale.width - 30, 252, "", {
      fontFamily: "Georgia", fontSize: "12px", color: "#c8d2ff", wordWrap: { width: 272 },
    }).setOrigin(1, 0);
    this.questCount = this.add.text(this.scale.width - 30, 276, "", {
      fontFamily: "Georgia", fontSize: "11px", color: "#8a94b8",
    }).setOrigin(1, 0);

    // "Saved ✓" flash, bottom-right above the controls line
    this.savedText = this.add.text(this.scale.width - 20, this.scale.height - 64, "Saved ✓", {
      fontFamily: "Georgia", fontSize: "13px", color: "#7be8a8", stroke: "#000", strokeThickness: 3,
    }).setOrigin(1, 0).setAlpha(0);

    // The dialogue box lives in the HUD so it doesn't shake with the world camera
    this.dialogue = new Dialogue(this);
    this.dialogue.onClose = undefined;

    // The pause menu, hidden until ESC
    this.buildPausePanel();
    // ESC is handled HERE, not by the world scene: the world is frozen while
    // paused, so only this (always-awake) scene can hear the key to resume.
    this.input.keyboard!.on("keydown-ESC", () => this.togglePause());

    // Listen to the world.
    // Each of these is an arrow function that handles one kind of message.
    // We store them in variables so we can remove the exact same functions later.
    const onOpen = (lines: DialogueLine[]) => {
      this.dialogue.onClose = () => EventBus.emit(EVT.dialogueClosed);
      // The story still tells Andre's life, but the hero answers to the
      // PLAYER's name — every line passes through one funnel here, so no
      // scene ever has to think about it.
      this.dialogue.open(personalizeLines(lines, this.heroDisplayName()));
    };
    // A short blip per advance, pitched by the speaker's name length so
    // each character "sounds" a little different (classic JRPG trick).
    const onAdvance = () => {
      sfx.blip(520 + (this.dialogue.speaker.length * 37) % 320);
      this.dialogue.advance();
    };
    const onHud = (s: HudState) => this.drawHud(s);
    // The player holds Andre's position in the story, so every name the
    // HUD shows — boss bar, toasts, quest tracker — speaks THEIR name.
    const onToast = (msg: string) => this.toast(personalizeText(msg, this.heroDisplayName()));
    const onBoss = (b: { name: string; hp: number; max: number } | null) => {
      this.boss = b ? { ...b, name: personalizeText(b.name, this.heroDisplayName()) } : b;
    };
    // The quest tracker got a new state
    const onQuest = (q: QuestState) => this.showQuest({
      ...q,
      title: personalizeText(q.title, this.heroDisplayName()),
      hint: personalizeText(q.hint, this.heroDisplayName()),
    });
    // Progress was written: flash "Saved ✓"
    const onSaved = () => this.flashSaved();
    // A new world scene took over (Forest <-> Kingdom): unpause and retarget
    const onWorld = (key: string) => {
      this.worldKey = key;
      if (this.paused) this.togglePause();
    };
    EventBus.on(EVT.dialogueOpen, onOpen);
    EventBus.on(EVT.dialogueAdvance, onAdvance);
    EventBus.on(EVT.hud, onHud);
    EventBus.on(EVT.toast, onToast);
    EventBus.on(EVT.bossBar, onBoss);
    EventBus.on(EVT.quest, onQuest);
    EventBus.on(EVT.saved, onSaved);
    EventBus.on(EVT.worldReady, onWorld);
    // Always unsubscribe when the scene shuts down, or old listeners pile up
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off(EVT.dialogueOpen, onOpen);
      EventBus.off(EVT.dialogueAdvance, onAdvance);
      EventBus.off(EVT.hud, onHud);
      EventBus.off(EVT.toast, onToast);
      EventBus.off(EVT.bossBar, onBoss);
      EventBus.off(EVT.quest, onQuest);
      EventBus.off(EVT.saved, onSaved);
      EventBus.off(EVT.worldReady, onWorld);
    });
  }

  // ── PAUSE MENU ───────────────────────────────────────────────
  private buildPausePanel() {
    const w = this.scale.width;
    const h = this.scale.height;
    // A dark see-through sheet over the whole screen
    const shade = this.add.rectangle(w / 2, h / 2, w, h, 0x05070f, 0.72);
    const boxW = 420;
    const bg = this.add.rectangle(w / 2, h / 2, boxW, 340, 0x0d1830, 0.97).setStrokeStyle(2, 0xd4a72c, 0.9);
    const title = this.add.text(w / 2, h / 2 - 130, "PAUSED", {
      fontFamily: "Cinzel, Georgia, serif", fontSize: "30px", color: "#ffd75e", stroke: "#000", strokeThickness: 5,
    }).setOrigin(0.5);
    const controls = this.add.text(w / 2, h / 2 - 62,
      "WASD / Arrows — move\nN — combo · M — heavy\nSHIFT — dash · F — interact\nQ / E / R — powers you earn · 1-5 — allies", {
        fontFamily: "Georgia", fontSize: "15px", color: "#c8d2ff", align: "center", lineSpacing: 6,
      }).setOrigin(0.5, 0);

    // A button = text with a background that reacts to the mouse
    const makeButton = (y: number, label: string, onClick: () => void) => {
      const t = this.add.text(w / 2, y, label, {
        fontFamily: "Georgia", fontSize: "17px", color: "#f3e3b5", backgroundColor: "#1b2a4a", padding: { x: 22, y: 10 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      t.on("pointerover", () => t.setColor("#ffd75e"));
      t.on("pointerout", () => t.setColor("#f3e3b5"));
      t.on("pointerdown", onClick);
      return t;
    };
    const resumeBtn = makeButton(h / 2 + 78, "▸ Resume (ESC)", () => this.togglePause());
    // "Save & Exit": the WORLD scene hears this, writes the save, then leaves
    // the page for the main menu (window.location).
    const quitBtn = makeButton(h / 2 + 130, "💾 Save & Exit to Menu", () => EventBus.emit(EVT.pauseQuit));

    this.pausePanel = this.add.container(0, 0, [shade, bg, title, controls, resumeBtn, quitBtn])
      .setDepth(2000).setVisible(false);
  }

  private togglePause() {
    // Never pause over the top of nothing: only when a world is running
    if (!this.scene.isActive(this.worldKey) && !this.paused) return;
    this.paused = !this.paused;
    if (this.paused) {
      // Tell the world to lock input, THEN freeze it (order matters)
      EventBus.emit(EVT.pause, true);
      this.scene.pause(this.worldKey);
      this.pausePanel.setVisible(true);
    } else {
      this.pausePanel.setVisible(false);
      this.scene.resume(this.worldKey);
      EventBus.emit(EVT.pause, false);
    }
  }

  /** The player's chosen name ("" if none). Every display funnel —
      dialogue, boss bar, toasts, quests, ally flavor — personalizes
      through this one helper so the player fully holds Andre's role. */
  private heroDisplayName(): string {
    return loadSave()?.name ?? "";
  }

  // ── QUEST TRACKER ────────────────────────────────────────────
  private showQuest(q: QuestState) {
    this.questTitle.setText(q.title);
    this.questHint.setText(q.hint);
    this.questCount.setText(`${q.done} / ${q.total} quests`);
  }

  // ── "Saved ✓" FLASH ──────────────────────────────────────────
  private flashSaved() {
    this.tweens.killTweensOf(this.savedText);
    this.savedText.setAlpha(1);
    this.tweens.add({ targets: this.savedText, alpha: 0, delay: 1200, duration: 600 });
  }

  // Redraws the whole HUD from the latest numbers. Called many times a second,
  // but every part first checks "did this actually change?" and skips if not.
  private drawHud(s: HudState) {
    // ── BARS (health, XP, boss): redrawn only when a value changed ──
    const barsSig = [s.hp, s.maxHp, s.xp, s.xpNext, s.auraActive, this.boss?.hp, this.boss?.max, this.boss?.name].join("|");
    if (barsSig !== this.lastBarsSig) {
      this.lastBarsSig = barsSig;
      const g = this.bars;
      g.clear();
      // Health: dark background bar, then a red bar whose width = hp / maxHp.
      g.fillStyle(0x000000, 0.6).fillRoundedRect(20, 46, 260, 16, 6);
      g.fillStyle(0xe0455a).fillRoundedRect(22, 48, 256 * (s.hp / s.maxHp), 12, 5);
      // XP: gold while Leadership Aura is active, cyan otherwise.
      g.fillStyle(0x000000, 0.6).fillRoundedRect(20, 66, 260, 8, 4);
      g.fillStyle(s.auraActive ? 0xffd75e : 0x4fd1ff).fillRoundedRect(21, 67, 258 * (s.xp / s.xpNext), 6, 3);
      // Boss bar: only during a boss fight (this.boss is null otherwise)
      if (this.boss) {
        const w = Math.min(600, this.scale.width - 340);
        const x = this.scale.width / 2 - w / 2;
        g.fillStyle(0x000000, 0.7).fillRoundedRect(x, 48, w, 18, 6);
        g.fillStyle(0xb3263a).fillRoundedRect(x + 2, 50, (w - 4) * (this.boss.hp / this.boss.max), 14, 5);
      }
    }

    // Level + HP + the hero's name
    const levelLine = `${s.name} · Lv ${s.level}   HP ${Math.ceil(s.hp)}/${s.maxHp}`;
    if (levelLine !== this.lastLevelText) {
      this.lastLevelText = levelLine;
      this.levelText.setText(levelLine);
    }

    // The blood-moon wave counter (Forest only; hidden in the Kingdom)
    const waveLine = s.wave !== undefined ? `Blood moon · Wave ${s.wave} · ${s.zombies ?? 0} risen` : "";
    if (waveLine !== this.lastWaveText) {
      this.lastWaveText = waveLine;
      this.waveText.setText(waveLine);
    }

    // One sword symbol per combo hit (left-right-left), or nothing when not attacking
    const comboLine = s.combo > 0 ? `${"⚔ ".repeat(s.combo)}` : "";
    if (comboLine !== this.lastComboText) {
      this.lastComboText = comboLine;
      this.comboText.setText(comboLine);
    }

    // ── ALLY PANEL (only when the world sends ally data) ──
    if (s.allies) {
      const fmt = (ms: number) => (ms > 0 ? ` ${(ms / 1000).toFixed(1)}s` : "");
      const cds = s.allyCooldowns ?? ({} as Record<CompanionId, number>);
      const allyLines = s.allies.map((ally) =>
        `${ally.key} ${ally.title}: ${personalizeText(ally.ability, this.heroDisplayName())}${fmt(cds[ally.id] ?? 0)}`);
      if (s.allies.some((ally) => ally.id === "shield")) {
        allyLines.push(`Shield: ${s.shieldArmor ?? 0}/${s.shieldMaxArmor ?? 0} armor · ${s.shieldHealth ?? 0}/${s.shieldMaxHealth ?? 0} HP${s.holyProtection ? " · PROTECTING" : ""}`);
      }
      if (s.allies.some((ally) => ally.id === "wizard")) {
        allyLines.push(`Wizard: ${s.wizardHealth ?? 0}/${s.wizardMaxHealth ?? 0} HP · Cataclysm: first cast halves HP, repeats leave 10`);
      }
      if ((s.resurrectionOrbs ?? 0) > 0) {
        allyLines.push(`Resurrection orb${s.resurrectionOrbs === 1 ? "" : "s"}: walk over ${s.resurrectionOrbs} to revive fallen allies`);
      }
      if (s.allies.some((ally) => ally.id === "gunslinger")) {
        allyLines.push(`5 Tracking Laser: up to ${s.trackingLaserShots ?? 1} shots · 110 damage each${fmt(s.trackingLaserCooldown ?? 0)}`);
      }
      allyLines.push("Party recovery: +2 HP / 5s · E boosts ally damage");
      const allyLine = s.allies.length || (s.resurrectionOrbs ?? 0) > 0
        ? allyLines.join("\n")
        : "Find allies · abilities use keys 1-5";
      if (allyLine !== this.lastAllyText) {
        this.lastAllyText = allyLine;
        this.allyText.setText(allyLine);
      }
    } else if (this.lastAllyText !== "") {
      this.lastAllyText = "";
      this.allyText.setText("");
    }

    // Skill buttons: dim while on cooldown, show seconds left
    const fmtCd = (ms: number) => (ms > 0 ? ` ${(ms / 1000).toFixed(1)}s` : "");
    const info = [
      { label: "SHIFT Dash", cd: s.dashCd, ok: true },
      { label: "Q Courage", cd: s.courageCd, ok: s.courageUnlocked },
      { label: "E Aura", cd: s.auraCd, ok: s.auraUnlocked },
      { label: "R Legacy", cd: s.legacyCd, ok: s.legacyUnlocked },
    ];
    info.forEach((k, i) => {
      const text = k.ok ? k.label + fmtCd(k.cd) : `🔒 ${k.label}`;
      const alpha = !k.ok ? 0.45 : k.cd > 0 ? 0.6 : 1;
      const color = k.ok && k.cd === 0 ? "#ffd75e" : "#ffffff";
      // Only touch the Text object when something actually changed
      if (text !== this.lastSkillTexts[i]) {
        this.lastSkillTexts[i] = text;
        this.skillTexts[i].setText(text);
      }
      if (alpha !== this.lastSkillAlpha[i]) {
        this.lastSkillAlpha[i] = alpha;
        this.skillTexts[i].setAlpha(alpha);
      }
      if (color !== this.lastSkillColor[i]) {
        this.lastSkillColor[i] = color;
        this.skillTexts[i].setColor(color);
      }
    });

    const bossLine = this.boss ? this.boss.name : "";
    if (bossLine !== this.lastBossName) {
      this.lastBossName = bossLine;
      this.bossName.setText(bossLine);
    }
  }

  // Show a pop-up message, then fade it out.
  private toast(msg: string) {
    this.toastText.setText(msg);
    this.tweens.killTweensOf(this.toastText);
    this.toastText.setAlpha(1);
    this.tweens.add({ targets: this.toastText, alpha: 0, delay: 1800, duration: 500 });
  }
}
