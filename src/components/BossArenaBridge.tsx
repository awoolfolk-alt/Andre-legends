"use client";

import { useEffect, useRef, useState } from "react";

type BossId = "empire" | "nike" | "self";
type BossRequest = { id: BossId; name: string };
type Transition = "cover" | "loading" | "reveal" | "returning";

function isBossRequest(value: unknown): value is BossRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as Record<string, unknown>;
  return (
    (request.id === "empire" || request.id === "nike" || request.id === "self") &&
    typeof request.name === "string"
  );
}

export default function BossArenaBridge() {
  const [boss, setBoss] = useState<BossRequest | null>(null);
  const [transition, setTransition] = useState<Transition>("cover");
  const [loadError, setLoadError] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const activeBoss = useRef<BossRequest | null>(null);
  const transitionRef = useRef<Transition>("cover");
  const arenaReady = useRef(false);
  const cancelBossRef = useRef<((request: BossRequest) => void) | null>(null);
  const coverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const returnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const changeTransition = (next: Transition) => {
    transitionRef.current = next;
    setTransition(next);
  };

  useEffect(() => {
    let disposed = false;
    let removeListeners = () => {};
    const clearTimer = () => {
      if (coverTimer.current) clearTimeout(coverTimer.current);
      if (returnTimer.current) clearTimeout(returnTimer.current);
      coverTimer.current = null;
      returnTimer.current = null;
    };
    import("@/game/systems/EventBus")
      .then(({ EventBus, EVT }) => {
        if (disposed) return;
        const start = (request: unknown) => {
          if (!isBossRequest(request)) return;
          clearTimer();
          activeBoss.current = request;
          arenaReady.current = false;
          setBoss(request);
          setLoadError(false);
          changeTransition("cover");
        };
        const finish = (event: MessageEvent) => {
          const current = activeBoss.current;
          if (
            event.origin !== window.location.origin ||
            event.source !== frameRef.current?.contentWindow ||
            !current ||
            !event.data ||
            typeof event.data !== "object" ||
            event.data.bossId !== current.id
          ) {
            return;
          }

          if (event.data.type === "boss3dReady") {
            arenaReady.current = true;
            if (transitionRef.current === "loading") {
              if (coverTimer.current) clearTimeout(coverTimer.current);
              coverTimer.current = null;
              changeTransition("reveal");
            }
            return;
          }
          if (event.data.type !== "boss3dComplete" && event.data.type !== "boss3dCancel") return;

          clearTimer();
          changeTransition("returning");
          returnTimer.current = setTimeout(() => {
            EventBus.emit(
              event.data.type === "boss3dComplete" ? EVT.boss3dComplete : EVT.boss3dCancel,
              { id: current.id }
            );
            activeBoss.current = null;
            setBoss(null);
          }, 520);
        };

        cancelBossRef.current = (request) => EventBus.emit(EVT.boss3dCancel, { id: request.id });
        EventBus.on(EVT.boss3dStart, start);
        window.addEventListener("message", finish);
        removeListeners = () => {
          EventBus.off(EVT.boss3dStart, start);
          window.removeEventListener("message", finish);
          cancelBossRef.current = null;
        };
      })
      .catch((error: unknown) => {
        console.error("Could not load the boss arena event bridge.", error);
      });
    return () => {
      disposed = true;
      clearTimer();
      removeListeners();
    };
  }, []);

  useEffect(() => {
    if (transition !== "cover" || !boss) return;
    coverTimer.current = setTimeout(() => {
      changeTransition(arenaReady.current ? "reveal" : "loading");
    }, 480);
    return () => {
      if (coverTimer.current) clearTimeout(coverTimer.current);
      coverTimer.current = null;
    };
  }, [boss, transition]);

  if (!boss) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      {transition !== "cover" && (
        <iframe
          ref={frameRef}
          key={boss.id}
          src={`/prototype?embed=boss&boss=${boss.id}`}
          title={`${boss.name} 3D boss arena`}
          allow="autoplay; fullscreen; pointer-lock"
          onLoad={() => {
            if (transitionRef.current !== "loading") return;
            if (arenaReady.current) {
              changeTransition("reveal");
              return;
            }
            coverTimer.current = setTimeout(() => changeTransition("reveal"), 1200);
          }}
          onError={() => setLoadError(true)}
          className="absolute inset-0 h-full w-full border-0"
          style={{
            opacity: transition === "reveal" ? 1 : 0,
            transition: "opacity 700ms ease",
          }}
        />
      )}
      <div
        className="absolute inset-0 flex items-center justify-center bg-black transition-opacity duration-700"
        style={{ opacity: transition === "reveal" ? 0 : 1, pointerEvents: transition === "reveal" ? "none" : "auto" }}
      >
        {loadError && (
          <div className="mx-6 max-w-md text-center text-white">
            <p className="text-xl text-[#ffb3b3]">The 3D arena could not be loaded.</p>
            <p className="mt-2 text-sm text-white/65">Return to the 2D duel and continue the fight there.</p>
            <button
              onClick={() => {
                if (!boss) return;
                cancelBossRef.current?.(boss);
                activeBoss.current = null;
                setBoss(null);
              }}
              className="mt-5 rounded-lg border border-white/30 px-5 py-3 hover:bg-white/10"
            >
              Return to the 2D duel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
