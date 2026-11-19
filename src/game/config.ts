// ─────────────────────────────────────────────────────────────
// GAME CONFIG: the "master settings" for The Legend of Andre.
// This file creates the Phaser game: screen size, physics, and which
// scenes (screens/levels) exist. Everything else plugs into this.
// ─────────────────────────────────────────────────────────────

// "import * as Phaser" loads the whole Phaser game engine under the name Phaser.
import * as Phaser from "phaser";
// Each scene is one "screen" of the game. We list them all below.
import { BootScene } from "./scenes/BootScene";
import { ForestScene } from "./scenes/ForestScene";
import { KingdomScene } from "./scenes/KingdomScene";
import { UIScene } from "./scenes/UIScene";
// Room = the interior scenes (Vinyl Lounge, arcade mini-games...) that
// buildings in the world lead into.
import { RoomScene } from "./scenes/RoomScene";

// The Phaser "game" settings. React calls createGame() once when the
// /game page mounts, and destroys it when you leave the page.
// "export" means other files can import this function.
// "parent: HTMLElement" is the <div> on the web page the game draws inside.
// ": Phaser.Game" after the () says this function RETURNS a Phaser game.
export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO, // WebGL if available, Canvas otherwise
    // Shorthand for "parent: parent" (put the game inside that <div>)
    parent,
    // Dark night-blue color shown behind everything
    backgroundColor: "#0b1220",
    // The game is designed at 1280x720 (720p, 16:9 like a TV screen)
    width: 1280,
    height: 720,
    // FIT = shrink/grow to fit any window while keeping the 16:9 shape; CENTER_BOTH centers it
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    // dom.createContainer lets scenes add real HTML elements (RoomScene uses
    // them for the Vinyl Lounge's embedded music player).
    dom: { createContainer: true },
    // antialias smooths edges so the code-drawn art looks clean, not jagged
    render: { antialias: true, roundPixels: false },
    // "arcade" physics = simple, fast boxes for movement and collisions.
    // Set debug: true to see the hitboxes drawn on screen (great for learning).
    physics: { default: "arcade", arcade: { debug: false } },
    // Boot draws the art, then starts Forest (the world) and UI (the HUD).
    // Kingdom (the Future Kingdom) starts when the hero walks through the gate.
    // Room starts when the hero steps inside a building.
    scene: [BootScene, ForestScene, KingdomScene, UIScene, RoomScene], // first one starts automatically
  });
}
