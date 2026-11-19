import { PUBLIC_PLAYLIST, Track } from "./playlist";
// The synthesized starter song (a "file" track whose src is "synth:...").
import { setForestThemeVolume, startForestTheme, stopForestTheme } from "./forestTheme";

// ─────────────────────────────────────────────────────────────
// MUSIC PLAYER ENGINE
// This works the same way as the player on dreaddontdie.com:
//   1. ONE hidden audio player (new Audio() is the same as an <audio> tag)
//   2. a PLAYLIST (an array of tracks)
//   3. functions that put a song into the player and call play()
//
// It has NO buttons of its own. The Jukebox component (the buttons you
// see) calls these functions and "subscribes" to hear about changes.
// Keeping the engine separate from the buttons means the menu, the game,
// or a keyboard shortcut can all control the same music.
// ─────────────────────────────────────────────────────────────

/** Everything the buttons need to draw themselves. */
export interface MusicState {
  tracks: Track[];
  index: number; // which track is selected (0 = first)
  playing: boolean;
  volume: number; // 0 (silent) to 1 (full)
  needsClick: boolean; // the browser blocked autoplay; the visitor must press play
}

type Listener = (state: MusicState) => void;

class MusicPlayer {
  // "?" = may be undefined. We only create the audio player in the browser.
  private audio?: HTMLAudioElement;
  private listeners = new Set<Listener>();
  private loadedLocal = false;
  private state: MusicState = {
    tracks: [...PUBLIC_PLAYLIST],
    index: 0,
    playing: false,
    volume: 0.4,
    needsClick: false,
  };

  /** Create the hidden audio player (once). Browsers only: there's no audio on the server. */
  private get player(): HTMLAudioElement {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = "auto";
      // Remember the volume between visits. localStorage can throw in private
      // windows, so it's wrapped in try/catch (if it fails, we use the default).
      try {
        const saved = Number(localStorage.getItem("legend.musicVolume"));
        if (saved >= 0 && saved <= 1 && localStorage.getItem("legend.musicVolume") !== null) this.state.volume = saved;
      } catch { /* no saved volume, keep the default */ }
      this.audio.volume = this.state.volume;
      // When a song finishes, play the next one (like a real playlist)
      this.audio.addEventListener("ended", () => this.next());
      // Keep our "playing" flag honest if the browser pauses on its own
      this.audio.addEventListener("pause", () => this.update({ playing: false }));
      this.audio.addEventListener("play", () => this.update({ playing: true, needsClick: false }));
    }
    return this.audio;
  }

  // ── SUBSCRIBE: how the buttons stay up to date ──────────────
  /** Call `fn` now and every time the state changes. Returns an "unsubscribe" function. */
  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  get current(): Track | undefined {
    return this.state.tracks[this.state.index];
  }

  // Merge a change into the state, then tell every listener
  // ("Partial<MusicState>" = an object with SOME of MusicState's fields)
  private update(change: Partial<MusicState>) {
    this.state = { ...this.state, ...change };
    this.listeners.forEach((fn) => fn(this.state));
  }

  /**
   * Load the PRIVATE local playlist if it exists on this computer.
   * fetch() asks for the file; on the live site it isn't there (git ignored it),
   * so the request fails quietly and the public playlist is used alone.
   */
  async loadLocal() {
    if (this.loadedLocal) return;
    this.loadedLocal = true;
    try {
      // Root of the SITE, whatever host we're on:
      //   Docker / local dev  → "/"           → /assets/audio/local/...
      //   GitHub Pages        → "/awoolfolk/" → /awoolfolk/assets/audio/local/...
      // (The Pages export inlines its basePath into the built-in 404 page's
      // asset links; on any other host there is no basePath, so "/" is right.)
      const siteRoot = document.querySelector('script[src*="/_next/"]')?.getAttribute("src")?.split("/_next/")[0] || "";
      const res = await fetch(`${siteRoot}/assets/audio/local/playlist.json`, { cache: "no-store" });
      if (!res.ok) return;
      // The JSON is a list like [{ "title": "...", "artist": "...", "file": "song.mp3" }]
      const list = (await res.json()) as { title: string; artist: string; file: string }[];
      const local: Track[] = list.map((s) => ({
        kind: "file",
        local: true,
        title: s.title,
        artist: s.artist,
        // encodeURIComponent makes spaces and symbols in file names safe for a web address
        // Relative to the PAGE: the jukebox lives on pages at the site root
        // (menu, vision, portfolio) where this resolves correctly on both hosts.
        src: `assets/audio/local/${encodeURIComponent(s.file)}`,
        credit: `${s.title} by ${s.artist}. All rights belong to the artist.`,
        license: "Personal copy for local study only (not published)",
      }));
      this.update({ tracks: [...this.state.tracks, ...local] });
    } catch {
      // No local playlist on this machine. That's normal for the live site.
    }
  }

  // ── CONTROLS ────────────────────────────────────────────────
  /** Play track number i (wraps around past the ends). */
  play(i = this.state.index) {
    const count = this.state.tracks.length;
    if (count === 0) return;
    // "%" (remainder) wraps the number around: after the last song comes the first,
    // and before the first comes the last. (+ count keeps it from going negative.)
    const index = ((i % count) + count) % count;
    const track = this.state.tracks[index];
    this.update({ index });

    if (track.kind === "embed") {
      // Embedded songs play inside the platform's own player (the Jukebox shows it),
      // so our audio player stays quiet.
      this.player.pause();
      stopForestTheme();
      this.update({ playing: false });
      return;
    }

    // Synthesized tracks (src starts with "synth:") are generated in the
    // browser — no file to load, no autoplay promise to reject. A jukebox
    // button press IS a user gesture, so Web Audio is allowed here.
    if (track.src.startsWith("synth:")) {
      this.player.pause();
      startForestTheme();
      setForestThemeVolume(this.state.volume);
      this.update({ playing: true, needsClick: false });
      return;
    }

    // A real file is playing now — make sure the synth is off.
    stopForestTheme();
    const p = this.player;
    // Only reload the file if it's a different song (so pause/resume keeps its place)
    if (!p.src.endsWith(track.src)) p.src = track.src;
    // play() returns a Promise. Browsers REJECT it if the visitor hasn't clicked
    // anything yet (they block surprise sound). Then we ask for a click instead.
    p.play().catch(() => this.update({ playing: false, needsClick: true }));
  }

  /** Pause if playing, play if paused (the play/pause button). */
  toggle() {
    if (this.state.playing) {
      this.player.pause();
      stopForestTheme();
      this.update({ playing: false });
    } else this.play();
  }

  next() { this.play(this.state.index + 1); }
  prev() { this.play(this.state.index - 1); }

  /** Start the music only if nothing is playing yet (used by "New Adventure"). */
  startIfIdle() {
    if (!this.state.playing && this.current?.kind === "file") this.play();
  }

  setVolume(v: number) {
    // Math.min/Math.max keep the value between 0 and 1
    const volume = Math.min(1, Math.max(0, v));
    this.player.volume = volume;
    setForestThemeVolume(volume); // synthesized tracks follow the same slider
    try { localStorage.setItem("legend.musicVolume", String(volume)); } catch { /* ignore */ }
    this.update({ volume });
  }
}

// ONE player for the whole site ("singleton"), so the menu and the game
// share the same music. Every file that imports `music` gets this same object.
export const music = new MusicPlayer();
