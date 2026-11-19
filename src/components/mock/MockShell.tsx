"use client";
// ─────────────────────────────────────────────────────────────────────────────
// MockShell — the stage every mock page performs on.
//
// WHY a shell? Each mock page has two layers that must never know about each
// other: a WebGL world (Three.js, imperative) and a HUD (React, declarative).
// The shell owns the canvas lifetime: it builds the world when the page
// mounts, pumps the single clock, and tears everything down on unmount —
// without this, navigating between mock pages would leak GPU contexts.
// Pages hand in a `build` function ("here is my world") and HUD children
// ("here is my interface"); the shell keeps them divorced and happy.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef } from "react";
import { createWorld, startLoop, type MockWorld, type WorldOpts } from "@/game/mock/kit";

export default function MockShell({
  opts,
  build,
  children,
  className = "",
}: {
  opts: WorldOpts;
  /** Build the scene; return per-frame updaters that read the one clock `t`. */
  build: (world: MockWorld) => Array<(t: number) => void>;
  children?: React.ReactNode;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Keep the latest build function in a ref so the effect below never needs
  // to re-run (and recreate the whole GPU world) on every render.
  const buildRef = useRef(build);
  buildRef.current = build;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const world = createWorld(canvas, opts);
    const updaters = buildRef.current(world) ?? [];
    const stop = startLoop(world, updaters);
    return () => {
      stop();
      world.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`mock-stage ${className}`}>
      <canvas ref={canvasRef} className="mock-canvas" />
      {children}
    </div>
  );
}
