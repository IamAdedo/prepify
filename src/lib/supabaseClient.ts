import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Public (anon) client for the browser. Reads/inserts are governed by RLS.
// If env vars are absent, we return null so callers can gracefully fall back
// to local seed data — the app must still build and run without a database.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (cached) return cached;
  if (!url || !anonKey) return null;
  cached = createClient(url, anonKey, {
    auth: {
      // Persist sessions so optional email sign-in works across reloads.
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return cached;
}

export const isSupabaseConfigured = Boolean(url && anonKey);
