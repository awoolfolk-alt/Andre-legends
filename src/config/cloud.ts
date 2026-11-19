// ─────────────────────────────────────────────────────────────
// CLOUD CONFIG — the two "where is our save server?" values.
//
// These come from your Supabase project (Project Settings → API):
//   SUPABASE_URL      = Project URL      (https://abcdefgh.supabase.co)
//   SUPABASE_ANON_KEY = Publishable key  (sb_publishable_...)
//
// WHY is it safe to ship the publishable key in a public game?
// It can ONLY do what the database's Row Level Security policies allow,
// and our policies say "each player may touch ONLY their own save row."
// It is NOT the secret key — the secret key must never appear here.
//
// Until real values are pasted in, cloudConfigured is false and the
// game quietly stays in local-only mode (nothing breaks).
// ─────────────────────────────────────────────────────────────

export const SUPABASE_URL = "https://kdzvfrhhoozlckdeuvzy.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_oaZuvbjdULX_crswi8uSWg_nTWWSBZB";

// True only when real values have been pasted above.
// Every cloud feature checks this first, so a fresh clone still runs offline.
export const cloudConfigured =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_URL.includes(".supabase.co") &&
  SUPABASE_ANON_KEY.length > 20;
