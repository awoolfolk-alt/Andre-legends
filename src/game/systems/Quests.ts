import { EventBus, EVT } from "./EventBus";
import { QUESTS } from "../data/quests";

// ─────────────────────────────────────────────────────────────
// QUEST LOG (the "to-do list" of the adventure)
// Holds which quests are done, decides which one is CURRENT (the first
// unfinished one, in story order), and tells the HUD what to show.
//
// Both world scenes (Forest, Future Kingdom) share one log per play session.
// Scenes call complete("overload") at story moments; the log fires a
// "quest complete" toast and updates the tracker through the EventBus.
// ─────────────────────────────────────────────────────────────

export class QuestLog {
  // A Set of completed quest ids. Restored from the save file on boot.
  private done: Set<string>;

  constructor(done: string[] = []) {
    this.done = new Set(done);
  }

  /** The first quest that isn't finished yet, or null when the chapter is complete. */
  get current() {
    return QUESTS.find((q) => !this.done.has(q.id)) ?? null;
  }

  /** List of completed ids (used when writing the save). */
  get completedIds(): string[] {
    return [...this.done];
  }

  isDone(id: string): boolean {
    return this.done.has(id);
  }

  /** Mark a quest complete. Safe to call twice — only the first call celebrates. */
  complete(id: string) {
    if (this.done.has(id)) return;
    const quest = QUESTS.find((q) => q.id === id);
    if (!quest) return;
    this.done.add(id);
    // Pop-up celebration, then tell the tracker to redraw
    EventBus.emit(EVT.toast, `Quest complete: ${quest.title}`);
    this.push();
  }

  /** Send the current quest state to the HUD tracker. */
  push() {
    const cur = this.current;
    EventBus.emit(EVT.quest, {
      done: this.done.size,
      total: QUESTS.length,
      title: cur ? cur.title : "Chapter 1 complete!",
      hint: cur ? cur.hint : "The Internship Kingdom awaits in the next chapter...",
    });
  }
}
