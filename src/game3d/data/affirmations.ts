// ─────────────────────────────────────────────────────────────
// AFFIRMATION WORD BANK — every "spell" in the game lives here
// ─────────────────────────────────────────────────────────────
// WHY this file exists: words are CONTENT, not logic. The fight
// code (src/game3d/prototype.ts) should never hard-code a word —
// it asks this bank "give me 3 words from Round 2" and this file
// answers. That separation means you can add, remove, or retune
// words without touching a single line of game code.
//
// ═══ HOW TO ADD YOUR OWN WORDS ═══════════════════════════════
// 1. Pick the round whose THEME fits your word (see the round
//    table below — each round is a chapter of Andre's story).
// 2. Add one line to that round's array:
//      { word: "GRATEFUL", meaning: "Thankful for the journey." },
//    Rules: UPPERCASE, letters only (no spaces), 3–12 letters,
//    and a one-sentence meaning a player can learn from.
// 3. If the word is 7 letters or fewer and beginner-friendly,
//    also add its string to that round's ASSIST list below.
// 4. Done. The fight picks words randomly from each round, so
//    your word joins the rotation automatically — no other file
//    to edit. Never add anything to CONFIDENT's slot: the final
//    word is always the transformation, and there is only one.
// ═══════════════════════════════════════════════════════════════

export interface BankWord {
  word: string; // the spell itself — singular, UPPERCASE, no spaces
  meaning: string; // shown after it lands, so the player learns the lesson
}

export interface Round {
  id: 1 | 2 | 3 | 4;
  theme: string; // the chapter of the story this round represents
  words: BankWord[];
  // Assist mode: shorter words for a player who is struggling.
  // WHY a separate list? Difficulty should never mean changing the
  // LESSON — same themes, gentler spelling.
  assist: string[];
}

// ─── The four rounds ──────────────────────────────────────────
// WHY rounds? The fight against the Shadow is the whole story in
// miniature: you start by PROVING yourself (Nike, Empire Cooler),
// you GROW through the program (i.c.stars), you step up to LEAD,
// and you win by finally ACCEPTING yourself. Each round triggers
// at 25% health thresholds, so the story unfolds as he weakens.
//
// 47 words across the 4 rounds + CONFIDENT as the finale = 48.
export const ROUNDS: Round[] = [
  {
    id: 1,
    theme: "Proving",
    words: [
      { word: "CAPABLE", meaning: "You can handle challenges and succeed." },
      { word: "BRAVE", meaning: "Face fears with courage." },
      { word: "READY", meaning: "Prepared for what comes next." },
      { word: "FOCUSED", meaning: "Locked on the goal, undistracted." },
      { word: "FEARLESS", meaning: "Acting despite fear." },
      { word: "STRONG", meaning: "Inner resilience and strength." },
      { word: "WORTHY", meaning: "You are valued and deserving of good things." },
      { word: "STEADY", meaning: "Calm and reliable under pressure." },
      { word: "ALERT", meaning: "Watching, ready — the analyst's stance." },
      { word: "PREPARED", meaning: "You did the work before the test." },
      { word: "SHARP", meaning: "Quick-minded and precise." },
      { word: "BOLD", meaning: "Willing to take the swing." },
    ],
    assist: ["READY", "BRAVE", "BOLD", "SHARP", "ALERT"],
  },
  {
    id: 2,
    theme: "Growing",
    words: [
      { word: "RESILIENT", meaning: "Bouncing back from setbacks." },
      { word: "PATIENT", meaning: "Growth takes the time it takes." },
      { word: "CURIOUS", meaning: "Every question makes you stronger." },
      { word: "PERSISTENT", meaning: "You showed up again today." },
      { word: "UNSTOPPABLE", meaning: "Setbacks slow you; they don't stop you." },
      { word: "GROUNDED", meaning: "Connected to reality and yourself." },
      { word: "ADAPTABLE", meaning: "New tools, new rooms — you adjust." },
      { word: "DISCIPLINED", meaning: "Small daily reps compound." },
      { word: "EVOLVING", meaning: "Not finished, and that's the point." },
      { word: "TEACHABLE", meaning: "Feedback is fuel, not attack." },
      { word: "DRIVEN", meaning: "Fueled from the inside." },
      { word: "RISING", meaning: "Already higher than last year." },
    ],
    assist: ["RISING", "DRIVEN", "PATIENT", "CURIOUS"],
  },
  {
    id: 3,
    theme: "Leading",
    words: [
      { word: "ADVOCATE", meaning: "You speak up for people who aren't in the room." },
      { word: "MENTOR", meaning: "You shorten someone else's climb." },
      { word: "BUILDER", meaning: "You make things that outlast the day." },
      { word: "COURAGEOUS", meaning: "You go first." },
      { word: "VISIONARY", meaning: "You see the block as it could be." },
      { word: "GUIDE", meaning: "You've walked it, so you can show it." },
      { word: "PROTECTOR", meaning: "The whole point of the shield." },
      { word: "HONEST", meaning: "Straight answers, even when hard." },
      { word: "GENEROUS", meaning: "Knowledge shared is knowledge squared." },
      { word: "RELIABLE", meaning: "People can build on your word." },
      { word: "INSPIRING", meaning: "Your climb gives others a map." },
      { word: "STEADFAST", meaning: "Still standing when it's hard." },
    ],
    assist: ["GUIDE", "HONEST", "MENTOR"],
  },
  {
    id: 4,
    theme: "Accepting",
    words: [
      { word: "LOVED", meaning: "You are cherished and valued." },
      { word: "ENOUGH", meaning: "You were always enough." },
      { word: "PROUD", meaning: "Let yourself feel the win." },
      { word: "HEALED", meaning: "The past is a lesson, not a cage." },
      { word: "LEGACY", meaning: "What you build outlives you." },
      { word: "WHOLE", meaning: "Nothing about you is missing." },
      { word: "SEEN", meaning: "Your work and worth are visible." },
      { word: "VALUED", meaning: "The room is better with you in it." },
      { word: "FORGIVEN", meaning: "Old mistakes don't get a vote." },
      { word: "ROOTED", meaning: "From the South Side, for the South Side." },
      { word: "PEACEFUL", meaning: "The noise can stop now." },
    ],
    assist: ["LOVED", "ENOUGH", "PROUD", "WHOLE", "SEEN"],
  },
];

