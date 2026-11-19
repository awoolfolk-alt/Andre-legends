import * as Phaser from "phaser";
import { loadSave } from "../save";
import { phaserPainter } from "../painter";
import {
  DEFAULT_HERO,
  drawHeroBody,
  drawHeroHair,
  sanitizeHero,
} from "../data/hero";

// ─────────────────────────────────────────────────────────────
// BOOT SCENE: makes every texture the game needs, then starts the world.
// We DRAW the art with code (Graphics → generateTexture) so the game
// runs with zero image files. WHY: you can play and learn today, and
// later swap any key (e.g. "hero") for a real pixel-art sprite sheet
// with this.load.spritesheet("hero", "/assets/sprites/hero.png", ...)
// without touching any other code.
//
// The HERO textures ("hero" body + "locks" hair) are drawn from the
// player's customization (chosen on the /create page, stored in the
// save). The texture KEYS stay the same, so Player.ts and every scene
// keep working untouched.
// ─────────────────────────────────────────────────────────────

const SKIN = 0x6b4226;
const GOLD = 0xd4a72c;
const CYAN = 0xc44a67;

export class BootScene extends Phaser.Scene {
  constructor() { super("Boot"); }

  create() {
    this.makeHero();
    this.makeLocks();
    this.makeDummy();
    this.makeTree();
    this.makeGlowTree();
    this.makeElder();
    this.makeBook();
    this.makeStone();
    this.makeGate();
    this.makeOverload();
    this.makeMachine();
    this.makeBloodCount();
    this.makeCrimsonOracle();
    this.makeDarkHero();
    // The Wayfinder mentor and the Future Kingdom set piece
    this.makeWayfinder();
    this.makeMonument();
    this.makeGoldGrass();
    this.makeCompanion("wizard", 0x563c8a, 0xbba0ff, "staff");
    this.makeCompanion("shieldHero", 0x2d617a, 0x93d8ef, "shield");
    this.makeCompanion("gunslinger", 0x704629, 0xf1bd61, "gun");
    this.makeCompanion("thief", 0x31594c, 0x79d6b0, "dagger");
    this.makeZombie();
    this.makeBuildings();
    this.makeSpark();
    this.makeGrass();
    // Continue drops the hero into the scene their checkpoint names
    // (a kingdom save resumes in the kingdom); new games start in the forest.
    const checkpoint = loadSave()?.pos;
    this.scene.start(checkpoint?.scene === "Kingdom" ? "Kingdom" : "Forest");
    this.scene.launch("UI"); // HUD runs on top, in parallel
  }

  private gfx() { return this.make.graphics({ x: 0, y: 0 }, false); }

  // The hero's look comes from the save (chosen on /create). Old saves
  // have no `hero` field, so they fall back to Andre's original look —
  // nothing about existing adventures changes.
  private heroConfig() {
    return sanitizeHero(loadSave()?.hero ?? DEFAULT_HERO);
  }

  private makeHero() {
    const g = this.gfx();
    drawHeroBody(phaserPainter(g), this.heroConfig());
    g.generateTexture("hero", 48, 64);
    g.destroy();
  }

  private makeLocks() {
    // The "locks" key now holds WHATEVER hairstyle the player picked —
    // same 44×40 box, so the sway/attachment code in Player.ts is untouched.
    const g = this.gfx();
    drawHeroHair(phaserPainter(g), this.heroConfig());
    g.generateTexture("locks", 44, 40);
    g.destroy();
  }

  private makeDummy() {
    const g = this.gfx();
    g.fillStyle(0x000000, 0.25).fillEllipse(32, 84, 40, 10);
    g.fillStyle(0x6b4a2b).fillRect(28, 30, 8, 56);
    g.fillStyle(0x7d5a36).fillRect(10, 40, 44, 7);
    g.fillStyle(0x3d2a55).fillPoints([{ x: 16, y: 28 }, { x: 48, y: 28 }, { x: 52, y: 70 }, { x: 12, y: 70 }], true);
    g.fillStyle(0x8a7a5a).fillCircle(32, 20, 14);
    g.lineStyle(2, 0x2a1d3d).strokeCircle(32, 20, 14);
    g.fillStyle(0x2a1d3d).fillRect(25, 16, 4, 2).fillRect(35, 16, 4, 2).fillRect(27, 25, 10, 2);
    g.generateTexture("dummy", 64, 90);
    g.destroy();
  }

