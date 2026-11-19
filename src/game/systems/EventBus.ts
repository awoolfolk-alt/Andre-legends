import * as Phaser from "phaser";

// One shared "radio channel" for scenes (and React) to talk without
// importing each other. The world scene says "show dialogue", the UI
// scene listens. WHY: scenes stay independent and easy to replace.
//
// How to use it:
//   EventBus.emit(name, data)  -> broadcast a message (talk on the radio)
//   EventBus.on(name, fn)      -> run fn EVERY time that message is heard
//   EventBus.once(name, fn)    -> run fn only the NEXT time, then stop listening
//   EventBus.off(name, fn)     -> stop listening (cleanup)
// "new" creates one EventEmitter object. Because we export this single object,
// every file that imports it shares the same channel.
export const EventBus = new Phaser.Events.EventEmitter();

// The list of message names ("radio stations") the game uses.
// WHY a list? If you mistype a plain string like "dialog:open", nothing happens
// and no error shows. Using EVT.dialogueOpen lets TypeScript catch typos.
export const EVT = {
  // World -> HUD: "open the dialogue box with these lines"
  dialogueOpen: "dialogue:open",
  // World -> HUD: "player pressed SPACE/F, go to the next line"
  dialogueAdvance: "dialogue:advance",
  // HUD -> World: "the last line was read, give control back to the player"
  dialogueClosed: "dialogue:closed",
  // World -> HUD: new health, XP, cooldowns etc. (sent every frame)
  hud: "hud:update",
  // World -> HUD: show a short pop-up message (level up, gate opened...)
  toast: "hud:toast",
  // World -> HUD: show/update the boss health bar (or hide it with null)
  bossBar: "hud:boss",
  // World -> HUD: the current quest changed; update the tracker
  quest: "hud:quest",
  // World -> HUD: progress was just written to the save file
  saved: "hud:saved",
  // World (either) -> HUD: which world scene is live ("Forest" | "Kingdom"),
  // so the pause menu knows which scene to freeze
  worldReady: "world:ready",
  // The boss-intro dialogue is complete: hand the encounter to the 3D arena.
  boss3dStart: "boss:3dStart",
  // The 3D boss arena completed or was exited; return control to the world.
  boss3dComplete: "boss:3dComplete",
  boss3dCancel: "boss:3dCancel",
  // HUD -> World: ESC pressed; the world pauses and the HUD shows the pause panel
  pause: "game:pause",
  // HUD -> World: "Save & Exit" was clicked in the pause menu
  pauseQuit: "game:pauseQuit",
// "as const" locks these values: they are read-only and TypeScript knows
// the exact text of each one, not just "some string".
} as const;
