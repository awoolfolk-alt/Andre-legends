import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);
const isoDate = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), "Use a real calendar date.");

export const CardSchema = z.object({
  id: nonEmptyString,
  district: z.enum(["hardware", "network", "security"]),
  objective: nonEmptyString,
  source: nonEmptyString,
  game: nonEmptyString,
  format: z.string().regex(/^F\d+$/, "Use a quiz format code such as F7."),
  difficulty: z.number().int().min(1).max(3),
  prompt: nonEmptyString,
  options: z.array(nonEmptyString).default([]),
  answer: z.array(nonEmptyString).min(1),
  selectCount: z.number().int().positive().optional(),
  accept: z.array(nonEmptyString).default([]),
  requiredKeywords: z.array(nonEmptyString).default([]),
  requiresRationale: z.boolean().default(false),
  explanation: nonEmptyString,
  clueWords: z.array(nonEmptyString).default([]),
  trap: z.string().nullable().optional(),
  versions: z.record(z.string(), z.string()).nullable().optional(),
  sourceUrl: z.string().url().refine((value) => value.startsWith("https://"), "Source links must use HTTPS.").optional(),
  tags: z.array(nonEmptyString).default([]),
}).strict();

const LabCheckSchema = z.object({
  type: z.enum([
    "exists",
    "notExists",
    "fileContains",
    "permissionsEqual",
    "ownerEqual",
    "userExists",
    "outputContains",
    "outputCount",
    "queryResultEquals",
    "filterMatches",
    "ruleAlertCount",
  ]),
  path: z.string().optional(),
  kind: z.enum(["file", "dir"]).optional(),
  text: z.string().optional(),
  value: z.string().optional(),
  count: z.number().int().nonnegative().optional(),
}).passthrough().superRefine((check, context) => {
  const requireField = (field: string, value: unknown) => {
    if (value === undefined || value === "") {
      context.addIssue({
        code: "custom",
        message: `Check type "${check.type}" requires "${field}".`,
        path: [field],
      });
    }
  };

  if (["exists", "notExists", "fileContains", "permissionsEqual", "ownerEqual"].includes(check.type)) {
    requireField("path", check.path);
  }
  if (check.type === "fileContains" || check.type === "outputContains") {
    requireField("text", check.text);
  }
  if (check.type === "userExists") requireField("value", check.value);
  if (["outputCount", "ruleAlertCount"].includes(check.type)) requireField("count", check.count);
});

export const LabSchema = z.object({
  id: nonEmptyString,
  game: nonEmptyString,
  engine: z.enum(["terminal", "powershell", "packet", "sql", "inbox", "world", "siem"]),
  title: nonEmptyString,
  brief: nonEmptyString,
  fs: z.string().optional(),
  scenario: nonEmptyString,
  goalTree: z.string().optional(),
  checkpoints: z.array(z.object({
    id: nonEmptyString,
    text: nonEmptyString,
    check: LabCheckSchema,
  }).strict()).min(1),
  hints: z.array(nonEmptyString).default([]),
  followUpQuiz: nonEmptyString,
  objectives: z.array(nonEmptyString).min(1),
}).strict();

export const ScenarioSchema = z.object({
  id: nonEmptyString,
  title: nonEmptyString,
  surface: nonEmptyString,
  setting: nonEmptyString,
  story: nonEmptyString,
  actions: z.array(z.object({
    text: nonEmptyString,
    rating: z.enum(["best", "acceptable", "risky"]),
    feedback: nonEmptyString,
  }).strict()).min(2),
  typeAnswers: z.object({
    attack: z.array(nonEmptyString).min(1),
    redFlags: z.array(nonEmptyString).min(1),
  }).strict(),
  objectives: z.array(nonEmptyString).min(1),
}).strict().superRefine((scenario, context) => {
  for (const rating of ["best", "acceptable", "risky"] as const) {
    if (!scenario.actions.some((action) => action.rating === rating)) {
      context.addIssue({
        code: "custom",
        message: `A scenario must include a "${rating}" action.`,
        path: ["actions"],
      });
    }
  }
});

export const BriefSchema = z.object({
  id: nonEmptyString,
  title: nonEmptyString,
  district: z.enum(["hardware", "network", "security"]),
  objective: nonEmptyString,
  keyTerms: z.array(z.object({
    term: nonEmptyString,
    def: nonEmptyString,
  }).strict()).min(1),
  example: nonEmptyString,
  diagram: nonEmptyString.optional(),
  watchOut: z.array(nonEmptyString).default([]),
}).strict();

const IncidentStageSchema = z.discriminatedUnion("stage", [
  z.object({
    stage: z.literal("detect"),
    surface: nonEmptyString,
    data: nonEmptyString,
  }).strict(),
  z.object({
    stage: z.literal("investigate"),
    lab: nonEmptyString,
  }).strict(),
  z.object({
    stage: z.literal("respond"),
    choices: nonEmptyString,
  }).strict(),
  z.object({
    stage: z.literal("debrief"),
    csfRooms: z.array(nonEmptyString).min(1),
  }).strict(),
  z.object({
    stage: z.literal("report"),
    template: nonEmptyString,
    modelReport: nonEmptyString,
  }).strict(),
  z.object({
    stage: z.literal("lessons"),
    question: nonEmptyString,
    upgrades: z.array(nonEmptyString),
  }).strict(),
]);

export const IncidentCaseSchema = z.object({
  id: nonEmptyString,
  title: nonEmptyString,
  stages: z.array(IncidentStageSchema).min(1),
}).strict();

export const PlayerProgressSchema = z.object({
  playerId: nonEmptyString,
  wpmHistory: z.array(z.object({
    date: isoDate,
    wpm: z.number().nonnegative(),
    accuracy: z.number().min(0).max(1),
  }).strict()),
  cards: z.record(z.string(), z.object({
    level: z.number().int().min(0),
    nextReview: isoDate,
    misses: z.number().int().nonnegative(),
  }).strict()),
  weakSpots: z.array(nonEmptyString),
  fence: z.object({
    tiles: z.number().int().nonnegative(),
    cracked: z.number().int().nonnegative(),
    tier: nonEmptyString,
  }).strict(),
  portfolio: z.array(nonEmptyString),
}).strict();

export type Card = z.infer<typeof CardSchema>;
export type Lab = z.infer<typeof LabSchema>;
export type Scenario = z.infer<typeof ScenarioSchema>;
export type Brief = z.infer<typeof BriefSchema>;
export type IncidentCase = z.infer<typeof IncidentCaseSchema>;
export type PlayerProgress = z.infer<typeof PlayerProgressSchema>;