  private makeTree() {
    const g = this.gfx();
    g.fillStyle(0x000000, 0.25).fillEllipse(55, 124, 70, 14);
    g.fillStyle(0x4a3220).fillRect(46, 70, 18, 54);
    g.fillStyle(0x21141f).fillCircle(55, 52, 42);
    g.fillStyle(0x382037).fillCircle(38, 60, 28).fillCircle(72, 58, 28).fillCircle(55, 34, 30);
    g.fillStyle(0x703348, 0.8).fillCircle(46, 30, 12).fillCircle(66, 44, 10);
    g.generateTexture("tree", 110, 130);
    g.destroy();
  }

  private makeGlowTree() {
    const g = this.gfx();
    g.fillStyle(0x000000, 0.3).fillEllipse(80, 184, 110, 18);
    g.fillStyle(0x3d2a1a).fillRect(66, 100, 28, 84);
    g.fillStyle(0x36142a).fillCircle(80, 70, 64);
    g.fillStyle(0x61213c).fillCircle(54, 82, 40).fillCircle(108, 80, 40).fillCircle(80, 44, 44);
    g.fillStyle(0xf05d78, 0.7).fillCircle(64, 40, 8).fillCircle(100, 64, 7).fillCircle(80, 90, 6).fillCircle(52, 76, 5);
    g.generateTexture("glowtree", 160, 190);
    g.destroy();
  }

  private makeElder() {
    const g = this.gfx();
    g.fillStyle(0x000000, 0.25).fillEllipse(24, 66, 30, 8);
    g.lineStyle(3, 0x7d5a36).lineBetween(42, 10, 40, 66); // staff
    g.fillStyle(0x6ff7e6).fillCircle(42, 9, 5);
    g.fillStyle(0x4a5a3a).fillPoints([{ x: 14, y: 26 }, { x: 34, y: 26 }, { x: 40, y: 66 }, { x: 8, y: 66 }], true);
    g.fillStyle(SKIN).fillCircle(24, 18, 10);
    g.fillStyle(0xe8e8e8).fillPoints([{ x: 16, y: 21 }, { x: 32, y: 21 }, { x: 24, y: 38 }], true); // beard
    g.fillStyle(0x6a6a6a).fillEllipse(24, 10, 22, 8);
    g.generateTexture("elder", 50, 70);
    g.destroy();
  }

  private makeBook() {
    const g = this.gfx();
    g.fillStyle(0x000000, 0.25).fillEllipse(30, 64, 40, 8);
    g.fillStyle(0x6d6d78).fillRect(20, 30, 20, 34);
    g.fillStyle(0x85858f).fillRect(12, 24, 36, 8);
    g.fillStyle(0x7a1f2b).fillRect(10, 14, 40, 12);
    g.fillStyle(0xf3e3b5).fillRect(12, 12, 17, 12).fillRect(31, 12, 17, 12);
    g.lineStyle(1, 0x8a7a5a).lineBetween(15, 16, 26, 16).lineBetween(15, 19, 26, 19).lineBetween(34, 16, 45, 16);
    g.generateTexture("book", 60, 68);
    g.destroy();
  }

  private makeStone() {
    const g = this.gfx();
    g.fillStyle(0x000000, 0.25).fillEllipse(22, 52, 36, 8);
    g.fillStyle(0x5d6470).fillRoundedRect(6, 6, 32, 46, 10);
    g.fillStyle(0x737b88).fillRoundedRect(9, 8, 14, 40, 6);
    g.lineStyle(2, CYAN).strokeCircle(22, 26, 7).lineBetween(22, 14, 22, 38);
    g.generateTexture("stone", 44, 56);
    g.destroy();
  }

  private makeGate() {
    const g = this.gfx();
    g.fillStyle(0x4b4f5a).fillRect(0, 20, 30, 130).fillRect(130, 20, 30, 130).fillRect(0, 0, 160, 30);
    g.fillStyle(GOLD).fillRect(0, 26, 160, 4).fillCircle(80, 14, 9);
    g.fillStyle(0x1b2a4a, 0.85).fillRect(30, 30, 100, 120);
    g.lineStyle(2, CYAN, 0.8);
    for (let x = 40; x < 130; x += 15) g.lineBetween(x, 30, x, 150);
    g.generateTexture("gate", 160, 150);
    g.destroy();
  }

