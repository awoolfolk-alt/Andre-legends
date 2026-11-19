import * as Phaser from "phaser";
import { loadSave } from "../save";
import { personalizeText } from "../data/hero";
import { EventBus, EVT } from "../systems/EventBus";
import { SECURITY_PLUS_STATIONS, STUDY_BUILDINGS, type StudySubjectId } from "../data/securityPlus";

export interface RoomData {
  title: string;
  subtitle: string;
  details?: readonly string[];
  musicLounge?: boolean;
  miniGames?: boolean;
  studySubject?: StudySubjectId;
}

interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PlatformEnemy extends Platform {
  vx: number;
  alive: boolean;
}

interface PlatformCoin {
  x: number;
  y: number;
  phase: number;
}

interface PlatformBlock extends Platform {
  hit: number;
}

interface PlatformPlayer {
  x: number;
  y: number;
  w: number;
  h: number;
  vy: number;
  onGround: boolean;
  face: number;
}

interface PlatformerKeys {
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  jump: Phaser.Input.Keyboard.Key[];
}

interface TowerDefenseEnemy {
  progress: number;
  hp: number;
  maxHp: number;
  speed: number;
}

interface DefenseTower {
  x: number;
  y: number;
  cooldown: number;
  damage: number;
}

interface DefenseShot {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  life: number;
}

export class RoomScene extends Phaser.Scene {
  private musicPlayer?: Phaser.GameObjects.DOMElement;
  private musicFrame?: HTMLIFrameElement;
  private playingDisc?: Phaser.GameObjects.Container;
  private playingTween?: Phaser.Tweens.Tween;
  private musicStatus?: Phaser.GameObjects.Text;
  private platformerLayer?: Phaser.GameObjects.Graphics;
  private platformerStatus?: Phaser.GameObjects.Text;
  private platformerStart?: Phaser.GameObjects.Text;
  private platformerRestart?: Phaser.GameObjects.Text;
  private platformerTouchButtons: Phaser.GameObjects.Text[] = [];
  private platformerKeys?: PlatformerKeys;
  private platformerState: "ready" | "playing" | "over" | "won" = "ready";
  private platformerCameraX = 0;
  private platformerScore = 0;
  private platformerCoinCount = 0;
  private platformerGroundY = 0;
  private platformerViewWidth = 0;
  private platformerWorldScale = 1;
  private platformerPlayer: PlatformPlayer = {
    x: 60, y: 0, w: 14, h: 20, vy: 0, onGround: false, face: 1,
  };
  private platformerPlatforms: Platform[] = [];
  private platformerEnemies: PlatformEnemy[] = [];
  private platformerCoins: PlatformCoin[] = [];
  private platformerBlocks: PlatformBlock[] = [];
  private platformerTouch = { left: false, right: false, jump: false };
  private platformerJumpWasDown = false;
  private activeMiniGame: "platformer" | "tower-defense" | null = null;
  private arcadeMenu?: Phaser.GameObjects.Container;
  private towerDefenseStart?: Phaser.GameObjects.Text;
  private rpsStatus?: Phaser.GameObjects.Text;
  private rpsWins = 0;
  private rpsLosses = 0;
  private towerDefenseLayer?: Phaser.GameObjects.Graphics;
  private towerDefenseStatus?: Phaser.GameObjects.Text;
  private towerDefenseRestart?: Phaser.GameObjects.Text;
  private towerDefenseState: "ready" | "playing" | "over" | "won" = "ready";
  private towerDefenseWave = 0;
  private towerDefenseWaveTimer = 0;
  private towerDefenseGold = 120;
  private towerDefenseLives = 12;
  private towerDefenseFirstWaveDelay = 1500;
  private towerDefenseIgnoreClickUntil = 0;
  private towerDefenseTowers: DefenseTower[] = [];
  private towerDefenseEnemies: TowerDefenseEnemy[] = [];
  private towerDefenseShots: DefenseShot[] = [];
  private towerDefensePath: [number, number][] = [
    [0, 4], [1, 4], [2, 4], [3, 4], [3, 3], [3, 2],
    [4, 2], [5, 2], [6, 2], [6, 3], [6, 4], [6, 5],
    [7, 5], [8, 5], [9, 5], [9, 6], [9, 7], [10, 7], [11, 7],
  ];
  private towerDefenseCell = 0;
  private towerDefenseOriginX = 0;
  private towerDefenseOriginY = 0;
  private studyAvatar?: Phaser.GameObjects.Container;
  private studyBusy = false;
  private studyTerminalOpen = false;
  private studyCloseHandler?: () => void;

  constructor() { super("Room"); }

