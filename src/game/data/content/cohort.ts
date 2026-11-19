import { z } from "zod";
import { cloudClient } from "@/game/cloud";
import { readReviewStore } from "./review";

const ProfileSchema = z.object({
  user_id: z.string().uuid(),
  display_name: z.string().min(1).max(24),
  is_shared: z.boolean(),
  best_wpm: z.number().int().nonnegative(),
  quiz_accuracy: z.number().int().min(0).max(100),
  fence_tiles: z.number().int().nonnegative(),
  best_raid_score: z.number().int().nonnegative(),
  updated_at: z.string(),
}).strict();

const NoteSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  topic: z.enum(["terminal", "phishing", "network", "study"]),
  note: z.string().min(1).max(500),
  created_at: z.string(),
}).strict();

const ProfileListSchema = z.array(ProfileSchema);
const NoteListSchema = z.array(NoteSchema);

export type CohortProfile = z.infer<typeof ProfileSchema>;
export type CohortNote = z.infer<typeof NoteSchema>;
export type CohortMetrics = Pick<CohortProfile, "best_wpm" | "quiz_accuracy" | "fence_tiles" | "best_raid_score">;

export type CohortSnapshot = {
  signedIn: boolean;
  ownProfile: CohortProfile | null;
  profiles: CohortProfile[];
  notes: CohortNote[];
  error?: string;
};

async function accountContext() {
  const client = cloudClient();
  if (!client) return { client: null, userId: null, error: "Cloud accounts are not configured in this build." };
  const { data, error } = await client.auth.getUser();
  if (error) return { client, userId: null, error: `Could not verify the account: ${error.message}` };
  return { client, userId: data.user?.id ?? null, error: null };
}

export function readLocalCohortMetrics(): CohortMetrics {
  const rawDojo = localStorage.getItem("legend-typing-dojo-v1");
  const rawReview = localStorage.getItem("legend-cyberprep-review-v1");
  const dojo = rawDojo ? JSON.parse(rawDojo) as { bestWpm?: unknown } : {};
  if (dojo.bestWpm !== undefined && (typeof dojo.bestWpm !== "number" || !Number.isInteger(dojo.bestWpm) || dojo.bestWpm < 0)) {
    throw new Error("Saved Typing Dojo progress is invalid; open the Typing Dojo to review the saved data.");
  }
  const review = rawReview ? readReviewStore() : { store: { version: 1 as const, cards: {} }, error: "" };
  if (review.error) throw new Error(review.error);
  const states = Object.values(review.store.cards);
  const attempts = states.reduce((sum, state) => sum + state.attempts, 0);
  const correct = states.reduce((sum, state) => sum + state.correct, 0);
  return {
    best_wpm: typeof dojo.bestWpm === "number" ? dojo.bestWpm : 0,
    quiz_accuracy: attempts ? Math.round(correct / attempts * 100) : 0,
    fence_tiles: correct,
    best_raid_score: 0,
  };
}

export async function loadCohortSnapshot(): Promise<CohortSnapshot> {
  const { client, userId, error: accountError } = await accountContext();
  if (!client) return { signedIn: false, ownProfile: null, profiles: [], notes: [], error: accountError ?? undefined };
  if (accountError) return { signedIn: false, ownProfile: null, profiles: [], notes: [], error: accountError };
  if (!userId) return { signedIn: false, ownProfile: null, profiles: [], notes: [] };

  const [profilesResult, ownResult, notesResult] = await Promise.all([
    client.from("cyberprep_profiles")
      .select("user_id,display_name,is_shared,best_wpm,quiz_accuracy,fence_tiles,best_raid_score,updated_at")
      .eq("is_shared", true)
      .order("best_wpm", { ascending: false })
      .limit(100),
    client.from("cyberprep_profiles")
      .select("user_id,display_name,is_shared,best_wpm,quiz_accuracy,fence_tiles,best_raid_score,updated_at")
      .eq("user_id", userId)
      .maybeSingle(),
    client.from("cyberprep_notes")
      .select("id,user_id,topic,note,created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (profilesResult.error) return { signedIn: true, ownProfile: null, profiles: [], notes: [], error: `Could not load cohort profiles: ${profilesResult.error.message}` };
  if (ownResult.error) return { signedIn: true, ownProfile: null, profiles: [], notes: [], error: `Could not load your cohort profile: ${ownResult.error.message}` };
  if (notesResult.error) return { signedIn: true, ownProfile: null, profiles: [], notes: [], error: `Could not load Mentor Notes: ${notesResult.error.message}` };

  const profiles = ProfileListSchema.safeParse(profilesResult.data);
  const ownProfile = ownResult.data === null ? { success: true as const, data: null } : ProfileSchema.safeParse(ownResult.data);
  const notes = NoteListSchema.safeParse(notesResult.data);
  if (!profiles.success || !ownProfile.success || !notes.success) {
    return { signedIn: true, ownProfile: null, profiles: [], notes: [], error: "Cohort data had an unexpected format and was not displayed." };
  }
  return {
    signedIn: true,
    ownProfile: ownProfile.data,
    profiles: profiles.data,
    notes: notes.data,
  };
}

export async function saveCohortProfile(
  displayName: string,
  isShared: boolean,
  metrics: CohortMetrics,
): Promise<string | null> {
  const safeName = displayName.trim();
  if (safeName.length < 2 || safeName.length > 24) return "Choose a display name between 2 and 24 characters.";
  if (!/^[\p{L}\p{N} _.-]+$/u.test(safeName)) return "Use letters, numbers, spaces, periods, underscores, or hyphens only.";
  const { client, userId, error } = await accountContext();
  if (!client || error || !userId) return error ?? "Sign in before saving a cohort profile.";
  const result = await client.from("cyberprep_profiles").upsert({
    user_id: userId,
    display_name: safeName,
    is_shared: isShared,
    ...metrics,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  return result.error ? `Could not save your cohort profile: ${result.error.message}` : null;
}

export async function postMentorNote(topic: CohortNote["topic"], note: string): Promise<string | null> {
  const safeNote = note.trim();
  if (safeNote.length < 8 || safeNote.length > 500) return "Write a note between 8 and 500 characters.";
  const { client, userId, error } = await accountContext();
  if (!client || error || !userId) return error ?? "Sign in before posting a Mentor Note.";
  const result = await client.from("cyberprep_notes").insert({ user_id: userId, topic, note: safeNote });
  return result.error ? `Could not post the Mentor Note: ${result.error.message}` : null;
}

export async function saveBestRaidScore(score: number): Promise<string | null> {
  if (!Number.isInteger(score) || score < 0 || score > 3) return "Raid score is outside the expected range.";
  const snapshot = await loadCohortSnapshot();
  const profile = snapshot.ownProfile;
  if (!snapshot.signedIn || snapshot.error || !profile?.is_shared) return snapshot.error ?? null;
  if (score <= profile.best_raid_score) return null;
  return saveCohortProfile(profile.display_name, true, {
    best_wpm: profile.best_wpm,
    quiz_accuracy: profile.quiz_accuracy,
    fence_tiles: profile.fence_tiles,
    best_raid_score: score,
  });
}