  private makeOverload() {
    // A hulking figure buried under stacked task boxes
    const g = this.gfx();
    g.fillStyle(0x000000, 0.3).fillEllipse(60, 132, 100, 16);
    g.fillStyle(0x5a1e1e).fillRoundedRect(22, 52, 76, 78, 14);
    g.fillStyle(0x7a2a2a).fillRoundedRect(28, 58, 30, 66, 10);
    g.fillStyle(0x5a1e1e).fillRect(8, 60, 16, 46).fillRect(96, 60, 16, 46);
    const boxes = [[30, 30, 30, 24], [62, 26, 30, 28], [42, 4, 34, 24], [18, 10, 22, 20], [80, 2, 24, 22]];
    boxes.forEach(([x, y, w, h], i) => {
      g.fillStyle(i % 2 ? 0xa67c52 : 0x8c6239).fillRect(x, y, w, h);
      g.lineStyle(2, 0x5a3d22).strokeRect(x, y, w, h).lineBetween(x, y + h / 2, x + w, y + h / 2);
    });
    g.fillStyle(0xff4d4d).fillCircle(48, 78, 5).fillCircle(72, 78, 5);
    g.generateTexture("overload", 120, 140);
    g.destroy();
  }

  private makeMachine() {
    // An ice machine with an angry error screen
    const g = this.gfx();
    g.fillStyle(0x000000, 0.3).fillEllipse(60, 124, 100, 14);
    g.fillStyle(0x8a96a6).fillRoundedRect(14, 10, 92, 112, 8);
    g.fillStyle(0xaab6c6).fillRect(20, 16, 80, 40);
    g.fillStyle(0x1a0606).fillRect(30, 24, 60, 24);
    g.fillStyle(0xff3b3b).fillRect(36, 30, 10, 12).fillRect(52, 30, 10, 12).fillRect(68, 30, 16, 12);
    g.lineStyle(3, 0x5d6878);
    for (let y = 66; y < 114; y += 8) g.lineBetween(24, y, 96, y);
    g.fillStyle(CYAN, 0.7).fillRect(24, 104, 72, 6);
    g.generateTexture("machine", 120, 130);
    g.destroy();
  }

  private makeBloodCount() {
    const g = this.gfx();
    g.fillStyle(0x000000, 0.34).fillEllipse(64, 140, 96, 18);
    g.fillStyle(0x250916).fillPoints([
      { x: 30, y: 50 }, { x: 98, y: 50 }, { x: 118, y: 134 },
      { x: 80, y: 120 }, { x: 64, y: 145 }, { x: 48, y: 120 }, { x: 10, y: 134 },
    ], true);
    g.fillStyle(0x68152e).fillPoints([
      { x: 48, y: 60 }, { x: 80, y: 60 }, { x: 96, y: 126 },
      { x: 64, y: 112 }, { x: 32, y: 126 },
    ], true);
    g.fillStyle(0xe6c6ad).fillEllipse(64, 40, 34, 38);
    g.fillStyle(0x160911).fillPoints([{ x: 43, y: 29 }, { x: 47, y: 6 }, { x: 60, y: 20 }], true);
    g.fillStyle(0x160911).fillPoints([{ x: 68, y: 20 }, { x: 81, y: 6 }, { x: 85, y: 29 }], true);
    g.fillStyle(0xff365c).fillCircle(55, 41, 4).fillCircle(73, 41, 4);
    g.fillStyle(0xf3e3b5).fillPoints([{ x: 60, y: 53 }, { x: 64, y: 61 }, { x: 68, y: 53 }], true);
    g.lineStyle(4, GOLD).lineBetween(64, 70, 64, 100);
    g.fillStyle(0x8b1536).fillCircle(64, 86, 8);
    g.generateTexture("bloodCount", 128, 154);
    g.destroy();
  }

