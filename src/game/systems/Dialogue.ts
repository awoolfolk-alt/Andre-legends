import * as Phaser from "phaser";
import type { DialogueLine } from "../data/story";

// ─────────────────────────────────────────────────────────────
// DIALOGUE SYSTEM: one reusable box for every NPC, memory, and boss.
// Feed it an array of lines; SPACE/F/click advances.
// Typewriter effect: letters appear one at a time. Pressing SPACE
// while typing finishes the line instantly (players expect this).
// ─────────────────────────────────────────────────────────────

export class Dialogue {
  private box: Phaser.GameObjects.Container;
  private speakerText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private hint: Phaser.GameObjects.Text;
  private lines: DialogueLine[] = [];
  private index = 0;
  private typing?: Phaser.Time.TimerEvent;
  private fullText = "";
  isOpen = false;
  onClose?: () => void;

  constructor(private scene: Phaser.Scene) {
    const w = scene.scale.width;
    const h = scene.scale.height;
    const bw = Math.min(900, w - 80);
    const bg = scene.add.graphics();
    bg.fillStyle(0x0d1830, 0.92).fillRoundedRect(-bw / 2, -80, bw, 160, 14);
    bg.lineStyle(3, 0xd4a72c, 1).strokeRoundedRect(-bw / 2, -80, bw, 160, 14);
    bg.lineStyle(1, 0x4fd1ff, 0.5).strokeRoundedRect(-bw / 2 + 6, -74, bw - 12, 148, 10);

    this.speakerText = scene.add.text(-bw / 2 + 28, -64, "", {
      fontFamily: "Cinzel, Georgia, serif", fontSize: "20px", color: "#ffd75e",
    });
    this.bodyText = scene.add.text(-bw / 2 + 28, -30, "", {
      fontFamily: "Georgia, serif", fontSize: "19px", color: "#f2f4ff", lineSpacing: 6,
      wordWrap: { width: bw - 56 },
    });
    this.hint = scene.add.text(bw / 2 - 24, 58, "SPACE ▸", {
      fontFamily: "Georgia", fontSize: "14px", color: "#4fd1ff",
    }).setOrigin(1, 0.5);
    scene.tweens.add({ targets: this.hint, alpha: 0.3, yoyo: true, repeat: -1, duration: 500 });

    this.box = scene.add.container(w / 2, h - 110, [bg, this.speakerText, this.bodyText, this.hint])
      .setDepth(1000).setVisible(false);
  }

  open(lines: DialogueLine[]) {
    this.lines = lines;
    this.index = 0;
    this.isOpen = true;
    this.box.setVisible(true).setAlpha(0);
    this.scene.tweens.add({ targets: this.box, alpha: 1, duration: 150 });
    this.showLine();
  }

  /** Who is speaking right now ("" when the box is closed). The UI
      uses this to pitch the dialogue blip differently per character. */
  get speaker(): string {
    return this.isOpen && this.lines[this.index] ? this.lines[this.index].speaker : "";
  }

  advance() {
    if (!this.isOpen) return;
    if (this.bodyText.text !== this.fullText) {
      // Still typing → finish the line instantly
      this.typing?.remove();
      this.typing = undefined;
      this.bodyText.setText(this.fullText);
      return;
    }
    this.index++;
    if (this.index >= this.lines.length) this.close();
    else this.showLine();
  }

  private showLine() {
    const line = this.lines[this.index];
    this.speakerText.setText(line.speaker);
    this.fullText = line.text;
    this.bodyText.setText("");
    let i = 0;
    this.typing?.remove();
    this.typing = this.scene.time.addEvent({
      delay: 18,
      repeat: line.text.length - 1,
      callback: () => this.bodyText.setText(line.text.slice(0, ++i)),
    });
  }

  private close() {
    this.isOpen = false;
    this.typing?.remove();
    this.box.setVisible(false);
    const cb = this.onClose;
    this.onClose = undefined;
    cb?.();
  }
}
