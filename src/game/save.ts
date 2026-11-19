// ─────────────────────────────────────────────────────────────
// SAVE SYSTEM (simple, browser-local, TWO SLOTS + CHECKPOINTS)
//
// The player builds a hero on /create, and the game saves progress to
// localStorage: name, level, XP, powers, bosses, the gate, story
// objects read, their LOOK (hero), and WHERE THEY STOOD (pos).
//
// TWO SAVE FILES ("slots"), like a Zelda cartridge:
//   - Slot 1 and Slot 2 are independent adventures.
//   - The "active" slot is the one Continue/resume uses right now.
//   - New Adventure lets the player choose which slot to overwrite.
// Every classic function below (loadSave/writeSave/hasSave/...) works
// on the ACTIVE slot, so the game scenes and the cloud mirror did not
// need to change when slots were added.
//
// CHECKPOINTS: SaveData.pos remembers the area + exact spot of the
// last save, so Continue puts the hero back where they stood.
//
// WHY localStorage: no accounts needed — the save lives in the
// player's own browser. Clearing browser data erases it.
// ─────────────────────────────────────────────────────────────

import type { Power } from "./entities/Player";
import type { HeroConfig } from "./data/hero";

// Everything we remember between visits.
export interface SaveData {
  name: string; // the hero's chosen name
  level: number;
  xp: number;
  unlocked: Power[]; // powers earned ("aura", "courage", "legacy")
  defeated: string[]; // ids of bosses already beaten
  gateOpen: boolean; // has the Future Kingdom gate been opened?
  memoriesRead: string[]; // ids of memory stones already read
  questsDone: string[]; // ids of quests already completed
  savedAt: number; // Date.now() when last saved
  // The hero's look, chosen on the /create page. Optional on purpose:
  // saves written before customization existed simply don't have it,
  // and the game falls back to Andre's original appearance for them.
  hero?: HeroConfig;
  // The CHECKPOINT: which scene the hero stood in and exactly where,
  // the last time progress was saved. Optional so old saves still load.
  pos?: { scene: string; x: number; y: number };
}

export type SlotId = 1 | 2;

// Old single-save key (kept ONLY so we can migrate it into Slot 1).
const LEGACY_KEY = "andre-legend-save-v1";
const SLOT_KEY = (n: SlotId) => `andre-legend-save-v2-slot-${n}`;
const ACTIVE_KEY = "andre-legend-save-v2-active";
// A one-shot "note" the menu leaves for the game page:
// "new" = start fresh; missing = continue from the save if one exists.
const MODE_KEY = "andre-legend-mode";

// ── Slots ─────────────────────────────────────────────────────

/** Which slot Continue/resume uses right now (defaults to 1). */
export function getActiveSlot(): SlotId {
  try {
    return localStorage.getItem(ACTIVE_KEY) === "2" ? 2 : 1;
  } catch {
    return 1;
  }
}

export function setActiveSlot(n: SlotId) {
  try {
    localStorage.setItem(ACTIVE_KEY, String(n));
  } catch { /* ignore */ }
}

/** Read one slot, or null if empty / corrupted. */
export function loadSlot(n: SlotId): SaveData | null {
  try {
    const raw = localStorage.getItem(SLOT_KEY(n));
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    // A quick sanity check so a broken save never crashes the game
    if (typeof data.name !== "string" || typeof data.level !== "number") return null;
    return data;
  } catch {
    return null;
  }
}

/** Both slots at a glance — the menu uses this for the picker. */
export function listSlots(): { slot: SlotId; save: SaveData | null }[] {
  return [
    { slot: 1, save: loadSlot(1) },
    { slot: 2, save: loadSlot(2) },
  ];
}

// A "hook" = a function someone else (the cloud module) asks us to call
// after every write. We keep it here instead of importing the cloud code
// so the two files never depend on each other in a circle.
let syncHook: ((data: SaveData) => void) | null = null;

/** The cloud module registers its mirror function here (once, at page load). */
export function onSaveSync(hook: (data: SaveData) => void) {
  syncHook = hook;
}

/** Write a specific slot. Only fires the cloud mirror when the ACTIVE
    slot was written, so the cloud copy always matches what the player
    is currently playing. */
export function writeSlot(n: SlotId, data: SaveData) {
  try {
    localStorage.setItem(SLOT_KEY(n), JSON.stringify(data));
  } catch {
    // Storage can fail (private mode, full disk). The game keeps running either way.
  }
  if (n === getActiveSlot() && syncHook) syncHook(data);
}

/** Erase one slot. */
export function clearSlot(n: SlotId) {
  try {
    localStorage.removeItem(SLOT_KEY(n));
  } catch { /* ignore */ }
}

// ── One-time migration: the old single save becomes Slot 1 ──────────
let migrated = false;
function migrateLegacy() {
  if (migrated) return;
  migrated = true;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    if (!localStorage.getItem(SLOT_KEY(1))) {
      localStorage.setItem(SLOT_KEY(1), raw); // nobody loses progress
    }
    localStorage.removeItem(LEGACY_KEY);
  } catch { /* ignore */ }
}

// ── The classic API (works on the ACTIVE slot — unchanged behavior) ──

/** True if ANY slot holds an adventure (used to show the Continue button). */
export function hasSave(): boolean {
  migrateLegacy();
  return loadSlot(1) !== null || loadSlot(2) !== null;
}

/** Read the ACTIVE slot's save, or null if there is none / it is corrupted. */
export function loadSave(): SaveData | null {
  migrateLegacy();
  return loadSlot(getActiveSlot());
}

/** Write the ACTIVE slot. Called after every meaningful moment
    (level up, boss, memory read, checkpoint...). */
export function writeSave(data: SaveData) {
  migrateLegacy();
  writeSlot(getActiveSlot(), data);
}

/** Erase the ACTIVE slot. */
export function clearSave() {
  clearSlot(getActiveSlot());
}

/** The menu calls this before sending the player to /game. */
export function setPendingMode(mode: "new" | "continue") {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch { /* ignore */ }
}

/** The game reads the note once, then clears it. */
export function takePendingMode(): "new" | "continue" | null {
  try {
    const mode = localStorage.getItem(MODE_KEY);
    localStorage.removeItem(MODE_KEY);
    return mode === "new" || mode === "continue" ? mode : null;
  } catch {
    return null;
  }
}

/** Build a fresh save for a brand-new adventure. */
export function freshSave(name: string, hero?: HeroConfig): SaveData {
  return {
    name, level: 1, xp: 0,
    unlocked: [], defeated: [], gateOpen: false,
    memoriesRead: [], questsDone: [],
    savedAt: Date.now(),
    ...(hero ? { hero } : {}), // only stored when the player customized
  };
}