  private makeCrimsonOracle() {
    const g = this.gfx();
    g.fillStyle(0x000000, 0.3).fillEllipse(62, 132, 92, 16);
    g.fillStyle(0x260923).fillPoints([
      { x: 43, y: 56 }, { x: 82, y: 56 }, { x: 104, y: 126 },
      { x: 62, y: 146 }, { x: 20, y: 126 },
    ], true);
    g.fillStyle(0x4b174a).fillPoints([
      { x: 12, y: 58 }, { x: 3, y: 22 }, { x: 44, y: 50 }, { x: 62, y: 104 },
    ], true);
    g.fillStyle(0x4b174a).fillPoints([
      { x: 112, y: 58 }, { x: 121, y: 22 }, { x: 80, y: 50 }, { x: 62, y: 104 },
    ], true);
    g.fillStyle(0xd8c4d6).fillEllipse(62, 38, 32, 36);
    g.fillStyle(0x170911).fillPoints([{ x: 43, y: 27 }, { x: 49, y: 7 }, { x: 61, y: 19 }], true);
    g.fillStyle(0x170911).fillPoints([{ x: 63, y: 19 }, { x: 77, y: 7 }, { x: 81, y: 28 }], true);
    g.fillStyle(0xff365c).fillCircle(54, 39, 4).fillCircle(70, 39, 4);
    g.fillStyle(0xf5eaf1).fillPoints([{ x: 59, y: 50 }, { x: 62, y: 57 }, { x: 65, y: 50 }], true);
    g.fillStyle(0xff365c, 0.8).fillCircle(62, 87, 12);
    g.generateTexture("crimsonOracle", 124, 154);
    g.destroy();
  }

  private makeDarkHero() {
    const g = this.gfx();
    g.fillStyle(0x000000, 0.32).fillEllipse(24, 59, 30, 8);
    g.fillStyle(0x120c18).fillRect(16, 46, 6, 11).fillRect(26, 46, 6, 11);
    g.fillStyle(0x281321).fillPoints([{ x: 13, y: 25 }, { x: 35, y: 25 }, { x: 40, y: 52 }, { x: 8, y: 52 }], true);
    g.lineStyle(2, 0xff365c).lineBetween(24, 27, 24, 51).lineBetween(8, 51, 40, 51);
    g.fillStyle(0x5d1834).fillCircle(24, 17, 10);
    g.fillStyle(0xff365c).fillCircle(20, 18, 2).fillCircle(28, 18, 2);
    g.lineStyle(3, 0xc9d3e0).lineBetween(31, 26, 40, 6);
    g.generateTexture("darkHero", 48, 64);
    g.destroy();
  }

  private makeCompanion(texture: string, robe: number, accent: number, tool: string) {
    const g = this.gfx();
    g.setScale(3);
    g.fillStyle(0x000000, 0.25).fillEllipse(26, 69, 36, 8);
    // More costume and face detail at the same design scale as the hero.
    g.fillStyle(robe).fillPoints([
      { x: 15, y: 31 }, { x: 37, y: 31 }, { x: 43, y: 65 }, { x: 9, y: 65 },
    ], true);
    g.fillStyle(0x18121a).fillRect(15, 61, 10, 8).fillRect(29, 61, 10, 8);
    g.fillStyle(0x30232a).fillRect(13, 67, 13, 4).fillRect(28, 67, 13, 4);
    g.fillStyle(robe).fillPoints([
      { x: 18, y: 32 }, { x: 34, y: 32 }, { x: 36, y: 59 }, { x: 16, y: 59 },
    ], true);
    g.lineStyle(1.5, accent).lineBetween(26, 34, 26, 62);
    g.fillStyle(0xd4a72c).fillRect(17, 51, 18, 3).fillCircle(26, 52.5, 2);
    g.fillStyle(0xe5c9ae).fillRect(8, 36, 7, 17).fillRect(37, 36, 7, 17);
    g.fillStyle(0xe5c9ae).fillCircle(26, 20, 12);
    g.fillStyle(0x1b101a).fillCircle(22, 20, 1.4).fillCircle(30, 20, 1.4);
    g.lineStyle(1, 0x704f46).lineBetween(24, 26, 28, 26);
    g.fillStyle(0x201722).fillEllipse(26, 10, 24, 7);
    g.fillStyle(0x201722).fillRect(14, 11, 5, 15).fillRect(33, 11, 5, 15);
    g.fillStyle(accent);

    if (tool === "staff") {
      g.lineStyle(4, accent).lineBetween(43, 18, 45, 67);
      g.fillCircle(43, 15, 7);
      g.fillPoints([{ x: 17, y: 35 }, { x: 35, y: 35 }, { x: 26, y: 48 }], true);
    } else if (tool === "shield") {
      g.fillPoints([{ x: 3, y: 34 }, { x: 14, y: 30 }, { x: 16, y: 54 }, { x: 7, y: 61 }], true);
      g.lineStyle(2, 0xf3e3b5).strokePoints([{ x: 3, y: 34 }, { x: 14, y: 30 }, { x: 16, y: 54 }, { x: 7, y: 61 }], true);
    } else if (tool === "gun") {
      g.fillRoundedRect(37, 39, 16, 6, 2);
      g.fillRect(42, 44, 5, 10);
      g.fillStyle(0xf3e3b5).fillRect(49, 40, 5, 2);
    } else {
      g.lineStyle(4, accent).lineBetween(37, 37, 48, 29);
      g.lineStyle(3, 0xf3e3b5).lineBetween(46, 28, 50, 22);
    }
    g.generateTexture(texture, 168, 228);
    g.destroy();
  }