  create(data: RoomData) {
    const { width, height } = this.scale;
    this.cameras.main.resetFX().fadeIn(1500, 0, 0, 0);

    if (data.studySubject) {
      this.drawStudyOffice(width, height, data.studySubject);
      this.studyCloseHandler = () => this.returnFromStudyStation();
      this.studyTerminalOpen = false;
      EventBus.on(EVT.studyStationClose, this.studyCloseHandler);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        if (this.studyCloseHandler) EventBus.off(EVT.studyStationClose, this.studyCloseHandler);
      });
    } else {
      this.cameras.main.setBackgroundColor("#100810");
      this.add.rectangle(width / 2, height / 2, width - 64, height - 64, 0x24101c)
        .setStrokeStyle(5, 0x9e4256);
      this.add.rectangle(width / 2, 94, width - 96, 90, 0x140b14)
        .setStrokeStyle(2, 0xd4a72c);
      const heroName = loadSave()?.name ?? "";
      this.add.text(width / 2, 70, personalizeText(data.title, heroName), {
        fontFamily: "Georgia, serif",
        fontSize: "34px",
        color: "#f3d7bd",
        stroke: "#09050a",
        strokeThickness: 4,
      }).setOrigin(0.5);
      this.add.text(width / 2, 118, personalizeText(data.subtitle, heroName), {
        fontFamily: "Georgia, serif",
        fontSize: "17px",
        color: "#e69aab",
      }).setOrigin(0.5);

      this.add.rectangle(112, 310, 12, 250, 0x9e4256);
      this.add.rectangle(width - 112, 310, 12, 250, 0x9e4256);
      for (const x of [160, width - 160]) {
        this.add.rectangle(x, 248, 58, 92, 0x66243b).setStrokeStyle(4, 0xd4a72c);
        this.add.rectangle(x, 248, 7, 92, 0x1a1017);
        this.add.rectangle(x, 248, 58, 7, 0x1a1017);
      }

      if (data.details && !data.musicLounge && !data.miniGames) {
        this.add.text(190, 202, data.details.map((d) => personalizeText(d, heroName)).join("\n\n"), {
          fontFamily: "Georgia, serif",
          fontSize: "22px",
          color: "#f2e8df",
          lineSpacing: 10,
          wordWrap: { width: width - 380 },
        });
      }

      if (data.musicLounge) this.drawRecordDisplay(width);
      if (data.miniGames) {
        this.activeMiniGame = null;
        this.platformerState = "ready";
        this.towerDefenseState = "ready";
        this.platformerTouch = { left: false, right: false, jump: false };
        this.drawArcade(width, height);
        this.input.on("pointerdown", this.handleTowerDefenseClick, this);
        this.input.keyboard?.on("keydown-R", this.handleArcadeRestart, this);
      }
    }

    const exitText = this.add.text(width / 2, height - 82, "F or ESC  ·  Leave this building", {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#f1c66e",
      backgroundColor: "#100810",
      padding: { x: 12, y: 8 },
    }).setOrigin(0.5).setDepth(20).setInteractive({ useHandCursor: true });

    let leaving = false;
    const leave = () => {
      if (leaving || (data.studySubject && this.studyTerminalOpen)) return;
      leaving = true;
      this.input.keyboard?.off("keydown-F", leave);
      this.input.keyboard?.off("keydown-ESC", leave);
      this.input.keyboard?.off("keydown-R", this.handleArcadeRestart, this);
      this.input.off("pointerdown", this.handleTowerDefenseClick, this);
      this.musicPlayer?.destroy();
      this.musicPlayer = undefined;
      this.musicFrame = undefined;
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.stop();
        this.scene.resume("Forest");
        this.scene.get("Forest").cameras.main.fadeIn(1500, 0, 0, 0);
      });
      this.cameras.main.fadeOut(1500, 0, 0, 0);
    };
    this.input.keyboard!.on("keydown-F", leave);
    this.input.keyboard!.on("keydown-ESC", leave);
    exitText.on("pointerdown", leave);
  }

  private drawStudyOffice(width: number, height: number, subject: StudySubjectId) {
    const building = STUDY_BUILDINGS[subject];
    this.cameras.main.setBackgroundColor("#181b1c");
    this.add.rectangle(width / 2, height / 2, width - 52, height - 52, 0x30302b)
      .setStrokeStyle(4, 0x807453);
    this.add.rectangle(width / 2, 118, width - 88, 110, 0x222522)
      .setStrokeStyle(2, 0x928763);
    this.add.text(width / 2, 82, building.name.toUpperCase(), {
      fontFamily: "Consolas, monospace",
      fontSize: "27px",
      color: "#e7d8ac",
      fontStyle: "bold",
    }).setOrigin(0.5);
    this.add.text(width / 2, 132, `${building.subject}  ·  RETRO SOC TRAINING FLOOR`, {
      fontFamily: "Consolas, monospace",
      fontSize: "15px",
      color: "#a9d8bd",
    }).setOrigin(0.5);
    this.add.rectangle(width / 2, 196, width - 150, 3, 0x857a5d);
    this.add.rectangle(width / 2, height - 70, width - 110, 56, 0x242522)
      .setStrokeStyle(1, 0x807453);

    const stations = subject === "security-plus" ? SECURITY_PLUS_STATIONS : null;
    const labels = stations?.map((station) => station.name) ?? [
      subject === "a-plus" ? "Hardware & Devices" : "Network Foundations",
      subject === "a-plus" ? "Operating Systems" : "Ports & Protocols",
      subject === "a-plus" ? "Troubleshooting" : "Network Operations",
      subject === "a-plus" ? "Security Basics" : "Network Security",
    ];
    const positions = [
      { x: width * 0.29, y: 318 },
      { x: width * 0.71, y: 318 },
      { x: width * 0.29, y: 493 },
      { x: width * 0.71, y: 493 },
    ];
    positions.forEach(({ x, y }, index) => {
      const station = stations?.[index];
      this.drawWorkstation(x, y, labels[index], index + 1, Boolean(station), width);
      if (station && building.available) {
        this.add.zone(x, y + 8, 460, 160)
          .setInteractive({ useHandCursor: true })
          .on("pointerover", () => this.input.setDefaultCursor("pointer"))
          .on("pointerout", () => this.input.setDefaultCursor("default"))
          .on("pointerdown", () => this.openStudyStation(subject, station.id, x, y - 45, width, height));
      }
    });

    if (building.available) {
      this.add.text(width / 2, 602, "SELECT A STATION  ·  THE ANALYST WALKS OVER, SITS, THEN CONNECTS", {
        fontFamily: "Consolas, monospace",
        fontSize: "13px",
        color: "#a9d8bd",
      }).setOrigin(0.5);
    } else {
      this.add.text(width / 2, 602, "CURRICULUM IN PREPARATION  ·  THIS LAB WILL OPEN IN A FUTURE STUDY UPDATE", {
        fontFamily: "Consolas, monospace",
        fontSize: "13px",
        color: "#e7c77a",
      }).setOrigin(0.5);
    }

    const avatar = this.add.container(width / 2, height - 116);
    avatar.add([
      this.add.ellipse(0, 26, 48, 12, 0x080a0c, 0.45),
      this.add.rectangle(0, 2, 24, 34, 0x243b51).setStrokeStyle(2, 0x9db4c4),
      this.add.circle(0, -22, 12, 0x754d3b).setStrokeStyle(2, 0xd7b59c),
      this.add.rectangle(-7, 48, 8, 22, 0x202127),
      this.add.rectangle(7, 48, 8, 22, 0x202127),
    ]);
    avatar.setDepth(12);
    this.studyAvatar = avatar;
    this.studyBusy = false;
  }

  private drawWorkstation(x: number, y: number, label: string, number: number, enabled: boolean, width: number) {
    const deskWidth = Math.min(470, width * 0.37);
    this.add.rectangle(x, y + 48, deskWidth, 20, 0x65462f).setStrokeStyle(2, 0xa58458);
    this.add.rectangle(x - deskWidth * 0.38, y + 87, 14, 62, 0x483728);
    this.add.rectangle(x + deskWidth * 0.38, y + 87, 14, 62, 0x483728);
    this.add.rectangle(x, y - 4, 174, 92, 0x272b2c).setStrokeStyle(5, 0x777b72);
    this.add.rectangle(x, y - 6, 148, 67, enabled ? 0x173b38 : 0x1a211e)
      .setStrokeStyle(2, enabled ? 0x8ac7a6 : 0x4c554e);
    if (enabled) {
      this.add.text(x, y - 17, `SECURITY+  /  ${String(number).padStart(2, "0")}`, {
        fontFamily: "Consolas, monospace",
        fontSize: "11px",
        color: "#a9e3be",
      }).setOrigin(0.5);
      this.add.text(x, y + 3, label.toUpperCase(), {
        fontFamily: "Consolas, monospace",
        fontSize: "9px",
        color: "#e7d8ac",
        align: "center",
        wordWrap: { width: 130 },
      }).setOrigin(0.5);
    } else {
      this.add.text(x, y - 5, "LAB OFFLINE", {
        fontFamily: "Consolas, monospace",
        fontSize: "12px",
        color: "#9b9b88",
      }).setOrigin(0.5);
    }
    this.add.rectangle(x - 106, y - 2, 28, 54, 0x272b2c).setStrokeStyle(3, 0x777b72);
    for (let i = 0; i < 6; i++) this.add.circle(x - 111 + (i % 2) * 10, y - 17 + Math.floor(i / 2) * 12, 2, 0x8a8b7f);
    this.add.rectangle(x + 2, y + 30, 154, 10, 0x24282a).setStrokeStyle(1, 0x85887e);
    for (let i = 0; i < 12; i++) this.add.rectangle(x - 66 + i * 12, y + 29, 7, 2, 0x8c9389);
    this.add.rectangle(x + 142, y + 7, 19, 31, 0x292d2e).setStrokeStyle(2, 0x777b72);
    this.add.circle(x + 142, y - 4, 3, enabled ? 0x72d29a : 0x777b72);
    this.add.text(x, y + 116, `${String(number).padStart(2, "0")}  ·  ${label}`, {
      fontFamily: "Consolas, monospace",
      fontSize: "13px",
      color: enabled ? "#e7d8ac" : "#96978d",
      align: "center",
      wordWrap: { width: deskWidth - 24 },
    }).setOrigin(0.5);
  }

  private openStudyStation(subject: StudySubjectId, stationId: string, x: number, y: number, width: number, height: number) {
    if (this.studyBusy || !this.studyAvatar) return;
    this.studyBusy = true;
    this.tweens.add({
      targets: this.studyAvatar,
      x,
      y: y + 120,
      scale: 0.68,
      duration: 720,
      ease: "Cubic.easeInOut",
      onComplete: () => {
        this.studyAvatar?.setY(y + 108);
        this.tweens.add({
          targets: this.studyAvatar,
          y: y + 112,
          duration: 180,
          yoyo: true,
          onComplete: () => {
            this.cameras.main.pan(x, y, 1050, "Cubic.easeInOut");
            this.cameras.main.zoomTo(2.8, 1050, "Cubic.easeInOut");
            this.time.delayedCall(1100, () => {
              this.studyTerminalOpen = true;
              EventBus.emit(EVT.studyStationOpen, { subject, stationId, width, height });
            });
          },
        });
      },
    });
  }

  private returnFromStudyStation() {
    this.studyTerminalOpen = false;
    const { width, height } = this.scale;
    this.cameras.main.pan(width / 2, height / 2, 850, "Cubic.easeInOut");
    this.cameras.main.zoomTo(1, 850, "Cubic.easeInOut");
    if (this.studyAvatar) {
      this.tweens.add({
        targets: this.studyAvatar,
        x: width / 2,
        y: height - 116,
        scale: 1,
        duration: 850,
        ease: "Cubic.easeOut",
      });
    }
    this.time.delayedCall(850, () => { this.studyBusy = false; });
  }

  update(_time: number, delta: number) {
    if (this.platformerState === "playing") {
      this.updatePlatformer(delta);
      return;
    }
    if (this.towerDefenseState === "playing") this.updateTowerDefense(delta);
  }

  private updatePlatformer(delta: number) {
    // Each frame reads controls, moves the hero, checks collisions, then redraws.
    const frameScale = Math.min(delta / (1000 / 60), 2);
    const keys = this.platformerKeys;
    if (!keys) return;

    const left = keys.left.isDown || this.platformerTouch.left;
    const right = keys.right.isDown || this.platformerTouch.right;
    const jumpDown = keys.jump.some((key) => key.isDown) || this.platformerTouch.jump;
    if (jumpDown && !this.platformerJumpWasDown && this.platformerPlayer.onGround) {
      this.platformerPlayer.vy = -9.4;
      this.platformerPlayer.onGround = false;
    }
    this.platformerJumpWasDown = jumpDown;

    const player = this.platformerPlayer;
    const previousBottom = player.y + player.h;
    let vx = 0;
    if (left) {
      vx = -2.7;
      player.face = -1;
    }
    if (right) {
      vx = 2.7;
      player.face = 1;
    }
    player.x = Math.max(0, player.x + vx * frameScale);
    player.vy += 0.55 * frameScale;
    player.y += player.vy * frameScale;
    player.onGround = false;

    for (const platform of this.platformerPlatforms) {
      if (
        player.x + player.w > platform.x &&
        player.x < platform.x + platform.w &&
        player.vy >= 0 &&
        previousBottom <= platform.y + 8 &&
        player.y + player.h >= platform.y
      ) {
        player.y = platform.y - player.h;
        player.vy = 0;
        player.onGround = true;
      }
    }

    for (const block of this.platformerBlocks) {
      if (
        player.x + player.w <= block.x || player.x >= block.x + block.w ||
        player.y + player.h <= block.y || player.y >= block.y + block.h
      ) continue;
      if (player.vy < 0 && player.y > block.y + block.h - 8) {
        player.y = block.y + block.h;
        player.vy = 1;
        block.hit = 6;
        this.platformerScore += 5;
      } else if (player.vy > 0) {
        player.y = block.y - player.h;
        player.vy = 0;
        player.onGround = true;
      }
    }

    for (let index = this.platformerCoins.length - 1; index >= 0; index--) {
      const coin = this.platformerCoins[index];
      coin.phase += 0.13 * frameScale;
      if (
        Math.abs(coin.x + 5 - (player.x + player.w / 2)) < 12 &&
        Math.abs(coin.y + 6 - (player.y + player.h / 2)) < 15
      ) {
        this.platformerCoins.splice(index, 1);
        this.platformerCoinsCollected();
      }
    }

    for (const enemy of this.platformerEnemies) {
      if (!enemy.alive) continue;
      enemy.x += enemy.vx * frameScale;
      if (enemy.x < 20 || enemy.x > 1520) enemy.vx *= -1;
      if (!this.platformerOverlaps(player, enemy)) continue;
      if (player.vy > 0 && previousBottom <= enemy.y + enemy.h * 0.7) {
        enemy.alive = false;
        player.vy = -7.5;
        this.platformerScore += 50;
      } else {
        this.platformerState = "over";
      }
    }

    if (player.y > this.platformerGroundY + 60) this.platformerState = "over";
    if (player.x > 1400) this.platformerState = "won";
    this.platformerCameraX = Math.max(0, player.x - this.platformerViewWidth * 0.35);

    this.drawPlatformer();
  }

  private drawRecordDisplay(width: number) {
    this.add.text(width / 2, 198, "ALBUM COVER WALL  ·  ORIGINAL ART FOR YOUR PLAYLIST", {
      fontFamily: "Georgia, serif",
      fontSize: "17px",
      color: "#e69aab",
    }).setOrigin(0.5);

    const records = [
      { title: "Young Metro", subtitle: "93 'Til Infinity beat", videoId: "PSIS30-Q_Pg", colors: [0x8b2944, 0x49305f], art: "NIGHT HOUSE" },
      { title: "Slow Down", subtitle: "Lucky Daye", videoId: "sB8pY6kmdCA", colors: [0x19374e, 0xd4a72c], art: "KINGDOM" },
      { title: "MF GROOVE", subtitle: "Smino feat. Ravyn Lenae", videoId: "NwG25Sl_9Rs", colors: [0xc05a32, 0xf0c676], art: "GROOVE" },
      { title: "All Bad", subtitle: "All Bad", videoId: "tDcgqwZPfTY", colors: [0x24545a, 0xb5d3c1], art: "ALL BAD" },
      { title: "Make It To The Morning", subtitle: "PARTYNEXTDOOR", search: true, colors: [0x51315f, 0xf1a973], art: "HOMETOWN" },
    ] as const;

    records.forEach((record, index) => {
      const x = width / 2 - 300 + index * 150;
      this.drawAlbumCover(x, 274, record.colors[0], record.colors[1], record.art, index);
      this.add.text(x, 343, record.title, {
        fontFamily: "Georgia, serif",
        fontSize: "12px",
        color: "#f3d7bd",
        align: "center",
        wordWrap: { width: 136 },
      }).setOrigin(0.5);
      this.add.text(x, 361, record.subtitle, {
        fontFamily: "Georgia, serif",
        fontSize: "10px",
        color: "#d2bdc1",
        align: "center",
        wordWrap: { width: 138 },
      }).setOrigin(0.5);

      const disc = this.add.container(x, 476);
      disc.add(this.add.circle(0, 0, 36, record.colors[0]).setStrokeStyle(2, 0xd4a72c));
      disc.add(this.add.circle(0, 0, 25, record.colors[1], 0.7).setStrokeStyle(1, 0xe9d9c5, 0.75));
      disc.add(this.add.circle(0, 0, 13, 0x180f16).setStrokeStyle(2, 0xd4a72c));
      disc.add(this.add.circle(0, 0, 3, 0xe9d9c5));
      disc.setSize(74, 74)
        .setInteractive(new Phaser.Geom.Circle(0, 0, 38), Phaser.Geom.Circle.Contains)
        .on("pointerover", () => disc.setScale(1.12))
        .on("pointerout", () => disc.setScale(1))
        .on("pointerdown", () => this.playRecord(record, disc, width));
      this.add.text(x, 523, "PLAY", {
        fontFamily: "Georgia, serif",
        fontSize: "11px",
        color: "#f1c66e",
      }).setOrigin(0.5);
    });

    this.musicStatus = this.add.text(width / 2, 568, "Click a record to play its YouTube reference.", {
      fontFamily: "Georgia, serif",
      fontSize: "13px",
      color: "#d2bdc1",
    }).setOrigin(0.5);
  }

  private drawAlbumCover(x: number, y: number, background: number, accent: number, title: string, style: number) {
    this.add.rectangle(x, y, 112, 112, 0x140b14).setStrokeStyle(3, 0xd4a72c);
    this.add.rectangle(x, y, 100, 100, background);
    if (style === 0) {
      this.add.triangle(x, y + 12, -46, 38, 0, -34, 46, 38, 0x180f16, 0.82);
      this.add.rectangle(x - 20, y + 20, 6, 13, accent);
      this.add.rectangle(x + 18, y + 17, 6, 13, accent);
      this.add.circle(x + 30, y - 29, 10, accent, 0.85);
    } else if (style === 1) {
      this.add.circle(x + 27, y - 29, 14, accent, 0.9);
      this.add.rectangle(x, y + 17, 56, 25, 0x111b2b, 0.9);
      for (const towerX of [-24, 0, 24]) {
        this.add.rectangle(x + towerX, y + 3, 12, 50, 0x111b2b, 0.95);
        this.add.triangle(x + towerX, y - 25, -7, 12, 0, -11, 7, 12, accent);
      }
    } else if (style === 2) {
      this.add.circle(x, y - 4, 30, accent, 0.88);
      this.add.circle(x, y - 4, 18, background);
      for (const angle of [0, 60, 120, 180, 240, 300]) {
        const radians = Phaser.Math.DegToRad(angle);
        this.add.circle(x + Math.cos(radians) * 22, y - 4 + Math.sin(radians) * 22, 7, 0xf3d7bd, 0.85);
      }
    } else if (style === 3) {
      this.add.rectangle(x, y + 8, 84, 2, accent, 0.8);
      for (let i = 0; i < 6; i++) {
        this.add.line(x - 35 + i * 14, y - 22, 0, 0, -8, 38, accent, 0.65).setLineWidth(2);
      }
      this.add.circle(x + 24, y - 24, 12, 0xe9d9c5, 0.7);
    } else {
      this.add.rectangle(x, y + 23, 92, 28, 0x20182b, 0.78);
      this.add.circle(x, y - 8, 24, accent, 0.88);
      this.add.rectangle(x, y + 4, 92, 14, background);
      this.add.line(x - 40, y + 22, 0, 0, 80, 0, accent, 0.9).setLineWidth(2);
    }
    this.add.text(x, y + 38, title, {
      fontFamily: "Georgia, serif",
      fontSize: "10px",
      color: "#fff1dc",
      stroke: "#100810",
      strokeThickness: 3,
      align: "center",
    }).setOrigin(0.5);
  }

  private playRecord(
    record: {
      title: string;
      subtitle: string;
      colors: readonly [number, number];
      search?: boolean;
      videoId?: string;
    },
    disc: Phaser.GameObjects.Container,
    width: number,
  ) {
    this.playingTween?.stop();
    if (this.playingDisc) this.playingDisc.angle = 0;
    this.playingDisc = disc;
    this.playingTween = this.tweens.add({ targets: disc, angle: 360, duration: 2600, repeat: -1 });

    if (record.search) {
      if (this.musicFrame) this.musicFrame.src = "about:blank";
      const searchWindow = window.open(
        "https://www.youtube.com/results?search_query=PARTYNEXTDOOR+Make+It+To+The+Morning",
        "_blank",
      );
      if (searchWindow) searchWindow.opener = null;
      this.musicStatus?.setText(searchWindow
        ? `${record.title} · Choose the PARTYNEXTDOOR result in the YouTube tab.`
        : "YouTube search was blocked. Allow pop-ups to open Make It To The Morning.");
      return;
    }

    if (!record.videoId) return;
    const src = `https://www.youtube-nocookie.com/embed/${record.videoId}?autoplay=1&playsinline=1&rel=0`;
    if (this.musicPlayer) {
      if (this.musicFrame) this.musicFrame.src = src;
    } else {
      const iframe = document.createElement("iframe");
      iframe.src = src;
      iframe.title = `${record.title} · YouTube player`;
      iframe.allow = "autoplay; encrypted-media; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      iframe.width = "320";
      iframe.height = "180";
      iframe.style.border = "2px solid #d4a72c";
      iframe.style.background = "#100810";
      this.musicFrame = iframe;
      this.musicPlayer = this.add.dom(width - 170, 440, iframe).setDepth(20);
    }
    this.musicStatus?.setText(`Now playing: ${record.title} · ${record.subtitle}`);
  }

  private drawArcade(width: number, height: number) {
    const cardWidth = (width - 128) / 3;
    const cardHeight = 360;
    const cardY = 395;
    const centers = [width / 2 - cardWidth - 12, width / 2, width / 2 + cardWidth + 12];
    const menu = this.add.container(0, 0).setDepth(5);
    this.arcadeMenu = menu;

    const addCard = (centerX: number, eyebrow: string, title: string, description: string) => {
      menu.add(this.add.rectangle(centerX, cardY, cardWidth, cardHeight, 0x141b2c, 0.97)
        .setStrokeStyle(2, 0xd4a72c, 0.75));
      menu.add(this.add.text(centerX - cardWidth / 2 + 22, cardY - cardHeight / 2 + 25, eyebrow, {
        fontFamily: "Georgia, serif", fontSize: "12px", color: "#67e8f9",
      }));
      menu.add(this.add.text(centerX - cardWidth / 2 + 22, cardY - cardHeight / 2 + 55, title, {
        fontFamily: "Georgia, serif", fontSize: "23px", color: "#f1c66e", fontStyle: "bold",
        wordWrap: { width: cardWidth - 44 },
      }));
      menu.add(this.add.text(centerX - cardWidth / 2 + 22, cardY - cardHeight / 2 + 101, description, {
        fontFamily: "Georgia, serif", fontSize: "15px", color: "#f2e8df",
        lineSpacing: 5, wordWrap: { width: cardWidth - 44 },
      }));
    };

    addCard(centers[0], "ARCADE CLASSIC", "Rock Paper Scissors", "Challenge the vampire. Choose a move and see who wins the round.");
    addCard(centers[1], "PIXEL PLATFORMER", "Run to the Flag", "Jump across gaps, collect coins, hit blocks, and stomp enemies.");
    addCard(centers[2], "TOWER DEFENSE", "PC Tactics", "Build towers, protect the path, and survive eight enemy waves.");

    this.rpsStatus = this.add.text(centers[0], cardY + 72, "Choose your move.", {
      fontFamily: "Georgia, serif", fontSize: "14px", color: "#f2e8df", align: "center",
      wordWrap: { width: cardWidth - 36 },
    }).setOrigin(0.5);
    menu.add(this.rpsStatus);

    const moves = ["Rock", "Paper", "Scissors"] as const;
    for (const [index, move] of moves.entries()) {
      const button = this.add.text(centers[0] - 110 + index * 110, cardY + 20, move, {
        fontFamily: "Georgia, serif",
        fontSize: "14px",
        color: "#f3d7bd", backgroundColor: "#63263b", padding: { x: 8, y: 7 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      menu.add(button);
      button.on("pointerdown", () => {
        const enemyMove = moves[Phaser.Math.Between(0, moves.length - 1)];
        if (move === enemyMove) {
          this.rpsStatus?.setText(`Draw! The vampire chose ${enemyMove}.\nWins ${this.rpsWins} · Losses ${this.rpsLosses}`);
          return;
        }
        const won =
          (move === "Rock" && enemyMove === "Scissors") ||
          (move === "Paper" && enemyMove === "Rock") ||
          (move === "Scissors" && enemyMove === "Paper");
        if (won) this.rpsWins++;
        else this.rpsLosses++;
        this.rpsStatus?.setText(`${won ? "You win!" : "The vampire wins!"} It chose ${enemyMove}.\nWins ${this.rpsWins} · Losses ${this.rpsLosses}`);
      });
    }

    this.platformerLayer = this.add.graphics().setDepth(10).setVisible(false);
    this.platformerStatus = this.add.text(width / 2, 190, "", {
      fontFamily: "Consolas, monospace", fontSize: "15px", color: "#ffffff",
      stroke: "#10213c", strokeThickness: 4,
    }).setOrigin(0.5).setDepth(11).setVisible(false);
    this.platformerStart = this.add.text(centers[1], cardY + 32, "PLAY PLATFORMER", {
      fontFamily: "Georgia, serif", fontSize: "16px", color: "#f1c66e",
      backgroundColor: "#18304f", padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menu.add(this.platformerStart);
    this.platformerStart.on("pointerdown", () => this.startPlatformer());

    this.platformerRestart = this.add.text(width / 2, height - 126, "PLAY AGAIN  ·  R", {
      fontFamily: "Georgia, serif", fontSize: "16px", color: "#f1c66e",
      backgroundColor: "#18304f", padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setDepth(13).setInteractive({ useHandCursor: true }).setVisible(false);
    this.platformerRestart.on("pointerdown", () => this.resetPlatformer());
    this.platformerTouchButtons = [
      this.addPlatformerTouchButton(142, height - 155, "◀", "left"),
      this.addPlatformerTouchButton(222, height - 155, "▶", "right"),
      this.addPlatformerTouchButton(width - 150, height - 155, "JUMP", "jump"),
    ];
    this.platformerTouchButtons.forEach((button) => button.setVisible(false));

    this.towerDefenseLayer = this.add.graphics().setDepth(10).setVisible(false);
    this.towerDefenseStatus = this.add.text(width / 2, 158, "", {
      fontFamily: "Consolas, monospace", fontSize: "15px", color: "#e2e8f0",
      stroke: "#0b1020", strokeThickness: 4,
    }).setOrigin(0.5).setDepth(11).setVisible(false);
    this.towerDefenseStart = this.add.text(centers[2], cardY + 32, "PLAY TOWER DEFENSE", {
      fontFamily: "Georgia, serif", fontSize: "16px", color: "#67e8f9",
      backgroundColor: "#18304f", padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menu.add(this.towerDefenseStart);
    this.towerDefenseStart.on("pointerdown", () => this.startTowerDefense());
    this.towerDefenseRestart = this.add.text(width / 2, height - 126, "PLAY AGAIN  ·  R", {
      fontFamily: "Georgia, serif", fontSize: "16px", color: "#67e8f9",
      backgroundColor: "#18304f", padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setDepth(13).setInteractive({ useHandCursor: true }).setVisible(false);
    this.towerDefenseRestart.on("pointerdown", () => this.resetTowerDefense());

    const keyboard = this.input.keyboard;
    if (keyboard) {
      this.platformerKeys = {
        left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
        right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
        jump: [
          keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
          keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
          keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        ],
      };
    }

    menu.setDepth(5);
    this.rpsWins = 0;
    this.rpsLosses = 0;
  }

  private addPlatformerTouchButton(
    x: number,
    y: number,
    label: string,
    control: keyof typeof this.platformerTouch,
  ) {
    const button = this.add.text(x, y, label, {
      fontFamily: "Georgia, serif",
      fontSize: "18px",
      color: "#ffffff",
      backgroundColor: "#17385dcc",
      padding: { x: 14, y: 10 },
    }).setOrigin(0.5).setDepth(12).setInteractive({ useHandCursor: true });
    button.on("pointerdown", () => { this.platformerTouch[control] = true; });
    const release = () => { this.platformerTouch[control] = false; };
    button.on("pointerup", release);
    button.on("pointerout", release);
    return button;
  }

  private startPlatformer() {
    if (!this.platformerLayer || !this.platformerStart) return;
    // Hide the project selector and show only the selected game.
    this.activeMiniGame = "platformer";
    this.arcadeMenu?.setVisible(false);
    this.platformerStart.setVisible(false);
    this.platformerLayer.setVisible(true);
    this.platformerStatus?.setVisible(true);
    this.platformerTouchButtons.forEach((button) => button.setVisible(true));
    this.resetPlatformer();
  }

  private resetPlatformer() {
    const layer = this.platformerLayer;
    if (!layer) return;
    const bounds = { x: 96, y: 174, w: this.scale.width - 192, h: 438 };
    this.platformerWorldScale = Math.min(1, bounds.w / 900);
    this.platformerViewWidth = bounds.w / this.platformerWorldScale;
    this.platformerGroundY = bounds.h - 42;

    // Reset every score and object so Play Again always starts a fresh round.
    this.platformerPlatforms = [];
    this.platformerEnemies = [];
    this.platformerCoins = [];
    this.platformerBlocks = [];
    this.platformerScore = 0;
    this.platformerCoinCount = 0;
    this.platformerCameraX = 0;
    this.platformerState = "playing";
    this.platformerJumpWasDown = false;
    this.platformerTouch.left = false;
    this.platformerTouch.right = false;
    this.platformerTouch.jump = false;
    this.platformerRestart?.setVisible(false);

    const groundY = this.platformerGroundY;
    const segments: [number, number][] = [
      [0, 190], [230, 190], [470, 150], [670, 210], [930, 300], [1280, 460],
    ];
    this.platformerPlatforms = segments.map(([x, w]) => ({ x, y: groundY, w, h: 24 }));
    const brickPositions: [number, number][] = [
      [150, groundY - 70], [210, groundY - 70], [270, groundY - 70],
      [340, groundY - 120], [560, groundY - 90], [620, groundY - 90],
      [810, groundY - 80], [870, groundY - 130], [1010, groundY - 70], [1060, groundY - 70],
    ];
    this.platformerBlocks = brickPositions.map(([x, y]) => ({ x, y, w: 18, h: 18, hit: 0 }));
    this.platformerCoins = brickPositions.map(([x, y]) => ({ x: x + 4, y: y - 28, phase: Math.random() * 6 }));
    for (let index = 0; index < 12; index++) {
      this.platformerCoins.push({
        x: 70 + index * 72,
        y: groundY - 42,
        phase: Math.random() * 6,
      });
    }
    this.platformerEnemies = [300, 520, 760, 1050, 1220].map((x) => ({
      x, y: groundY - 18, w: 16, h: 18, vx: -0.9, alive: true,
    }));
    this.platformerPlayer = {
      x: 60, y: groundY - 20, w: 14, h: 20, vy: 0, onGround: true, face: 1,
    };
    this.platformerStatus?.setText("Move: A/D or ←/→   Jump: W, ↑, SPACE or JUMP");
    this.drawPlatformer();
  }

  private startTowerDefense() {
    // Reuse the same Arcade room; only the selected game's board is shown.
    this.activeMiniGame = "tower-defense";
    this.towerDefenseIgnoreClickUntil = this.time.now + 200;
    this.arcadeMenu?.setVisible(false);
    this.towerDefenseStart?.setVisible(false);
    this.towerDefenseLayer?.setVisible(true);
    this.towerDefenseStatus?.setVisible(true);
    this.resetTowerDefense();
  }

  private resetTowerDefense() {
    // Reset the board, then size each tile to fit the current window.
    this.towerDefenseState = "playing";
    this.towerDefenseWave = 0;
    this.towerDefenseWaveTimer = 0;
    this.towerDefenseGold = 120;
    this.towerDefenseLives = 12;
    this.towerDefenseTowers = [];
    this.towerDefenseEnemies = [];
    this.towerDefenseShots = [];
    this.towerDefenseRestart?.setVisible(false);
    this.towerDefenseIgnoreClickUntil = this.time.now + 200;

    // Fit a 12-by-9 board below the HUD and above the room's exit button.
    this.towerDefenseCell = Math.floor(Math.min(
      (this.scale.width - 140) / 12,
      (this.scale.height - 300) / 9,
    ));
    this.towerDefenseOriginX = Math.floor((this.scale.width - this.towerDefenseCell * 12) / 2);
    this.towerDefenseOriginY = Math.max(202, this.scale.height - 125 - this.towerDefenseCell * 9);
    this.drawTowerDefense();
  }

  private handleTowerDefenseClick(pointer: Phaser.Input.Pointer) {
    if (
      this.activeMiniGame !== "tower-defense" ||
      this.towerDefenseState !== "playing" ||
      this.time.now < this.towerDefenseIgnoreClickUntil
    ) return;
    const cellX = Math.floor((pointer.x - this.towerDefenseOriginX) / this.towerDefenseCell);
    const cellY = Math.floor((pointer.y - this.towerDefenseOriginY) / this.towerDefenseCell);
    if (cellX < 0 || cellY < 0 || cellX >= 12 || cellY >= 9) return;

    // Keep the route open and prevent two towers from occupying one tile.
    const isPath = this.towerDefensePath.some(([x, y]) => x === cellX && y === cellY);
    const isOccupied = this.towerDefenseTowers.some((tower) => tower.x === cellX && tower.y === cellY);
    if (isPath || isOccupied || this.towerDefenseGold < 40) return;

    // Towers cost 40 gold; gold is earned by defeating enemies.
    this.towerDefenseGold -= 40;
    this.towerDefenseTowers.push({ x: cellX, y: cellY, cooldown: 0, damage: 1 });
    this.drawTowerDefense();
  }

  private handleArcadeRestart() {
    // The R key restarts whichever game is currently open.
    if (this.activeMiniGame === "platformer") this.resetPlatformer();
    if (this.activeMiniGame === "tower-defense") this.resetTowerDefense();
  }

  private updateTowerDefense(delta: number) {
    this.towerDefenseWaveTimer += delta;
    // Send the first wave quickly, then leave seven seconds between later waves.
    const nextWaveDelay = this.towerDefenseWave === 0 ? this.towerDefenseFirstWaveDelay : 7000;
    if (this.towerDefenseWave < 8 && this.towerDefenseWaveTimer >= nextWaveDelay) {
      this.towerDefenseWaveTimer = 0;
      this.towerDefenseWave++;
      const enemyCount = 4 + this.towerDefenseWave * 2;
      const hp = 3 + Math.floor(this.towerDefenseWave * 0.8);
      for (let index = 0; index < enemyCount; index++) {
        this.towerDefenseEnemies.push({
          progress: -index * 14,
          hp,
          maxHp: hp,
          speed: 1.2 + this.towerDefenseWave * 0.06,
        });
      }
    }

    // Enemies follow the path; each tower shoots at the nearest enemy in range.
    for (let index = this.towerDefenseEnemies.length - 1; index >= 0; index--) {
      const enemy = this.towerDefenseEnemies[index];
      if (enemy.progress < 0) {
        enemy.progress += delta * 0.036;
        continue;
      }
      enemy.progress += enemy.speed * delta / 1000;
      if (enemy.progress >= this.towerDefensePath.length - 1) {
        this.towerDefenseEnemies.splice(index, 1);
        this.towerDefenseLives--;
        if (this.towerDefenseLives <= 0) this.towerDefenseState = "over";
      }
    }

    for (const tower of this.towerDefenseTowers) {
      tower.cooldown -= delta;
      if (tower.cooldown > 0) continue;
      const towerX = (tower.x + 0.5) * this.towerDefenseCell + this.towerDefenseOriginX;
      const towerY = (tower.y + 0.5) * this.towerDefenseCell + this.towerDefenseOriginY;
      let target: TowerDefenseEnemy | undefined;
      let targetDistance = this.towerDefenseCell * 2.4;
      for (const enemy of this.towerDefenseEnemies) {
        if (enemy.progress < 0) continue;
        const position = this.towerDefenseEnemyPosition(enemy.progress);
        const distance = Phaser.Math.Distance.Between(towerX, towerY, position.x, position.y);
        if (distance < targetDistance) {
          target = enemy;
          targetDistance = distance;
        }
      }
      if (!target) continue;

      const targetPosition = this.towerDefenseEnemyPosition(target.progress);
      tower.cooldown = 367;
      this.towerDefenseShots.push({
        x: towerX, y: towerY, targetX: targetPosition.x, targetY: targetPosition.y, life: 134,
      });
      target.hp -= tower.damage;
      if (target.hp <= 0) {
        this.towerDefenseGold += 12;
        this.towerDefenseEnemies.splice(this.towerDefenseEnemies.indexOf(target), 1);
      }
    }

    for (let index = this.towerDefenseShots.length - 1; index >= 0; index--) {
      this.towerDefenseShots[index].life -= delta;
      if (this.towerDefenseShots[index].life <= 0) this.towerDefenseShots.splice(index, 1);
    }

    if (this.towerDefenseWave >= 8 && this.towerDefenseEnemies.length === 0) {
      this.towerDefenseState = "won";
    }
    if (this.towerDefenseState !== "playing") {
      this.towerDefenseRestart?.setVisible(true);
    }
    this.drawTowerDefense();
  }

  private towerDefenseEnemyPosition(progress: number) {
    // Convert an enemy's progress into a pixel position between path tiles.
    const boundedProgress = Phaser.Math.Clamp(progress, 0, this.towerDefensePath.length - 1);
    const index = Math.floor(boundedProgress);
    const fraction = boundedProgress - index;
    const from = this.towerDefensePath[index];
    const to = this.towerDefensePath[Math.min(index + 1, this.towerDefensePath.length - 1)];
    return {
      x: (from[0] + (to[0] - from[0]) * fraction + 0.5) * this.towerDefenseCell + this.towerDefenseOriginX,
      y: (from[1] + (to[1] - from[1]) * fraction + 0.5) * this.towerDefenseCell + this.towerDefenseOriginY,
    };
  }

  private drawTowerDefense() {
    const graphics = this.towerDefenseLayer;
    const cell = this.towerDefenseCell;
    if (!graphics || cell <= 0) return;
    graphics.clear();

    // Redraw the board from its current state so removed enemies disappear cleanly.
    const pathTiles = new Set(this.towerDefensePath.map(([x, y]) => `${x},${y}`));
    for (let x = 0; x < 12; x++) {
      for (let y = 0; y < 9; y++) {
        const px = this.towerDefenseOriginX + x * cell;
        const py = this.towerDefenseOriginY + y * cell;
        graphics.fillStyle(pathTiles.has(`${x},${y}`) ? 0x1e293b : 0x111827);
        graphics.fillRect(px + 1, py + 1, cell - 2, cell - 2);
      }
    }

    for (const shot of this.towerDefenseShots) {
      graphics.lineStyle(2, 0x67e8f9, Math.min(1, shot.life / 134));
      graphics.lineBetween(shot.x, shot.y, shot.targetX, shot.targetY);
    }
    for (const tower of this.towerDefenseTowers) {
      const x = this.towerDefenseOriginX + tower.x * cell;
      const y = this.towerDefenseOriginY + tower.y * cell;
      graphics.fillStyle(0x6366f1).fillRect(x + cell * 0.18, y + cell * 0.18, cell * 0.64, cell * 0.64);
      graphics.fillStyle(0xa5b4fc).fillRect(x + cell * 0.38, y + cell * 0.38, cell * 0.24, cell * 0.24);
    }
    for (const enemy of this.towerDefenseEnemies) {
      if (enemy.progress < 0) continue;
      const position = this.towerDefenseEnemyPosition(enemy.progress);
      graphics.fillStyle(0xf87171).fillCircle(position.x, position.y, cell * 0.26);
      graphics.fillStyle(0x111827, 0.8).fillRect(position.x - cell * 0.26, position.y - cell * 0.44, cell * 0.52, 4);
      graphics.fillStyle(0x4ade80).fillRect(
        position.x - cell * 0.26,
        position.y - cell * 0.44,
        cell * 0.52 * Math.max(0, enemy.hp / enemy.maxHp),
        4,
      );
    }

    this.towerDefenseStatus?.setText(
      `Gold ${this.towerDefenseGold}   Lives ${this.towerDefenseLives}   Wave ${this.towerDefenseWave}/8\nClick a tile to build a tower (40 gold) · R to restart`,
    );
    if (this.towerDefenseState === "over" || this.towerDefenseState === "won") {
      graphics.fillStyle(0x050814, 0.88).fillRect(0, 0, this.scale.width, this.scale.height);
      this.towerDefenseStatus?.setText(
        `${this.towerDefenseState === "won" ? "BASE SECURED!" : "OVERRUN"}\nWaves survived: ${this.towerDefenseWave} · Press R or Play Again`,
      );
    }
  }

  private platformerCoinsCollected() {
    // A coin raises both the coin total and the score.
    this.platformerCoinCount++;
    this.platformerScore += 10;
  }

  private platformerOverlaps(first: Platform, second: Platform) {
    return first.x + first.w > second.x &&
      first.x < second.x + second.w &&
      first.y + first.h > second.y &&
      first.y < second.y + second.h;
  }

  private drawPlatformer() {
    const graphics = this.platformerLayer;
    if (!graphics) return;
    const panelX = 96;
    const panelY = 174;
    const panelW = this.scale.width - 192;
    const panelH = 438;
    const scale = this.platformerWorldScale;
    const cameraX = this.platformerCameraX;
    const sx = (x: number) => panelX + (x - cameraX) * scale;
    const sy = (y: number) => panelY + y * scale;
    const groundY = sy(this.platformerGroundY);
    const worldScreenWidth = this.platformerViewWidth * scale;

    // Clear and redraw the scene so the camera, coins, enemies, and player stay in sync.
    graphics.clear();
    graphics.fillStyle(0x5c94fc).fillRect(panelX, panelY, panelW, panelH);

    graphics.fillStyle(0xffffff, 0.85);
    for (let index = 0; index < 7; index++) {
      const cloudX = panelX + (((index * 240 - cameraX * 0.4) % (worldScreenWidth + 240)) + worldScreenWidth + 240) % (worldScreenWidth + 240) - 120 * scale;
      const cloudY = panelY + (26 + (index * 53) % 44) * scale;
      graphics.fillCircle(cloudX, cloudY, 11 * scale);
      graphics.fillCircle(cloudX + 13 * scale, cloudY + 3 * scale, 14 * scale);
      graphics.fillCircle(cloudX + 29 * scale, cloudY, 10 * scale);
    }

    for (const platform of this.platformerPlatforms) {
      const x = sx(platform.x);
      if (x + platform.w * scale < panelX || x > panelX + panelW) continue;
      graphics.fillStyle(0xc84c0c).fillRect(x, groundY, platform.w * scale, platform.h * scale);
      graphics.fillStyle(0xe45c10).fillRect(x, groundY, platform.w * scale, 5 * scale);
      graphics.fillStyle(0x58d854).fillRect(x, groundY - 4 * scale, platform.w * scale, 4 * scale);
    }

    for (const block of this.platformerBlocks) {
      const y = block.y - (block.hit > 0 ? 3 : 0);
      const x = sx(block.x);
      if (x + block.w * scale < panelX || x > panelX + panelW) continue;
      graphics.fillStyle(0xc84c0c).fillRect(x, sy(y), block.w * scale, block.h * scale);
      graphics.fillStyle(0xe45c10).fillRect(x + 2 * scale, sy(y) + 2 * scale, (block.w - 4) * scale, (block.h - 4) * scale);
      if (block.hit > 0) block.hit--;
    }

    for (const coin of this.platformerCoins) {
      const x = sx(coin.x);
      if (x < panelX - 12 || x > panelX + panelW + 12) continue;
      const coinW = (6 + Math.abs(Math.cos(coin.phase)) * 6) * scale;
      graphics.fillStyle(0xfcd800).fillRect(x + (10 * scale - coinW) / 2, sy(coin.y), coinW, 12 * scale);
      graphics.fillStyle(0xfc9838).fillRect(x + 4 * scale, sy(coin.y) + 3 * scale, 3 * scale, 6 * scale);
    }

    for (const enemy of this.platformerEnemies) {
      if (!enemy.alive) continue;
      const x = sx(enemy.x);
      if (x + enemy.w * scale < panelX || x > panelX + panelW) continue;
      graphics.fillStyle(0x8b4513).fillRect(x, sy(enemy.y), enemy.w * scale, enemy.h * scale);
      graphics.fillStyle(0xffffff);
      graphics.fillRect(x + 3 * scale, sy(enemy.y) + 4 * scale, 3 * scale, 4 * scale);
      graphics.fillRect(x + 10 * scale, sy(enemy.y) + 4 * scale, 3 * scale, 4 * scale);
    }

    const playerX = sx(this.platformerPlayer.x);
    const playerY = sy(this.platformerPlayer.y);
    graphics.fillStyle(0xe40058).fillRect(playerX, playerY, this.platformerPlayer.w * scale, this.platformerPlayer.h * scale);
    graphics.fillStyle(0xfcd8a8).fillRect(playerX + 2 * scale, playerY + 2 * scale, (this.platformerPlayer.w - 4) * scale, 7 * scale);
    graphics.fillStyle(0x0f380f).fillRect(playerX + (this.platformerPlayer.face > 0 ? 8 : 3) * scale, playerY + 4 * scale, 3 * scale, 3 * scale);
    graphics.fillStyle(0x2b8cff).fillRect(playerX + 1 * scale, playerY + 10 * scale, (this.platformerPlayer.w - 2) * scale, 6 * scale);

    graphics.fillStyle(0x10213c, 0.82).fillRect(panelX, panelY, panelW, 25);
    const showOutcome = this.platformerState === "over" || this.platformerState === "won";
    if (this.platformerState === "over") {
      this.platformerStatus?.setText(`GAME OVER  ·  Score ${this.platformerScore}  ·  Click Play Again or press R`);
      this.platformerRestart?.setVisible(true);
      graphics.fillStyle(0x000000, 0.65).fillRect(panelX, panelY + panelH / 2 - 30, panelW, 60);
      graphics.fillStyle(0xffffff);
      graphics.fillRect(panelX + 18, panelY + panelH / 2 - 7, 4, 4);
    } else if (this.platformerState === "won") {
      this.platformerStatus?.setText(`YOU WIN!  ·  Score ${this.platformerScore}  ·  Click Play Again or press R`);
      this.platformerRestart?.setVisible(true);
      graphics.fillStyle(0x000000, 0.65).fillRect(panelX, panelY + panelH / 2 - 30, panelW, 60);
    } else {
      this.platformerStatus?.setText(`SCORE ${this.platformerScore}   COINS ${this.platformerCoinCount}                                      Reach the flag →`);
      this.platformerRestart?.setVisible(false);
    }
    if (showOutcome) {
      graphics.fillStyle(0xfcd800).fillRect(panelX + panelW / 2 - 5, panelY + panelH / 2 - 5, 10, 10);
    }
  }
}
