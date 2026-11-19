// "use client" tells Next.js this file runs in the BROWSER, not on the server.
// We need that because this menu reacts to clicks and mouse movement,
// and those only exist in a real browser window.
"use client";

// useState = a React "memory box". When its value changes, React redraws the screen.
import { useEffect, useState } from "react";
// useRouter = lets our code move the player to another page (like clicking a link).
import { useRouter } from "next/navigation";
// Framer Motion = an animation library. Each import is explained where it is used below.
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
// The browser-local save system: Continue reads it, New Adventure rewrites it.
import { hasSave, listSlots, setActiveSlot, setPendingMode, type SlotId } from "@/game/save";
// The OPTIONAL cloud layer: email login + saves that follow the player
// across devices (Supabase). Everything still works without it (guest mode).
import {
  cloudReady, cloudLogin, cloudLogout, cloudEmail,
  initCloudSync, syncCloudSave,
} from "@/game/cloud";

// ─────────────────────────────────────────────────────────────
// MAIN MENU (React + Framer Motion, not Phaser)
// WHY: menus are buttons, text, and layout, which is React's strength.
// Framer Motion gives hover/parallax/transition animations with a few
// props instead of hand-written animation code.
//
// This is the portfolio's landing page (the "/" URL). It has 4 options:
//   New Adventure  -> plays a "draw the sword" zoom, then opens the game at /game
//   The Legend     -> a pop-up panel with Andre's bio
//   Future Kingdom -> a locked panel describing Andre's mission for the South Side
//   Credits        -> who built it and with what tools
// ─────────────────────────────────────────────────────────────

// A TypeScript "type" describes which values are allowed.
// Panel is either null (no pop-up open) or the name of one pop-up.
type Panel = null | "legend" | "future" | "credits" | "cloud" | "continue";

const MENU_HOVER_TRANSITION = { type: "spring" as const, stiffness: 320, damping: 24 };

// The list of menu buttons. Keeping them in an array means we can draw all
// buttons with one loop (.map below) instead of writing 4 buttons by hand.
// "action" says what happens on click: "play" starts the game, the rest open a panel.
const MENU: { label: string; action: "play" | Panel }[] = [
  { label: "New Adventure", action: "play" },
  { label: "The Legend", action: "legend" },
  { label: "Future Kingdom", action: "future" },
  { label: "Credits", action: "credits" },
  { label: "Cloud Save", action: "cloud" },
];

