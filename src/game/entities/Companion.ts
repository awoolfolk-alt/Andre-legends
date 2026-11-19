import * as Phaser from "phaser";
import { COMPANION_BASE_HEALTH, SHIELD_HERO, WIZARD_AREA_ATTACK, type CompanionConfig } from "../data/companions";
import { Player } from "./Player";

export class Companion {
  readonly sprite: Phaser.GameObjects.Image;
  private nameTag: Phaser.GameObjects.Text;
  private nextAbilityAt = 0;
  private nextSecondaryAbilityAt = 0;
  private nextBasicAttackAt = 0;
  private recruited = false;
  private fallen = false;
  private wizardHasCastCataclysm = false;
  private companionHealth = COMPANION_BASE_HEALTH;
  private shieldArmor = SHIELD_HERO.armor;
  private holyProtectionUntil = 0;
  private rescueTauntUsed = false;

  constructor(
    private scene: Phaser.Scene,
    public config: CompanionConfig,
    private formationIndex: number,
    private onFallen: (companion: Companion, x: number, y: number) => void,
  ) {
    this.sprite = scene.add.image(config.x, config.y, config.texture)
      .setOrigin(0.5, 0.86).setScale(1 / 3).setDepth(config.y).setVisible(false);
    this.nameTag = scene.add.text(config.x, config.y - 54, config.title, {
      fontFamily: "Georgia, serif",
      fontSize: "12px",
      color: "#f3e3b5",
      stroke: "#000",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(config.y + 1).setVisible(false);
  }

  get abilityReadyAt() { return this.nextAbilityAt; }
  get secondaryAbilityReadyAt() { return this.nextSecondaryAbilityAt; }
  get armor() { return this.config.id === "shield" ? this.shieldArmor : 0; }
  get maxArmor() { return SHIELD_HERO.armor; }
  get health() { return this.companionHealth; }
  get maxHealth() { return COMPANION_BASE_HEALTH; }
  get isFallen() { return this.fallen; }
  get isRecruited() { return this.recruited; }
  get isDefending() { return this.scene.time.now < this.holyProtectionUntil; }
  get canDefend() { return this.config.id === "shield" && this.recruited && this.sprite.visible && this.companionHealth > 0; }

  basicAttackReady(time: number, cooldown: number) {
    if (!this.sprite.visible || time < this.nextBasicAttackAt) return false;
    this.nextBasicAttackAt = time + cooldown;
    return true;
  }

  recruit() {
    if (this.fallen) return;
    this.recruited = true;
    this.sprite.setVisible(true);
    this.nameTag.setVisible(true);
    this.nextAbilityAt = 0;
    this.resetBossDefense();
  }

  resetBossDefense() {
    if (this.config.id !== "shield" || !this.recruited || this.fallen) return;
    this.shieldArmor = SHIELD_HERO.armor;
    this.holyProtectionUntil = 0;
    this.rescueTauntUsed = false;
  }

  activateHolyProtection(time: number) {
    if (!this.canDefend) return;
    this.shieldArmor = SHIELD_HERO.armor;
    this.holyProtectionUntil = time + SHIELD_HERO.protectionDuration;
  }

  canUseSacrificeAttack() {
    const requiredHealth = this.wizardHasCastCataclysm ? 11 : 2;
    return this.config.id === "wizard" && this.recruited && this.sprite.visible &&
      !this.fallen && this.companionHealth >= requiredHealth;
  }

  spendSacrificeHealth() {
    if (!this.canUseSacrificeAttack()) return null;
    if (this.wizardHasCastCataclysm) {
      this.companionHealth = WIZARD_AREA_ATTACK.repeatCastHealth;
      return { remainingHealth: this.companionHealth, firstCast: false };
    }
    this.companionHealth = Math.max(1, Math.floor(this.companionHealth * 0.5));
    this.wizardHasCastCataclysm = true;
    return { remainingHealth: this.companionHealth, firstCast: true };
  }

  absorbDamage(damage: number): number {
    if (!this.canDefend) return damage;
    const armorDamage = Math.min(this.shieldArmor, damage);
    this.shieldArmor -= armorDamage;
    const healthDamage = Math.min(this.companionHealth, damage - armorDamage);
    this.companionHealth -= healthDamage;
    if (this.companionHealth === 0) this.fall();
    return damage - armorDamage - healthDamage;
  }

  takeDamage(damage: number) {
    if (!this.recruited || this.fallen || damage <= 0) return;
    let remaining = damage;
    if (this.config.id === "shield") {
      const armorDamage = Math.min(this.shieldArmor, remaining);
      this.shieldArmor -= armorDamage;
      remaining -= armorDamage;
    }
    this.companionHealth = Math.max(0, this.companionHealth - remaining);
    this.sprite.setTintFill(0xff526c);
    this.scene.time.delayedCall(100, () => {
      if (this.sprite.active && !this.fallen) this.sprite.clearTint();
    });
    if (this.companionHealth === 0) this.fall();
  }

  private fall() {
    if (this.fallen) return;
    this.fallen = true;
    this.holyProtectionUntil = 0;
    this.sprite.setVisible(false);
    this.nameTag.setVisible(false);
    this.onFallen(this, this.sprite.x, this.sprite.y);
  }

  revive() {
    if (!this.recruited || !this.fallen) return false;
    this.fallen = false;
    this.companionHealth = this.maxHealth;
    if (this.config.id === "shield") {
      this.shieldArmor = SHIELD_HERO.armor;
      this.rescueTauntUsed = false;
    } else if (this.config.id === "wizard") {
      this.wizardHasCastCataclysm = false;
    }
    this.sprite.setAlpha(0).setScale(1 / 3).setVisible(true);
    this.nameTag.setVisible(true);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 1,
      scaleX: { from: 0.12, to: 1 / 3 },
      scaleY: { from: 0.12, to: 1 / 3 },
      duration: 550,
      ease: "Back.easeOut",
    });
    return true;
  }

