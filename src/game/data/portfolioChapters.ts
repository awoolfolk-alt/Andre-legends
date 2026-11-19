// ─────────────────────────────────────────────────────────────
// PORTFOLIO CHAPTERS — Andre's living portfolio, mirrored into the game.
//
// This is the SAME story told on the standalone portfolio site
// (awoolfolk-alt.github.io/awoolfolk), carried into the Legend so the
// altar in Safe Town has somewhere real to take you: Prologue, five
// chapters, and the Epilogue. Each chapter is a set of "quests"
// (reflections). A quest with text is CLEAR; an empty one is still
// IN PROGRESS — the portfolio is honest about being unfinished.
//
// The text fields hold small bits of HTML (<b>, <i>, <ul>, <br>) on
// purpose: they are Andre's own static words, never user input, so
// rendering them as HTML is safe and keeps the formatting he wrote.
// ─────────────────────────────────────────────────────────────

export interface PortfolioLink {
  label: string;
  url: string;
}

export interface PortfolioQuest {
  title: string;
  prompt: string; // the question being answered (shown while unfinished)
  text: string; // the answer (HTML); empty = still in progress
  links?: PortfolioLink[];
  bonus?: boolean;
}

export interface PortfolioGroup {
  name?: string; // shrine name (Wellness chapter); absent = plain group
  sub?: string;
  quests: PortfolioQuest[];
}

export interface PortfolioChapter {
  id: string;
  tag: string; // "CHAPTER 1 · LEADERSHIP"
  region: string; // the game-world name for this chapter
  section: string; // "Where I Was" / "Where I Am" / "Where I'm Going"
  accent: string; // chapter color
  intro: string;
  boss?: { name: string; text: string };
  groups: PortfolioGroup[];
}

export const PORTFOLIO_PROFILE = {
  name: "Andre Woolfolk",
  title: "Developer in training · Future SOC Analyst · i.c.stars C60",
  email: "awoolfolk@icstars.org",
  github: "https://github.com/awoolfolk-alt",
  linkedin: "https://www.linkedin.com/in/andre-woolfolk-335243121/",
  // The standalone portfolio site (home of the playable mini-games)
  site: "https://awoolfolk-alt.github.io/awoolfolk/",
};

