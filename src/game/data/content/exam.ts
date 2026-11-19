import { SECURITY_PLUS_STATIONS } from "../securityPlus";
import type { StudyQuestion, StudyScenario } from "../securityPlus";
import { PHISH_MESSAGES, type PhishMessage } from "./phish";
import { loadContentList } from "./load";
import { CardSchema, type Card, type Scenario } from "./schemas";

type ChoiceQuestion = StudyQuestion | StudyScenario;

function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function makeChoiceCard(
  id: string,
  prompt: string,
  options: string[],
  answer: string,
  explanation: string,
  objective: string,
  district: Card["district"] = "security",
): Card {
  const choices = shuffled([...new Set(options)]);
  return {
    id,
    district,
    objective,
    source: "Original simulated practice content",
    game: "exam",
    format: "F2",
    difficulty: 2,
    prompt,
    options: choices,
    answer: [answer],
    accept: [],
    requiredKeywords: [],
    requiresRationale: false,
    explanation,
    clueWords: [],
    tags: ["exam-simulator"],
  };
}

function fromMessage(message: PhishMessage, index: number, messages: PhishMessage[]): Card {
  const distractors = messages
    .filter((other) => other.id !== message.id)
    .map((other) => other.action)
    .filter((action) => action !== message.action);
  return makeChoiceCard(
    `exam-message-${index + 1}`,
    `A fictional ${message.channel.toLowerCase()} from ${message.sender} says “${message.preview}.” ${message.body} What is the safest next action?`,
    [message.action, ...distractors],
    message.action,
    message.explanation,
    "Threat identification · safe verification",
  );
}

function fromScenario(scenario: Scenario, index: number): Card {
  const bestAction = scenario.actions.find((action) => action.rating === "best");
  if (!bestAction) throw new Error(`Scenario ${scenario.id} has no best response.`);
  return makeChoiceCard(
    `exam-scenario-${index + 1}`,
    `${scenario.title}: ${scenario.story} What is the safest response?`,
    scenario.actions.map((action) => action.text),
    bestAction.text,
    bestAction.feedback,
    scenario.objectives.join(" · "),
  );
}

function fromStudyQuestion(
  question: ChoiceQuestion,
  id: string,
  objective: string,
  district: Card["district"],
): Card {
  const answer = question.options[question.answer];
  if (!answer) throw new Error(`Study question ${id} has no answer option.`);
  return makeChoiceCard(id, question.prompt, question.options, answer, question.explanation, objective, district);
}

export function buildExamDeck(cards: Card[], scenarios: Scenario[], messages: PhishMessage[] = PHISH_MESSAGES): Card[] {
  const stationCards = SECURITY_PLUS_STATIONS.flatMap((station) => {
    const district: Card["district"] = station.id === "governance" ? "security"
      : station.id === "architecture" ? "network"
        : station.id === "operations" ? "security"
          : "hardware";
    return [
      ...station.questions.map((question, index) => fromStudyQuestion(
        question,
        `exam-station-${station.id}-question-${index + 1}`,
        station.name,
        district,
      )),
      ...station.scenarios.map((question, index) => fromStudyQuestion(
        question,
        `exam-station-${station.id}-scenario-${index + 1}`,
        `${station.name} scenario`,
        district,
      )),
    ];
  });
  return loadContentList(CardSchema, [
    ...cards,
    ...stationCards,
    ...scenarios.map((scenario, index) => fromScenario(scenario, index)),
    ...messages.map((message, index) => fromMessage(message, index, messages)),
  ], "exam question pool");
}