  private makeZombie() {
    const g = this.gfx();
    g.fillStyle(0x000000, 0.3).fillEllipse(26, 62, 40, 8);
    g.fillStyle(0x28342c).fillPoints([{ x: 12, y: 30 }, { x: 38, y: 30 }, { x: 44, y: 58 }, { x: 8, y: 58 }], true);
    g.fillStyle(0x625d51).fillCircle(25, 19, 13);
    g.fillStyle(0x190a12).fillRect(17, 17, 5, 3).fillRect(29, 17, 5, 3);
    g.fillStyle(0xbf324e).fillCircle(19, 18, 2).fillCircle(31, 18, 2);
    g.fillStyle(0x514c43).fillRect(12, 55, 8, 9).fillRect(30, 55, 8, 9);
    g.lineStyle(4, 0x504b43).lineBetween(12, 34, 4, 46).lineBetween(38, 34, 47, 43);
    g.generateTexture("zombie", 52, 70);
    g.destroy();
  }

  private makeBuildings() {
    const palettes = [
      { wall: 0x39313a, roof: 0x21131e, glass: 0x9b354e },
      { wall: 0x393540, roof: 0x211725, glass: 0xa74d57 },
      { wall: 0x34313e, roof: 0x201521, glass: 0xb74859 },
      { wall: 0x40313a, roof: 0x25151f, glass: 0x8e3150 },
      { wall: 0x3c2933, roof: 0x21121b, glass: 0xd45a6b },
    ];
    palettes.forEach(({ wall, roof, glass }, index) => {
      const g = this.gfx();
      g.fillStyle(0x000000, 0.34).fillEllipse(132, 211, 224, 22);
      g.fillStyle(wall).fillRect(30, 70, 204, 136);
      g.fillStyle(roof).fillPoints([
        { x: 10, y: 76 }, { x: 58, y: 20 }, { x: 108, y: 50 },
        { x: 151, y: 10 }, { x: 250, y: 76 },
      ], true);
      g.lineStyle(5, 0x85616a).lineBetween(31, 77, 232, 77);
      g.fillStyle(glass, 0.78).fillRect(47, 104, 38, 48).fillRect(179, 104, 38, 48);
      g.lineStyle(4, 0x1c1018).lineBetween(66, 104, 66, 152).lineBetween(47, 128, 85, 128);
      g.lineStyle(4, 0x1c1018).lineBetween(198, 104, 198, 152).lineBetween(179, 128, 217, 128);
      g.fillStyle(0x170e17).fillRoundedRect(102, 124, 60, 82, 6);
      g.lineStyle(3, GOLD).strokeRoundedRect(102, 124, 60, 82, 6);
      g.fillStyle(0xf2c76e).fillCircle(151, 165, 3);
      if (index === 4) {
        g.fillStyle(0x72203b).fillCircle(132, 47, 14);
        g.fillStyle(0x160c13).fillCircle(132, 47, 9);
        g.fillStyle(0xd1a45b).fillCircle(132, 47, 2);
      } else {
        g.fillStyle(0xd4a72c).fillCircle(132, 52, 9);
      }
      g.generateTexture(`building${index}`, 264, 220);
      g.destroy();
    });
  }

