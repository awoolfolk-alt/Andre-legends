// ─────────────────────────────────────────────────────────────
// SAFE TOWN PRESENCE (Supabase Realtime) — the multiplayer layer.
//
// WHAT IT DOES: while the hero stands inside Safe Town, the game
// joins one shared channel ("legend-of-andre-safe-town-v1") and
// broadcasts a tiny state (name, hero look, x/y, facing, moving)
// about 8 times a second. Everyone else in town does the same,
// so each player sees the others as visitor avatars.
//
// THE SAFETY RULE: this module NEVER blocks the game. If the keys
// are missing, the server is down, or Realtime is off, join()
// simply returns false and the adventure continues exactly as
// before — single-player, local, unbothered.
//
// NO LOGIN NEEDED: presence rides on the publishable key (the
// channel is a public town square, not private data). Cloud SAVE
// still requires an account; simply SEEING other travelers does
// not. Remote data is untrusted — everything is validated and
// clamped in cleanState() before the scene ever hears about it.
// ─────────────────────────────────────────────────────────────

import type { RealtimeChannel } from "@supabase/supabase-js";
import { cloudClient } from "../cloud";
import { sanitizeHero, type HeroConfig } from "../data/hero";

// What one traveler tells the town about themselves, ~8x a second.
export interface RemoteState {
  name: string;
  hero?: HeroConfig;
  x: number;
  y: number;
  flipX: boolean;
  moving: boolean;
}

export interface PresenceCallbacks {
  onJoin(id: string, state: RemoteState): void;
  onUpdate(id: string, state: RemoteState): void;
  onLeave(id: string): void;
}

const CHANNEL = "legend-of-andre-safe-town-v1";
const TRACK_INTERVAL_MS = 120; // ~8 broadcasts a second
const MAX_NAME = 24; // keep name labels from ever breaking the layout
const SUBSCRIBE_TIMEOUT_MS = 6000;

// Stranger data is untrusted: shape-check every field, clamp the name,
// clamp positions to the forest world, sanitize the hero look.
// Returns null for anything malformed — that traveler is ignored.
function cleanState(raw: unknown): RemoteState | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const { x, y } = r;
  if (typeof x !== "number" || !Number.isFinite(x) || typeof y !== "number" || !Number.isFinite(y)) return null;
  if (x < 0 || x > 3800 || y < 0 || y > 2600) return null; // outside the world = nonsense
  return {
    name: typeof r.name === "string" && r.name.trim() ? r.name.trim().slice(0, MAX_NAME) : "Traveler",
    hero: r.hero && typeof r.hero === "object" ? sanitizeHero(r.hero as Partial<HeroConfig>) : undefined,
    x,
    y,
    flipX: r.flipX === true,
    moving: r.moving === true,
  };
}

function sessionKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `traveler-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}

export class SafeTownPresence {
  private channel: RealtimeChannel | null = null;
  private key = "";
  private known = new Set<string>();
  private lastSent = "";
  private lastSentAt = 0;

  /** True once the channel is live (joined successfully). */
  get active(): boolean {
    return this.channel !== null;
  }

  /**
   * Join the town square. Resolves true if we are live on the channel,
   * false if presence is unavailable (offline, unconfigured, Realtime
   * off) — in which case the game simply stays single-player.
   */
  async join(cb: PresenceCallbacks): Promise<boolean> {
    if (this.channel) return true;
    const sb = cloudClient();
    if (!sb) return false;

    this.key = sessionKey();
    const channel = sb.channel(CHANNEL, { config: { presence: { key: this.key } } });

    // One "sync" handler drives everything: it diffs the channel's full
    // presence list against the travelers we know, then issues join /
    // update / leave callbacks. Using sync (not raw join/leave events)
    // means a missed event can never leave a ghost on screen — the next
    // sync always heals the state.
    channel.on("presence", { event: "sync" }, () => {
      const table = channel.presenceState() as Record<string, unknown[]>;
      const seen = new Set<string>();
      for (const [id, metas] of Object.entries(table)) {
        if (id === this.key) continue; // never draw ourselves
        const clean = cleanState(Array.isArray(metas) ? metas[0] : undefined);
        if (!clean) continue;
        seen.add(id);
        if (this.known.has(id)) {
          cb.onUpdate(id, clean);
        } else {
          this.known.add(id);
          cb.onJoin(id, clean);
        }
      }
      for (const id of [...this.known]) {
        if (!seen.has(id)) {
          this.known.delete(id);
          cb.onLeave(id);
        }
      }
    });

    try {
      const status = await new Promise<string>((resolve) => {
        const timer = setTimeout(() => resolve("timeout"), SUBSCRIBE_TIMEOUT_MS);
        channel.subscribe((s) => {
          clearTimeout(timer);
          resolve(s);
        });
      });
      if (status !== "SUBSCRIBED") {
        void sb.removeChannel(channel);
        return false;
      }
      this.channel = channel;
      return true;
    } catch {
      this.channel = null;
      try {
        void sb.removeChannel(channel);
      } catch { /* already gone */ }
      return false;
    }
  }

  /**
   * Offer our latest state. Called every frame by the scene; this method
   * does the throttling (max ~8/s) and skips broadcasts when nothing
   * changed. Because the scene calls it continuously, the final
   * "stopped" state is always delivered within one throttle window.
   */
  update(state: RemoteState): void {
    const channel = this.channel;
    if (!channel) return;
    const now = Date.now();
    if (now - this.lastSentAt < TRACK_INTERVAL_MS) return;
    const payload = JSON.stringify(state);
    if (payload === this.lastSent) return;
    this.lastSent = payload;
    this.lastSentAt = now;
    channel.track(state).catch(() => { /* a dropped tick heals on the next one */ });
  }

  /** Leave the square: untrack ourselves and drop the channel. */
  leave(): void {
    const channel = this.channel;
    this.channel = null;
    this.known.clear();
    this.lastSent = "";
    if (!channel) return;
    try {
      channel.untrack().catch(() => { /* closing anyway */ });
      void cloudClient()?.removeChannel(channel);
    } catch { /* leaving must never throw into the game loop */ }
  }
}
