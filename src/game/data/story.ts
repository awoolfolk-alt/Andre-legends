// ─────────────────────────────────────────────────────────────
// STORY DATA
// Every word the player reads lives here, NOT inside the scenes.
// WHY: when your story grows, you edit one file instead of hunting
// through game code. Scenes only ask for jv-marc's lines.
// Source: Andre's Master Resume / Experience Inventory → Story Bank.
// ─────────────────────────────────────────────────────────────

// An "interface" describes the shape of an object: which fields it has and
// their types. Every line of dialogue has a speaker and a text.
export interface DialogueLine {
  speaker: string;
  text: string;
}

// say() is a small helper so we don't have to type the speaker name on every
// line. "...texts" collects ANY number of strings into an array:
//   say("jv-marc", "Hi.", "Welcome.")
// becomes
//   [{ speaker: "jv-marc", text: "Hi." }, { speaker: "jv-marc", text: "Welcome." }]
const say = (speaker: string, ...texts: string[]): DialogueLine[] =>
  texts.map((text) => ({ speaker, text }));

// STORY is one big object holding every conversation in the game, grouped by
// name. To change what a character says, edit the text here. No game code
// needs to change.
export const STORY = {
  // The first thing jv-marc says. It also teaches the controls.
  elderIntro: say(
    "jv-marc",
    "Welcome, Traveler.",
    "You now walk the path of Andre Woolfolk.",
    "Three vampire lords guard this gothic forest: Empire, Nike, and the shadow of Andre himself.",
    "Explore the forest to find allies. Each one brings a different power to help you face the lords.",
    "N strikes quickly. M swings heavy. SHIFT dashes. Practice on the Doubt Totems first.",
  ),

  // What jv-marc says once all three lords are beaten.
  elderAfterBosses: say(
    "jv-marc",
    "You have faced every lesson and chosen how to carry them forward.",
    "The gate to the east is open. The Future Kingdom is waiting.",
    "Remember why he walks this road: not only to rise, but to come back and lift the South Side with him.",
  ),

  // Shown when the gate opens after three hard attempts at one boss.
  futureGateAssisted: say(
    "jv-marc",
    "Three times you stood against this challenge. Asking for another path is a strength, not a failure.",
    "The Future Kingdom gate is open. You may read Andre's portfolio now, or stay and keep exploring and fighting.",
  ),

  // The glowing book: Andre's About Me, read in-game.
  legendBook: say(
    "The Legend of Andre",
    "Andre is a driven developer building his skills through i.c.stars while strengthening the leadership that will guide his next chapter.",
    "He approaches every challenge as a chance to grow: thoughtful problem-solving, meaningful innovation.",
    "As a Black professional in technology, his mission reaches past personal success: create opportunity, inspire future innovators, and leave a lasting impact.",
    "His end goal: to bring knowledge, resources, and opportunity back to the South Side of Chicago, so his neighborhood can see a world bigger than its walls.",
    "His journey continues. His greatest achievements remain ahead.",
  ),

  // Memory stones: short, true moments from the Experience Inventory.
  memories: {
    nike: say(
      "Memory: Nike (2017–2023)",
      "Six years as a Footwear Athlete. He owned men's footwear, about 75% of the store's business.",
      "He planned launches for the Chicago Marathon, 2020 NBA All-Star, and Back to School, and helped onboard 50+ new hires.",
      "As a Customer Support Analyst he studied order history to spot fraud and escalated suspicious cases. That was his first taste of investigation.",
    ),
    rebuild: say(
      "Memory: Rebuild da Block (2021)",
      "He demolished and staged vacant houses so they could be rebuilt for families, seniors, and first-time buyers.",
      "Five houses. One neighborhood. Rebuilding his own community, one wall at a time.",
    ),
    marathon: say(
      "Memory: The Lakefront Walk",
      "Every year he walks from 67th and Lake Shore to Navy Pier.",
      "Not for a medal. For mental and physical wellness, and to show others that determination is a habit.",
    ),
    empire: say(
      "Memory: Empire Cooler (2023–2025)",
      "Delivery driver first, then promoted to Preventive Maintenance Technician.",
      "Five to six ice machines a day across Chicago, reading blueprints and troubleshooting machines he had never seen before.",
    ),
  },

  // Bosses transform lessons in Andre's Story Bank into original monsters.
  //   intro  = what the boss and jv-marc say before the fight
  //   lesson = what the player learns after winning
  bosses: {
    // THE EMPIRE REVENANT = Empire Cooler. Lesson: not knowing is not failing.
    empire: {
      // The "..." spread operator unpacks two say() arrays into ONE list,
      // so the boss speaks first and then jv-marc explains.
      intro: [
        ...say(
          "The Empire Revenant",
          "A machine breaks down. You have never seen its curse before.",
          "No map. No mentor. Solve it alone—or be buried in the gears.",
        ),
        ...say(
          "jv-marc",
          "At Empire Cooler, Andre was promoted from delivery driver to Preventive Maintenance Technician.",
          "He was sent into the field with less training than usual. He studied blueprints, asked experienced peers, and requested more support. Watch for the curse marks.",
        ),
      ],
      lesson: say(
        "Empire Lesson",
        "Not knowing a machine is not the same as being unable to learn it.",
        "Andre studied blueprints, learned from peers, and asked for support. You can do the same.",
        "POWER UNLOCKED: Courage Strike (Q). Act despite fear.",
      ),
    },
    // THE NIKE NIGHTSTALKER = Nike. Lesson: set boundaries.
    nike: {
      intro: [
        ...say(
          "The Nike Nightstalker",
          "You own your department. So carry everyone else's burden too.",
          "Say yes to every task, every rescue, every demand... until nothing is left.",
        ),
        ...say(
          "jv-marc",
          "At Nike, Andre owned his department and kept stepping in for a teammate who wasn't delivering.",
          "He gave more and more until he felt overwhelmed. Dodge the Nightstalker's burden marks and protect your boundaries.",
        ),
      ],
      lesson: say(
        "Nike Lesson",
        "Helping others is leadership. Carrying everything alone is not.",
        "Set expectations early. Offer support while keeping boundaries, so you can still deliver your own work.",
        "POWER UNLOCKED: Leadership Aura (E). Lift yourself up so you can lift others.",
      ),
    },
    // THE SHADOW OF ANDRE = self-doubt. Lesson: you are more than your doubts.
    self: {
      intro: [
        ...say(
          "The Shadow of Andre",
          "I am every doubt you carry, wearing your face.",
          "I have learned every trick your allies know. Can you face the parts of yourself you fear?",
        ),
        ...say(
          "jv-marc",
          "This last fight is about seeing the whole journey: asking questions, setting boundaries, and believing you can keep learning.",
          "Your allies' powers can help. You do not have to face the shadow alone.",
        ),
      ],
      lesson: say(
        "The Lesson You Keep",
        "You are more than your doubts and your hardest days.",
        "You have built skills, asked for help, supported others, and kept moving forward.",
        "The future is not a prize for perfection. It is a path you are allowed to keep building.",
      ),
    },
  },

  // Shown if the player reaches the east gate before it opens.
  futureGateLocked: say(
    "Future Kingdom Gate",
    "The gate opens when you defeat the three vampire lords, or after three hard attempts at a boss.",
  ),

  // A sealed preview of the ultimate, Legacy Surge (R). It awakens in the Future Kingdom.
  legacyMission: say(
    "Legacy Surge (sealed)",
    "This power only awakens in the Future Kingdom.",
    "It is not built for one hero. It is built to lift a whole neighborhood.",
  ),

  // ── Extra characters and visions (the expansion pass) ──

  // The Wayfinder: a mentor standing by the Doubt Totems, teaching combat rhythm.
  wayfinder: say(
    "Wayfinder",
    "The Totems are doubt given shape, Traveler. Strike them down; they always return. So does doubt. So will you.",
    "A rhythm to remember: slash, slash, slash — then dash clear before the world answers back.",
    "And when a boss dims and you see the opening — that is the moment. Strike true, and strike hard.",
  ),

  // Vision stones: not memories of the past, but pictures of where the road leads.
  visions: {
    icstars: say(
      "Vision: The Internship Kingdom",
      "Past the eastern hills, a tower of glass and late-night code reviews rises: i.c.stars.",
      "There, developers are forged into leaders — JavaScript, React, SQL, Agile — and every project ships to a real client.",
      "That kingdom is the next chapter of this legend. It is still being built.",
    ),
    southside: say(
      "Vision: The South Side, Transformed",
      "He sees it clearly: his neighborhood, lit up like this forest's glowing tree.",
      "Kids with laptops instead of limits. Mentors on every block. Opportunity growing like grass after rain.",
      "Every skill he masters is a brick for that future. That is why he trains.",
    ),
  },

  // The Future Kingdom itself, once the gate opens.
  kingdom: {
    // The hero's Future Self, waiting at the monument.
    futureSelf: say(
      "Future Self",
      "You made it. I was wondering when you'd catch up.",
      "Look around. This is what the lessons build: boundaries that protect the work, and courage that asks for more.",
      "The career is real now — defending networks, reading traffic, hunting threats. From spotting fraud to stopping intrusions.",
      "But you know the career was never the destination. Look west. Home is still waiting.",
      "Take this. Everything we've learned, given back at once. Use it to lift more than yourself.",
      "POWER UNLOCKED: Legacy Surge (R). A surge built to lift a whole neighborhood.",
    ),
    // The monument at the kingdom's heart: the mission statement, carved in gold.
    monument: say(
      "Monument of Legacy",
      "HERE STANDS THE PROMISE:",
      "To rise — and to return.",
      "To bring knowledge, resources, and opportunity back to the South Side of Chicago.",
      "To show every kid on those blocks that their world is bigger than its walls.",
      "THE LEGEND CONTINUES. The Internship Kingdom rises in the next chapter...",
    ),
    // jv-marc's voice, carried on the wind, when the hero first arrives.
    arrival: say(
      "jv-marc (on the wind)",
      "So. The forest's lessons took root after all.",
      "Walk to the monument at the heart of the kingdom. Someone is waiting to meet you.",
    ),
  },
// "as const" tells TypeScript this data is read-only, so no game code can
// accidentally change the story while the game is running.
} as const;