export const PORTFOLIO_CHAPTERS: PortfolioChapter[] = [
  {
    id: "prologue", tag: "PROLOGUE", region: "Forest of Origins", section: "Where I Was",
    accent: "#58c48a",
    intro: "I'm a driven, detail-oriented developer building my skills through i.c.stars, where I'm growing my technical foundation while sharpening the leadership instincts that will define the next stage of my career. As a Black professional in tech, I bring strong problem-solving skills, a commitment to clean, thoughtful code, and a perspective shaped by resilience and the drive to open doors, for myself and for others coming up behind me. Before i.c.stars, I learned my biggest lessons the hard way. In the game, those lessons become the first bosses you face.",
    groups: [{ quests: [
      { title: "The Overload", prompt: "",
        text: "At Nike, I carried the work of two departments. I kept saying yes until I had nothing left. The lesson: <b>set boundaries.</b> In the game, beating The Overload unlocks <i>Leadership Aura</i>." },
      { title: "The Unknown Machine", prompt: "",
        text: "At Empire Cooler, I was supposed to get six months of training and got three. I could have stayed quiet. The lesson: <b>advocate for yourself.</b> In the game, beating The Unknown Machine unlocks <i>Courage Strike</i>." },
      { title: "The Day Before i.c.stars", prompt: "Who were you the day before i.c.stars started? What were you carrying, and what did you want?",
        text: "I walked into i.c.stars with a Google Cybersecurity Certificate I earned in 2025 while working full time, years of customer service and field experience, and one question: could someone like me build a career protecting people in tech? I didn't have a tech degree, and I didn't see many people who looked like me in the field. I came anyway, because I'd tell any nervous new hire I ever trained that they were more ready than they thought." },
    ]}],
  },

  {
    id: "leadership", tag: "CHAPTER 1 · LEADERSHIP", region: "Leadership Hall", section: "Where I Am",
    accent: "#e8b64a",
    intro: "How I showed up, stepped up, and led, through action, projects, and reflection.",
    groups: [{ quests: [
      { title: "Team Week", prompt: "What role did you play on your team? Describe one moment you led, or chose to follow. What would you do differently?",
        text: "Team Week showed me two things about myself. My relationship skills work well with groups, and my public speaking still needed work. When a few teammates on Team Canary got into a dispute, I realized I didn't yet have the tools to calm it down. So I set a goal for the next 13 weeks: be more proactive with my communication. I practiced my pitch with alumni and staff to break the nerves, and I committed to presenting without saying \"um.\" My first step was simple: speak my mind, with care, in every group conversation." },
      { title: "The Gifts Project", prompt: "What gift did you find in yourself or someone else? What did you deliver?", text: "" },
      { title: "Community Role", prompt: "What was your community role? Name one thing you did that made the cohort better.", text: "" },
      { title: "Feedback & Planetary Responsibility", prompt: "Share one piece of feedback that changed how you work. How did you respond, and what did you do after?",
        text: "At i.c.stars I named my planetary responsibility: <b>to encourage</b>. To me that means putting courage into people so they can take the next step themselves. I do it through five gifts: empathy, confidence, trust, knowledge, and plain-language communication. The hardest lesson behind it came from Nike. I tried to carry a coworker until I burned out, and I learned that encouraging someone means <i>helping them stand, not carrying them forever</i>." },
      { title: "Tea Host", prompt: "Who was your Tea Guest (role or industry)? How did you prepare? What stuck with you?",
        text: "<p>As a Tea Host, I welcomed Kevin M. Gates, a fellow i.c.stars alum and Technology Manager for Americas Global Partner Solutions at Microsoft, where he leads a team of Solution Architects helping partners build modern applications with AI and Azure. To prepare, I went beyond his résumé and spent time on dreaddontdie, a personal site he has designed and built himself since 2001. It's home to his photography, which he also shares through Adobe Stock and iStock, along with his music, videos, and a \"vault\" of past projects.</p><p>I was especially drawn to the path that came before tech. Kevin spent about four and a half years as a line cook, first at Bertucci's, where he started as a busboy in high school and worked his way up to the brick-oven pizza station, and then at the House of Blues, where he became a senior line cook. During downtime in that kitchen, he taught himself HTML after learning about i.c.stars. It was the year 2000, when the resources I take for granted today, like online tutorials, video courses, and AI tools, weren't readily available. He built a website for Prologue High School as part of his application and turned it in on a floppy disk.</p><p>After going through my own cycle, I understand how much persistence it takes to learn this work, and I admire how much more it took him to do it with so little to lean on. Like my own years on the Nike sales floor and in the field at Empire Cooler, his story reminds me that the discipline of hands-on work carries straight into technology. His determination has become part of my motivation: if he could build that from a kitchen, I can keep pushing with what I have.</p>",
        links: [{ label: "Kevin's LinkedIn", url: "https://www.linkedin.com/in/kevinmgates/" }, { label: "dreaddontdie.com", url: "https://www.dreaddontdie.com/" }] },
      { title: "Tea Debriefs", prompt: "One lesson from a debrief or cohort discussion you still think about, and why.", text: "" },
      { title: "Dream Speech", prompt: "What did you dream out loud? Were you recognized as a business, service, or civic leader? Add a quote.",
        text: "My Dream Speech takes place in Chicago in 2051, where I'm accepting the <b>Courage Builder Award for Community Technology Leadership</b>. It traces my path from the Nike sales floor to SOC Analyst, Threat Intelligence Analyst, Security Engineer, and CISO by 2038. Then it goes home: the Open Door Center, a safe haven I build in an abandoned factory on the far South Side, with cybersecurity classes, mentoring, wellness programs, and recreation for kids who never had them close by.<br><br><i>\"If you have the courage to speak it, you have the power to create it.\"</i>" },
      { title: "CIVICs Project", prompt: "What did your project address? What did you learn, and how will you use it right after the internship?", text: "" },
    ]}],
  },

  {
    id: "business", tag: "CHAPTER 2 · BUSINESS", region: "Consulting Guild", section: "Where I Am",
    accent: "#3fd0c0",
    intro: "My growth as a business thinker and emerging consultant.",
    groups: [{ quests: [
      { title: "The Client Project: Medline OPN", prompt: "The Medline Operations Problem Navigator: what business problem it solves, how your team approached it, and your individual role.", text: "" },
      { title: "Forming the Consulting Company", prompt: "Your company name, how you split roles, what was hard, and how you worked through it.", text: "" },
      { title: "The RFP Proposal", prompt: "What the RFP asked for, what you proposed, and your biggest takeaway. Link the deck.", text: "" },
      { title: "Company Engagement Days", prompt: "Pick one company (Accenture, Salesforce...). What did you learn that changed how you see the industry?", text: "" },
      { title: "Mentors, Clients & Guest Consultants", prompt: "How you received feedback, how you adapted your team's approach, and what you learned about professionalism.", text: "" },
      { title: "Allskates & External Feedback", prompt: "One piece of outside feedback and what you did with it.", text: "" },
    ]}],
  },

  {
    id: "technology", tag: "CHAPTER 3 · TECHNOLOGY", region: "Innovation Forge", section: "Where I Am",
    accent: "#ff9a4a",
    intro: "What I built, how I built it, and what I learned along the way.",
    groups: [{ quests: [
      { title: "Web App Walkthrough: The Legend of Andre", prompt: "",
        text: "My portfolio is also a playable game. <b>The problem it solves:</b> recruiters see hundreds of portfolios that look the same, so this one lets them <i>experience</i> my story.<ul><li><b>Stack:</b> Next.js, TypeScript, Tailwind CSS, Phaser 3, Framer Motion</li><li>A combat input system that buffers keys so attacks feel responsive</li><li>A dash on SHIFT with after-images and a short invulnerability window</li><li>One reusable dialogue system for every NPC and story moment</li><li>Cloud saves: log in on any computer and your legend follows you</li></ul>",
        links: [{ label: "Game repo", url: "https://github.com/awoolfolk-alt/awoolfolk" }] },
      { title: "Geek Week", prompt: "SQL, Excel, and hot keys: starting score vs. ending score. What did coaching show you about how you learn?", text: "" },
      { title: "When Coding \"Clicked\"", prompt: "The exact moment something made sense, or the bug that almost beat you and how you beat it.", text: "" },
      { title: "Debugging & Asking Good Questions", prompt: "What did a bad question from you look like in week 1? What does a good one look like now?", text: "" },
      { title: "GitHub, Branching & Version Control", prompt: "How your team used branches and pull requests. Link a PR you're proud of.", text: "" },
      { title: "Cloud Tools", prompt: "How you used Office 365 and Google Drive to keep versions and share work.", text: "" },
      { title: "Business Tools", prompt: "One real example each: Trello, Teams, Zoom, Outlook, Windows Explorer.", text: "" },
      { title: "Typing Speed", prompt: "Starting WPM, current WPM, and did you hit 40+?", text: "" },
      { title: "5-Hour Minimums", prompt: "How you hit your 5-hour minimums and what you spent that time on.", text: "" },
      { title: "Side Quest: Mini-Games", prompt: "", bonus: true,
        text: "<p>One of my first JavaScript builds grew into four playable mini-games — Tic-Tac-Toe, Snake, Breakout, and Arena Survival. They live on the standalone portfolio site:</p>",
        links: [{ label: "Play the mini-games", url: "https://awoolfolk-alt.github.io/awoolfolk/" }] },
    ]}],
  },

  {
    id: "wellness", tag: "CHAPTER 4 · WELLNESS", region: "Wellness Sanctuary", section: "Where I Am",
    accent: "#b48cff",
    intro: "A hero is only as strong as the habits behind him. Four shrines: wealth, heart, mind, and body.",
    boss: { name: "FINAL BOSS: SELF DOUBT", text: "In the game, the last boss isn't a monster. It's Self Doubt, and beating it turns it into Confidence. The Shrine of the Heart tells the real story behind that fight." },
    groups: [
      { name: "Shrine of Wealth", sub: "Financial Wellness", quests: [
        { title: "My Financial Goals", prompt: "Your short- and long-term financial goals. Bonus: a salary-based budget for after i.c.stars.", text: "" },
        { title: "The Money Story I Want to Tell", prompt: "Your spending patterns, what you learned, or techniques you're using to raise your credit score.", text: "" },
      ]},
      { name: "Shrine of the Heart", sub: "Emotional Wellness", quests: [
        { title: "Defeating Self Doubt", prompt: "How you've challenged negative self-talk or imposter syndrome. Be specific about one moment.",
          text: "When I first got interested in cybersecurity, doubt crept in fast. I didn't have a tech degree, and I didn't see many people who looked like me in the field. So I asked myself what I'd tell one of the nervous new hires I used to train at Nike: you're more ready than you think, and the only way to find out is to take the first step. I said those words to myself and meant them. That's how I earned my Google Cybersecurity Certificate while working full time, and it's why Self Doubt is the final boss of my game." },
        { title: "Letter to My Younger Self", prompt: "Bonus: what would you tell your younger self? Or list your affirmations.", text: "" },
      ]},
      { name: "Shrine of the Mind", sub: "Mental Wellness", quests: [
        { title: "My Mental Wellness Toolbox", prompt: "The coping strategies that work for you, and how you handled stress or burnout.",
          text: "My biggest stress pattern is being a people pleaser. At Nike I carried a coworker who wasn't meeting his goals, and when my managers gave me more instead of fixing the problem, I burned out. My toolbox now:<ul><li>Set boundaries early, and say clearly how I can help</li><li>Check in with someone I trust for a reality check when I notice the pattern</li><li>Block time on my calendar for what matters most</li><li>Remember that a \"no\" is information, not a verdict</li></ul>" },
        { title: "How I Kept My Mind Right During Geek Week", prompt: "Bonus: what got you through the hardest week?", text: "" },
      ]},
      { name: "Shrine of the Body", sub: "Physical Wellness", quests: [
        { title: "My Physical Routine", prompt: "A routine you started or improved, or a habit tracker (water, sleep, steps).", text: "" },
        { title: "I Am My Own Health Advocate", prompt: "Bonus: local resources you use, or health SMART goals for after the internship.", text: "" },
      ]},
    ],
  },

  {
    id: "career", tag: "CHAPTER 5 · CAREER PLANNING", region: "Future Kingdom", section: "Where I'm Going",
    accent: "#5ad1ff",
    intro: "The gates open after the lessons are learned. This is the future I'm building.",
    groups: [{ quests: [
      { title: "The Road Ahead", prompt: "Long-term tech goal, leadership or entrepreneur goal, and business or consulting goal.",
        text: "<ul><li><b>Next role:</b> SOC Analyst I. I want to protect the systems people depend on, and I've already earned my Google Cybersecurity Certificate as my first step.</li><li><b>Long-term tech goal:</b> grow from SOC Analyst to Threat Intelligence Analyst to Security Engineer, then Chief Information Security Officer by 2038.</li><li><b>Leadership & community goal:</b> build the Open Door Center on Chicago's South Side, so every kid in my neighborhood has a mentor and knows they have options.</li></ul>" },
      { title: "Career Director & Program Manager", prompt: "One conversation that changed your plan or your confidence.",
        text: "My Program Director led our Personal Board of Directors workshop, which pushed me to move from reflection into action. I built my board around my vision: a Chairman to keep me focused, a Visionary to help me think a few moves ahead, a support person for honest check-ins, a Medline mentor to hold me accountable, and a future CISO connection. I also named my \"Must Not Have\": the people-pleaser trap, which I set a boundary around instead of inviting it in." },
      { title: "Employer Partner Workshops", prompt: "What Accenture, Capital One, or Salesforce taught you about what employers want.", text: "" },
      { title: "Resume & Job-Search Prep", prompt: "The feedback you got on your resume and what you changed.",
        text: "My resume changed a lot during i.c.stars. My early drafts tried to cover everything: cybersecurity, IT operations, and project management. Through Resume Rockstars and revisions, I focused it on one target: <b>SOC Analyst I</b>. I rewrote my experience to show analyst skills: investigating sensitive refund and fraud claims at Nike, documenting and escalating cases, and diagnosing equipment under pressure at Empire Cooler. I also added my hands-on lab practice with SIEM, Wireshark, Suricata IDS, SQL, and Linux." },
      { title: "My Brand & Values", prompt: "Three values you want employers to see, with one sentence of proof each.",
        text: "My brand is <b>people-first, action-driven security</b>. My values come from my five gifts of encouragement:<ul><li><b>Empathy:</b> most people are telling the truth and deserve help, which I learned reviewing thousands of customer claims.</li><li><b>Trust:</b> I document everything so the next person can follow my steps.</li><li><b>Plain-language communication:</b> I explain problems so clearly that people stop being afraid to ask questions.</li></ul>" },
      { title: "The Roles I Want, and Why", prompt: "Why SOC Analyst (and any other roles) fit your interests, skills, and purpose.",
        text: "<b>SOC Analyst</b> fits how I already think. On Nike's online support team, I investigated refund and missing-package claims. I checked order histories and account activity, looked for patterns (like one address on five accounts), documented what I found, and escalated suspicious cases to IT and compliance. That's an analyst's job: question what you see, follow the evidence, spot patterns, and know when to raise your hand. Long term, I want to be a <b>CISO</b>, because leaders who explain risk in plain language make room for everyone at the table." },
    ]}],
  },

  {
    id: "legacy", tag: "EPILOGUE", region: "Legacy Temple", section: "Why It Matters",
    accent: "#e8b64a",
    intro: "As a Black professional in technology, my mission goes beyond my own success. I want to give back to the South Side community I come from by opening doors in tech for the people who come after me.",
    groups: [{ quests: [
      { title: "My Mission Statement", prompt: "Your mission in one or two sentences, in your own words.",
        text: "My mission is to encourage: to put courage into people so they can take the next step themselves. I'll do that by protecting people through cybersecurity and by opening doors in tech for the young people in the South Side neighborhood I come from." },
    ]}],
  },
];
