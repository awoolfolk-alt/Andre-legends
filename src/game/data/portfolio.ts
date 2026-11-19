export const PORTFOLIO_OPEN_EVENT = "portfolio:open";
export const PORTFOLIO_CLOSE_EVENT = "portfolio:close";

export interface PortfolioSection {
  id: string;
  eyebrow: string;
  heading: string;
  paragraphs: readonly string[];
}

export const PORTFOLIO_SECTIONS: readonly PortfolioSection[] = [
  {
    id: "story",
    eyebrow: "THE STORY SO FAR",
    heading: "A career built through curiosity and service",
    paragraphs: [
      "I am a driven, detail-oriented developer building my technical skills and leadership through i.c.stars Cycle 60. As a Black professional in technology, I want to use what I learn to solve meaningful problems and help open doors for others.",
      "My path into technology grew from real-world experience. At Nike, I spent six years in footwear leadership, supported major launches, and helped onboard more than 50 teammates. Later, investigating suspicious order activity as a Customer Support Analyst introduced me to the careful, evidence-based work of cybersecurity.",
      "At Empire Cooler, I grew from delivery work into preventive maintenance. Learning to troubleshoot unfamiliar machines with blueprints and help from experienced coworkers taught me to stay patient, ask questions, and turn a difficult problem into a plan.",
      "I have also helped prepare vacant homes for rebuilding through Rebuild da Block. That work reflects a goal that matters to me: bringing knowledge, resources, and opportunity back to the South Side of Chicago.",
    ],
  },
  {
    id: "focus",
    eyebrow: "WHAT I AM BUILDING",
    heading: "Learning by making useful things",
    paragraphs: [
      "The Medline Operations Problem Navigator is a team project built around the Canary signal. It is a chance to practice turning a real operational need into a tool people can understand and use.",
      "Through i.c.stars, I am building experience with JavaScript, React, SQL, APIs, and Agile teamwork. I am also working on becoming more confident with networking and presentations, and on expressing technical ideas clearly.",
    ],
  },
  {
    id: "cybersecurity",
    eyebrow: "WHERE I AM HEADED",
    heading: "Growing toward cybersecurity",
    paragraphs: [
      "I have earned the Google Cybersecurity Professional Certificate and am developing practical skills in network analysis, security alerts, and SQL. I am working toward a future in an entry-level Cybersecurity or SOC Analyst role.",
      "The goal is bigger than a job title. I want to keep learning, become a stronger teammate and leader, and help make technology and opportunity more accessible in my community.",
    ],
  },
  {
    id: "community",
    eyebrow: "THE FUTURE KINGDOM",
    heading: "A future we build together",
    paragraphs: [
      "The Future Kingdom is my vision for a South Side of Chicago where people can reach knowledge, resources, and opportunity—and where young people can see a world bigger than the walls around them.",
      "This is an ongoing story, not a finished chapter. I will keep adding projects, lessons, and goals as I grow.",
    ],
  },
];

export const PORTFOLIO_PROJECTS = [
  {
    name: "Medline Operations Problem Navigator",
    tag: "i.c.stars · Team project",
    description:
      "A team project based on the Canary signal and focused on helping make operations problems easier to navigate. I am building my technical and collaboration skills as the project develops.",
  },
  {
    name: "The Legend of Andre: Rise of Legacy",
    tag: "Personal project · In progress",
    description:
      "A playable portfolio adventure that turns personal growth, work experience, and community goals into a world to explore. The Legend Book links to this standalone portfolio.",
  },
];

export const PORTFOLIO_SKILLS = [
  "JavaScript",
  "React",
  "SQL",
  "APIs",
  "Agile teamwork",
  "Problem solving",
  "Network analysis",
  "Security alerts",
  "Technical communication",
];

export const PORTFOLIO_CONTACTS = [
  { label: "i.c.stars email", href: "mailto:awoolfolk@icstars.org" },
  { label: "Email", href: "mailto:andrewoolfolkjr98@gmail.com" },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/andre-woolfolk-335243121/",
  },
  { label: "GitHub", href: "https://github.com/awoolfolk-alt" },
];