// A React component is just a function that returns what should appear on screen.
// "export default" lets other files (app/page.tsx) import and use it.
export default function MainMenu() {
  // router.push("/game") will send the player to the game page.
  const router = useRouter();
  // Which pop-up panel is open right now (null = none). setPanel changes it.
  const [panel, setPanel] = useState<Panel>(null);
  // true while the "draw the sword" exit animation is playing.
  const [leaving, setLeaving] = useState(false);
  // True once we know (in the browser) that at least one save slot holds an
  // adventure — gates the Continue button. Starts false because localStorage
  // doesn't exist while Next.js renders on the server.
  const [existing, setExisting] = useState(false);

  // ── CLOUD LOGIN state ──
  // cloudUser = the signed-in email (null = guest). The rest drive the
  // login form: what they typed, whether we're waiting on the network,
  // any error to show, and whether to offer the personal-password step.
  const [cloudUser, setCloudUser] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // Re-read the local save and update the Continue button's label.
  const refreshExisting = () => setExisting(hasSave());

  useEffect(() => {
    refreshExisting();
    // Start the cloud mirror (registers the "every save also goes up" hook).
    // If the player logged in on a previous visit, Supabase remembers the
    // session — so we quietly sync and show them as signed in.
    initCloudSync();
    (async () => {
      const email = await cloudEmail();
      if (email) {
        await syncCloudSave(); // newer save wins (cloud <-> cartridge)
        setCloudUser(email);
        refreshExisting(); // the cloud may have just delivered a save
      }
    })();
  }, []);

  // Sign in (or create the account on first use of an email), then sync.
  const doLogin = async () => {
    if (!loginEmail.trim()) return;
    setCloudBusy(true);
    setCloudError(null);
    const res = await cloudLogin(loginEmail.trim(), loginPw);
    if (!res.ok) {
      setCloudError(res.error);
      setCloudBusy(false);
      return;
    }
    await syncCloudSave(); // pull their cloud save down / push local progress up
    setCloudUser(res.email);
    refreshExisting();
    setCloudBusy(false);
  };

  // Sign out: back to guest mode. The local save stays on this device.
  const doLogout = async () => {
    await cloudLogout();
    setCloudUser(null);
  };

  // Cursor parallax: each layer moves a different amount = fake 3D depth
  // mx / my store where the mouse is, from -0.5 (left/top) to 0.5 (right/bottom).
  // useMotionValue is like useState, but it updates animations WITHOUT redrawing
  // the whole component, so it stays smooth while the mouse moves.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  // useSpring makes the value "chase" the mouse with a soft, springy delay
  // instead of snapping instantly. Lower stiffness = lazier; damping = less bounce.
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });
  // useTransform turns the mouse value into pixels for each layer.
  // far (stars) moves a little, mid (skyline) more, near (cliff + hero) the most.
  // Things close to your eyes seem to move more, so this fakes 3D depth.
  // The minus sign makes layers move AWAY from the cursor, like looking around.
  const far = { x: useTransform(sx, (v) => v * -10), y: useTransform(sy, (v) => v * -6) };
  const mid = { x: useTransform(sx, (v) => v * -25), y: useTransform(sy, (v) => v * -12) };
  const near = { x: useTransform(sx, (v) => v * -45), y: useTransform(sy, (v) => v * -20) };

  // Runs every time the mouse moves over the page.
  // clientX / window.innerWidth gives 0 to 1; subtracting 0.5 centers it at 0.
  const onMove = (e: React.MouseEvent) => {
    mx.set(e.clientX / window.innerWidth - 0.5);
    my.set(e.clientY / window.innerHeight - 0.5);
  };

  // Runs when a menu button is clicked.
  const choose = (action: "play" | Panel) => {
    if (action === "play") {
      // New Adventure walks through the character creator first (/create):
      // name, gender, skin, hair, clothes — then "Begin the Legend" there
      // writes the save (hero included) and opens /game.
      router.push("/create");
    } else setPanel(action); // any other button just opens its pop-up panel
  };

  // "Draw the sword" zoom, then walk into the game.
  const depart = () => {
    setPanel(null);
    setLeaving(true);
    // Wait 900 milliseconds (0.9s) so the animation can finish, then change page.
    setTimeout(() => router.push("/game"), 900);
  };

  // Continue: the player picks a save slot, we mark it active and pick up
  // exactly where that hero left off (checkpoint included).
  const continueGame = (slot: SlotId) => {
    setActiveSlot(slot);
    setPendingMode("continue");
    depart();
  };

  // Everything below is JSX: HTML-like code that describes the screen.
  // className holds Tailwind classes. Each class is one small style, for example:
  //   relative h-screen w-screen = full-screen box that children can position inside
  //   overflow-hidden = hide anything that moves past the edges
  //   bg-gradient-to-b from-[..] via-[..] to-[..] = a top-to-bottom color fade (night sky)
  //   font-display = our Cinzel font (defined in tailwind.config.ts)
  return (
    <main onMouseMove={onMove} className="relative min-h-screen min-h-[100dvh] w-full overflow-x-hidden bg-gradient-to-b from-[#0b1430] via-[#1b2a4a] to-[#3b2a3a] font-display">
      {/* Sky glow + stars (far layer) */}
      {/* motion.div is a normal div that Framer Motion can animate. style={far} hooks it */}
      {/* to the parallax values above. absolute inset-[-5%] = fill the screen plus a bit */}
      {/* extra on each side, so no gap shows when the layer slides. */}
      <motion.div style={far} className="absolute inset-[-5%]">
        {/* A big golden circle, blurred (blur-3xl) into a soft glow behind the title. */}
        <div className="absolute left-1/2 top-[18%] h-[50vh] w-[50vh] -translate-x-1/2 rounded-full bg-legacy/20 blur-3xl" />
        {/* Array.from({ length: 50 }) makes a list of 50 empty slots, so .map draws 50 stars. */}
        {/* i is the star's number (0-49). React needs a unique "key" on each item in a list. */}
        {/* The % (remainder) math spreads stars around the sky without random numbers. */}
        {/* animate opacity [0.2, 1, 0.2] = fade in and out; repeat: Infinity = twinkle forever. */}
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-white"
            style={{ left: `${(i * 37) % 100}%`, top: `${(i * 23) % 55}%` }}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 2 + (i % 4), repeat: Infinity, delay: i * 0.1 }}
          />
        ))}
      </motion.div>

      {/* Distant skyline: Chicago, the home the hero fights for (mid layer) */}
      {/* An SVG is a drawing made of shapes. The "path" d="..." is a list of pen moves */}
      {/* (h = go across, v = go up/down) that traces the building tops. */}
      {/* preserveAspectRatio="none" lets the drawing stretch to any screen width. */}
      <motion.svg style={mid} viewBox="0 0 1200 300" preserveAspectRatio="none" className="absolute bottom-[22%] left-[-5%] h-[30vh] w-[110%] opacity-60">
        <path fill="#141f3a" d="M0 300 V220 h60 v-40 h40 v60 h50 v-120 h30 v-30 h20 v30 h30 v150 h60 v-80 h50 v-60 h20 v60 h40 v90 h70 v-140 h25 v-50 h10 v50 h25 v140 h60 v-70 h80 v-30 h30 v100 h90 v-60 h40 v40 h60 v-110 h30 v110 h80 v-50 h60 v80 V300 Z" />
      </motion.svg>

      {/* Cliff + hero silhouette with swaying locks (near layer) */}
      {/* This layer moves the most with the cursor because it is "closest" to you. */}
      <motion.div style={near} className="absolute bottom-0 left-[-5%] h-[34vh] w-[110%]">
        {/* The cliff: one curved dark shape along the bottom of the screen. */}
        <svg viewBox="0 0 1200 300" preserveAspectRatio="none" className="absolute bottom-0 h-full w-full">
          <path fill="#0a1020" d="M0 300 V140 C200 120 380 90 560 110 C700 125 760 60 860 70 C960 80 1050 130 1200 120 V300 Z" />
        </svg>
        {/* The hero standing on the cliff. The "? :" picks one of two animations: */}
        {/* - leaving is true (New Adventure clicked): grow 1.3x and glow blue = draw the sword */}
        {/* - otherwise: bob up and down 2px every 3 seconds, like breathing while idle */}
        <motion.svg
          viewBox="0 0 60 90"
          className="absolute bottom-[68%] left-[69%] h-[18vh]"
          animate={leaving ? { scale: 1.3, filter: "drop-shadow(0 0 20px #4fd1ff)" } : { y: [0, -2, 0] }}
          transition={leaving ? { duration: 0.5 } : { duration: 3, repeat: Infinity }}
        >
          {/* The locks: 6 lines hanging from the head. The group (g) rotates -6 to 6 degrees */}
          {/* forever, pivoting at the top of the head (originX/originY), so the hair sways. */}
          <motion.g animate={{ rotate: [-6, 6, -6] }} transition={{ duration: 2.5, repeat: Infinity }} style={{ originX: "30px", originY: "12px" }}>
            {/* Each number is where one lock ends (x position). The number doubles as its key. */}
            {[14, 18, 22, 38, 42, 46].map((x) => (
              <line key={x} x1={30} y1={10} x2={x} y2={34} stroke="#0a0a0f" strokeWidth={3.5} strokeLinecap="round" />
            ))}
          </motion.g>
          {/* Head */}
          <circle cx={30} cy={16} r={9} fill="#0a0a0f" />
          {/* Body / coat */}
          <path d="M18 28 h24 l6 40 h-36 Z" fill="#0a0a0f" />
          {/* Sword on his back. It turns energy-blue when the adventure starts. */}
          <line x1={40} y1={28} x2={52} y2={2} stroke={leaving ? "#4fd1ff" : "#0a0a0f"} strokeWidth={3} />
          {/* Legs */}
          <rect x={20} y={66} width={7} height={22} fill="#0a0a0f" />
          <rect x={33} y={66} width={7} height={22} fill="#0a0a0f" />
        </motion.svg>
      </motion.div>

      {/* Title + menu */}
      {/* z-10 puts this above the background layers. Shorter gaps and a compact grid */}
      {/* keep the featured links visible, while the page can scroll on small screens. */}
      {/* When leaving, the whole menu fades out and zooms toward you (scale 1.4). */}
      <motion.div
        className="relative z-10 flex min-h-screen min-h-[100dvh] flex-col items-center justify-center gap-6 px-4 py-8"
        animate={leaving ? { opacity: 0, scale: 1.4 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* initial = how it starts (invisible, 30px higher); animate = where it ends. */}
        {/* So the title slides down and fades in over 1.2 seconds when the page loads. */}
        <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.2 }} className="text-center">
          {/* tracking-[0.5em] = wide letter spacing; text-energy = our blue theme color. */}
          <p className="text-sm tracking-[0.5em] text-energy">THE LEGEND OF</p>
          {/* Gold gradient text: paint a gradient, clip it to the letters (bg-clip-text), */}
          {/* and make the real text color see-through (text-transparent). */}
          {/* text-6xl = big text; sm:text-8xl = even bigger on screens at least "small" wide. */}
          <h1 className="bg-gradient-to-b from-[#fff3c4] to-legacy bg-clip-text text-6xl font-black text-transparent drop-shadow-[0_4px_20px_rgba(212,167,44,0.4)] sm:text-8xl">
            ANDRE
          </h1>
          <p className="mt-2 text-lg tracking-[0.3em] text-white/80">RISE OF LEGACY</p>
        </motion.div>

        {/* The menu buttons, drawn from the MENU array with .map. */}
        <nav className="grid w-full max-w-[34rem] grid-cols-2 gap-2 sm:gap-3">
          {/* Continue only appears when a saved adventure exists. It sits above the */}
          {/* list like a "welcome back" greeting, with the hero's name and level. */}
          {existing && (
            <motion.button
              onClick={() => setPanel("continue")}
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.025, y: -2, boxShadow: "0 0 18px rgba(79,209,255,0.45)", transition: MENU_HOVER_TRANSITION }}
              whileTap={{ scale: 0.985, transition: MENU_HOVER_TRANSITION }}
              className="col-span-2 w-full rounded-lg border border-energy/60 bg-navy/70 px-4 py-2.5 text-left text-base text-energy backdrop-blur sm:px-6 sm:py-3 sm:text-lg"
            >
              ▸ Continue
            </motion.button>
          )}
          {MENU.map((item, i) => (
            // Each button slides in from the left. delay grows with i, so they arrive
            // one after another. whileHover = grow, shift right, and glow gold while the
            // mouse is over it. whileTap = shrink a little while being pressed.
            // backdrop-blur blurs whatever is behind the button (frosted glass look).
            <motion.button
              key={item.label}
              onClick={() => choose(item.action)}
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.12 }}
              whileHover={{ scale: 1.025, y: -2, boxShadow: "0 0 18px rgba(212,167,44,0.45)", transition: MENU_HOVER_TRANSITION }}
              whileTap={{ scale: 0.985, transition: MENU_HOVER_TRANSITION }}
              className={`w-full rounded-lg border border-legacy/50 bg-navy/70 px-4 py-2.5 text-left text-base text-[#f3e3b5] backdrop-blur sm:px-6 sm:py-3 sm:text-lg${i === 0 ? " col-span-2" : ""}`}
            >
              ⚔ {item.label}
            </motion.button>
          ))}
        </nav>

        {/* Featured links form a pyramid: the prototype above Vision and Design Mocks. */}
        <div className="grid w-full max-w-[38rem] grid-cols-2 items-center gap-x-3 gap-y-2 sm:gap-x-6 sm:gap-y-3">
          {/* The playable first-person prototype: Mock B-1 (the Walk) + */}
          {/* B-2 (the Shadow fight). Same dashed treatment, gold tone. */}
          <motion.button
            onClick={() => router.push("/prototype")}
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.72 + MENU.length * 0.12 }}
            whileHover={{ scale: 1.025, y: -2, boxShadow: "0 0 18px rgba(212,167,44,0.45)", transition: MENU_HOVER_TRANSITION }}
            whileTap={{ scale: 0.985, transition: MENU_HOVER_TRANSITION }}
            className="col-span-2 w-[min(100%,22rem)] justify-self-center rounded-lg border border-dashed border-legacy/70 bg-navy/80 px-4 py-3 text-center text-base text-[#f3e3b5] shadow-lg shadow-black/20 backdrop-blur sm:px-6 sm:py-3 sm:text-lg"
          >
            🗡 Playable Prototype
          </motion.button>
          {/* The Vision: a scrollable page describing where the legend is */}
          {/* heading — the first-person endgame and the three bosses. */}
          <motion.button
            onClick={() => router.push("/vision")}
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.84 + MENU.length * 0.12 }}
            whileHover={{ scale: 1.025, y: -2, boxShadow: "0 0 18px rgba(196,130,255,0.45)", transition: MENU_HOVER_TRANSITION }}
            whileTap={{ scale: 0.985, transition: MENU_HOVER_TRANSITION }}
            className="w-full rounded-lg border border-dashed border-[#c482ff]/70 bg-navy/80 px-3 py-3 text-center text-sm text-[#c482ff] shadow-lg shadow-black/20 backdrop-blur sm:px-5 sm:text-base"
          >
            🌌 The Vision
          </motion.button>
          {/* Design review door: the redesign mocks live at /mock. */}
          <motion.button
            onClick={() => router.push("/mock")}
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + MENU.length * 0.12 }}
            whileHover={{ scale: 1.025, y: -2, boxShadow: "0 0 18px rgba(127,216,255,0.45)", transition: MENU_HOVER_TRANSITION }}
            whileTap={{ scale: 0.985, transition: MENU_HOVER_TRANSITION }}
            className="w-full rounded-lg border border-dashed border-[#7fd8ff]/70 bg-navy/80 px-3 py-3 text-center text-sm text-[#7fd8ff] shadow-lg shadow-black/20 backdrop-blur sm:px-5 sm:text-base"
          >
            ✦ Design Mocks
          </motion.button>
        </div>
      </motion.div>

      {/* Info panels */}
      {/* AnimatePresence lets things play an "exit" animation BEFORE React removes them. */}
      {/* Without it, a closed panel would just vanish instead of fading out. */}
      <AnimatePresence>
        {/* "panel && (...)" means: only show this if a panel is open (panel is not null). */}
        {panel && (
          // The dark see-through backdrop covering the whole screen (absolute inset-0).
          // Clicking it closes the panel.
          <motion.div
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => {
              setPanel(null);
            }}
          >
            {/* The panel card itself. It pops from 90% to full size. */}
            {/* e.stopPropagation() stops the click from "bubbling up" to the backdrop, */}
            {/* so clicking inside the card does NOT close it. */}
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-xl rounded-xl border-2 border-legacy bg-navy/95 p-8 font-serif text-white/90"
            >
              {/* Only the section matching the open panel is shown. */}
              {/* <> </> is a "fragment": it groups elements without adding an extra box. */}
              {/* The Legend: Andre's bio. */}
              {panel === "legend" && (
                <>
                  <h2 className="mb-4 font-display text-2xl text-legacy">The Legend of Andre</h2>
                  <p className="mb-3">Andre is a driven developer building his skills through i.c.stars while strengthening the leadership that will guide his next chapter.</p>
                  <p className="mb-3">As a Black professional in technology, his mission reaches past personal success: create opportunity, inspire future innovators, and leave a lasting impact.</p>
                  <p className="mb-3">His journey continues. His greatest achievements remain ahead.</p>
                  {/* The same portfolio the Legend book opens in-game, as a plain page. */}
                  <button
                    onClick={() => router.push("/portfolio")}
                    className="text-sm text-energy hover:underline"
                  >
                    📖 Open Andre's portfolio →
                  </button>
                </>
              )}
              {/* Future Kingdom: locked for now. It shares Andre's end goal, bringing */}
              {/* knowledge, resources, and opportunity to the South Side of Chicago. */}
              {panel === "future" && (
                <>
                  <h2 className="mb-4 font-display text-2xl text-legacy">🔒 Future Kingdom</h2>
                  <p className="mb-3">Defeat the three lords of the Forest — the Empire Revenant, the Nike Nightstalker, and the Shadow of Andre — to open the gate.</p>
                  <p>The destination: a South Side of Chicago with access to knowledge, resources, and opportunity, where every kid can see a world bigger than the walls around them.</p>
                </>
              )}
              {/* Continue: pick one of the two save slots. Each resumes
                  exactly where that hero stood when progress was last saved. */}
              {panel === "continue" && (
                <>
                  <h2 className="mb-4 font-display text-2xl text-legacy">Choose Your Legend</h2>
                  <p className="mb-4">Two cartridges, two heroes. Pick up right where either one left off.</p>
                  <div className="flex flex-col gap-3">
                    {listSlots().map(({ slot, save }) =>
                      save ? (
                        <motion.button
                          key={slot}
                          onClick={() => continueGame(slot)}
                          whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(79,209,255,0.5)" }}
                          whileTap={{ scale: 0.97 }}
                          className="rounded-lg border border-energy/60 bg-navy/70 px-5 py-3 text-left text-energy"
                        >
                          <span className="text-xs tracking-[0.25em] text-energy/60">SLOT {slot}</span>
                          <span className="block text-lg">{save.name} · Lv {save.level}</span>
                          <span className="block text-xs text-white/40">
                            Last played {new Date(save.savedAt).toLocaleDateString()}
                          </span>
                        </motion.button>
                      ) : (
                        <div key={slot} className="rounded-lg border border-dashed border-white/15 px-5 py-3 text-white/35">
                          <span className="text-xs tracking-[0.25em]">SLOT {slot}</span>
                          <span className="block text-lg italic">Empty — start a New Adventure to fill it</span>
                        </div>
                      ),
                    )}
                  </div>
                </>
              )}
              {/* Cloud Save: use your own account password. First login
                  creates an account; guest play still works. */}
              {panel === "cloud" && (
                <>
                  <h2 className="mb-4 font-display text-2xl text-legacy">☁ Cloud Save</h2>
                  {/* If the Supabase keys are not pasted in yet, say so honestly
                      instead of showing a login form that goes nowhere. */}
                  {!cloudReady() && (
                    <p className="text-white/80">
                      Cloud saves are not switched on yet. You can still play —
                      progress saves on this device like a cartridge.
                    </p>
                  )}
                  {cloudReady() && !cloudUser && (
                    <>
                      <p className="mb-4">
                        Sign in with your email and password. First time? A new account is created automatically.
                      </p>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          doLogin();
                        }}
                      >
                        <input
                          autoFocus
                          type="email"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="mb-3 w-full rounded-md border border-legacy/50 bg-black/40 px-4 py-2 text-lg text-[#f3e3b5] outline-none placeholder:text-white/30 focus:border-energy"
                        />
                        <input
                          type="password"
                          required
                          minLength={8}
                          value={loginPw}
                          onChange={(e) => setLoginPw(e.target.value)}
                          placeholder="Password"
                          className="w-full rounded-md border border-legacy/50 bg-black/40 px-4 py-2 text-lg text-[#f3e3b5] outline-none placeholder:text-white/30 focus:border-energy"
                        />
                        <p className="mt-2 text-sm text-white/50">Use a unique password for your account. Guest play remains available without signing in.</p>
                        {cloudError && <p className="mt-3 text-sm text-[#ffb3b3]">{cloudError}</p>}
                        <motion.button
                          type="submit"
                          disabled={cloudBusy}
                          whileHover={{ scale: 1.04, boxShadow: "0 0 24px rgba(212,167,44,0.6)" }}
                          whileTap={{ scale: 0.97 }}
                          className="mt-5 w-full rounded-lg border border-legacy/50 bg-legacy/20 px-6 py-3 text-lg text-[#f3e3b5] disabled:opacity-50"
                        >
                          {cloudBusy ? "Entering…" : "⚔ Enter the Legend"}
                        </motion.button>
                      </form>
                    </>
                  )}
                  {cloudReady() && cloudUser && (
                    <>
                      <p className="mb-3">
                        Signed in as <span className="text-energy">{cloudUser}</span>.
                      </p>
                      <p className="mb-4 text-white/80">
                        Your legend now syncs to the cloud every time you save — pick it up on any device.
                      </p>
                      {cloudError && <p className="mb-3 text-sm text-[#ffb3b3]">{cloudError}</p>}
                      <button onClick={doLogout} className="text-sm text-energy hover:underline">
                        Sign out (play as guest)
                      </button>
                    </>
                  )}
                </>
              )}
              {/* Credits: who made it and the tech stack. */}
              {panel === "credits" && (
                <>
                  <h2 className="mb-4 font-display text-2xl text-legacy">Credits</h2>
                  <p>Story, design and development: Andre Woolfolk</p>
                  <p className="mt-2 text-sm text-white/60">Built with Next.js, TypeScript, Tailwind CSS, Phaser 3, and Framer Motion. Made at i.c.stars Chicago.</p>
                </>
              )}
              <button onClick={() => setPanel(null)} className="mt-6 text-sm text-energy hover:underline">Close ✕</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
