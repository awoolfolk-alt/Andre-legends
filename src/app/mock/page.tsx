// ─────────────────────────────────────────────────────────────────────────────
// /mock — the review lobby for the first-person redesign.
//
// The standalone scenes remain visual review references. The lava cave,
// mansion, and floating-castle layouts are now used by the real boss fights
// in /game after each boss's intro dialogue.
// ─────────────────────────────────────────────────────────────────────────────
import Link from "next/link";

const MOCKS = [
  {
    href: "/mock/forest/",
    num: "MOCK B-1",
    title: "The Walk — First-Person Forest",
    body: "The overworld in first person: winding path, shrine thresholds, the Watchtower on the horizon, fireflies. Judge the feel: speed of looking, density of trees, readability of the path. Includes the boss-announcement event.",
  },
  {
    href: "/mock/arena-lava/",
    num: "ARENA I",
    title: "The Lava Cave — Empire Revenant",
    body: "Heat, pressure, machines grinding. The place where you had to advocate for yourself — three months of training instead of six, and you still learned the machine.",
  },
  {
    href: "/mock/arena-mansion/",
    num: "ARENA II",
    title: "The Death-Trapped Mansion — Nike Nightstalker",
    body: "A beautiful place full of traps: too many rooms, every door a yes you should not have said. Carrying two departments until nothing was left.",
  },
  {
    href: "/mock/arena-castle/",
    num: "ARENA III",
    title: "The Floating Castle — Shadow of Andre",
    body: "Above the clouds, at the height you are reaching for, the final boss waits: yourself. Doubt defeated becomes Confidence.",
  },
  {
    href: "/mock/shadow-word/",
    num: "THE HYBRID",
    title: "The Word Duel — Sword ⇄ Affirmation",
    body: "The mechanic only this story could have: melee to a threshold, then the world freezes and you type the word. Spelling is the spell. Cracks form, light seeps through. Fully playable mock — try it.",
  },
  {
    href: "/mock/death/",
    num: "THE FALL",
    title: "DISCOURAGED — The Death Screen",
    body: "GTA-style, but the verdict is the one word your whole story argues against. One short line of determination, then rise.",
  },
  {
    href: "/mock/kingdom/",
    num: "THE EMERGENCE",
    title: "Future Kingdom — Interactive Blueprint",
    body: "Out of the deep forest, the trees break — and the future stands drawn, not built. Walk the grounds; each outline tells you what it means.",
  },
];

export default function MockIndex() {
  return (
    <main className="mock-index">
      <div className="wrap">
        <p className="kicker">THE LEGEND OF ANDRE · RISE OF LEGACY</p>
        <h1>First-Person Redesign — Review Mocks</h1>
        <p className="sub">
          These pages are the live visual references for the first-person rooms. In{" "}
          <b>/game, each boss intro now fades into its matching low-poly 3D arena</b>: the
          Empire Revenant&apos;s lava cave, the Nike Nightstalker&apos;s mansion, or the
          Shadow&apos;s floating castle. Win the 3D duel to continue the story, or return to
          the classic 2D fight at any time. The standalone mocks remain useful for comparing
          room layouts. The first-person walk prototype is still available at{" "}
          <Link href="/prototype/" style={{ color: "#ffd75e" }}>
            /prototype
          </Link>
          ; the classic game also remains playable at{" "}
          <Link href="/game/" style={{ color: "#ffd75e" }}>
            /game
          </Link>
          .
        </p>

        <div className="grid">
          {MOCKS.map((m) => (
            <Link key={m.href} href={m.href} className="mock-card">
              <span className="num">{m.num}</span>
              <h2>{m.title}</h2>
              <p>{m.body}</p>
              <span className="go">OPEN MOCK →</span>
            </Link>
          ))}
        </div>

        <table>
          <caption>THE BOSS STRUCTURE — ONE AT A TIME, EACH BEHIND A SHRINE</caption>
          <thead>
            <tr>
              <th>Boss</th>
              <th>Arena (its own page/world)</th>
              <th>The lesson it guards</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>The Empire Revenant</td>
              <td>The Lava Cave — heat, pressure, the grinding machine</td>
              <td>Empire Cooler: advocate for yourself. Three months instead of six — you still learned the machine.</td>
            </tr>
            <tr>
              <td>The Nike Nightstalker</td>
              <td>The Death-Trapped Mansion — beauty full of traps</td>
              <td>Nike: two departments carried until nothing was left. Every door is a yes you should not have said.</td>
            </tr>
            <tr>
              <td>The Shadow of Andre</td>
              <td>The Floating Castle — above the clouds, the summit</td>
              <td>Self Doubt at the height you are reaching for. The sword wounds it; only the words break it.</td>
            </tr>
          </tbody>
        </table>

        <div className="foot">
          <p>
            <b>How to review:</b> compare each standalone mock with the same boss room inside{" "}
            <Link href="/game/" style={{ color: "#ffd75e" }}>/game</Link>. Drag to look around
            in 3D, then check whether the room feels like its story, reads at a glance, and
            works on a phone. After the intro, the actual fight can be moved through with WASD
            and mouse-look (or the touch controls); the Shadow&apos;s typing phase begins with
            a 3-second count-in.
          </p>
          <p style={{ marginTop: 10 }}>
            <Link href="/">← Back to the main menu</Link> · The word list, death lines, and arena
            meanings come from your own affirmations and chapters.
          </p>
        </div>
      </div>
    </main>
  );
}
