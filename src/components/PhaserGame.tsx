// "use client" = this file runs in the browser. Phaser draws on a real screen,
// so it can only work in the browser, never on the server.
"use client";

// useRef = a box that holds something (here, an HTML element) without redrawing the page.
// useEffect = run some code AFTER the component appears on screen.
import { useEffect, useRef } from "react";

// The bridge between React and Phaser.
// WHY dynamic import inside useEffect? Phaser needs `window`, which
// doesn't exist when Next.js renders on the server. useEffect only
// runs in the browser, so Phaser loads there.
//
// React owns the page; Phaser owns the game. This component gives Phaser an
// empty <div> to draw its game canvas into, then gets out of the way.
export default function PhaserGame() {
  // container will point at the <div> at the bottom once React puts it on the page.
  const container = useRef<HTMLDivElement>(null);

  // The empty [] at the end means "run this once, when the component first appears".
  useEffect(() => {
    // We remember the game so we can shut it down later.
    let game: import("phaser").Game | undefined;
    // If the player leaves the page before Phaser finishes loading, this flag
    // tells us NOT to start the game anyway.
    let cancelled = false;
    // import("...") with parentheses is a "dynamic import": it loads the file later,
    // while the app is running, instead of at the top of the file. It returns a
    // Promise, and .then(...) runs once the file has finished loading.
    import("@/game/config").then(({ createGame }) => {
      // Only start the game if we're still on the page and the <div> exists.
      if (!cancelled && container.current) {
        game = createGame(container.current);
        (window as unknown as { __legend?: unknown }).__legend = game; // handy for debugging in DevTools
      }
    });

    // Browser window resizes (dragging a corner, going fullscreen) change the
    // available space, so we poke Phaser's Scale Manager to re-fit the canvas.
    const refresh = () => game?.scale.refresh();
    window.addEventListener("resize", refresh);

    // The function we return is the "cleanup". React runs it when this component
    // is removed (for example, when the player clicks back to the Menu).
    // Without it, the old game would keep running in the background.
    return () => {
      cancelled = true;
      window.removeEventListener("resize", refresh);
      game?.destroy(true); // clean up when leaving the page
    };
  }, []);

  // The empty box Phaser draws into. h-full w-full = fill the whole parent.
  return <div ref={container} className="h-full w-full" />;
}
