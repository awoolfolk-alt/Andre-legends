import { MAX_POWER_LEVEL } from "./combatData";

export type CompanionId = "wizard" | "shield" | "gunslinger" | "thief";

export interface CompanionConfig {
  id: CompanionId;
  name: string;
  title: string;
  texture: string;
  ability: string;
  key: string;
  cooldown: number;
  secondaryAbility?: string;
  secondaryKey?: string;
  secondaryCooldown?: number;
  color: number;
  x: number;
  y: number;
  intro: string;
}

export const COMPANIONS: CompanionConfig[] = [
  {
    id: "wizard", name: "The Blueprint Mage", title: "Wizard", texture: "wizard",
    ability: "Arcane Cataclysm", key: "1", cooldown: 7000, color: 0x9a69e8, x: 2110, y: 1060,
    intro: "The Blueprint Mage turns patient study into power. Arcane Cataclysm deals 165 damage in a wide area. The first cast halves the wizard's current health; each later cast leaves him at 10 HP.",
  },
  {
    id: "shield", name: "The Boundary Keeper", title: "Shield Hero", texture: "shieldHero",
    ability: "Holy Protection", key: "2", cooldown: 16000, color: 0x4e9bc7, x: 2280, y: 1410,
    intro: "The Boundary Keeper protects nearby allies with 150 armor. Holy Protection absorbs hits before health.",
  },
  {
    id: "gunslinger", name: "The Fraud Hunter", title: "Gunslinger", texture: "gunslinger",
    ability: "True Sight", key: "3", cooldown: 9000,
    secondaryAbility: "Tracking Laser", secondaryKey: "5", secondaryCooldown: 20000,
    color: 0xe0a343, x: 2850, y: 1300,
    intro: "The Fraud Hunter follows the evidence. True Sight fires a precise shot at the nearest monster. Tracking Laser fires up to 11 shots at level 1, adding 5 shots per level up to level 15. Each enemy hit takes 110 damage; the ability recharges in 20 seconds.",
  },
  {
    id: "thief", name: "The Shadow Runner", title: "Thief", texture: "thief",
    ability: "Backstab", key: "4", cooldown: 11000, color: 0x55ba9b, x: 2600, y: 390,
    intro: "The Shadow Runner strikes from behind. Backstab closes the distance and deals a precise 85-damage hit.",
  },
];

export const SHIELD_HERO = {
  armor: 150,
  health: 100,
  protectionDuration: 6000,
  protectionRadius: 260,
  tauntDuration: 5000,
};

export const COMPANION_BASE_HEALTH = 100;
export const WIZARD_AREA_ATTACK = {
  damage: 165,
  radius: 210,
  healthCostFraction: 0.5,
  repeatCastHealth: 10,
};
export const GUNSLINGER_TRACKING_LASER = {
  damage: 110,
  cooldown: 20000,
  targetStagger: 65,
  startingShots: 11,
  shotsPerLevel: 5,
};

export function trackingLaserShots(level: number): number {
  const powerLevel = Math.min(MAX_POWER_LEVEL, Math.max(1, Math.floor(level)));
  return GUNSLINGER_TRACKING_LASER.startingShots +
    (powerLevel - 1) * GUNSLINGER_TRACKING_LASER.shotsPerLevel;
}

export const COMPANION_STORIES: Record<CompanionId, string> = {
  wizard: "Learning from blueprints and asking experienced peers turned unfamiliar machines into solvable puzzles.",
  shield: "Leadership includes helping others, but good boundaries keep the whole team standing.",
  gunslinger: "Careful attention to order histories helped Andre spot suspicious patterns and escalate possible fraud.",
  thief: "Courage is choosing a path through uncertainty, then asking for support when you need it.",
};
