import briefs from "./seeds/briefs.json";
import cards from "./seeds/cards.json";
import cases from "./seeds/cases.json";
import labs from "./seeds/labs.json";
import scenarios from "./seeds/scenarios.json";
import { loadContent, loadContentList } from "./load";
import {
  BriefSchema,
  CardSchema,
  IncidentCaseSchema,
  LabSchema,
  PlayerProgressSchema,
  ScenarioSchema,
  type PlayerProgress,
} from "./schemas";

export const CURRICULUM_CONTENT = {
  briefs: loadContentList(BriefSchema, briefs, "seeds/briefs.json"),
  cards: loadContentList(CardSchema, cards, "seeds/cards.json"),
  cases: loadContentList(IncidentCaseSchema, cases, "seeds/cases.json"),
  labs: loadContentList(LabSchema, labs, "seeds/labs.json"),
  scenarios: loadContentList(ScenarioSchema, scenarios, "seeds/scenarios.json"),
};

export function createEmptyProgress(playerId: string): PlayerProgress {
  return loadContent(PlayerProgressSchema, {
    playerId,
    wpmHistory: [],
    cards: {},
    weakSpots: [],
    fence: { tiles: 0, cracked: 0, tier: "starter" },
    portfolio: [],
  }, "new player progress");
}

export {
  IncidentCaseSchema as CaseSchema,
  BriefSchema,
  CardSchema,
  IncidentCaseSchema,
  LabSchema,
  PlayerProgressSchema,
  PlayerProgressSchema as ProgressSchema,
  ScenarioSchema,
} from "./schemas";
export type {
  IncidentCase as Case,
  Brief,
  Card,
  IncidentCase,
  Lab,
  PlayerProgress,
  PlayerProgress as Progress,
  Scenario,
} from "./schemas";
export { ContentValidationError, loadContent, loadContentList } from "./load";
export {
  dueCardIds,
  emptyReviewStore,
  readReviewStore,
  recordCardAnswer,
  REVIEW_STORAGE_KEY,
  STARTING_WEAK_SPOTS,
  weakCardIds,
} from "./review";
export type { ReviewState, ReviewStore } from "./review";
export { interactionForFormat, scoreQuizResponse } from "./quiz";
export { buildExamDeck } from "./exam";
export type { QuizResponse, QuizResult } from "./quiz";
export { createTerminalSession, executeTerminalCommand, tokenize } from "./terminal";
export type { TerminalResult, TerminalSession, VirtualNode } from "./terminal";
export { PHISH_MESSAGES } from "./phish";
export type { PhishChannel, PhishMessage } from "./phish";
export { createPowerShellSession, executePowerShell } from "./powershell";
export type { PowerShellRecord, PowerShellSession } from "./powershell";
export { createSqlTrainingDatabase, executeReadOnlySql, runParameterizedLogin } from "./sql";
export type { SqlQueryResult } from "./sql";
export { compileCaptureFilter, compileDisplayFilter, TRAINING_CAPTURE } from "./packet";
export type { TrainingPacket } from "./packet";
export { searchSIEM, SIEM_ALERTS, SIEM_LOGS } from "./siem";
export type { SIEMAlert, SIEMLog, SIEMSearchResult } from "./siem";