  private makeWayfinder() {
    const g = this.gfx();
    // shadow
    g.fillStyle(0x000000, 0.25).fillEllipse(24, 66, 30, 8);
    // deep teal hooded robe
    g.fillStyle(0x1d4a4a).fillPoints([{ x: 14, y: 22 }, { x: 34, y: 22 }, { x: 40, y: 66 }, { x: 8, y: 66 }], true);
    // lighter robe shading on the right side
    g.fillStyle(0x2a6363).fillPoints([{ x: 24, y: 24 }, { x: 34, y: 22 }, { x: 40, y: 66 }, { x: 26, y: 66 }], true);
    // the hood: a pointed cowl over the head
    g.fillStyle(0x173838).fillPoints([{ x: 12, y: 22 }, { x: 24, y: 2 }, { x: 36, y: 22 }], true);
    // face in shadow under the hood, with glowing teal eyes
    g.fillStyle(SKIN).fillCircle(24, 20, 7);
    g.fillStyle(0x6ff7e6).fillCircle(21, 20, 1.8).fillCircle(27, 20, 1.8);
    // a wooden practice sword held point-down like a walking staff
    g.lineStyle(3, 0x7d5a36).lineBetween(40, 30, 42, 66);
    g.lineStyle(2, GOLD).lineBetween(37, 32, 45, 32);
    g.generateTexture("wayfinder", 50, 70);
    g.destroy();
  }

  private makeMonument() {
    const g = this.gfx();
    // wide golden base and shadow
    g.fillStyle(0x000000, 0.3).fillEllipse(80, 156, 130, 14);
    g.fillStyle(0x8a6d2f).fillRect(30, 130, 100, 26);
    // the obelisk shaft, lighter in the middle for a carved glow
    g.fillStyle(0xb08a3e).fillPoints([{ x: 50, y: 130 }, { x: 110, y: 130 }, { x: 100, y: 20 }, { x: 60, y: 20 }], true);
    g.fillStyle(GOLD).fillPoints([{ x: 70, y: 126 }, { x: 90, y: 126 }, { x: 86, y: 24 }, { x: 74, y: 24 }], true);
    // pyramidion (the pointed cap), bright like a beacon
    g.fillStyle(0xffe9a8).fillPoints([{ x: 60, y: 20 }, { x: 100, y: 20 }, { x: 80, y: 0 }], true);
    // carved lines of the promise (short horizontal "engraving" marks)
    g.lineStyle(2, 0x6d5426);
    for (let y = 44; y <= 116; y += 12) g.lineBetween(66, y, 94, y);
    // small cyan gem at the heart: the future-tech thread of the story
    g.fillStyle(0x4fd1ff).fillCircle(80, 34, 4);
    g.generateTexture("monument", 160, 164);
    g.destroy();
  }

  private makeGoldGrass() {
    const g = this.gfx();
    g.fillStyle(0x7a6528).fillRect(0, 0, 128, 128);
    const rnd = new Phaser.Math.RandomDataGenerator(["goldgrass"]);
    for (let i = 0; i < 160; i++) {
      g.fillStyle(rnd.pick([0x6d5a22, 0x8a7430, 0x9c8440, 0x665520]), 0.9);
      g.fillRect(rnd.between(0, 126), rnd.between(0, 124), 2, rnd.between(3, 6));
    }
    g.generateTexture("goldgrass", 128, 128);
    g.destroy();
  }

  private makeSpark() {
    const g = this.gfx();
    g.fillStyle(0xffffff).fillCircle(4, 4, 4);
    g.generateTexture("spark", 8, 8);
    g.destroy();
  }

  private makeGrass() {
    const g = this.gfx();
    g.fillStyle(0x202d27).fillRect(0, 0, 128, 128);
    const rnd = new Phaser.Math.RandomDataGenerator(["grass"]);
    for (let i = 0; i < 160; i++) {
      g.fillStyle(rnd.pick([0x1a2924, 0x26352b, 0x302831, 0x1e2825]), 0.9);
      g.fillRect(rnd.between(0, 126), rnd.between(0, 124), 2, rnd.between(3, 6));
    }
    g.generateTexture("grass", 128, 128);
    g.destroy();
  }
}