// ─── The final word ───────────────────────────────────────────
// WHY separate from the rounds? CONFIDENT is not drawn randomly.
// It is ALWAYS the last word of the fight — typing it is what
// transforms Self Doubt into Confidence. One slot, one word.
export const FINAL_WORD: BankWord = {
  word: "CONFIDENT",
  meaning: "Trust in your abilities and decisions.",
};

// The original 8-word fight, in story order. The current prototype
// still uses this exact sequence; the full round system replaces it
// in the world build. Kept here so there is ONE source of truth.
export const ORIGINAL_EIGHT: string[] = [
  "CAPABLE", "BRAVE", "STRONG", "WORTHY",
  "GROUNDED", "RESILIENT", "LOVED", "CONFIDENT",
];

// Flat lookup: any word → its meaning (rounds + final word).
// WHY a Map? O(1) lookup and impossible to get two copies of a
// word drifting out of sync — the bank stays the single truth.
const ALL_WORDS: BankWord[] = [...ROUNDS.flatMap((r) => r.words), FINAL_WORD];
const MEANINGS = new Map(ALL_WORDS.map((w) => [w.word, w.meaning]));

export function meaningOf(word: string): string {
  return MEANINGS.get(word) ?? "A truth worth saying out loud.";
}

// ─── The Shadow's lies and their counter-words ────────────────
// WHY doubts as data? During the fight the Shadow taunts Andre
// with a lie; the ANSWER is a word from the bank. Several of these
// come straight from Andre's real story — which is the whole point
// of the game. 4 were locked in by Andre; the rest are drafts he
// can edit freely (they're content, like everything else here).
export interface Doubt {
  lie: string; // what the Shadow hisses
  counter: string; // the word that answers it (must exist in the bank)
  source?: string; // where in Andre's story this comes from
}

export const DOUBTS: Doubt[] = [
  // ── Locked by Andre ──
  { lie: "SAY YES TO EVERYTHING", counter: "BOUNDARIES", source: "The Overload" },
  { lie: "DON'T SPEAK UP", counter: "ADVOCATE", source: "Empire Cooler" },
  { lie: "YOUR BLOCK CAN'T CHANGE", counter: "REBUILD", source: "South Side" },
  { lie: "NO ONE CARES", counter: "COMMUNITY", source: "The team" },
  // ── Drafted from Andre's story (edit freely) ──
  { lie: "YOU'RE NOT READY", counter: "PREPARED", source: "Night-shift goal" },
  { lie: "YOU DON'T BELONG IN THIS ROOM", counter: "WORTHY", source: "i.c.stars" },
  { lie: "YOU'LL QUIT LIKE BEFORE", counter: "PERSISTENT" },
  { lie: "THE NIGHT SHIFT WILL BREAK YOU", counter: "STEADY", source: "SOC dream" },
  { lie: "YOU'RE TOO FAR BEHIND", counter: "CURIOUS" },
  { lie: "FAILING MEANS YOU'RE WEAK", counter: "RESILIENT" },
  { lie: "NO ONE FROM YOUR BLOCK MAKES IT", counter: "LEGACY", source: "South Side" },
  { lie: "YOU HAVE TO DO THIS ALONE", counter: "MENTOR", source: "The team" },
  { lie: "YOUR PAST DEFINES YOU", counter: "HEALED" },
  { lie: "YOU'RE NOT SMART ENOUGH", counter: "CAPABLE" },
  { lie: "PLAYING IT SAFE KEEPS YOU SAFE", counter: "COURAGEOUS" },
  { lie: "REST IS WEAKNESS", counter: "GROUNDED", source: "Wellness walks" },
  { lie: "YOU'LL NEVER FINISH", counter: "UNSTOPPABLE" },
  { lie: "WHO ARE YOU TO LEAD?", counter: "BUILDER" },
];

// NOTE: two counter-words above (BOUNDARIES, REBUILD, COMMUNITY)
// live OUTSIDE the four rounds on purpose — they answer specific
// lies rather than belonging to a story chapter. If you add a new
// doubt, its counter must either be a bank word or listed here:
export const EXTRA_COUNTERS: BankWord[] = [
  { word: "BOUNDARIES", meaning: "No is a complete sentence." },
  { word: "REBUILD", meaning: "Brick by brick, the block rises." },
  { word: "COMMUNITY", meaning: "Somebody always cared. You do too." },
];
