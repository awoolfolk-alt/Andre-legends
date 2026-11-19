import * as Phaser from "phaser";

// Anything you can walk up to and press F on: jv-marc, the Legend
// book, memory stones, the Future gate. They all share this class.
// WHY: "talk to things" is the core of a story portfolio. Build it
// once, reuse it everywhere.
export class Interactable {
  sprite: Phaser.GameObjects.Image;
  private prompt: Phaser.GameObjects.Text;
  private nameTag: Phaser.GameObjects.Text;
  private interactableVisible = true;

  constructor(
    private scene: Phaser.Scene,
    public x: number,
    public y: number,
    texture: string,
    name: string,
    public onInteract: () => void,
    public range = 80,
  ) {
    this.sprite = scene.add.image(x, y, texture).setOrigin(0.5, 0.9).setDepth(y);
    this.nameTag = scene.add.text(x, y - this.sprite.height - 6, name, {
      fontFamily: "Cinzel, Georgia, serif", fontSize: "13px", color: "#f3e3b5", stroke: "#000", strokeThickness: 3,
    }).setOrigin(0.5).setDepth(99000).setAlpha(0.85);
    this.prompt = scene.add.text(x, y - this.sprite.height - 26, "[F] Talk", {
      fontFamily: "Georgia", fontSize: "14px", color: "#ffffff", backgroundColor: "#0d1830cc", padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setDepth(99001).setVisible(false);
  }

  isNear(px: number, py: number) {
    return Phaser.Math.Distance.Between(px, py, this.x, this.y) < this.range;
  }

  showPrompt(show: boolean) {
    this.prompt.setVisible(this.interactableVisible && show);
  }

  setVisible(visible: boolean) {
    this.interactableVisible = visible;
    this.sprite.setVisible(visible);
    this.nameTag.setVisible(visible);
    this.prompt.setVisible(false);
  }

  setScale(scale: number) {
    this.sprite.setScale(scale);
    const labelY = this.y - this.sprite.displayHeight - 6;
    this.nameTag.setPosition(this.x, labelY);
    this.prompt.setPosition(this.x, labelY - 20);
  }

  setLabel(text: string) {
    this.prompt.setText(text);
  }
}