  recoverHealth(amount: number) {
    if (!this.recruited || this.fallen || amount <= 0) return;
    this.companionHealth = Math.min(this.maxHealth, this.companionHealth + amount);
    if (this.companionHealth > 0 && !this.sprite.visible) {
      this.sprite.setVisible(true);
      this.nameTag.setVisible(true);
    }
  }

  useRescueTaunt(): boolean {
    if (!this.canDefend || this.rescueTauntUsed) return false;
    this.rescueTauntUsed = true;
    return true;
  }

  update(player: Player, time: number) {
    if (!this.sprite.visible) return;
    const angle = Math.PI + this.formationIndex * (Math.PI * 2 / 4);
    const targetX = player.x + Math.cos(angle) * 54;
    const targetY = player.y + Math.sin(angle) * 38;
    const followSpeed = player.auraActive ? 0.18 : 0.12;
    this.sprite.x = Phaser.Math.Linear(this.sprite.x, targetX, followSpeed);
    this.sprite.y = Phaser.Math.Linear(this.sprite.y, targetY, followSpeed);
    this.sprite.setFlipX(player.x < this.sprite.x).setDepth(this.sprite.y - 1);
    this.nameTag.setPosition(this.sprite.x, this.sprite.y - 54).setDepth(this.sprite.y);
    this.sprite.setTint(time < this.nextAbilityAt ? 0x9b929b : 0xffffff);
  }

  useAbility(now: number, cooldown: number): boolean {
    if (this.fallen || !this.sprite.visible || now < this.nextAbilityAt) return false;
    this.nextAbilityAt = now + cooldown;
    this.sprite.clearTint();
    return true;
  }

  useSecondaryAbility(now: number, cooldown: number): boolean {
    if (this.config.id !== "gunslinger" || this.fallen || !this.sprite.visible || now < this.nextSecondaryAbilityAt) return false;
    this.nextSecondaryAbilityAt = now + cooldown;
    this.sprite.clearTint();
    return true;
  }
}
