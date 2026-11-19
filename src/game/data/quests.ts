// ─────────────────────────────────────────────────────────────
// QUEST DATA
// A quest is one clear goal ("defeat The Empire Revenant") with a short hint.
// The tracker in the top-right corner shows the current quest, and a
// toast pops when one is completed. Scenes call Quests.complete(id)
// at the right story moments; the rest is automatic.
//
// WHY data instead of code: adding a quest = adding one line here and
// one Quests.complete(...) call where it happens.
// ─────────────────────────────────────────────────────────────

export interface QuestDef {
  id: string;
  title: string; // shown in the tracker, e.g. "The Lesson of Boundaries"
  hint: string; // what to do, e.g. "Face The Nike Nightstalker in the north-east"
}

// The main path through Chapter 1, in order.
export const QUESTS: QuestDef[] = [
  { id: "meet-elder", title: "The Journey Begins", hint: "Speak with jv-marc in Safe Town" },
  { id: "train", title: "Sharpen the Sword", hint: "Break a Doubt Totem (N combo / M heavy)" },
  { id: "read-legend", title: "Know the Legend", hint: "Read The Legend, the glowing book in Safe Town" },
  { id: "empire", title: "The Lesson of the Unknown", hint: "Face The Empire Revenant in the south-east arena" },
  { id: "nike", title: "The Lesson of Boundaries", hint: "Face The Nike Nightstalker in the north-east arena" },
  { id: "self", title: "The Lesson You Keep", hint: "Face The Shadow of Andre in the far south-east" },
  { id: "gate", title: "The Road East", hint: "Enter the Future Kingdom gate on the far east road" },
  { id: "legacy", title: "Rise of Legacy", hint: "Meet your Future Self at the monument" },
];
