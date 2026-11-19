// ─────────────────────────────────────────────────────────────
// PLAYLIST: the list of songs the jukebox can play.
// Same idea as dreaddontdie.com's newMusic.js (a list of tracks),
// but each track also carries its CREDIT and LICENSE, so the site
// always shows who made the music and what lets us play it.
//
// THREE KINDS OF TRACKS:
//   "file"  -> an MP3 we're allowed to publish (our own or royalty-free),
//              stored in public/assets/audio/. Plays in our own player.
//   "embed" -> a song you love by another artist, played through the
//              artist's OFFICIAL player (YouTube or Spotify). The platform
//              holds the license, the artist gets the play, and credit is
//              built in. This is the legal way to share music you don't own.
//   LOCAL   -> your own MP3 copies for studying, in public/assets/audio/local/.
//              Git ignores that folder, so they never get published.
//              (See public/assets/audio/local/README.txt.)
//
// WHY NOT just upload other artists' MP3s with credit? Credit is not
// permission. Putting the file on a public site makes copies of it,
// which the copyright owner hasn't allowed. Embeds avoid that problem.
// ─────────────────────────────────────────────────────────────

// Fields every track has, no matter its kind.
interface TrackBase {
  title: string;
  artist: string;
  credit: string; // shown under the song: who made it / where it's from
  license: string; // what gives us the right to play it
}

// A UNION TYPE with a "kind" field: TypeScript uses `kind` to know which
// other fields exist. (A file track has `src`; an embed track has `embedUrl`.)
export type Track =
  | (TrackBase & { kind: "file"; src: string; local?: boolean })
  | (TrackBase & { kind: "embed"; embedUrl: string; link: string });

/**
 * Turns a normal share link into the address of the official embed player.
 *   YouTube: https://www.youtube.com/watch?v=ID  or  https://youtu.be/ID
 *   Spotify: https://open.spotify.com/track/ID
 * Returns null if the link isn't one we recognize.
 */
export function toEmbedUrl(link: string): string | null {
  try {
    // URL() splits a web address into parts (host, path, ?query)
    const u = new URL(link);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube-nocookie.com/embed${u.pathname}`;
    }
    if (u.hostname === "open.spotify.com") {
      // "/track/ID" becomes "/embed/track/ID"
      return `https://open.spotify.com/embed${u.pathname}`;
    }
  } catch {
    // new URL() throws on text that isn't a web address. Treat it as "not recognized".
  }
  return null;
}

/** Helper to add a song you love by another artist, from its share link. */
export function embed(title: string, artist: string, link: string): Track | null {
  const embedUrl = toEmbedUrl(link);
  // Skip links we can't turn into an official player
  if (!embedUrl) return null;
  return {
    kind: "embed", title, artist, embedUrl, link,
    credit: `${title} by ${artist}. Plays through the official player.`,
    license: "Streamed via the platform's official embed (licensed by the platform)",
  };
}

// ── THE PUBLIC PLAYLIST (this is what goes live on your site) ──
const tracks: (Track | null)[] = [
  {
    kind: "file",
    title: "Forest of Origins",
    artist: "The Legend of Andre",
    // No MP3 needed: this track is synthesized live by src/music/forestTheme.ts
    // (zero download, and it can never 404).
    src: "synth:forest-of-origins",
    credit: "Original theme generated in code with the Web Audio API.",
    license: "Original work, free to use (CC0)",
  },

  // ADD SONGS YOU LOVE HERE. Copy a share link from YouTube or Spotify
  // (Share -> Copy link) and paste it as the third value, like:
  //   embed("Song Title", "Artist Name", "https://open.spotify.com/track/..."),
  //   embed("Song Title", "Artist Name", "https://www.youtube.com/watch?v=..."),
];

// .filter removes any null entries (links that weren't recognized).
// "(t): t is Track" tells TypeScript that everything left is a real Track.
export const PUBLIC_PLAYLIST: Track[] = tracks.filter((t): t is Track => t !== null);

// Where the private, git-ignored song list lives (loaded at runtime if it exists)
// Local (never-published) songs live in public/assets/audio/local/.
// MusicPlayer.loadLocal builds the fetch URL at runtime so it works on
// both the Docker host and GitHub Pages — see the siteRoot comment there.
