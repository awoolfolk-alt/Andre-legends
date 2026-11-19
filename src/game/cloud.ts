// ─────────────────────────────────────────────────────────────
// CLOUD SAVE (Supabase) — the "log in anywhere, keep your legend" layer.
//
// HOW IT FITS WITH THE LOCAL SAVE (src/game/save.ts):
//   localStorage stays the CARTRIDGE — the game scenes read and write it
//   exactly like before, synchronously, never waiting on the internet.
//   The cloud is a MIRROR of that cartridge:
//     - every local write is also pushed up (fire-and-forget)
//     - at login (and at page load) we pull the cloud copy down, and if it
//       is NEWER than the local one, it replaces the local one
//   Result: if the Wi-Fi dies mid-game, nothing about the game breaks;
//   the save simply syncs next time it can.
//
// AUTH MODEL:
//   - A player enters their own email and password.
//   - First use of an email CREATES the account; later uses SIGN IN.
//   - Shared cohort credentials are not used by the app.
//   - Row Level Security in the database means a logged-in player can
//     only ever read or write THEIR OWN save row.
// ─────────────────────────────────────────────────────────────

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, cloudConfigured } from "@/config/cloud";
import { loadSave, onSaveSync, writeSave } from "./save";
import type { SaveData } from "./save";

// The client is created ONCE and reused (a "singleton"). Creating it is
// cheap, but one shared client means one shared login session.
let client: SupabaseClient | null = null;

function supabase(): SupabaseClient | null {
  if (!cloudConfigured) return null; // keys not pasted yet -> local-only mode
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

/** True when the cloud is wired up (keys pasted). False = local-only game. */
export function cloudReady(): boolean {
  return cloudConfigured;
}

/** The one shared Supabase client (null when keys aren't pasted).
    Cloud saves AND Safe Town presence both ride on this client, so they
    always share the same session and connection. */
export function cloudClient(): SupabaseClient | null {
  return supabase();
}

/** The signed-in player's email, or null when playing as a guest. */
export async function cloudEmail(): Promise<string | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user?.email ?? null;
}

export type LoginResult =
  | { ok: true; firstTime: boolean; email: string }
  | { ok: false; error: string };

/**
 * Sign in with email + password. If no account exists for that email yet,
 * CREATE it on the spot (firstTime = true) — the menu uses that flag to
 * offer the personal-password step.
 */
export async function cloudLogin(email: string, password: string): Promise<LoginResult> {
  const sb = supabase();
  if (!sb) return { ok: false, error: "Cloud saves are not configured yet." };

  // Try the normal path first: a returning player signing in.
  const signIn = await sb.auth.signInWithPassword({ email, password });
  if (!signIn.error) {
    return { ok: true, firstTime: false, email };
  }

  // "Invalid login credentials" can mean two things: wrong password, OR
  // this email has never played. Try creating the account; if the email
  // is already taken, Supabase tells us — then it really was a wrong password.
  const signUp = await sb.auth.signUp({ email, password });
  if (signUp.error) {
    // Translate Supabase's error codes into plain sentences for the player.
    const code = (signUp.error as { code?: string }).code ?? "";
    if (code === "weak_password") {
      return { ok: false, error: "That password is too simple for this project — it needs an uppercase letter, a number, and a symbol." };
    }
    if (code === "email_provider_disabled") {
      return { ok: false, error: "New accounts are switched off right now — tell Andre to enable Email sign-ups in Supabase." };
    }
    if (code === "over_email_send_rate_limit" || signUp.error.status === 429) {
      return { ok: false, error: "Too many attempts — wait a minute and try again." };
    }
    // user_already_exists and anything else lands here: the account exists,
    // so the password they typed simply wasn't right.
    return { ok: false, error: "Wrong password for that email (or the email is invalid)." };
  }
  if (!signUp.data.user || !signUp.data.session) {
    return { ok: false, error: "Could not create the account. Try again." };
  }
  return { ok: true, firstTime: true, email };
}

/** Change the signed-in player's password. */
export async function cloudSetPassword(newPassword: string): Promise<{ ok: boolean; error?: string }> {
  const sb = supabase();
  if (!sb) return { ok: false, error: "Cloud saves are not configured yet." };
  const { error } = await sb.auth.updateUser({ password: newPassword });
  return error ? { ok: false, error: error.message } : { ok: true };
}

/** Sign out: the game falls back to guest/local mode. */
export async function cloudLogout(): Promise<void> {
  const sb = supabase();
  if (sb) await sb.auth.signOut();
}

/** Download the cloud save, or null if this account has none yet. */
async function pullCloudSave(): Promise<SaveData | null> {
  const sb = supabase();
  if (!sb) return null;
  const { data: user } = await sb.auth.getUser();
  if (!user.user) return null;
  const { data, error } = await sb
    .from("saves")
    .select("save")
    .eq("user_id", user.user.id)
    .maybeSingle(); // maybeSingle: zero rows is fine (new account), not an error
  if (error || !data) return null;
  return data.save as SaveData;
}

/** Upload a save (creates or overwrites this account's one row). */
async function pushCloudSave(save: SaveData): Promise<void> {
  const sb = supabase();
  if (!sb) return;
  const { data: user } = await sb.auth.getUser();
  if (!user.user) return;
  await sb.from("saves").upsert({
    user_id: user.user.id,
    email: user.user.email ?? "",
    save,
    updated_at: new Date().toISOString(),
  });
}

/**
 * THE SYNC RULE — one sentence: NEWER WINS.
 * Compare the cloud copy with the local cartridge by their savedAt
 * timestamps and move the newer one over the older one. This also covers
 * "first login on a new computer": local is empty (savedAt 0), so the
 * cloud copy always wins and the adventure follows the player.
 */
export async function syncCloudSave(): Promise<SaveData | null> {
  const email = await cloudEmail();
  if (!email) return null; // guest: nothing to sync

  const cloud = await pullCloudSave();
  const local = loadSave();

  if (cloud && (!local || cloud.savedAt >= local.savedAt)) {
    // Cloud is newer (or local is empty): bring it down to the cartridge.
    writeSave(cloud);
    return cloud;
  }
  if (local && (!cloud || local.savedAt > cloud.savedAt)) {
    // Local is newer (or the account has no save yet): push it up.
    // This is also the MIGRATION path — a guest's progress joins their account.
    await pushCloudSave(local);
    return local;
  }
  return local;
}

let initialized = false;

/**
 * Call once per page (the menu and the game page both call it).
 * Registers the "every local save also goes to the cloud" hook and does
 * a first sync if the player is already logged in from a previous visit
 * (Supabase remembers the session in localStorage for us).
 */
export function initCloudSync(): void {
  if (initialized) return;
  initialized = true;

  // The hook: save.ts calls this after every local write.
  // Fire-and-forget — the game must never stutter waiting on the network.
  onSaveSync((data) => {
    pushCloudSave(data).catch(() => {
      // Offline? The local cartridge still has it; next sync will catch up.
    });
  });

  // Already logged in from a previous visit? Sync quietly on page load.
  syncCloudSave().catch(() => { /* offline is fine */ });
}
